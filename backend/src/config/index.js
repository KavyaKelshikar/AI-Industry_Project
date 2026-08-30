/**
 * Centralised configuration module.
 * All environment values are accessed through this object
 * so no file ever reads process.env directly.
 */

const env = process.env.NODE_ENV || 'development';
let envConfig = {};

try {
  envConfig = require(`./${env}`);
} catch (error) {
  console.warn(`[WARNING] No specific configuration found for environment: ${env}`);
}

const config = {
  env,
  port: parseInt(process.env.PORT, 10) || 5000,

  // Database
  mongoUri: process.env.MONGODB_URI,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Auth Security & Rate Limiting
  auth: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
    rateLimit: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
    },
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  },

  // AI Service
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },

  // Vector Database (ChromaDB)
  chromadb: {
    host: process.env.CHROMADB_HOST || 'localhost',
    port: parseInt(process.env.CHROMADB_PORT, 10) || 8000,
  },

  ...envConfig,
};

module.exports = config;
