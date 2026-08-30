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
const aiServiceClient = require('../../src/services/aiServiceClient');
const { generateAccessToken } = require('../../src/utils/token');
const { hashPassword } = require('../../src/utils/password');

describe('Module 10: Document Ingestion & AI Vector Pipeline Integration Tests', () => {
  let mongoServer;
  let companyA, companyB;
  let superAdminRole, companyAdminRole, employeeRole;
  let superAdminUser, companyAdminA, companyAdminB, employeeUserA;
  let superAdminToken, companyAdminAToken, companyAdminBToken, employeeUserAToken;
  let testFolderA, testFolderB;
  let sourceA, sourceB;
  let docA1, docA2, docB1;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    testFolderA = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-int-test-a-'));
    testFolderB = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-int-test-b-'));

    // Create real files in temp directories
    fs.writeFileSync(path.join(testFolderA, 'safety.txt'), 'Plant Safety Policy 2026: Wear protective gear.');
    fs.writeFileSync(path.join(testFolderA, 'manual.pdf'), 'Dummy PDF manual content.');
    fs.writeFileSync(path.join(testFolderB, 'finance.txt'), 'Confidential Beta Financial Report.');
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
    const permDocRead = await Permission.create({
      module: 'documents',
      action: 'read',
      code: 'documents:read',
      displayName: 'View documents',
      description: 'View authorized documents',
    });
    const permDocUpload = await Permission.create({
      module: 'documents',
      action: 'upload',
      code: 'documents:upload',
      displayName: 'Upload documents',
      description: 'Upload new documents',
    });
    const permDocProcess = await Permission.create({
      module: 'documents',
      action: 'process',
      code: 'documents:process',
      displayName: 'Process documents',
      description: 'Process documents through AI vector pipeline',
    });
    const permDocDelete = await Permission.create({
      module: 'documents',
      action: 'delete',
      code: 'documents:delete',
      displayName: 'Delete documents',
      description: 'Delete documents and embeddings',
    });
    const permDocManage = await Permission.create({
      module: 'documents',
      action: 'manage',
      code: 'documents:manage',
      displayName: 'Manage documents',
      description: 'Full document management',
    });

    // 2. Seed Companies
    companyA = await Company.create({
      name: 'Alpha Energy Corp',
      slug: 'alpha-energy',
      companyCode: 'ALPHA',
      email: 'contact@alpha.com',
      status: 'active',
    });
    companyB = await Company.create({
      name: 'Beta Mining Global',
      slug: 'beta-mining',
      companyCode: 'BETAG',
      email: 'contact@beta.com',
      status: 'active',
    });

    // 3. Seed Roles
    superAdminRole = await Role.create({
      name: 'Super Admin',
      description: 'Global administrator',
      companyId: null,
      permissionIds: [permDocRead._id, permDocUpload._id, permDocProcess._id, permDocDelete._id, permDocManage._id],
    });

    companyAdminRole = await Role.create({
      name: 'Company Admin',
      description: 'Tenant administrator',
      companyId: null,
      permissionIds: [permDocRead._id, permDocUpload._id, permDocProcess._id, permDocDelete._id, permDocManage._id],
    });

    employeeRole = await Role.create({
      name: 'Employee',
      description: 'Standard employee',
      companyId: null,
      permissionIds: [permDocRead._id],
    });

    // 4. Seed Users
    const passwordHash = await hashPassword('Password123!');

    superAdminUser = await User.create({
      name: 'Super Admin',
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

    // 6. Seed Knowledge Sources
    sourceA = await KnowledgeSource.create({
      companyId: companyA._id,
      name: 'Alpha Plant Docs',
      type: 'local_folder',
      approvedPath: testFolderA,
      status: 'active',
      createdBy: companyAdminA._id,
    });

    sourceB = await KnowledgeSource.create({
      companyId: companyB._id,
      name: 'Beta Finance Docs',
      type: 'local_folder',
      approvedPath: testFolderB,
      status: 'active',
      createdBy: companyAdminB._id,
    });

    // 7. Seed Documents
    docA1 = await Document.create({
      companyId: companyA._id,
      uploadedBy: companyAdminA._id,
      filename: `ks_${sourceA._id}_safety.txt`,
      originalFilename: 'safety.txt',
      fileType: 'txt',
      fileSize: 1024,
      storagePath: path.join(testFolderA, 'safety.txt'),
      sourceType: 'local_folder',
      sourceId: sourceA._id.toString(),
      knowledgeSourceId: sourceA._id,
      sourceRelativePath: 'safety.txt',
      sourceFileHash: 'hash_safety_1',
      status: 'pending',
      indexingStatus: 'pending',
    });

    docA2 = await Document.create({
      companyId: companyA._id,
      uploadedBy: companyAdminA._id,
      filename: `ks_${sourceA._id}_manual.pdf`,
      originalFilename: 'manual.pdf',
      fileType: 'pdf',
      fileSize: 2048,
      storagePath: path.join(testFolderA, 'manual.pdf'),
      sourceType: 'local_folder',
      sourceId: sourceA._id.toString(),
      knowledgeSourceId: sourceA._id,
      sourceRelativePath: 'manual.pdf',
      sourceFileHash: 'hash_manual_1',
      status: 'pending',
      indexingStatus: 'pending',
    });

    docB1 = await Document.create({
      companyId: companyB._id,
      uploadedBy: companyAdminB._id,
      filename: `ks_${sourceB._id}_finance.txt`,
      originalFilename: 'finance.txt',
      fileType: 'txt',
      fileSize: 1024,
      storagePath: path.join(testFolderB, 'finance.txt'),
      sourceType: 'local_folder',
      sourceId: sourceB._id.toString(),
      knowledgeSourceId: sourceB._id,
      sourceRelativePath: 'finance.txt',
      sourceFileHash: 'hash_finance_1',
      status: 'pending',
      indexingStatus: 'pending',
    });
  });

  describe('1. Document Listing & Metrics', () => {
    it('should list only documents belonging to the authenticated tenant', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.map((d) => d.originalFilename)).toEqual(
        expect.arrayContaining(['safety.txt', 'manual.pdf'])
      );
      expect(res.body.data.items.map((d) => d.originalFilename)).not.toContain('finance.txt');
    });

    it('should allow Employee with read permission to list documents', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('should get aggregate document and vector metrics for tenant', async () => {
      const res = await request(app)
        .get('/api/v1/documents/stats')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.pending).toBe(2);
      expect(res.body.data.indexed).toBe(0);
    });

    it('should retrieve a single document details without leaking server storagePath', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${docA1._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalFilename).toBe('safety.txt');
      expect(res.body.data.indexingStatus).toBe('pending');
      expect(res.body.data.hasStoragePath).toBe(true);
      // Ensure raw absolute path is not leaked
      expect(res.body.data.storagePath).toBeUndefined();
    });
  });

  describe('2. Document Vector Processing Engine', () => {
    it('should successfully process a document and record chunk/vector telemetry', async () => {
      // Mock AI service ingestion response
      jest.spyOn(aiServiceClient, 'ingestDocument').mockResolvedValueOnce({
        document_id: docA1._id.toString(),
        company_id: companyA._id.toString(),
        chunks_count: 3,
        vectors_stored: 3,
        embedding_model: 'all-MiniLM-L6-v2',
        status: 'success',
        duration_ms: 120.5,
      });

      const res = await request(app)
        .post(`/api/v1/documents/${docA1._id}/process`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.indexingStatus).toBe('indexed');
      expect(res.body.data.chunksCount).toBe(3);
      expect(res.body.data.vectorsCount).toBe(3);
      expect(res.body.data.embeddingModel).toBe('all-MiniLM-L6-v2');
      expect(res.body.data.lastProcessedAt).toBeDefined();

      // Verify in DB
      const updatedDoc = await Document.findById(docA1._id);
      expect(updatedDoc.indexingStatus).toBe('indexed');
      expect(updatedDoc.chunksCount).toBe(3);
      expect(updatedDoc.vectorsCount).toBe(3);
    });

    it('should handle AI service extraction failure safely and record sanitized error', async () => {
      jest.spyOn(aiServiceClient, 'ingestDocument').mockRejectedValueOnce(
        new Error('Failed to extract text from file: unreadable format')
      );

      const res = await request(app)
        .post(`/api/v1/documents/${docA1._id}/process`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Verify DB status is 'error'
      const updatedDoc = await Document.findById(docA1._id);
      expect(updatedDoc.indexingStatus).toBe('error');
      expect(updatedDoc.processingError).toBeDefined();
    });

    it('should batch process pending documents for a specific knowledge source', async () => {
      jest.spyOn(aiServiceClient, 'ingestDocument').mockResolvedValue({
        document_id: 'doc_id',
        company_id: companyA._id.toString(),
        chunks_count: 2,
        vectors_stored: 2,
        embedding_model: 'all-MiniLM-L6-v2',
        status: 'success',
      });

      const res = await request(app)
        .post('/api/v1/documents/batch-process')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({ knowledgeSourceId: sourceA._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.processed).toBe(2);
      expect(res.body.data.failed).toBe(0);

      const allIndexed = await Document.find({ knowledgeSourceId: sourceA._id });
      expect(allIndexed.every((d) => d.indexingStatus === 'indexed')).toBe(true);
    });
  });

  describe('3. Document Deletion & Vector Purge', () => {
    it('should delete document and call vector deletion in ChromaDB', async () => {
      const deleteVectorsSpy = jest
        .spyOn(aiServiceClient, 'deleteDocumentVectors')
        .mockResolvedValueOnce({ success: true, vectors_deleted: 3 });

      const res = await request(app)
        .delete(`/api/v1/documents/${docA1._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteVectorsSpy).toHaveBeenCalledWith(companyA._id.toString(), docA1._id.toString());

      // Verify document no longer exists in DB
      const checkDoc = await Document.findById(docA1._id);
      expect(checkDoc).toBeNull();
    });
  });

  describe('4. RBAC & Cross-Tenant Security Isolation', () => {
    it('should prevent Employee from triggering document processing (403 INSUFFICIENT_PERMISSIONS)', async () => {
      const res = await request(app)
        .post(`/api/v1/documents/${docA1._id}/process`)
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent Employee from deleting a document (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${docA1._id}`)
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent Company Admin A from processing Company B document (404 / Cross-Tenant Isolation)', async () => {
      const res = await request(app)
        .post(`/api/v1/documents/${docB1._id}/process`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Company Admin A from deleting Company B document (404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${docB1._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject forged client-supplied companyId with 403 TENANT_MISMATCH', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .query({ companyId: companyB._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });
  });
});
