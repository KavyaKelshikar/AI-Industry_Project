const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is unavailable
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events after initial connection
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) { // 1 = connected
    await mongoose.connection.close();
    logger.info('MongoDB disconnected through app termination (SIGINT)');
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected through app termination (SIGTERM)');
    process.exit(0);
  }
});

module.exports = connectDB;
