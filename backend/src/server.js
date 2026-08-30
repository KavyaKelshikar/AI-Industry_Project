require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { seedPermissions } = require('./seeders/permissionSeeder');
const { seedRoles } = require('./seeders/roleSeeder');

// Connect to MongoDB and initialize system metadata
connectDB().then(async () => {
  try {
    // Idempotent system metadata seeding (permissions & default roles only)
    await seedPermissions();
    await seedRoles();
    logger.info('System permissions and roles verified.');
  } catch (seedErr) {
    logger.warn(`Startup seeding warning: ${seedErr.message}`);
  }

  const server = app.listen(config.port, () => {
    logger.info(`[${config.env}] Backend server is running on port ${config.port}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION! 💥 Shutting down...`);
    logger.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
});
