process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum-length';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min';
process.env.AUTH_RATE_LIMIT_MAX = '3'; // Limit to 3 requests
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');

let mongoServer;

beforeAll(async () => {
  process.env.ENABLE_AUTH_RATE_LIMIT = 'true';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  process.env.ENABLE_AUTH_RATE_LIMIT = 'false';
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Authentication Rate Limiter', () => {
  it('should block requests exceeding the configured rate limit with HTTP 429', async () => {
    // Send 3 requests within limit
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'spam@test.com', password: 'wrong' });
    }

    // 4th request must be rejected by the rate limiter
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'spam@test.com', password: 'wrong' });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.body.error.message).toMatch(/too many authentication attempts/i);
  });
});
