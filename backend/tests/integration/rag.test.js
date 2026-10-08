const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const Role = require('../../src/models/Role');
const Permission = require('../../src/models/Permission');
const aiServiceClient = require('../../src/services/aiServiceClient');
const { generateAccessToken } = require('../../src/utils/token');
const { hashPassword } = require('../../src/utils/password');

describe('Module 11 Phase 2: RAG Backend Routes Integration Tests', () => {
  let mongoServer;
  let companyA;
  let companyAdminRole, employeeRole, unauthorizedRole;
  let companyAdminUser, employeeUser, unauthorizedUser;
  let companyAdminToken, employeeToken, unauthorizedToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});

    // 1. Seed Permissions
    const permChatUse = await Permission.create({
      module: 'chat',
      action: 'use',
      code: 'chat:use',
      displayName: 'Use AI chat',
      description: 'Access the AI chat interface',
    });

    const permDocRead = await Permission.create({
      module: 'documents',
      action: 'read',
      code: 'documents:read',
      displayName: 'View documents',
      description: 'View authorized documents',
    });

    // 2. Seed Company
    companyA = await Company.create({
      name: 'Quantum Industrial Corp',
      slug: 'quantum-industrial',
      companyCode: 'QUANT',
      email: 'admin@quantum.com',
      status: 'active',
    });

    // 3. Seed Roles
    companyAdminRole = await Role.create({
      name: 'Company Admin',
      description: 'Tenant administrator',
      companyId: null,
      permissionIds: [permChatUse._id, permDocRead._id],
    });

    employeeRole = await Role.create({
      name: 'Employee',
      description: 'Standard employee',
      companyId: null,
      permissionIds: [permChatUse._id, permDocRead._id],
    });

    unauthorizedRole = await Role.create({
      name: 'Restricted User',
      description: 'Role with no chat permission',
      companyId: null,
      permissionIds: [permDocRead._id],
    });

    // 4. Seed Users
    const passwordHash = await hashPassword('Password123!');

    companyAdminUser = await User.create({
      name: 'Admin Quantum',
      email: 'admin@quantum.com',
      passwordHash,
      roleId: companyAdminRole._id,
      companyId: companyA._id,
      status: 'active',
    });

    employeeUser = await User.create({
      name: 'Employee Jane',
      email: 'jane@quantum.com',
      passwordHash,
      roleId: employeeRole._id,
      companyId: companyA._id,
      status: 'active',
    });

    unauthorizedUser = await User.create({
      name: 'Restricted Bob',
      email: 'bob@quantum.com',
      passwordHash,
      roleId: unauthorizedRole._id,
      companyId: companyA._id,
      status: 'active',
    });

    // 5. Auth Tokens
    companyAdminToken = generateAccessToken({ id: companyAdminUser._id.toString() });
    employeeToken = generateAccessToken({ id: employeeUser._id.toString() });
    unauthorizedToken = generateAccessToken({ id: unauthorizedUser._id.toString() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/rag/query', () => {
    it('should successfully execute a RAG query and return structured data', async () => {
      jest.spyOn(aiServiceClient, 'queryRAG').mockResolvedValueOnce({
        query: 'What is boiler pressure limit?',
        answer: 'Boiler pressure must not exceed 150 PSI.',
        sources: [
          {
            documentId: 'doc_123',
            source: 'boiler_safety.pdf',
            snippet: 'Boiler pressure must not exceed 150 PSI during operation.',
            similarity: 0.94,
            page: 3,
            classification: 'internal',
          },
        ],
        grounded: true,
        retrieved_count: 1,
        duration_ms: 110.5,
        llm_provider: 'deterministic-grounding-engine',
      });

      const res = await request(app)
        .post('/api/v1/rag/query')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .send({
          query: 'What is boiler pressure limit?',
          top_k: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('150 PSI');
      expect(res.body.data.grounded).toBe(true);
      expect(res.body.data.companyId).toBe(companyA._id.toString());
      expect(res.body.data.sources).toHaveLength(1);
      expect(res.body.data.sources[0].source).toBe('boiler_safety.pdf');
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/rag/query')
        .send({ query: 'Hello' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject user without chat:use permission with 403 INSUFFICIENT_PERMISSIONS', async () => {
      const res = await request(app)
        .post('/api/v1/rag/query')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ query: 'Hello' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject empty or missing query with 400', async () => {
      const res = await request(app)
        .post('/api/v1/rag/query')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .send({ query: '   ' });

      expect(res.status).toBe(400);
    });

    it('should reject forged client-supplied companyId with 403 TENANT_MISMATCH', async () => {
      const res = await request(app)
        .post('/api/v1/rag/query')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .send({
          query: 'Valid search query',
          companyId: '507f1f77bcf86cd799439011',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });
  });

  describe('POST /api/v1/rag/chat', () => {
    it('should successfully execute a conversational chat RAG query', async () => {
      jest.spyOn(aiServiceClient, 'chatRAG').mockResolvedValueOnce({
        query: 'How about pressure threshold?',
        answer: 'The pressure threshold is 120 bar.',
        sources: [],
        grounded: true,
        retrieved_count: 1,
        duration_ms: 95.0,
      });

      const res = await request(app)
        .post('/api/v1/rag/chat')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          query: 'How about pressure threshold?',
          chat_history: [
            { role: 'user', content: 'What is the temperature limit?' },
            { role: 'assistant', content: 'The temperature limit is 300C.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toBe('The pressure threshold is 120 bar.');
      expect(res.body.data.grounded).toBe(true);
    });

    it('should reject chat history with more than 10 messages with 400', async () => {
      const longHistory = Array.from({ length: 11 }, (_, i) => ({
        role: 'user',
        content: `Question ${i}`,
      }));

      const res = await request(app)
        .post('/api/v1/rag/chat')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          query: 'Next question',
          chat_history: longHistory,
        });

      expect(res.status).toBe(400);
    });
  });
});
