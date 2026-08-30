const { hashPassword, comparePassword } = require('../../src/utils/password');

describe('Password Utility', () => {
  it('should generate a valid bcrypt hash', async () => {
    const password = 'StrongPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect(hash).not.toEqual(password);
  });

  it('should correctly compare matching password and hash', async () => {
    const password = 'CorrectPassword#456';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);

    expect(isMatch).toBe(true);
  });

  it('should return false when comparing incorrect password', async () => {
    const password = 'CorrectPassword#456';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword('WrongPassword', hash);

    expect(isMatch).toBe(false);
  });

  it('should throw error when hashing empty or non-string input', async () => {
    await expect(hashPassword('')).rejects.toThrow();
    await expect(hashPassword(null)).rejects.toThrow();
  });

  it('should return false when comparing empty inputs', async () => {
    expect(await comparePassword('', 'somehash')).toBe(false);
    expect(await comparePassword('password', '')).toBe(false);
  });
});
