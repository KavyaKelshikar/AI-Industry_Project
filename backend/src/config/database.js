const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

let mongodInstance = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000, // Fail fast to fallback if primary is offline
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events after initial connection
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    return conn;
  } catch (error) {
    if (config.env === 'development') {
      try {
        logger.warn(`Primary MongoDB unavailable (${error.message}). Launching embedded MongoMemoryServer for development...`);
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memoryUri = mongodInstance.getUri();
        const conn = await mongoose.connect(memoryUri);
        logger.info(`Embedded MongoMemoryServer connected at: ${memoryUri}`);

        // Automatically seed demo companies & departments for immediate use
        try {
          const { seedCompanies } = require('../seeders/companySeeder');
          const { seedDepartments } = require('../seeders/departmentSeeder');
          await seedCompanies();
          await seedDepartments();
          logger.info('Demo companies and departments seeded to development database.');
        } catch (seedErr) {
          logger.warn(`Demo seeding warning: ${seedErr.message}`);
        }

        return conn;
      } catch (memErr) {
        logger.error(`Failed to launch embedded MongoDB: ${memErr.message}`);
        process.exit(1);
      }
    } else {
      logger.error(`Error connecting to MongoDB: ${error.message}`);
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) { // 1 = connected
    await mongoose.connection.close();
    if (mongodInstance) await mongodInstance.stop();
    logger.info('MongoDB disconnected through app termination (SIGINT)');
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    if (mongodInstance) await mongodInstance.stop();
    logger.info('MongoDB disconnected through app termination (SIGTERM)');
    process.exit(0);
  }
});

module.exports = connectDB;

