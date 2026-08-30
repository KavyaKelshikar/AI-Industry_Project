const { seedPermissions, permissionsData } = require('./permissionSeeder');
const { seedRoles, defaultRoles } = require('./roleSeeder');
const { seedCompanies, companiesData } = require('./companySeeder');
const { seedDepartments, departmentsByCompany } = require('./departmentSeeder');

module.exports = {
  seedPermissions,
  permissionsData,
  seedRoles,
  defaultRoles,
  seedCompanies,
  companiesData,
  seedDepartments,
  departmentsByCompany,
};
