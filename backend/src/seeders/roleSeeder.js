const Role = require('../models/Role');
const Permission = require('../models/Permission');

/**
 * Defines the initial default system roles and their exact permission names.
 * These roles will have companyId = null so they exist globally for all tenants.
 * Custom roles created later will have a specific companyId attached.
 */
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'System-wide administrator with full access to everything.',
    // '*' is a placeholder we will map to ALL permissions dynamically
    permissions: ['*'],
  },
  {
    name: 'Company Admin',
    description: 'Full administrative access for a specific company tenant.',
    permissions: [
      'companies:read',
      'companies:update',
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'employees:read',
      'employees:create',
      'employees:update',
      'employees:delete',
      'employees:manage',
      'departments:read',
      'departments:create',
      'departments:update',
      'departments:delete',
      'documents:read',
      'documents:upload',
      'documents:process',
      'documents:review',
      'documents:delete',
      'documents:download',
      'chat:use',
      'chat:read-own',
      'roles:manage',
      'audit-logs:read',
      'knowledge-sources:read',
      'knowledge-sources:create',
      'knowledge-sources:update',
      'knowledge-sources:delete',
      'knowledge-sources:sync',
      'knowledge-sources:manage',
      'analytics:read',
      'settings:manage',
    ],
  },
  {
    name: 'Employee',
    description: 'Standard employee access with read rights and AI chat capability.',
    permissions: [
      'companies:read',
      'users:read',
      'departments:read',
      'documents:read',
      'documents:download',
      'chat:use',
      'chat:read-own',
      'knowledge-sources:read',
    ],
  },
];

/**
 * Seeds the database with the initial system roles.
 * Must be run AFTER seedPermissions.
 */
const seedRoles = async () => {
  try {
    console.log('Seeding default system roles...');
    
    // Fetch all available permissions to map names to ObjectIds
    const allPermissions = await Permission.find({}).lean();
    if (allPermissions.length === 0) {
      throw new Error('No permissions found. Please run seedPermissions first.');
    }

    const permissionMap = {};
    const allPermissionIds = [];
    
    allPermissions.forEach((p) => {
      permissionMap[p.code] = p._id;
      allPermissionIds.push(p._id);
    });

    let count = 0;

    for (const roleDef of defaultRoles) {
      let permissionIds = [];
      
      if (roleDef.permissions.includes('*')) {
        // Super Admin gets every single permission available
        permissionIds = allPermissionIds;
      } else {
        // Map string names to their respective ObjectIds
        permissionIds = roleDef.permissions
          .map(pName => permissionMap[pName])
          .filter(id => id); // Filter out any undefined just in case
      }

      // Upsert the system role (companyId: null)
      const result = await Role.updateOne(
        { name: roleDef.name, companyId: null },
        { 
          $set: {
            description: roleDef.description,
            permissionIds: permissionIds,
            status: 'active'
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        count++;
      }
    }

    console.log(`Successfully seeded ${count} new default roles.`);
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  }
};

module.exports = {
  seedRoles,
  defaultRoles
};
