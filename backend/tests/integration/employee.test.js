const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const Department = require('../../src/models/Department');
const Role = require('../../src/models/Role');
const Permission = require('../../src/models/Permission');
const { generateAccessToken } = require('../../src/utils/token');
const { hashPassword } = require('../../src/utils/password');

describe('Module 8: Employee Management Integration Tests', () => {
  let mongoServer;
  let companyA, companyB;
  let deptA, deptB;
  let superAdminRole, companyAdminRole, employeeRole, customRoleB;
  let superAdminUser, companyAdminA, companyAdminB, employeeUserA;
  let superAdminToken, companyAdminAToken, companyAdminBToken, employeeUserAToken;
  let permRead, permCreate, permUpdate, permDelete, permManage;

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
    // Clear collections
    await User.deleteMany({});
    await Company.deleteMany({});
    await Department.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});

    // 1. Seed Permissions
    permRead = await Permission.create({
      module: 'employees',
      action: 'read',
      code: 'employees:read',
      name: 'employees:read',
      displayName: 'View employees',
      description: 'View employee records',
    });
    permCreate = await Permission.create({
      module: 'employees',
      action: 'create',
      code: 'employees:create',
      name: 'employees:create',
      displayName: 'Create employees',
      description: 'Create new employees',
    });
    permUpdate = await Permission.create({
      module: 'employees',
      action: 'update',
      code: 'employees:update',
      name: 'employees:update',
      displayName: 'Update employees',
      description: 'Update employee details',
    });
    permDelete = await Permission.create({
      module: 'employees',
      action: 'delete',
      code: 'employees:delete',
      name: 'employees:delete',
      displayName: 'Delete employees',
      description: 'Delete employee records',
    });
    permManage = await Permission.create({
      module: 'employees',
      action: 'manage',
      code: 'employees:manage',
      name: 'employees:manage',
      displayName: 'Manage employees',
      description: 'Manage all employee operations',
    });

    const docReadPerm = await Permission.create({
      module: 'documents',
      action: 'read',
      code: 'documents:read',
      name: 'documents:read',
      displayName: 'Read documents',
      description: 'Read docs',
    });

    // 2. Seed Roles
    superAdminRole = await Role.create({
      companyId: null,
      name: 'Super Admin',
      description: 'Global Admin',
      permissionIds: [permRead._id, permCreate._id, permUpdate._id, permDelete._id, permManage._id],
      status: 'active',
    });

    companyAdminRole = await Role.create({
      companyId: null,
      name: 'Company Admin',
      description: 'Tenant Admin',
      permissionIds: [permRead._id, permCreate._id, permUpdate._id, permDelete._id, permManage._id],
      status: 'active',
    });

    employeeRole = await Role.create({
      companyId: null,
      name: 'Employee',
      description: 'Standard Employee',
      permissionIds: [docReadPerm._id], // No employee management permissions
      status: 'active',
    });

    // 3. Seed Companies
    companyA = await Company.create({
      name: 'Company Alpha',
      slug: 'company-alpha',
      companyCode: 'ALPHA',
      email: 'info@alpha.com',
      status: 'active',
    });

    companyB = await Company.create({
      name: 'Company Beta',
      slug: 'company-beta',
      companyCode: 'BETA',
      email: 'info@beta.com',
      status: 'active',
    });

    // Custom role belonging strictly to Company B
    customRoleB = await Role.create({
      companyId: companyB._id,
      name: 'Beta Custom Specialist',
      description: 'Role exclusive to Company B',
      permissionIds: [permRead._id],
      status: 'active',
    });

    // 4. Seed Departments
    deptA = await Department.create({
      name: 'Engineering',
      companyId: companyA._id,
      createdBy: new mongoose.Types.ObjectId(),
      status: 'active',
    });

    deptB = await Department.create({
      name: 'Marketing',
      companyId: companyB._id,
      createdBy: new mongoose.Types.ObjectId(),
      status: 'active',
    });

    const pwdHash = await hashPassword('Password123!');

    // 5. Seed Users
    superAdminUser = await User.create({
      companyId: null,
      roleId: superAdminRole._id,
      name: 'Root Super Admin',
      email: 'superadmin@platform.com',
      passwordHash: pwdHash,
      status: 'active',
    });

    companyAdminA = await User.create({
      companyId: companyA._id,
      roleId: companyAdminRole._id,
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      passwordHash: pwdHash,
      status: 'active',
    });

    companyAdminB = await User.create({
      companyId: companyB._id,
      roleId: companyAdminRole._id,
      name: 'Admin Beta',
      email: 'admin@beta.com',
      passwordHash: pwdHash,
      status: 'active',
    });

    employeeUserA = await User.create({
      companyId: companyA._id,
      departmentId: deptA._id,
      roleId: employeeRole._id,
      employeeId: 'EMP-A-001',
      name: 'Engineer Alpha',
      email: 'engineer@alpha.com',
      passwordHash: pwdHash,
      status: 'active',
    });

    // 6. Generate Tokens
    superAdminToken = generateAccessToken({
      id: superAdminUser._id.toString(),
      companyId: null,
      role: 'Super Admin',
      permissions: ['*'],
    });

    companyAdminAToken = generateAccessToken({
      id: companyAdminA._id.toString(),
      companyId: companyA._id.toString(),
      role: 'Company Admin',
      permissions: ['employees:read', 'employees:create', 'employees:update', 'employees:delete', 'employees:manage'],
    });

    companyAdminBToken = generateAccessToken({
      id: companyAdminB._id.toString(),
      companyId: companyB._id.toString(),
      role: 'Company Admin',
      permissions: ['employees:read', 'employees:create', 'employees:update', 'employees:delete', 'employees:manage'],
    });

    employeeUserAToken = generateAccessToken({
      id: employeeUserA._id.toString(),
      companyId: companyA._id.toString(),
      role: 'Employee',
      permissions: ['documents:read'],
    });
  });

  // ── 1. CRUD Operations ──
  describe('1. Employee CRUD Lifecycle', () => {
    it('should allow Company Admin to create a new employee in their company', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'John Developer',
          email: 'john@alpha.com',
          employeeId: 'EMP-A-002',
          roleId: employeeRole._id.toString(),
          departmentId: deptA._id.toString(),
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('John Developer');
      expect(res.body.data.email).toBe('john@alpha.com');
      expect(res.body.data.company.id).toBe(companyA._id.toString());
      expect(res.body.data.department.name).toBe('Engineering');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should allow retrieving employee by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${employeeUserA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('engineer@alpha.com');
      expect(res.body.data.employeeId).toBe('EMP-A-001');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should list employees with search, filtering, and pagination', async () => {
      // Create additional employee
      await User.create({
        companyId: companyA._id,
        roleId: employeeRole._id,
        employeeId: 'EMP-A-003',
        name: 'Sarah Tester',
        email: 'sarah@alpha.com',
        passwordHash: 'hash',
        status: 'active',
      });

      const res = await request(app)
        .get('/api/v1/employees?search=sarah&page=1&limit=10')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].email).toBe('sarah@alpha.com');
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should update employee details', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${employeeUserA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Engineer Alpha Senior',
          employeeId: 'EMP-A-001-SR',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Engineer Alpha Senior');
      expect(res.body.data.employeeId).toBe('EMP-A-001-SR');
    });

    it('should deactivate and reactivate an employee', async () => {
      // Deactivate
      const deactRes = await request(app)
        .patch(`/api/v1/employees/${employeeUserA._id}/deactivate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.status).toBe('inactive');

      // Reactivate
      const actRes = await request(app)
        .patch(`/api/v1/employees/${employeeUserA._id}/activate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(actRes.status).toBe(200);
      expect(actRes.body.data.status).toBe('active');
    });

    it('should delete employee record from company', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/employees/${employeeUserA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.deleted).toBe(true);

      const checkRes = await request(app)
        .get(`/api/v1/employees/${employeeUserA._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(checkRes.status).toBe(404);
    });
  });

  // ── 2. RBAC & Permission Enforcement ──
  describe('2. RBAC & Authorization Enforcement', () => {
    it('should deny employee without employees:read permission -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeUserAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny employee attempting to create employee -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeUserAToken}`)
        .send({
          name: 'Unauthorized User',
          email: 'unauth@alpha.com',
          roleId: employeeRole._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow Super Admin to access and manage employee endpoints', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?companyId=${companyA._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request without token -> 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/employees');
      expect(res.status).toBe(401);
    });

    it('should reject invalid or tampered token -> 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
    });
  });

  // ── 3. Strict Tenant Isolation & Anti-Tampering ──
  describe('3. Strict Tenant Isolation & Anti-Tampering', () => {
    it('should prevent Company Admin A from viewing employees of Company B -> 404 Not Found', async () => {
      const empBeta = await User.create({
        companyId: companyB._id,
        roleId: employeeRole._id,
        name: 'Beta Worker',
        email: 'worker@beta.com',
        passwordHash: 'hash',
        status: 'active',
      });

      const res = await request(app)
        .get(`/api/v1/employees/${empBeta._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent Company Admin A from modifying employees of Company B -> 404 Not Found', async () => {
      const empBeta = await User.create({
        companyId: companyB._id,
        roleId: employeeRole._id,
        name: 'Beta Worker',
        email: 'worker@beta.com',
        passwordHash: 'hash',
        status: 'active',
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${empBeta._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });

    it('should reject non-Super-Admin attempting to spoof companyId in body -> 403 TENANT_MISMATCH', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          companyId: companyB._id.toString(), // Forged Company B ID
          name: 'Spoofed Employee',
          email: 'spoofed@beta.com',
          roleId: employeeRole._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('TENANT_MISMATCH');
    });

    it('should reject non-Super-Admin attempting to spoof companyId in query -> 403 TENANT_MISMATCH', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?companyId=${companyB._id}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('TENANT_MISMATCH');
    });

    it('should reject non-Super-Admin attempting to spoof companyId in headers -> 403 TENANT_MISMATCH', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyB._id.toString());

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('TENANT_MISMATCH');
    });
  });

  // ── 4. Cross-Tenant Role & Department Integrity ──
  describe('4. Cross-Tenant Entity Integrity', () => {
    it('should reject assigning a Company B custom role to a Company A employee -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Cross Role Employee',
          email: 'crossrole@alpha.com',
          roleId: customRoleB._id.toString(), // Custom role strictly belonging to Beta
        });

      expect(res.status).toBe(403);
    });

    it('should reject assigning a Company B department to a Company A employee -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Cross Dept Employee',
          email: 'crossdept@alpha.com',
          roleId: employeeRole._id.toString(),
          departmentId: deptB._id.toString(), // Department strictly belonging to Beta
        });

      expect(res.status).toBe(403);
    });
  });

  // ── 5. Status & Authentication Integration ──
  describe('5. Status & Module 5 Authentication Integration', () => {
    it('should block deactivated employee from logging in -> 401 Unauthorized', async () => {
      // 1. Create active employee with known password
      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          name: 'Test Auth Employee',
          email: 'testauth@alpha.com',
          roleId: employeeRole._id.toString(),
          password: 'EmployeePassword123!',
        });
      expect(createRes.status).toBe(201);
      const empId = createRes.body.data.id;

      // 2. Successful login when active
      const loginResActive = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testauth@alpha.com',
          password: 'EmployeePassword123!',
          companySlug: 'company-alpha',
        });
      expect(loginResActive.status).toBe(200);

      // 3. Deactivate employee
      const deactRes = await request(app)
        .patch(`/api/v1/employees/${empId}/deactivate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);
      expect(deactRes.status).toBe(200);

      // 4. Attempt login when deactivated -> rejected with 401
      const loginResDeactivated = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testauth@alpha.com',
          password: 'EmployeePassword123!',
          companySlug: 'company-alpha',
        });
      expect(loginResDeactivated.status).toBe(401);

      // 5. Reactivate employee
      const actRes = await request(app)
        .patch(`/api/v1/employees/${empId}/activate`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);
      expect(actRes.status).toBe(200);

      // 6. Login succeeds again
      const loginResReactivated = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testauth@alpha.com',
          password: 'EmployeePassword123!',
          companySlug: 'company-alpha',
        });
      expect(loginResReactivated.status).toBe(200);
    });
  });
});
