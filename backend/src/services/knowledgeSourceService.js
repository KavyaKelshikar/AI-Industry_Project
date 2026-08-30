const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const KnowledgeSourceRepository = require('../repositories/KnowledgeSourceRepository');
const Document = require('../models/Document');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const logger = require('../utils/logger');
const {
  validateLocalFolderPath,
  sanitizeSyncError,
} = require('../utils/knowledgeSourcePathSecurity');
const { createAdapter, isAdapterImplemented } = require('./adapters/AdapterFactory');

/**
 * Currently supported source types that can actually be created.
 */
const SUPPORTED_CREATION_TYPES = ['uploaded_file', 'local_folder'];

class KnowledgeSourceService {
  /**
   * List knowledge sources for the authenticated tenant with stats.
   */
  async listSources(scope = {}, queryOptions = {}) {
    return KnowledgeSourceRepository.findByCompany(scope, queryOptions);
  }

  /**
   * Get a single knowledge source by ID within tenant scope.
   */
  async getSourceById(id, scope = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'Invalid knowledge source ID format', true, errorCodes.VALIDATION_ERROR);
    }

    const source = await KnowledgeSourceRepository.findByIdScoped(id, scope);
    if (!source) {
      throw new AppError(404, 'Knowledge source not found', true, errorCodes.KNOWLEDGE_SOURCE_NOT_FOUND);
    }

    return this._sanitizeSource(source);
  }

  /**
   * Create a new knowledge source.
   *
   * For local_folder: validates and resolves the path server-side.
   * For future connectors: rejects with CONNECTOR_NOT_IMPLEMENTED.
   */
  async createSource(data, scope = {}, user = null) {
    const companyId = scope.companyId || (user && user.companyId);
    if (!companyId) {
      throw new AppError(400, 'Company scope is required', true, errorCodes.TENANT_MISMATCH);
    }

    // Validate source type is currently supported
    if (!SUPPORTED_CREATION_TYPES.includes(data.type)) {
      throw new AppError(
        501,
        `The ${data.type} connector is not yet implemented`,
        true,
        errorCodes.CONNECTOR_NOT_IMPLEMENTED
      );
    }

    // Duplicate check
    const duplicate = await KnowledgeSourceRepository.findDuplicate(companyId, data.name);
    if (duplicate) {
      throw new AppError(
        409,
        `A knowledge source named '${data.name}' already exists in this company`,
        true,
        errorCodes.DUPLICATE_KNOWLEDGE_SOURCE
      );
    }

    // Build payload
    const payload = {
      companyId,
      name: data.name.trim(),
      type: data.type,
      description: data.description ? data.description.trim() : '',
      configuration: {},
      approvedPath: null,
      supportedFileTypes: data.supportedFileTypes || [],
      status: 'active',
      lastSyncStatus: 'idle',
      documentCount: 0,
      createdBy: user ? user.id : null,
      updatedBy: null,
    };

    // Type-specific validation
    if (data.type === 'local_folder') {
      const folderPath = data.folderPath || (data.configuration && data.configuration.folderPath);
      if (!folderPath) {
        throw new AppError(400, 'Folder path is required for local_folder sources', true, errorCodes.INVALID_SOURCE_PATH);
      }
      // Server-side validation and approval
      const approvedPath = validateLocalFolderPath(folderPath);
      payload.approvedPath = approvedPath;
      payload.configuration = { originalInput: data.name };
    }

    const created = await KnowledgeSourceRepository.createSource(payload, { companyId });
    logger.info(`Knowledge source created: ${created.name} [Company: ${companyId}]`);
    return this._sanitizeSource(created);
  }

  /**
   * Update an existing knowledge source.
   */
  async updateSource(id, data, scope = {}, user = null) {
    const existing = await this.getSourceById(id, scope);

    const fieldsToUpdate = {};

    if (data.name !== undefined) {
      const newName = data.name.trim();
      if (newName !== existing.name) {
        const duplicate = await KnowledgeSourceRepository.findDuplicate(
          existing.companyId,
          newName,
          id
        );
        if (duplicate) {
          throw new AppError(
            409,
            `A knowledge source named '${newName}' already exists`,
            true,
            errorCodes.DUPLICATE_KNOWLEDGE_SOURCE
          );
        }
        fieldsToUpdate.name = newName;
      }
    }

    if (data.description !== undefined) {
      fieldsToUpdate.description = data.description ? data.description.trim() : '';
    }

    if (data.supportedFileTypes !== undefined) {
      fieldsToUpdate.supportedFileTypes = data.supportedFileTypes;
    }

    // Re-validate path if changed for local_folder
    if (data.folderPath && existing.type === 'local_folder') {
      const approvedPath = validateLocalFolderPath(data.folderPath);
      fieldsToUpdate.approvedPath = approvedPath;
    }

    if (user) {
      fieldsToUpdate.updatedBy = user.id;
    }

    const updated = await KnowledgeSourceRepository.updateSource(id, fieldsToUpdate, scope);
    if (!updated) {
      throw new AppError(404, 'Knowledge source not found', true, errorCodes.KNOWLEDGE_SOURCE_NOT_FOUND);
    }

    logger.info(`Knowledge source updated: ${id}`);
    return this._sanitizeSource(updated);
  }

  /**
   * Delete a knowledge source and unlink associated documents.
   */
  async deleteSource(id, scope = {}) {
    await this.getSourceById(id, scope);

    // Unlink documents (do not delete them — they were already processed)
    await Document.updateMany(
      { knowledgeSourceId: id },
      { $set: { knowledgeSourceId: null } }
    );

    const deleted = await KnowledgeSourceRepository.deleteSource(id, scope);
    if (!deleted) {
      throw new AppError(404, 'Knowledge source not found', true, errorCodes.KNOWLEDGE_SOURCE_NOT_FOUND);
    }

    logger.info(`Knowledge source deleted: ${id}`);
    return { id, deleted: true };
  }

  /**
   * Activate a knowledge source.
   */
  async activateSource(id, scope = {}) {
    await this.getSourceById(id, scope);
    const updated = await KnowledgeSourceRepository.updateSource(id, { status: 'active' }, scope);
    logger.info(`Knowledge source activated: ${id}`);
    return this._sanitizeSource(updated);
  }

  /**
   * Deactivate a knowledge source.
   */
  async deactivateSource(id, scope = {}) {
    await this.getSourceById(id, scope);
    const updated = await KnowledgeSourceRepository.updateSource(id, { status: 'inactive' }, scope);
    logger.info(`Knowledge source deactivated: ${id}`);
    return this._sanitizeSource(updated);
  }

  /**
   * Trigger sync for a knowledge source.
   *
   * Lifecycle: active → syncing → discover → validate → import → completed|failed
   */
  async syncSource(id, scope = {}, user = null) {
    const source = await this.getSourceById(id, scope);

    if (source.status === 'inactive') {
      throw new AppError(400, 'Cannot sync an inactive source. Activate it first.', true, errorCodes.BAD_REQUEST);
    }

    if (source.status === 'syncing') {
      throw new AppError(400, 'Source is already syncing', true, errorCodes.BAD_REQUEST);
    }

    // Set syncing state
    await KnowledgeSourceRepository.updateSyncStatus(id, {
      status: 'syncing',
      lastSyncStatus: 'syncing',
      lastSyncError: null,
    }, scope);

    try {
      // Fetch fresh source with approvedPath
      const fullSource = await KnowledgeSourceRepository.findByIdScoped(id, scope);
      const adapter = createAdapter(fullSource);

      // Test connectivity first
      const connectionResult = await adapter.testConnection();
      if (!connectionResult.connected) {
        throw new Error(`Connection failed: ${connectionResult.message}`);
      }

      // Discover files
      const files = await adapter.listFiles();

      // Process each discovered file
      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const file of files) {
        try {
          const result = await this._processDiscoveredFile(file, fullSource, user);
          if (result === 'created') newCount++;
          else if (result === 'updated') updatedCount++;
          else skippedCount++;
        } catch (fileErr) {
          logger.warn(`Failed to process file ${file.relativePath}: ${fileErr.message}`);
        }
      }

      // Update document count
      const docCount = await Document.countDocuments({
        knowledgeSourceId: id,
        companyId: fullSource.companyId,
      });

      await KnowledgeSourceRepository.updateSyncStatus(id, {
        status: 'active',
        lastSyncAt: new Date(),
        lastSyncStatus: 'completed',
        lastSyncError: null,
        documentCount: docCount,
      }, scope);

      logger.info(
        `Sync completed for source ${id}: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`
      );

      return {
        status: 'completed',
        newDocuments: newCount,
        updatedDocuments: updatedCount,
        skippedDocuments: skippedCount,
        totalDocuments: docCount,
      };
    } catch (syncErr) {
      const sanitised = sanitizeSyncError(syncErr);
      await KnowledgeSourceRepository.updateSyncStatus(id, {
        status: 'error',
        lastSyncAt: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: sanitised,
      }, scope);

      logger.error(`Sync failed for source ${id}: ${syncErr.message}`);

      throw new AppError(500, `Sync failed: ${sanitised}`, true, errorCodes.SOURCE_SYNC_FAILED);
    }
  }

  /**
   * Get aggregate stats for knowledge sources within tenant scope.
   */
  async getSourceStats(scope = {}) {
    const [total, active, syncing, failed, inactive] = await Promise.all([
      KnowledgeSourceRepository.countByCompany(scope),
      KnowledgeSourceRepository.countByCompany(scope, { status: 'active' }),
      KnowledgeSourceRepository.countByCompany(scope, { status: 'syncing' }),
      KnowledgeSourceRepository.countByCompany(scope, { status: 'error' }),
      KnowledgeSourceRepository.countByCompany(scope, { status: 'inactive' }),
    ]);

    // Sum document counts
    const docCountAgg = await require('../models/KnowledgeSource').aggregate([
      { $match: scope.companyId ? { companyId: new mongoose.Types.ObjectId(scope.companyId) } : {} },
      { $group: { _id: null, totalDocuments: { $sum: '$documentCount' } } },
    ]);

    return {
      total,
      active,
      syncing,
      failed,
      inactive,
      totalDocuments: docCountAgg.length > 0 ? docCountAgg[0].totalDocuments : 0,
    };
  }

  /**
   * Process a single discovered file during sync.
   *
   * - If the file already exists (matched by sourceRelativePath + knowledgeSourceId), check hash.
   *   - If unchanged, skip.
   *   - If changed, update the existing document.
   * - If new, create a new Document record.
   *
   * @returns {'created'|'updated'|'skipped'}
   * @private
   */
  async _processDiscoveredFile(file, source, user) {
    // Compute a hash of the file for deduplication
    const fileBuffer = await fs.promises.readFile(file.absolutePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Look for an existing document from this source at this path
    const existingDoc = await Document.findOne({
      knowledgeSourceId: source._id,
      companyId: source.companyId,
      sourceRelativePath: file.relativePath,
    }).lean();

    if (existingDoc) {
      // If hash matches, skip reprocessing
      if (existingDoc.sourceFileHash === hash) {
        return 'skipped';
      }

      // File changed — update existing document and reset indexingStatus to pending
      await Document.findByIdAndUpdate(existingDoc._id, {
        $set: {
          sourceFileHash: hash,
          fileSize: file.size,
          status: 'pending',
          indexingStatus: 'pending',
          processingError: null,
          updatedAt: new Date(),
        },
      });
      return 'updated';
    }

    // New file — create a document record with indexingStatus pending
    const ext = file.extension.replace('.', '');
    await Document.create({
      companyId: source.companyId,
      uploadedBy: user ? user.id : source.createdBy,
      filename: `ks_${source._id}_${Date.now()}_${file.filename}`,
      originalFilename: file.filename,
      fileType: ext,
      fileSize: file.size,
      storagePath: file.absolutePath,
      sourceType: 'local_folder',
      sourceId: source._id.toString(),
      knowledgeSourceId: source._id,
      sourceRelativePath: file.relativePath,
      sourceFileHash: hash,
      status: 'pending',
      indexingStatus: 'pending',
    });

    return 'created';
  }

  /**
   * Sanitize a knowledge source for API response.
   * Never expose approved filesystem paths, credentials, or internal config.
   */
  _sanitizeSource(source) {
    if (!source) return null;

    return {
      id: source._id ? source._id.toString() : source.id,
      companyId: source.companyId ? (source.companyId._id ? source.companyId._id.toString() : source.companyId.toString()) : null,
      name: source.name,
      type: source.type,
      status: source.status,
      description: source.description || '',
      lastSyncAt: source.lastSyncAt,
      lastSyncStatus: source.lastSyncStatus || 'idle',
      lastSyncError: source.lastSyncError || null,
      documentCount: source.documentCount || 0,
      supportedFileTypes: source.supportedFileTypes || [],
      // For local_folder, expose a masked indicator (not the real path)
      hasApprovedPath: !!source.approvedPath,
      createdBy: source.createdBy
        ? {
            id: source.createdBy._id ? source.createdBy._id.toString() : source.createdBy.toString(),
            name: source.createdBy.name || '',
            email: source.createdBy.email || '',
          }
        : null,
      updatedBy: source.updatedBy
        ? {
            id: source.updatedBy._id ? source.updatedBy._id.toString() : source.updatedBy.toString(),
            name: source.updatedBy.name || '',
            email: source.updatedBy.email || '',
          }
        : null,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}

module.exports = new KnowledgeSourceService();
