const Company = require('../models/Company');

/**
 * Fictional demo companies for development and testing.
 * Do NOT use real or confidential company data here.
 */
const companiesData = [
  {
    name: 'Apex Engineering',
    slug: 'apex-engineering',
    companyCode: 'APEX',
    email: 'admin@apexengineering.demo',
    address: '42 Innovation Drive, Tech Park, Bangalore 560001',
    logo: '',
    status: 'active',
    settings: {
      maxUploadSizeMB: 50,
      allowedFileTypes: ['pdf', 'docx', 'csv', 'txt', 'xlsx'],
      chatEnabled: true,
    },
  },
  {
    name: 'Nova Finance',
    slug: 'nova-finance',
    companyCode: 'NOVA',
    email: 'admin@novafinance.demo',
    address: '88 Capital Square, Financial District, Mumbai 400051',
    logo: '',
    status: 'active',
    settings: {
      maxUploadSizeMB: 100,
      allowedFileTypes: ['pdf', 'docx', 'csv', 'xlsx'],
      chatEnabled: true,
    },
  },
  {
    name: 'Vertex Manufacturing',
    slug: 'vertex-manufacturing',
    companyCode: 'VERTEX',
    email: 'admin@vertexmfg.demo',
    address: '7 Industrial Avenue, MIDC, Pune 411026',
    logo: '',
    status: 'active',
    settings: {
      maxUploadSizeMB: 75,
      allowedFileTypes: ['pdf', 'docx', 'csv', 'txt'],
      chatEnabled: true,
    },
  },
];

/**
 * Seeds the database with fictional demo companies.
 * Uses upsert so it can be run safely multiple times.
 */
const seedCompanies = async () => {
  try {
    console.log('Seeding sample companies...');
    let count = 0;

    for (const company of companiesData) {
      const result = await Company.updateOne(
        { companyCode: company.companyCode },
        { $set: company },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        count++;
      }
    }

    console.log(`Successfully seeded ${count} new sample companies.`);
  } catch (error) {
    console.error('Error seeding companies:', error);
    throw error;
  }
};

module.exports = {
  seedCompanies,
  companiesData,
};
