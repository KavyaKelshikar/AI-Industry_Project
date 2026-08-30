process.env.JWT_SECRET = 'test-jwt-access-secret-123456';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-123456';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  parseExpiresInMs,
  getRefreshTokenCookieOptions,
} = require('../../src/utils/token');

describe('Token Utility', () => {
  const payload = {
    id: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012',
    email: 'admin@acme.com',
  };

  it('should generate and verify an access token', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toEqual(payload.id);
    expect(decoded.companyId).toEqual(payload.companyId);
    expect(decoded.email).toEqual(payload.email);
  });

  it('should generate and verify a refresh token', () => {
    const token = generateRefreshToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toEqual(payload.id);
    expect(decoded.companyId).toEqual(payload.companyId);
  });

  it('should generate deterministic SHA-256 token hash', () => {
    const rawToken = 'test-refresh-token-xyz';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex output length
  });

  it('should correctly parse expiration strings to milliseconds', () => {
    expect(parseExpiresInMs('1s')).toEqual(1000);
    expect(parseExpiresInMs('5m')).toEqual(300000);
    expect(parseExpiresInMs('2h')).toEqual(7200000);
    expect(parseExpiresInMs('7d')).toEqual(604800000);
  });

  it('should return secure HttpOnly cookie options', () => {
    const options = getRefreshTokenCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(options.path).toBe('/api/v1/auth');
    expect(options.maxAge).toBeGreaterThan(0);
  });
});
