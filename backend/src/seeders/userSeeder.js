const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const { hashPassword } = require('../utils/password');

/**
 * Seeds default demo users for the 3 core personas:
 * 1. Super Admin (System-Wide, companyId: null)
 * 2. Company Admin (Tenant-scoped to Apex Engineering)
 * 3. Employee (Tenant-scoped standard employee)
 */
const seedUsers = async () => {
  try {
    console.log('Seeding demo users for 3 personas (Super Admin, Company Admin, Employee)...');

    const superAdminRole = await Role.findOne({ name: 'Super Admin', companyId: null });
    const companyAdminRole = await Role.findOne({ name: 'Company Admin', companyId: null });
    const employeeRole = await Role.findOne({ name: 'Employee', companyId: null });

    if (!superAdminRole || !companyAdminRole || !employeeRole) {
      throw new Error('Default roles not found. Please run seedRoles first.');
    }

    const defaultCompany = await Company.findOne({ slug: 'apex-engineering' });

    const hashedPassword = await hashPassword('Password123!');

    const demoUsers = [
      {
        email: 'superadmin@platform.ai',
        name: 'Platform Super Admin',
        roleId: superAdminRole._id,
        companyId: null,
        passwordHash: hashedPassword,
        status: 'active',
        employeeId: 'SA-001',
      },
      {
        email: 'admin@apexengineering.com',
        name: 'Apex Company Admin',
        roleId: companyAdminRole._id,
        companyId: defaultCompany ? defaultCompany._id : null,
        passwordHash: hashedPassword,
        status: 'active',
        employeeId: 'CA-001',
      },
      {
        email: 'employee@apexengineering.com',
        name: 'Alex Engineer',
        roleId: employeeRole._id,
        companyId: defaultCompany ? defaultCompany._id : null,
        passwordHash: hashedPassword,
        status: 'active',
        employeeId: 'EMP-101',
      },
    ];

    let count = 0;
    for (const userData of demoUsers) {
      const query = userData.companyId 
        ? { email: userData.email, companyId: userData.companyId }
        : { email: userData.email, companyId: null };

      const result = await User.updateOne(
        query,
        { $set: userData },
        { upsert: true }
      );
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        count++;
      }
    }

    console.log(`Successfully seeded/updated ${count} demo users for Super Admin, Company Admin, and Employee.`);
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

module.exports = {
  seedUsers,
};
