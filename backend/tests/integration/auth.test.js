process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum-length';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Fast for tests
process.env.ENABLE_AUTH_RATE_LIMIT = 'false';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const { seedPermissions } = require('../../src/seeders/permissionSeeder');
const { seedRoles } = require('../../src/seeders/roleSeeder');
const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const RefreshToken = require('../../src/models/RefreshToken');
const { hashToken } = require('../../src/utils/token');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed baseline system permissions and roles
  await seedPermissions();
  await seedRoles();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear collections except system permissions and roles
  await User.deleteMany({});
  await Company.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Module 5: Authentication Integration Suite', () => {
  const validCompany = {
    companyName: 'Acme Corporation',
    companySlug: 'acme-corp',
    companyCode: 'ACME',
    name: 'Alice Admin',
    email: 'alice@acme.com',
    password: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new company and admin successfully and set HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validCompany);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company.slug).toBe('acme-corp');
      expect(res.body.data.user.email).toBe('alice@acme.com');
      expect(res.body.data.user.role.name).toBe('Company Admin');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check HttpOnly Cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject duplicate company slug with 409 Conflict', async () => {
      await request(app).post('/api/v1/auth/register').send(validCompany);

      const duplicateSlug = {
        ...validCompany,
        companyCode: 'ACME2',
        email: 'alice2@acme.com',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateSlug);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/slug already exists/i);
    });

    it('should reject duplicate company code with 409 Conflict', async () => {
      await request(app).post('/api/v1/auth/register').send(validCompany);

      const duplicateCode = {
        ...validCompany,
        companySlug: 'acme-corp-2',
        email: 'alice3@acme.com',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateCode);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/company code already exists/i);
    });

    it('should reject duplicate email within the same company', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validCompany);
      const companyId = regRes.body.data.company.id;

      // Attempt creating a second user in this company with the same email
      await expect(
        User.create({
          companyId,
          roleId: new mongoose.Types.ObjectId(),
          name: 'Another Alice',
          email: 'alice@acme.com',
          passwordHash: 'hash',
        })
      ).rejects.toThrow();
    });

    it('should allow the same email address in different companies', async () => {
      // Register Company A
      const resA = await request(app)
        .post('/api/v1/auth/register')
        .send(validCompany);
      expect(resA.status).toBe(201);

      // Register Company B with the same user email
      const companyB = {
        companyName: 'Beta Logistics',
        companySlug: 'beta-logistics',
        companyCode: 'BETA',
        companyEmail: 'contact@beta-logistics.com',
        name: 'Alice Beta',
        email: 'alice@acme.com', // Same user email!
        password: 'Password123!',
      };

      const resB = await request(app)
        .post('/api/v1/auth/register')
        .send(companyB);

      expect(resB.status).toBe(201);
      expect(resB.body.data.company.slug).toBe('beta-logistics');
      expect(resB.body.data.user.email).toBe('alice@acme.com');

      // Both users exist with separate companyIds
      const users = await User.find({ email: 'alice@acme.com' });
      expect(users).toHaveLength(2);
      expect(users[0].companyId.toString()).not.toEqual(users[1].companyId.toString());
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validCompany);
    });

    it('should successfully log in with valid email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@acme.com');
      expect(res.body.data.user.permissions).toBeInstanceOf(Array);
      expect(res.body.data.user.permissions.length).toBeGreaterThan(0);

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('should log in using explicit companySlug when provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'Password123!',
          companySlug: 'acme-corp',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it('should reject login for inactive or suspended user', async () => {
      await User.updateOne({ email: 'alice@acme.com' }, { status: 'suspended' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/inactive or suspended/i);
    });

    it('should reject login when company is suspended or inactive', async () => {
      await Company.updateOne({ slug: 'acme-corp' }, { status: 'suspended' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/company account is inactive/i);
    });

    it('should enforce tenant credential isolation (wrong companySlug fails)', async () => {
      // Create second company
      await request(app).post('/api/v1/auth/register').send({
        companyName: 'Beta Corp',
        companySlug: 'beta-corp',
        companyCode: 'BETA',
        name: 'Bob Beta',
        email: 'bob@beta.com',
        password: 'Password123!',
      });

      // Try logging in as Alice under Beta Corp
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@acme.com',
          password: 'Password123!',
          companySlug: 'beta-corp',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid/i);
    });
  });

  describe('POST /api/v1/auth/refresh-token (Rotation & Reuse Detection)', () => {
    let initialRefreshToken;
    let initialAccessToken;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validCompany);
      initialRefreshToken = regRes.body.data.refreshToken;
      initialAccessToken = regRes.body.data.accessToken;
    });

    it('should rotate refresh token and issue new token pair', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toEqual(initialAccessToken);

      // Old refresh token must be revoked in DB
      const oldHash = hashToken(initialRefreshToken);
      const oldRecord = await RefreshToken.findOne({ tokenHash: oldHash });
      expect(oldRecord.revoked).toBe(true);
      expect(oldRecord.revokedAt).toBeDefined();
    });

    it('should reject an already revoked refresh token and trigger theft reuse detection (revoking all user tokens)', async () => {
      // 1. Perform legitimate refresh (revokes initialRefreshToken)
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);
      expect(refreshRes.status).toBe(200);

      const secondRefreshToken = refreshRes.body.data.refreshToken;

      // Ensure second refresh token is currently active
      const secondHash = hashToken(secondRefreshToken);
      let secondRecord = await RefreshToken.findOne({ tokenHash: secondHash });
      expect(secondRecord.revoked).toBe(false);

      // 2. Attacker replays initialRefreshToken (REUSE ATTEMPT)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${initialRefreshToken}`]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.message).toMatch(/reuse detected/i);

      // 3. Verify that reuse detection revoked ALL tokens for this user, including secondRefreshToken!
      secondRecord = await RefreshToken.findOne({ tokenHash: secondHash });
      expect(secondRecord.revoked).toBe(true);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke refresh token and clear cookie on logout', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validCompany);
      const token = regRes.body.data.accessToken;
      const refreshTokenStr = regRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', [`refreshToken=${refreshTokenStr}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token revoked in DB
      const hash = hashToken(refreshTokenStr);
      const record = await RefreshToken.findOne({ tokenHash: hash });
      expect(record.revoked).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me (Protected Route)', () => {
    let accessToken;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validCompany);
      accessToken = regRes.body.data.accessToken;
    });

    it('should return user profile and permissions for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('alice@acme.com');
      expect(res.body.data.name).toBe('Alice Admin');
      expect(res.body.data.role.name).toBe('Company Admin');
      expect(res.body.data.company.slug).toBe('acme-corp');
      expect(res.body.data.permissions).toBeInstanceOf(Array);
    });

    it('should return 401 Unauthorized when token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 Unauthorized when token is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
    });
  });
});
