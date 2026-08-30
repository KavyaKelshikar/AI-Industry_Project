module.exports = {
  // Production specific configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    localPath: process.env.STORAGE_LOCAL_PATH || '/app/storage',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://productiondomain.com',
  },
};
