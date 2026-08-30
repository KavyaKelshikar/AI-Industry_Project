process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum-length';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ENABLE_AUTH_RATE_LIMIT = 'false';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { authenticate } = require('../../src/middlewares/auth');
const { enforceTenantScope } = require('../../src/middlewares/tenant');
const {
  requirePermission,
  requireRole,
  requireDepartmentAccess,
} = require('../../src/middlewares/authorize');
const errorHandler = require('../../src/middlewares/errorHandler');
const { successResponse } = require('../../src/utils/responseHelper');
const { generateAccessToken } = require('../../src/utils/token');

const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const Department = require('../../src/models/Department');
const Role = require('../../src/models/Role');
const Permission = require('../../src/models/Permission');

let mongoServer;
let testApp;

let companyA;
let companyB;
let deptA;
let deptB;
let superAdminUser;
let adminUserA;
let employeeUserA;
let inactiveUser;
let suspendedCompanyUser;

let superAdminToken;
let adminAToken;
let employeeAToken;
let inactiveUserToken;
let suspendedCompanyToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Create System Permissions
  const permDocs = await Permission.create([
    { module: 'documents', action: 'read', code: 'documents:read', displayName: 'Read Docs', description: 'Read' },
    { module: 'documents', action: 'upload', code: 'documents:upload', displayName: 'Upload Docs', description: 'Upload' },
    { module: 'documents', action: 'delete', code: 'documents:delete', displayName: 'Delete Docs', description: 'Delete' },
    { module: 'users', action: 'manage', code: 'users:manage', displayName: 'Manage Users', description: 'Users' },
  ]);
  const permMap = {};
  permDocs.forEach((p) => {
    permMap[p.code] = p._id;
  });

  // 2. Create System Roles
  const superAdminRole = await Role.create({
    name: 'Super Admin',
    description: 'Super Admin',
    companyId: null,
    permissionIds: permDocs.map((p) => p._id),
  });

  const companyAdminRole = await Role.create({
    name: 'Company Admin',
    description: 'Company Admin',
    companyId: null,
    permissionIds: [permMap['documents:read'], permMap['documents:upload'], permMap['users:manage']],
  });

  const employeeRole = await Role.create({
    name: 'Employee',
    description: 'Employee',
    companyId: null,
    permissionIds: [permMap['documents:read']],
  });

  // 3. Create Companies
  companyA = await Company.create({
    name: 'Company Alpha',
    slug: 'company-alpha',
    companyCode: 'ALPHA',
    email: 'contact@alpha.com',
    status: 'active',
  });

  companyB = await Company.create({
    name: 'Company Beta',
    slug: 'company-beta',
    companyCode: 'BETA',
    email: 'contact@beta.com',
    status: 'active',
  });

  const suspendedCompany = await Company.create({
    name: 'Company Suspended',
    slug: 'company-suspended',
    companyCode: 'SUSP',
    email: 'contact@susp.com',
    status: 'suspended',
  });

  // 4. Create Departments
  deptA = await Department.create({
    name: 'Engineering',
    companyId: companyA._id,
    createdBy: new mongoose.Types.ObjectId(),
    status: 'active',
  });

  deptB = await Department.create({
    name: 'HR',
    companyId: companyA._id,
    createdBy: new mongoose.Types.ObjectId(),
    status: 'active',
  });

  // 5. Create Users
  superAdminUser = await User.create({
    companyId: null,
    roleId: superAdminRole._id,
    name: 'Root Admin',
    email: 'root@platform.com',
    passwordHash: 'hash',
    status: 'active',
  });

  adminUserA = await User.create({
    companyId: companyA._id,
    roleId: companyAdminRole._id,
    name: 'Admin Alpha',
    email: 'admin@alpha.com',
    passwordHash: 'hash',
    status: 'active',
  });

  employeeUserA = await User.create({
    companyId: companyA._id,
    departmentId: deptA._id,
    roleId: employeeRole._id,
    name: 'Dev Alpha',
    email: 'dev@alpha.com',
    passwordHash: 'hash',
    status: 'active',
  });

  inactiveUser = await User.create({
    companyId: companyA._id,
    roleId: employeeRole._id,
    name: 'Inactive User',
    email: 'inactive@alpha.com',
    passwordHash: 'hash',
    status: 'inactive',
  });

  suspendedCompanyUser = await User.create({
    companyId: suspendedCompany._id,
    roleId: employeeRole._id,
    name: 'Suspended Tenant User',
    email: 'user@suspended.com',
    passwordHash: 'hash',
    status: 'active',
  });

  // 6. Generate Tokens
  superAdminToken = generateAccessToken({
    id: superAdminUser._id.toString(),
    companyId: null,
    roleId: superAdminRole._id.toString(),
    email: superAdminUser.email,
  });

  adminAToken = generateAccessToken({
    id: adminUserA._id.toString(),
    companyId: companyA._id.toString(),
    roleId: companyAdminRole._id.toString(),
    email: adminUserA.email,
  });

  employeeAToken = generateAccessToken({
    id: employeeUserA._id.toString(),
    companyId: companyA._id.toString(),
    roleId: employeeRole._id.toString(),
    email: employeeUserA.email,
  });

  inactiveUserToken = generateAccessToken({
    id: inactiveUser._id.toString(),
    companyId: companyA._id.toString(),
    roleId: employeeRole._id.toString(),
    email: inactiveUser.email,
  });

  suspendedCompanyToken = generateAccessToken({
    id: suspendedCompanyUser._id.toString(),
    companyId: suspendedCompany._id.toString(),
    roleId: employeeRole._id.toString(),
    email: suspendedCompanyUser.email,
  });

  // 7. Setup Express App with Authorization Pipeline
  testApp = express();
  testApp.use(express.json());

  // Test Endpoint 1: Single Permission Check (documents:read)
  testApp.get(
    '/test/documents/read',
    authenticate,
    enforceTenantScope,
    requirePermission('documents:read'),
    (req, res) => successResponse(res, { tenant: req.tenantScope }, 'Documents retrieved')
  );

  // Test Endpoint 2: Multi-Permission Check (documents:upload AND documents:read)
  testApp.post(
    '/test/documents/upload',
    authenticate,
    enforceTenantScope,
    requirePermission('documents:read', 'documents:upload'),
    (req, res) => successResponse(res, { tenant: req.tenantScope }, 'Document uploaded')
  );

  // Test Endpoint 3: Restricted Permission (documents:delete)
  testApp.delete(
    '/test/documents/delete',
    authenticate,
    enforceTenantScope,
    requirePermission('documents:delete'),
    (req, res) => successResponse(res, { tenant: req.tenantScope }, 'Document deleted')
  );

  // Test Endpoint 4: Role-Restricted Endpoint (Company Admin only)
  testApp.get(
    '/test/admin/overview',
    authenticate,
    enforceTenantScope,
    requireRole('Company Admin'),
    (req, res) => successResponse(res, { tenant: req.tenantScope }, 'Admin overview accessed')
  );

  // Test Endpoint 5: Department-Restricted Endpoint
  testApp.get(
    '/test/departments/:departmentId/data',
    authenticate,
    enforceTenantScope,
    requireDepartmentAccess('departmentId'),
    (req, res) => successResponse(res, { dept: req.params.departmentId }, 'Department data accessed')
  );

  testApp.use(errorHandler);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Module 6: Authorization & Multi-Tenancy Engine Integration', () => {
  describe('1. Permission Evaluation (requirePermission)', () => {
    it('should allow user with matching single permission (documents:read) -> 200 OK', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.companyId).toBe(companyA._id.toString());
    });

    it('should deny user lacking required permission -> 403 Forbidden (INSUFFICIENT_PERMISSIONS)', async () => {
      const res = await request(testApp)
        .delete('/test/documents/delete')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow user holding all multi-required permissions (documents:read, documents:upload) -> 200 OK', async () => {
      const res = await request(testApp)
        .post('/test/documents/upload')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny user holding only one of multiple required permissions -> 403 Forbidden', async () => {
      const res = await request(testApp)
        .post('/test/documents/upload')
        .set('Authorization', `Bearer ${employeeAToken}`); // only has read, not upload

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow Super Admin to access any permission-protected route -> 200 OK', async () => {
      const res = await request(testApp)
        .delete('/test/documents/delete')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Role Enforcement (requireRole)', () => {
    it('should allow user with matching role (Company Admin) -> 200 OK', async () => {
      const res = await request(testApp)
        .get('/test/admin/overview')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny user with non-matching role (Employee) -> 403 Forbidden (FORBIDDEN_ROLE)', async () => {
      const res = await request(testApp)
        .get('/test/admin/overview')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should allow Super Admin on role-restricted endpoints -> 200 OK', async () => {
      const res = await request(testApp)
        .get('/test/admin/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Strict Tenant Isolation & Anti-Tampering (enforceTenantScope)', () => {
    it('should bind trusted server-side tenant scope for regular tenant user', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tenant.companyId).toBe(companyA._id.toString());
    });

    it('should reject non-Super-Admin attempting to manipulate companyId in query -> 403 Forbidden (TENANT_MISMATCH)', async () => {
      const res = await request(testApp)
        .get(`/test/documents/read?companyId=${companyB._id}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
      expect(res.body.error.message).toMatch(/cross-tenant access forbidden/i);
    });

    it('should reject non-Super-Admin attempting to manipulate companyId in body -> 403 Forbidden', async () => {
      const res = await request(testApp)
        .post('/test/documents/upload')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ companyId: companyB._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });

    it('should allow Super Admin to explicitly target a company tenant', async () => {
      const res = await request(testApp)
        .get(`/test/documents/read?companyId=${companyB._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tenant.companyId).toBe(companyB._id.toString());
    });

    it('should set unscoped tenant {} for Super Admin global operations', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tenant).toEqual({});
    });
  });

  describe('4. Department-Level Scoping (requireDepartmentAccess)', () => {
    it('should allow employee to access their own department resources -> 200 OK', async () => {
      const res = await request(testApp)
        .get(`/test/departments/${deptA._id}/data`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.dept).toBe(deptA._id.toString());
    });

    it('should deny employee accessing another department resources -> 403 Forbidden (DEPARTMENT_ACCESS_DENIED)', async () => {
      const res = await request(testApp)
        .get(`/test/departments/${deptB._id}/data`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DEPARTMENT_ACCESS_DENIED');
    });

    it('should allow Company Admin to access any department within their company -> 200 OK', async () => {
      const res = await request(testApp)
        .get(`/test/departments/${deptB._id}/data`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
    });

    it('should allow Super Admin to access any department -> 200 OK', async () => {
      const res = await request(testApp)
        .get(`/test/departments/${deptB._id}/data`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('5. Authentication vs Authorization Error Semantics (401 vs 403)', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(testApp).get('/test/documents/read');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 Unauthorized when token is invalid or tampered', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 Unauthorized when user account is inactive', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', `Bearer ${inactiveUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 Unauthorized when company account is suspended', async () => {
      const res = await request(testApp)
        .get('/test/documents/read')
        .set('Authorization', `Bearer ${suspendedCompanyToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should consistently distinguish 401 (Authentication failure) from 403 (Authorization failure)', async () => {
      // 401: No token
      const res401 = await request(testApp).delete('/test/documents/delete');
      expect(res401.status).toBe(401);

      // 403: Authenticated but insufficient permission
      const res403 = await request(testApp)
        .delete('/test/documents/delete')
        .set('Authorization', `Bearer ${employeeAToken}`);
      expect(res403.status).toBe(403);
    });
  });
});
