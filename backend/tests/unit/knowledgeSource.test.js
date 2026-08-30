const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  validateLocalFolderPath,
  isWithinApprovedBoundary,
  isDangerousPath,
  hasTraversal,
  sanitizeSyncError,
} = require('../../src/utils/knowledgeSourcePathSecurity');
const { createAdapter, isAdapterImplemented } = require('../../src/services/adapters/AdapterFactory');
const LocalFolderAdapter = require('../../src/services/adapters/LocalFolderAdapter');
const KnowledgeSourceService = require('../../src/services/knowledgeSourceService');

describe('Module 9: Knowledge Source Security & Helpers (Unit)', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-unit-test-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Traversal Detection (hasTraversal)', () => {
    it('should detect standard .. traversal', () => {
      expect(hasTraversal('../foo')).toBe(true);
      expect(hasTraversal('foo/../../bar')).toBe(true);
      expect(hasTraversal('..\\windows\\system32')).toBe(true);
    });

    it('should detect null byte injection', () => {
      expect(hasTraversal('/safe/path\0/etc/passwd')).toBe(true);
    });

    it('should return true for null or non-string input', () => {
      expect(hasTraversal(null)).toBe(true);
      expect(hasTraversal(undefined)).toBe(true);
      expect(hasTraversal(123)).toBe(true);
    });

    it('should return false for safe paths', () => {
      expect(hasTraversal('C:\\Safe\\Data\\Folder')).toBe(false);
      expect(hasTraversal('/opt/company/docs')).toBe(false);
    });
  });

  describe('Dangerous Path Blocklist (isDangerousPath)', () => {
    it('should identify Windows system folders as dangerous', () => {
      expect(isDangerousPath('C:\\Windows')).toBe(true);
      expect(isDangerousPath('c:/windows/system32')).toBe(true);
      expect(isDangerousPath('C:\\Program Files\\App')).toBe(true);
      expect(isDangerousPath('C:\\')).toBe(true);
    });

    it('should identify Unix root/system folders as dangerous', () => {
      expect(isDangerousPath('/etc')).toBe(true);
      expect(isDangerousPath('/etc/shadow')).toBe(true);
      expect(isDangerousPath('/root')).toBe(true);
      expect(isDangerousPath('/var/log')).toBe(true);
      expect(isDangerousPath('/bin/bash')).toBe(true);
    });

    it('should identify sensitive project internal paths as dangerous', () => {
      expect(isDangerousPath('/app/node_modules')).toBe(true);
      expect(isDangerousPath('C:\\project\\.git')).toBe(true);
      expect(isDangerousPath('C:\\project\\.env')).toBe(true);
    });
  });

  describe('validateLocalFolderPath', () => {
    it('should accept a real existing non-system directory', () => {
      const approved = validateLocalFolderPath(tempDir);
      expect(approved).toBeDefined();
      expect(typeof approved).toBe('string');
    });

    it('should reject non-existent paths with INVALID_SOURCE_PATH', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist-' + Date.now());
      expect(() => validateLocalFolderPath(nonExistent)).toThrow();
    });

    it('should reject path traversal attempts with PATH_TRAVERSAL_DETECTED', () => {
      expect(() => validateLocalFolderPath(tempDir + '/../')).toThrow();
    });

    it('should reject files that are not directories with INVALID_SOURCE_PATH', () => {
      const sampleFile = path.join(tempDir, 'test-file.txt');
      fs.writeFileSync(sampleFile, 'hello');
      expect(() => validateLocalFolderPath(sampleFile)).toThrow();
    });
  });

  describe('Boundary Enforcement (isWithinApprovedBoundary)', () => {
    it('should return true for a file inside the approved directory', () => {
      const filePath = path.join(tempDir, 'doc.pdf');
      fs.writeFileSync(filePath, 'pdf data');
      expect(isWithinApprovedBoundary(filePath, tempDir)).toBe(true);
    });

    it('should return false for a path outside the approved directory', () => {
      const outsidePath = path.join(os.tmpdir(), 'other-random-file.txt');
      fs.writeFileSync(outsidePath, 'other data');
      expect(isWithinApprovedBoundary(outsidePath, tempDir)).toBe(false);
    });
  });

  describe('Error Sanitization (sanitizeSyncError)', () => {
    it('should mask Windows absolute paths', () => {
      const raw = 'Failed to read file at C:\\Users\\Admin\\Secret\\data.txt';
      const sanitized = sanitizeSyncError(raw);
      expect(sanitized).not.toContain('C:\\Users\\Admin');
      expect(sanitized).toContain('[path]');
    });

    it('should mask Unix absolute paths', () => {
      const raw = 'Error opening /home/user/private/doc.pdf';
      const sanitized = sanitizeSyncError(raw);
      expect(sanitized).not.toContain('/home/user/private');
      expect(sanitized).toContain('[path]');
    });

    it('should redact sensitive tokens and credentials', () => {
      const raw = 'Sync failed with token=ghp_abc123456789 secret: supersecret';
      const sanitized = sanitizeSyncError(raw);
      expect(sanitized).not.toContain('ghp_abc123456789');
      expect(sanitized).not.toContain('supersecret');
    });
  });

  describe('Adapter Factory', () => {
    it('should create LocalFolderAdapter for local_folder type', () => {
      const source = { type: 'local_folder', approvedPath: tempDir };
      const adapter = createAdapter(source);
      expect(adapter).toBeInstanceOf(LocalFolderAdapter);
      expect(adapter.getAdapterType()).toBe('local_folder');
    });

    it('should throw CONNECTOR_NOT_IMPLEMENTED (501) for future connectors', () => {
      const source = { type: 'google_drive' };
      try {
        createAdapter(source);
        fail('Expected createAdapter to throw');
      } catch (err) {
        expect(err.statusCode).toBe(501);
        expect(err.code).toBe('CONNECTOR_NOT_IMPLEMENTED');
      }
    });

    it('should correctly report adapter implementation status', () => {
      expect(isAdapterImplemented('local_folder')).toBe(true);
      expect(isAdapterImplemented('google_drive')).toBe(false);
      expect(isAdapterImplemented('s3')).toBe(false);
    });
  });

  describe('KnowledgeSource Sanitization (_sanitizeSource)', () => {
    it('should never expose raw approvedPath or internal secrets to API client', () => {
      const rawSource = {
        _id: '507f1f77bcf86cd799439011',
        companyId: '507f1f77bcf86cd799439012',
        name: 'Internal Documents',
        type: 'local_folder',
        status: 'active',
        approvedPath: 'C:\\Sensitive\\Internal\\Path',
        configuration: { secretKey: 'dont-leak-me' },
        description: 'Testing source',
        documentCount: 5,
        createdBy: { _id: '507f1f77bcf86cd799439013', name: 'Admin', email: 'admin@acme.com' },
      };

      const sanitized = KnowledgeSourceService._sanitizeSource(rawSource);
      expect(sanitized.approvedPath).toBeUndefined();
      expect(sanitized.configuration).toBeUndefined();
      expect(sanitized.hasApprovedPath).toBe(true);
      expect(sanitized.name).toBe('Internal Documents');
      expect(sanitized.documentCount).toBe(5);
    });
  });
});
