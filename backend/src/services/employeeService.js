const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const UserRepository = require('../repositories/UserRepository');
const RefreshTokenRepository = require('../repositories/RefreshTokenRepository');
const Role = require('../models/Role');
const Department = require('../models/Department');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const logger = require('../utils/logger');

class EmployeeService {
  /**
   * List employees belonging to the verified tenant scope with search, filters, and pagination.
   */
  async listEmployees(scope = {}, queryOptions = {}) {
    const result = await UserRepository.findEmployeesByCompany(scope, queryOptions);
    const sanitizedItems = result.items.map((emp) => this._sanitizeEmployee(emp));
    return {
      items: sanitizedItems,
      pagination: result.pagination,
    };
  }

  /**
   * Get employee details by ID within trusted scope.
   */
  async getEmployeeById(employeeId, scope = {}) {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new AppError(400, 'Invalid employee ID format', true, errorCodes.VALIDATION_ERROR);
    }

    const employee = await UserRepository.findEmployeeById(employeeId, scope);
    if (!employee) {
      throw new AppError(404, 'Employee not found', true, errorCodes.NOT_FOUND);
    }

    return this._sanitizeEmployee(employee);
  }

  /**
   * Create and provision a new employee within the company.
   */
  async createEmployee(data, scope = {}, creatorUser = null) {
    const targetCompanyId = scope.companyId || (creatorUser && creatorUser.companyId);
    if (!targetCompanyId) {
      throw new AppError(
        400,
        'Company scope required to provision employee',
        true,
        errorCodes.TENANT_MISMATCH
      );
    }

    const email = data.email.toLowerCase().trim();

    // 1. Verify email uniqueness within tenant
    const existing = await UserRepository.findByEmailAndCompany(email, targetCompanyId);
    if (existing) {
      throw new AppError(
        409,
        `An employee with email '${email}' already exists in this company`,
        true,
        errorCodes.CONFLICT
      );
    }

    // 2. Validate Role & Cross-Tenant Integrity
    const role = await Role.findById(data.roleId).lean();
    if (!role) {
      throw new AppError(404, 'Specified role not found', true, errorCodes.NOT_FOUND);
    }
    if (role.companyId && String(role.companyId) !== String(targetCompanyId)) {
      throw new AppError(
        403,
        'Cross-tenant assignment forbidden: role belongs to another company',
        true,
        errorCodes.FORBIDDEN
      );
    }

    // 3. Validate Department & Cross-Tenant Integrity (if assigned)
    if (data.departmentId) {
      const department = await Department.findById(data.departmentId).lean();
      if (!department) {
        throw new AppError(404, 'Specified department not found', true, errorCodes.NOT_FOUND);
      }
      if (String(department.companyId) !== String(targetCompanyId)) {
        throw new AppError(
          403,
          'Cross-tenant assignment forbidden: department belongs to another company',
          true,
          errorCodes.FORBIDDEN
        );
      }
    }

    // 4. Hash initial employee password
    const rawPassword = data.password || 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const employeePayload = {
      name: data.name.trim(),
      email,
      passwordHash,
      companyId: targetCompanyId,
      departmentId: data.departmentId || null,
      roleId: data.roleId,
      employeeId: data.employeeId ? data.employeeId.trim() : null,
      status: data.status || 'active',
    };

    const newEmployee = await UserRepository.createEmployee(employeePayload, { companyId: targetCompanyId });
    logger.info(`Employee created: ${newEmployee.email} [Company: ${targetCompanyId}]`);

    return this._sanitizeEmployee(newEmployee);
  }

  /**
   * Update an existing employee profile, role, or department.
   */
  async updateEmployee(employeeId, updateData, scope = {}) {
    const existing = await this.getEmployeeById(employeeId, scope);
    const targetCompanyId = existing.company?.id || scope.companyId;

    const fieldsToUpdate = {};

    if (updateData.name !== undefined) {
      fieldsToUpdate.name = updateData.name.trim();
    }

    if (updateData.employeeId !== undefined) {
      fieldsToUpdate.employeeId = updateData.employeeId ? updateData.employeeId.trim() : null;
    }

    if (updateData.status !== undefined) {
      fieldsToUpdate.status = updateData.status;
      if (updateData.status === 'inactive') {
        // Invalidate active refresh tokens on deactivation
        await RefreshTokenRepository.revokeAllUserTokens(employeeId);
      }
    }

    // Email update & uniqueness verification
    if (updateData.email !== undefined) {
      const cleanEmail = updateData.email.toLowerCase().trim();
      if (cleanEmail !== existing.email) {
        const emailExists = await UserRepository.findByEmailAndCompany(cleanEmail, targetCompanyId);
        if (emailExists && String(emailExists._id) !== String(employeeId)) {
          throw new AppError(
            409,
            `An employee with email '${cleanEmail}' already exists in this company`,
            true,
            errorCodes.CONFLICT
          );
        }
        fieldsToUpdate.email = cleanEmail;
      }
    }

    // Role update & cross-tenant validation
    if (updateData.roleId !== undefined) {
      const role = await Role.findById(updateData.roleId).lean();
      if (!role) {
        throw new AppError(404, 'Specified role not found', true, errorCodes.NOT_FOUND);
      }
      if (role.companyId && String(role.companyId) !== String(targetCompanyId)) {
        throw new AppError(
          403,
          'Cross-tenant assignment forbidden: role belongs to another company',
          true,
          errorCodes.FORBIDDEN
        );
      }
      fieldsToUpdate.roleId = updateData.roleId;
    }

    // Department update & cross-tenant validation
    if (updateData.departmentId !== undefined) {
      if (updateData.departmentId === null || updateData.departmentId === '') {
        fieldsToUpdate.departmentId = null;
      } else {
        const department = await Department.findById(updateData.departmentId).lean();
        if (!department) {
          throw new AppError(404, 'Specified department not found', true, errorCodes.NOT_FOUND);
        }
        if (String(department.companyId) !== String(targetCompanyId)) {
          throw new AppError(
            403,
            'Cross-tenant assignment forbidden: department belongs to another company',
            true,
            errorCodes.FORBIDDEN
          );
        }
        fieldsToUpdate.departmentId = updateData.departmentId;
      }
    }

    const updated = await UserRepository.updateEmployee(employeeId, fieldsToUpdate, scope);
    logger.info(`Employee updated: ${employeeId} [Company: ${targetCompanyId}]`);
    return this._sanitizeEmployee(updated);
  }

  /**
   * Activate employee account.
   */
  async activateEmployee(employeeId, scope = {}) {
    await this.getEmployeeById(employeeId, scope);
    const updated = await UserRepository.activateEmployee(employeeId, scope);
    logger.info(`Employee activated: ${employeeId}`);
    return this._sanitizeEmployee(updated);
  }

  /**
   * Deactivate employee account and invalidate active sessions.
   */
  async deactivateEmployee(employeeId, scope = {}) {
    await this.getEmployeeById(employeeId, scope);
    const updated = await UserRepository.deactivateEmployee(employeeId, scope);
    await RefreshTokenRepository.revokeAllUserTokens(employeeId);
    logger.info(`Employee deactivated and tokens revoked: ${employeeId}`);
    return this._sanitizeEmployee(updated);
  }

  /**
   * Delete an employee record.
   */
  async deleteEmployee(employeeId, scope = {}) {
    await this.getEmployeeById(employeeId, scope);
    await RefreshTokenRepository.revokeAllUserTokens(employeeId);
    await UserRepository.deleteEmployee(employeeId, scope);
    logger.info(`Employee deleted: ${employeeId}`);
    return { id: employeeId, deleted: true };
  }

  /**
   * Get employee overview metric counts.
   */
  async getEmployeeStats(scope = {}) {
    const [total, active, inactive] = await Promise.all([
      UserRepository.countEmployees(scope),
      UserRepository.countEmployees({ ...scope, status: 'active' }),
      UserRepository.countEmployees({ ...scope, status: 'inactive' }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  /**
   * Sanitize employee data to never expose password hashes or sensitive security internals.
   */
  _sanitizeEmployee(emp) {
    if (!emp) return null;

    let permissions = [];
    if (emp.roleId && Array.isArray(emp.roleId.permissionIds)) {
      permissions = emp.roleId.permissionIds.map((p) => (typeof p === 'object' ? p.code || p.name : p)).filter(Boolean);
    }

    return {
      id: emp._id ? emp._id.toString() : emp.id,
      name: emp.name,
      email: emp.email,
      employeeId: emp.employeeId || null,
      status: emp.status,
      profilePicture: emp.profilePicture || '',
      company: emp.companyId
        ? {
            id: emp.companyId._id ? emp.companyId._id.toString() : emp.companyId.toString(),
            name: emp.companyId.name || '',
            slug: emp.companyId.slug || '',
            companyCode: emp.companyId.companyCode || '',
          }
        : null,
      department: emp.departmentId
        ? {
            id: emp.departmentId._id ? emp.departmentId._id.toString() : emp.departmentId.toString(),
            name: emp.departmentId.name || '',
            description: emp.departmentId.description || '',
          }
        : null,
      role: emp.roleId
        ? {
            id: emp.roleId._id ? emp.roleId._id.toString() : emp.roleId.toString(),
            name: emp.roleId.name || '',
            description: emp.roleId.description || '',
            permissions,
          }
        : null,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    };
  }
}

module.exports = new EmployeeService();
