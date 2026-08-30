const Department = require('../models/Department');
const Company = require('../models/Company');

/**
 * Sample departments mapped to each fictional demo company.
 * These are seed data only — the system supports any department name dynamically.
 */
const departmentsByCompany = {
  APEX: [
    { name: 'HR', description: 'Human Resources and talent management' },
    { name: 'Mechanical', description: 'Mechanical engineering and design' },
    { name: 'IT', description: 'Information technology and infrastructure' },
    { name: 'Procurement', description: 'Procurement and vendor management' },
    { name: 'Safety', description: 'Workplace safety and compliance' },
    { name: 'Quality', description: 'Quality assurance and control' },
    { name: 'Research & Development', description: 'Product research and innovation' },
    { name: 'Operations', description: 'Day-to-day operations management' },
  ],
  NOVA: [
    { name: 'HR', description: 'Human Resources and employee relations' },
    { name: 'Finance', description: 'Financial planning, analysis, and reporting' },
    { name: 'IT', description: 'Technology systems and digital transformation' },
    { name: 'Legal', description: 'Legal compliance and corporate governance' },
    { name: 'Operations', description: 'Business operations and process management' },
    { name: 'Risk Management', description: 'Financial risk assessment and mitigation' },
  ],
  VERTEX: [
    { name: 'HR', description: 'Human Resources and workforce planning' },
    { name: 'Mechanical', description: 'Mechanical systems and plant engineering' },
    { name: 'Finance', description: 'Accounting and financial management' },
    { name: 'IT', description: 'IT infrastructure and manufacturing systems' },
    { name: 'Procurement', description: 'Raw materials and supply chain procurement' },
    { name: 'Safety', description: 'Industrial safety and environmental compliance' },
    { name: 'Quality', description: 'Product quality and Six Sigma initiatives' },
    { name: 'Operations', description: 'Production and plant operations' },
    { name: 'Logistics', description: 'Warehousing, shipping, and distribution' },
  ],
};

/**
 * Seeds the database with sample departments for each demo company.
 * Must be run AFTER seedCompanies.
 * Uses a placeholder ObjectId for createdBy since users don't exist yet during seeding.
 */
const seedDepartments = async () => {
  try {
    console.log('Seeding sample departments...');

    // Fetch the seeded companies to get their ObjectIds
    const companies = await Company.find({
      companyCode: { $in: Object.keys(departmentsByCompany) },
    }).lean();

    if (companies.length === 0) {
      throw new Error('No sample companies found. Please run seedCompanies first.');
    }

    const companyMap = {};
    companies.forEach((c) => {
      companyMap[c.companyCode] = c._id;
    });

    // Placeholder ObjectId for createdBy (will be updated once users are seeded)
    const mongoose = require('mongoose');
    const placeholderUserId = new mongoose.Types.ObjectId();

    let count = 0;

    for (const [companyCode, departments] of Object.entries(departmentsByCompany)) {
      const companyId = companyMap[companyCode];
      if (!companyId) {
        console.warn(`Company ${companyCode} not found, skipping its departments.`);
        continue;
      }

      for (const dept of departments) {
        const result = await Department.updateOne(
          { companyId, name: dept.name },
          {
            $set: {
              description: dept.description,
              status: 'active',
            },
            $setOnInsert: {
              createdBy: placeholderUserId,
            },
          },
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          count++;
        }
      }
    }

    console.log(`Successfully seeded ${count} new sample departments.`);
  } catch (error) {
    console.error('Error seeding departments:', error);
    throw error;
  }
};

module.exports = {
  seedDepartments,
  departmentsByCompany,
};
