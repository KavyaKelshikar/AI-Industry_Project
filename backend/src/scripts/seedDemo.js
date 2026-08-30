/**
 * Explicit demo data seeder script.
 *
 * Seeds fictional demo companies and departments into the database.
 * Run explicitly via: npm run seed:demo
 */

require('dotenv').config();
const connectDB = require('../config/database');
const { seedCompanies } = require('../seeders/companySeeder');
const { seedDepartments } = require('../seeders/departmentSeeder');
const { seedPermissions } = require('../seeders/permissionSeeder');
const { seedRoles } = require('../seeders/roleSeeder');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

async function runDemoSeed() {
  try {
    await connectDB();
    logger.info('--- Running Full Demo Seeding ---');
    await seedPermissions();
    await seedRoles();
    await seedCompanies();
    await seedDepartments();
    logger.info('--- Demo Seeding Completed Successfully ---');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Demo seeding failed: ${error.message}`);
    process.exit(1);
  }
}

runDemoSeed();
