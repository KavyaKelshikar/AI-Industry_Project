const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const EmployeeService = require('../../src/services/employeeService');
const UserRepository = require('../../src/repositories/UserRepository');
const RefreshTokenRepository = require('../../src/repositories/RefreshTokenRepository');
const Role = require('../../src/models/Role');
const Department = require('../../src/models/Department');

jest.mock('../../src/repositories/UserRepository');
jest.mock('../../src/repositories/RefreshTokenRepository');
jest.mock('../../src/models/Role');
jest.mock('../../src/models/Department');
jest.mock('../../src/utils/logger');

describe('Module 8: Employee Service Unit Tests', () => {
  const companyAId = new mongoose.Types.ObjectId().toString();
  const companyBId = new mongoose.Types.ObjectId().toString();
  const employeeId = new mongoose.Types.ObjectId().toString();
  const roleIdA = new mongoose.Types.ObjectId().toString();
  const deptIdA = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Employee Creation & Cross-Tenant Validation', () => {
    it('should create employee successfully with hashed password and scoped company', async () => {
      UserRepository.findByEmailAndCompany.mockResolvedValue(null);
      Role.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: roleIdA, companyId: companyAId, name: 'Employee' }),
      });
      Department.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: deptIdA, companyId: companyAId, name: 'Engineering' }),
      });

      const createdDoc = {
        _id: employeeId,
        name: 'Jane Doe',
        email: 'jane@company-a.com',
        companyId: { _id: companyAId, name: 'Company A' },
        departmentId: { _id: deptIdA, name: 'Engineering' },
        roleId: { _id: roleIdA, name: 'Employee', permissionIds: ['documents:read'] },
        status: 'active',
      };

      UserRepository.createEmployee.mockResolvedValue(createdDoc);

      const result = await EmployeeService.createEmployee(
        {
          name: 'Jane Doe',
          email: 'jane@company-a.com',
          roleId: roleIdA,
          departmentId: deptIdA,
          password: 'CustomPassword123!',
        },
        { companyId: companyAId }
      );

      expect(UserRepository.findByEmailAndCompany).toHaveBeenCalledWith('jane@company-a.com', companyAId);
      expect(UserRepository.createEmployee).toHaveBeenCalled();
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@company-a.com');
      expect(result.passwordHash).toBeUndefined();
    });

    it('should reject duplicate email within the same company tenant', async () => {
      UserRepository.findByEmailAndCompany.mockResolvedValue({ _id: 'existing-id', email: 'duplicate@company-a.com' });

      await expect(
        EmployeeService.createEmployee(
          {
            name: 'Duplicate User',
            email: 'duplicate@company-a.com',
            roleId: roleIdA,
          },
          { companyId: companyAId }
        )
      ).rejects.toThrow(/already exists/i);
    });

    it('should reject cross-tenant role assignment', async () => {
      UserRepository.findByEmailAndCompany.mockResolvedValue(null);
      Role.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: roleIdA, companyId: companyBId, name: 'Company B Custom Role' }),
      });

      await expect(
        EmployeeService.createEmployee(
          {
            name: 'Cross Tenant',
            email: 'cross@company-a.com',
            roleId: roleIdA,
          },
          { companyId: companyAId }
        )
      ).rejects.toThrow(/role belongs to another company/i);
    });

    it('should reject cross-tenant department assignment', async () => {
      UserRepository.findByEmailAndCompany.mockResolvedValue(null);
      Role.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: roleIdA, companyId: companyAId, name: 'Employee' }),
      });
      Department.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: deptIdA, companyId: companyBId, name: 'Company B Dept' }),
      });

      await expect(
        EmployeeService.createEmployee(
          {
            name: 'Cross Dept',
            email: 'crossdept@company-a.com',
            roleId: roleIdA,
            departmentId: deptIdA,
          },
          { companyId: companyAId }
        )
      ).rejects.toThrow(/department belongs to another company/i);
    });
  });

  describe('2. Employee Updates & Deactivation', () => {
    it('should update employee profile successfully within tenant scope', async () => {
      UserRepository.findEmployeeById.mockResolvedValue({
        _id: employeeId,
        name: 'Jane Doe',
        email: 'jane@company-a.com',
        companyId: { _id: companyAId, name: 'Company A' },
      });

      UserRepository.updateEmployee.mockResolvedValue({
        _id: employeeId,
        name: 'Jane Updated',
        email: 'jane@company-a.com',
        companyId: { _id: companyAId, name: 'Company A' },
      });

      const updated = await EmployeeService.updateEmployee(
        employeeId,
        { name: 'Jane Updated' },
        { companyId: companyAId }
      );

      expect(UserRepository.updateEmployee).toHaveBeenCalledWith(
        employeeId,
        { name: 'Jane Updated' },
        { companyId: companyAId }
      );
      expect(updated.name).toBe('Jane Updated');
    });

    it('should deactivate employee and revoke active refresh tokens', async () => {
      UserRepository.findEmployeeById.mockResolvedValue({
        _id: employeeId,
        name: 'Jane Doe',
        email: 'jane@company-a.com',
        status: 'active',
        companyId: { _id: companyAId },
      });

      UserRepository.deactivateEmployee.mockResolvedValue({
        _id: employeeId,
        name: 'Jane Doe',
        email: 'jane@company-a.com',
        status: 'inactive',
        companyId: { _id: companyAId },
      });

      RefreshTokenRepository.revokeAllUserTokens.mockResolvedValue({ acknowledged: true });

      const deactivated = await EmployeeService.deactivateEmployee(employeeId, { companyId: companyAId });

      expect(UserRepository.deactivateEmployee).toHaveBeenCalledWith(employeeId, { companyId: companyAId });
      expect(RefreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith(employeeId);
      expect(deactivated.status).toBe('inactive');
    });

    it('should delete employee and revoke refresh tokens', async () => {
      UserRepository.findEmployeeById.mockResolvedValue({
        _id: employeeId,
        name: 'Jane Doe',
        companyId: { _id: companyAId },
      });

      UserRepository.deleteEmployee.mockResolvedValue({ _id: employeeId });
      RefreshTokenRepository.revokeAllUserTokens.mockResolvedValue({ acknowledged: true });

      const result = await EmployeeService.deleteEmployee(employeeId, { companyId: companyAId });

      expect(RefreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith(employeeId);
      expect(UserRepository.deleteEmployee).toHaveBeenCalledWith(employeeId, { companyId: companyAId });
      expect(result.deleted).toBe(true);
    });
  });

  describe('3. Employee Retrieval & Listing', () => {
    it('should list employees with pagination and safe formatting', async () => {
      UserRepository.findEmployeesByCompany.mockResolvedValue({
        items: [
          {
            _id: employeeId,
            name: 'Alice Admin',
            email: 'alice@company-a.com',
            status: 'active',
            roleId: { name: 'Company Admin', permissionIds: ['employees:*'] },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const result = await EmployeeService.listEmployees({ companyId: companyAId }, { page: 1, limit: 20 });

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('Alice Admin');
      expect(result.pagination.total).toBe(1);
    });
  });
});
