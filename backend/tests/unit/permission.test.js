const {
  matchPermission,
  hasPermission,
  hasRole,
} = require('../../src/utils/permissionHelper');

describe('Permission & Role Evaluation Helpers (Unit)', () => {
  describe('matchPermission', () => {
    it('should return true for exact permission match', () => {
      expect(matchPermission('documents:read', 'documents:read')).toBe(true);
      expect(matchPermission('COMPANIES:UPDATE', 'companies:update')).toBe(true);
    });

    it('should return true for global wildcard *', () => {
      expect(matchPermission('*', 'documents:read')).toBe(true);
      expect(matchPermission('*', 'users:delete')).toBe(true);
      expect(matchPermission('*', 'any:custom:action')).toBe(true);
    });

    it('should return true for module-level wildcard module:*', () => {
      expect(matchPermission('documents:*', 'documents:read')).toBe(true);
      expect(matchPermission('documents:*', 'documents:upload')).toBe(true);
      expect(matchPermission('documents:*', 'documents:delete')).toBe(true);
    });

    it('should return false for mismatched module with wildcard', () => {
      expect(matchPermission('documents:*', 'users:read')).toBe(false);
      expect(matchPermission('companies:*', 'departments:create')).toBe(false);
    });

    it('should return false for different action', () => {
      expect(matchPermission('documents:read', 'documents:upload')).toBe(false);
      expect(matchPermission('users:read', 'users:delete')).toBe(false);
    });

    it('should return false for empty or null inputs', () => {
      expect(matchPermission('', 'documents:read')).toBe(false);
      expect(matchPermission('documents:read', '')).toBe(false);
      expect(matchPermission(null, null)).toBe(false);
    });
  });

  describe('hasPermission (AND Logic)', () => {
    it('should return true when user has all required permissions', () => {
      const userPerms = ['documents:read', 'documents:upload', 'chat:use'];
      expect(hasPermission(userPerms, 'documents:read')).toBe(true);
      expect(hasPermission(userPerms, 'documents:read', 'documents:upload')).toBe(true);
      expect(hasPermission(userPerms, ['documents:read', 'chat:use'])).toBe(true);
    });

    it('should return false when user is missing one of multiple required permissions', () => {
      const userPerms = ['documents:read', 'chat:use'];
      expect(hasPermission(userPerms, 'documents:read', 'documents:delete')).toBe(false);
    });

    it('should return true when user has global wildcard *', () => {
      const userPerms = ['*'];
      expect(hasPermission(userPerms, 'documents:read', 'users:delete', 'roles:manage')).toBe(true);
    });

    it('should return true when user has module wildcard covering required permissions', () => {
      const userPerms = ['documents:*', 'chat:use'];
      expect(hasPermission(userPerms, 'documents:read', 'documents:upload', 'chat:use')).toBe(true);
    });

    it('should return false for empty user permissions', () => {
      expect(hasPermission([], 'documents:read')).toBe(false);
      expect(hasPermission(null, 'documents:read')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user role matches allowed roles', () => {
      expect(hasRole('Company Admin', 'Company Admin', 'Super Admin')).toBe(true);
      expect(hasRole('Employee', ['Employee', 'Manager'])).toBe(true);
    });

    it('should return false when user role is not in allowed roles', () => {
      expect(hasRole('Employee', 'Company Admin')).toBe(false);
      expect(hasRole('Guest', 'Employee', 'Company Admin')).toBe(false);
    });

    it('should automatically grant access to Super Admin', () => {
      expect(hasRole('Super Admin', 'Company Admin')).toBe(true);
      expect(hasRole('Super Admin', 'Custom Department Role')).toBe(true);
    });

    it('should return false for null or empty user role', () => {
      expect(hasRole(null, 'Employee')).toBe(false);
      expect(hasRole('', 'Employee')).toBe(false);
    });
  });
});
