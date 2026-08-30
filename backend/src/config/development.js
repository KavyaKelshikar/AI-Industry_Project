module.exports = {
  // Development specific configuration
  storage: {
    provider: 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || '../storage/uploads',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
