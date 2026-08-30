const path = require('path');
const fs = require('fs');
const os = require('os');
const DocumentProcessingService = require('../../src/services/documentProcessingService');
const {
  isWithinApprovedBoundary,
  sanitizeSyncError,
} = require('../../src/utils/knowledgeSourcePathSecurity');

describe('Module 10: Document Processing Engine (Unit)', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-unit-test-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Path Boundary Verification for Documents', () => {
    it('should allow documents situated strictly within approved source folder', () => {
      const docPath = path.join(tempDir, 'handbook.pdf');
      fs.writeFileSync(docPath, 'sample');
      expect(isWithinApprovedBoundary(docPath, tempDir)).toBe(true);
    });

    it('should reject document paths attempting traversal outside approved boundary', () => {
      const escapedPath = path.join(tempDir, '..', 'secret.env');
      expect(isWithinApprovedBoundary(escapedPath, tempDir)).toBe(false);
    });
  });

  describe('Document Sanitization (_sanitizeDocument)', () => {
    it('should never expose raw server storagePath to API clients', () => {
      const rawDoc = {
        _id: '507f1f77bcf86cd799439021',
        companyId: '507f1f77bcf86cd799439022',
        filename: 'internal_file_123.pdf',
        originalFilename: 'Quarterly_Report.pdf',
        fileType: 'pdf',
        fileSize: 4096,
        storagePath: 'C:\\Approved\\Source\\Quarterly_Report.pdf',
        indexingStatus: 'indexed',
        chunksCount: 12,
        vectorsCount: 12,
        embeddingModel: 'all-MiniLM-L6-v2',
        lastProcessedAt: new Date(),
        processingError: null,
        status: 'approved',
      };

      const sanitized = DocumentProcessingService._sanitizeDocument(rawDoc);
      expect(sanitized.storagePath).toBeUndefined();
      expect(sanitized.hasStoragePath).toBe(true);
      expect(sanitized.originalFilename).toBe('Quarterly_Report.pdf');
      expect(sanitized.indexingStatus).toBe('indexed');
      expect(sanitized.chunksCount).toBe(12);
      expect(sanitized.vectorsCount).toBe(12);
      expect(sanitized.embeddingModel).toBe('all-MiniLM-L6-v2');
    });

    it('should return null for null input', () => {
      expect(DocumentProcessingService._sanitizeDocument(null)).toBeNull();
    });
  });

  describe('Error Sanitization for Document Processing', () => {
    it('should redact sensitive filesystem paths from processing error messages', () => {
      const rawError = 'Failed to extract text from D:\\Production\\Data\\Confidential.pdf: file corrupted';
      const sanitized = sanitizeSyncError(rawError);
      expect(sanitized).not.toContain('D:\\Production\\Data');
      expect(sanitized).toContain('[path]');
    });
  });
});
