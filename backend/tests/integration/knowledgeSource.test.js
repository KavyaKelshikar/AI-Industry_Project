const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const Role = require('../../src/models/Role');
const Permission = require('../../src/models/Permission');
const KnowledgeSource = require('../../src/models/KnowledgeSource');
const Document = require('../../src/models/Document');
const { generateAccessToken } = require('../../src/utils/token');
const { hashPassword } = require('../../src/utils/password');

describe('Module 9: Enterprise Knowledge Source Manager Integration Tests', () => {
  let mongoServer;
  let companyA, companyB;
  let superAdminRole, companyAdminRole, employeeRole;
  let superAdminUser, companyAdminA, companyAdminB, employeeUserA;
  let superAdminToken, companyAdminAToken, companyAdminBToken, employeeUserAToken;
  let testFolderA, testFolderB;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create temporary folders for local folder sync testing
    testFolderA = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-int-test-a-'));
    testFolderB = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-int-test-b-'));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    try {
      fs.rmSync(testFolderA, { recursive: true, force: true });
      fs.rmSync(testFolderB, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await KnowledgeSource.deleteMany({});
    await Document.deleteMany({});

    // 1. Seed Permissions
    const permRead = await Permission.create({
      module: 'knowledge-sources',
      action: 'read',
      code: 'knowledge-sources:read',
      name: 'knowledge-sources:read',
      displayName: 'View knowledge sources',
      description: 'View external knowledge sources',
    });
    const permCreate = await Permission.create({
      module: 'knowledge-sources',
      action: 'create',
      code: 'knowledge-sources:create',
      name: 'knowledge-sources:create',
      displayName: 'Create knowledge sources',
      description: 'Create knowledge sources',
    });
    const permUpdate = await Permission.create({
      module: 'knowledge-sources',
      action: 'update',
      code: 'knowledge-sources:update',
      name: 'knowledge-sources:update',
      displayName: 'Update knowledge sources',
      description: 'Update knowledge sources',
    });
    const permDelete = await Permission.create({
      module: 'knowledge-sources',
      action: 'delete',
      code: 'knowledge-sources:delete',
      name: 'knowledge-sources:delete',
      displayName: 'Delete knowledge sources',
      description: 'Delete knowledge sources',
    });
    const permSync = await Permission.create({
      module: 'knowledge-sources',
      action: 'sync',
      code: 'knowledge-sources:sync',
      name: 'knowledge-sources:sync',
      displayName: 'Sync knowledge sources',
      description: 'Sync knowledge sources',
    });
    const permManage = await Permission.create({
      module: 'knowledge-sources',
      action: 'manage',
      code: 'knowledge-sources:manage',
      name: 'knowledge-sources:manage',
      displayName: 'Manage knowledge sources',
      description: 'Manage knowledge sources',
    });

    // 2. Seed Companies
    companyA = await Company.create({
      name: 'Alpha Corp',
      slug: 'alpha-corp',
      companyCode: 'ALPHA',
      email: 'contact@alpha.com',
      status: 'active',
    });
    companyB = await Company.create({
      name: 'Beta Global',
      slug: 'beta-global',
      companyCode: 'BETAG',
      email: 'contact@beta.com',
      status: 'active',
    });

    // 3. Seed Roles
    superAdminRole = await Role.create({
      name: 'Super Admin',
      description: 'Global administrator',
      companyId: null,
      permissionIds: [permRead._id, permCreate._id, permUpdate._id, permDelete._id, permSync._id, permManage._id],
    });

    companyAdminRole = await Role.create({
      name: 'Company Admin',
      description: 'Tenant administrator',
      companyId: null,
      permissionIds: [permRead._id, permCreate._id, permUpdate._id, permDelete._id, permSync._id, permManage._id],
    });

    employeeRole = await Role.create({
      name: 'Employee',
      description: 'Standard employee with read-only rights',
      companyId: null,
      permissionIds: [permRead._id],
    });

    // 4. Seed Users
    const passwordHash = await hashPassword('Password123!');

    superAdminUser = await User.create({
      name: 'Super Admin User',
      email: 'super@system.com',
      passwordHash,
      roleId: superAdminRole._id,
      companyId: null,
      status: 'active',
    });

    companyAdminA = await User.create({
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      passwordHash,
      roleId: companyAdminRole._id,
      companyId: companyA._id,
      status: 'active',
    });

    companyAdminB = await User.create({
      name: 'Admin Beta',
      email: 'admin@beta.com',
      passwordHash,
      roleId: companyAdminRole._id,
      companyId: companyB._id,
      status: 'active',
    });

    employeeUserA = await User.create({
      name: 'Employee Alpha',
      email: 'emp@alpha.com',
      passwordHash,
      roleId: employeeRole._id,
      companyId: companyA._id,
      status: 'active',
    });

    // 5. Generate Auth Tokens
    superAdminToken = generateAccessToken({ id: superAdminUser._id.toString() });
    companyAdminAToken = generateAccessToken({ id: companyAdminA._id.toString() });
    companyAdminBToken = generateAccessToken({ id: companyAdminB._id.toString() });
    employeeUserAToken = generateAccessToken({ id: employeeUserA._id.toString() });
  });

  describe('1. Knowledge Source Creation & Path Validation', () => {
    it('should allow Company Admin to create a local_folder source with a valid directory', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Engineering Docs',
          type: 'local_folder',
          folderPath: testFolderA,
          description: 'Engineering documentation directory',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Engineering Docs');
      expect(res.body.data.type).toBe('local_folder');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.hasApprovedPath).toBe(true);
      // Ensure raw approved path is not leaked in response
      expect(res.body.data.approvedPath).toBeUndefined();
    });

    it('should reject invalid / non-existent folder path with 400', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Invalid Folder',
          type: 'local_folder',
          folderPath: path.join(testFolderA, 'non-existent-subfolder'),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_SOURCE_PATH');
    });

    it('should reject path traversal attempts with 400 PATH_TRAVERSAL_DETECTED', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Traversal Folder',
          type: 'local_folder',
          folderPath: testFolderA + '/../../etc',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PATH_TRAVERSAL_DETECTED');
    });

    it('should reject duplicate source names within the same company with 409', async () => {
      await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Policy Folder',
          type: 'local_folder',
          folderPath: testFolderA,
        });

      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Policy Folder',
          type: 'local_folder',
          folderPath: testFolderA,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_KNOWLEDGE_SOURCE');
    });

    it('should reject future unimplemented connectors with 501 CONNECTOR_NOT_IMPLEMENTED', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Corporate Google Drive',
          type: 'google_drive',
        });

      expect(res.status).toBe(501);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONNECTOR_NOT_IMPLEMENTED');
    });
  });

  describe('2. Listing & Retrieving Knowledge Sources', () => {
    beforeEach(async () => {
      await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Alpha Source 1',
        type: 'local_folder',
        approvedPath: testFolderA,
        status: 'active',
        createdBy: companyAdminA._id,
      });
      await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Alpha Source 2',
        type: 'uploaded_file',
        status: 'active',
        createdBy: companyAdminA._id,
      });
      await KnowledgeSource.create({
        companyId: companyB._id,
        name: 'Beta Source 1',
        type: 'local_folder',
        approvedPath: testFolderB,
        status: 'active',
        createdBy: companyAdminB._id,
      });
    });

    it('should list only sources belonging to the authenticated tenant', async () => {
      const res = await request(app)
        .get('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.map((s) => s.name)).toEqual(
        expect.arrayContaining(['Alpha Source 1', 'Alpha Source 2'])
      );
      expect(res.body.data.items.map((s) => s.name)).not.toContain('Beta Source 1');
    });

    it('should allow Employee with read permission to list sources', async () => {
      const res = await request(app)
        .get('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('should get aggregate stats for tenant sources', async () => {
      const res = await request(app)
        .get('/api/v1/knowledge-sources/stats')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.active).toBe(2);
    });
  });

  describe('3. Updating, Activating & Deactivating Sources', () => {
    let sourceA;

    beforeEach(async () => {
      sourceA = await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Initial Source',
        type: 'local_folder',
        approvedPath: testFolderA,
        status: 'active',
        createdBy: companyAdminA._id,
      });
    });

    it('should allow Company Admin to update source name and description', async () => {
      const res = await request(app)
        .patch(`/api/v1/knowledge-sources/${sourceA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Updated Source Name',
          description: 'New description text',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Source Name');
      expect(res.body.data.description).toBe('New description text');
    });

    it('should deactivate and reactivate a knowledge source', async () => {
      // Deactivate
      const deactRes = await request(app)
        .patch(`/api/v1/knowledge-sources/${sourceA._id}/deactivate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.status).toBe('inactive');

      // Activate
      const actRes = await request(app)
        .patch(`/api/v1/knowledge-sources/${sourceA._id}/activate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(actRes.status).toBe(200);
      expect(actRes.body.data.status).toBe('active');
    });
  });

  describe('4. Synchronization Engine & Deduplication', () => {
    let sourceA;

    beforeEach(async () => {
      // Clear folder contents
      const existingFiles = fs.readdirSync(testFolderA);
      for (const f of existingFiles) {
        fs.unlinkSync(path.join(testFolderA, f));
      }

      // Add 2 test files
      fs.writeFileSync(path.join(testFolderA, 'guide.pdf'), 'PDF content v1');
      fs.writeFileSync(path.join(testFolderA, 'notes.txt'), 'Plain notes text');

      sourceA = await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Syncable Folder',
        type: 'local_folder',
        approvedPath: testFolderA,
        status: 'active',
        lastSyncStatus: 'idle',
        createdBy: companyAdminA._id,
      });
    });

    it('should discover files and create Document records with metadata during sync', async () => {
      const res = await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.newDocuments).toBe(2);
      expect(res.body.data.totalDocuments).toBe(2);

      // Verify documents in DB
      const docs = await Document.find({ knowledgeSourceId: sourceA._id });
      expect(docs).toHaveLength(2);
      expect(docs[0].companyId.toString()).toBe(companyA._id.toString());
      expect(docs[0].sourceType).toBe('local_folder');
      expect(docs[0].sourceFileHash).toBeDefined();
    });

    it('should not duplicate documents on repeated sync of unchanged files', async () => {
      // First sync
      await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      // Second sync
      const res = await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.newDocuments).toBe(0);
      expect(res.body.data.skippedDocuments).toBe(2);
      expect(res.body.data.totalDocuments).toBe(2);

      const totalDocs = await Document.countDocuments({ knowledgeSourceId: sourceA._id });
      expect(totalDocs).toBe(2);
    });

    it('should update existing Document when a file is modified rather than creating a duplicate', async () => {
      // First sync
      await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      // Modify one file
      fs.writeFileSync(path.join(testFolderA, 'guide.pdf'), 'PDF content v2 UPDATED');

      // Second sync
      const res = await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.newDocuments).toBe(0);
      expect(res.body.data.updatedDocuments).toBe(1);
      expect(res.body.data.skippedDocuments).toBe(1);

      // Total document count remains 2
      const totalDocs = await Document.countDocuments({ knowledgeSourceId: sourceA._id });
      expect(totalDocs).toBe(2);
    });

    it('should reject sync on an inactive source with 400', async () => {
      await KnowledgeSource.findByIdAndUpdate(sourceA._id, { status: 'inactive' });

      const res = await request(app)
        .post(`/api/v1/knowledge-sources/${sourceA._id}/sync`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. RBAC & Cross-Tenant Security Isolation', () => {
    let sourceA, sourceB;

    beforeEach(async () => {
      sourceA = await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Alpha Secret Source',
        type: 'local_folder',
        approvedPath: testFolderA,
        status: 'active',
        createdBy: companyAdminA._id,
      });
      sourceB = await KnowledgeSource.create({
        companyId: companyB._id,
        name: 'Beta Secret Source',
        type: 'local_folder',
        approvedPath: testFolderB,
        status: 'active',
        createdBy: companyAdminB._id,
      });
    });

    it('should prevent Employee from creating a knowledge source (403 INSUFFICIENT_PERMISSIONS)', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${employeeUserAToken}`)
        .send({
          name: 'Unauthorized Source',
          type: 'local_folder',
          folderPath: testFolderA,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent Employee from deleting a knowledge source (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/knowledge-sources/${sourceA._id}`)
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent Company Admin A from accessing Company B source (404 / cross-tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/knowledge-sources/${sourceB._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject forged client-supplied companyId (403 TENANT_MISMATCH)', async () => {
      const res = await request(app)
        .post('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .query({ companyId: companyB._id.toString() })
        .send({
          name: 'Spoofed Company Source',
          type: 'local_folder',
          folderPath: testFolderA,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });

    it('should allow Super Admin to access sources across tenants', async () => {
      const res = await request(app)
        .get('/api/v1/knowledge-sources')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
    });
  });

  describe('6. Deletion Lifecycle', () => {
    let sourceA;

    beforeEach(async () => {
      sourceA = await KnowledgeSource.create({
        companyId: companyA._id,
        name: 'Deletable Source',
        type: 'local_folder',
        approvedPath: testFolderA,
        status: 'active',
        createdBy: companyAdminA._id,
      });

      // Create linked document
      await Document.create({
        companyId: companyA._id,
        uploadedBy: companyAdminA._id,
        filename: 'linked_doc.pdf',
        originalFilename: 'linked_doc.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        storagePath: path.join(testFolderA, 'linked_doc.pdf'),
        sourceType: 'local_folder',
        knowledgeSourceId: sourceA._id,
        status: 'approved',
      });
    });

    it('should delete knowledge source and unlink associated documents without destroying them', async () => {
      const res = await request(app)
        .delete(`/api/v1/knowledge-sources/${sourceA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify source cannot be retrieved
      const getRes = await request(app)
        .get(`/api/v1/knowledge-sources/${sourceA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);
      expect(getRes.status).toBe(404);

      // Document still exists but knowledgeSourceId is unlinked (null)
      const doc = await Document.findOne({ filename: 'linked_doc.pdf' });
      expect(doc).toBeDefined();
      expect(doc.knowledgeSourceId).toBeNull();
    });
  });
});
