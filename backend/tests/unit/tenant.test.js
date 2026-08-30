const {
  isSuperAdmin,
  getTenantScope,
  validateTenantOwnership,
} = require('../../src/utils/tenantHelper');

describe('Tenant Isolation & Scoping Helpers (Unit)', () => {
  const regularUser = {
    id: 'user-1',
    companyId: 'company-a',
    role: 'Employee',
    permissions: ['documents:read'],
  };

  const superAdminUser = {
    id: 'admin-1',
    companyId: null,
    role: 'Super Admin',
    permissions: ['*'],
  };

  describe('isSuperAdmin', () => {
    it('should return true for Super Admin role or null companyId with wildcard', () => {
      expect(isSuperAdmin(superAdminUser)).toBe(true);
      expect(isSuperAdmin({ role: 'Super Admin', companyId: 'some-company' })).toBe(true);
    });

    it('should return false for regular tenant users', () => {
      expect(isSuperAdmin(regularUser)).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('getTenantScope', () => {
    it('should return { companyId: user.companyId } for regular tenant user', () => {
      const scope = getTenantScope(regularUser);
      expect(scope).toEqual({ companyId: 'company-a' });
    });

    it('should allow regular user if targetCompanyId matches authenticated tenant', () => {
      const scope = getTenantScope(regularUser, 'company-a');
      expect(scope).toEqual({ companyId: 'company-a' });
    });

    it('should throw 403 TENANT_MISMATCH if regular user attempts targeting a different company', () => {
      try {
        getTenantScope(regularUser, 'company-b');
        fail('Expected getTenantScope to throw');
      } catch (err) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('TENANT_MISMATCH');
        expect(err.message).toMatch(/cross-tenant access forbidden/i);
      }
    });

    it('should return empty object {} for Super Admin when no target company is specified', () => {
      const scope = getTenantScope(superAdminUser);
      expect(scope).toEqual({});
    });

    it('should return { companyId: targetCompanyId } for Super Admin when target company is specified', () => {
      const scope = getTenantScope(superAdminUser, 'company-target');
      expect(scope).toEqual({ companyId: 'company-target' });
    });

    it('should throw 401 if reqUser is missing', () => {
      expect(() => getTenantScope(null)).toThrow(/authentication required/i);
    });
  });

  describe('validateTenantOwnership', () => {
    it('should return true when resource companyId matches regular user companyId', () => {
      expect(validateTenantOwnership('company-a', regularUser)).toBe(true);
    });

    it('should return false when resource companyId does not match regular user companyId', () => {
      expect(validateTenantOwnership('company-b', regularUser)).toBe(false);
    });

    it('should return true for Super Admin regardless of resource companyId', () => {
      expect(validateTenantOwnership('company-b', superAdminUser)).toBe(true);
    });

    it('should return false for null or empty inputs', () => {
      expect(validateTenantOwnership(null, regularUser)).toBe(false);
      expect(validateTenantOwnership('company-a', null)).toBe(false);
    });
  });
});
