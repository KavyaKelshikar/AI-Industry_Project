const Permission = require('../models/Permission');

const permissionsData = [
  // Canonical convention: `<resource>:<action>`, with lowercase kebab-case
  // resource and action tokens.
  { module: 'companies', action: 'read', code: 'companies:read', displayName: 'View company', description: 'View company details' },
  { module: 'companies', action: 'update', code: 'companies:update', displayName: 'Update company', description: 'Update company details and settings' },

  { module: 'users', action: 'read', code: 'users:read', displayName: 'View users', description: 'View user profiles and list users' },
  { module: 'users', action: 'create', code: 'users:create', displayName: 'Create users', description: 'Create new users and invite employees' },
  { module: 'users', action: 'update', code: 'users:update', displayName: 'Update users', description: 'Update existing user details' },
  { module: 'users', action: 'delete', code: 'users:delete', displayName: 'Deactivate users', description: 'Deactivate or suspend users' },

  { module: 'employees', action: 'read', code: 'employees:read', displayName: 'View employees', description: 'View employee records and list company employees' },
  { module: 'employees', action: 'create', code: 'employees:create', displayName: 'Create employees', description: 'Create or invite new company employees' },
  { module: 'employees', action: 'update', code: 'employees:update', displayName: 'Update employees', description: 'Update employee profiles, roles, and departments' },
  { module: 'employees', action: 'delete', code: 'employees:delete', displayName: 'Delete employees', description: 'Remove or soft-delete company employees' },
  { module: 'employees', action: 'manage', code: 'employees:manage', displayName: 'Manage employees', description: 'Full administrative employee management' },

  { module: 'departments', action: 'read', code: 'departments:read', displayName: 'View departments', description: 'View departments' },
  { module: 'departments', action: 'create', code: 'departments:create', displayName: 'Create departments', description: 'Create departments' },
  { module: 'departments', action: 'update', code: 'departments:update', displayName: 'Update departments', description: 'Update departments' },
  { module: 'departments', action: 'delete', code: 'departments:delete', displayName: 'Delete departments', description: 'Deactivate departments' },

  { module: 'documents', action: 'read', code: 'documents:read', displayName: 'View documents', description: 'View authorized documents' },
  { module: 'documents', action: 'upload', code: 'documents:upload', displayName: 'Upload documents', description: 'Upload new documents' },
  { module: 'documents', action: 'process', code: 'documents:process', displayName: 'Process documents', description: 'Trigger AI vector ingestion and re-indexing' },
  { module: 'documents', action: 'review', code: 'documents:review', displayName: 'Review documents', description: 'Review AI document suggestions' },
  { module: 'documents', action: 'delete', code: 'documents:delete', displayName: 'Delete documents', description: 'Delete documents and their embeddings' },
  { module: 'documents', action: 'download', code: 'documents:download', displayName: 'Download documents', description: 'Download authorized raw documents' },

  { module: 'chat', action: 'use', code: 'chat:use', displayName: 'Use AI chat', description: 'Access the AI chat interface' },
  { module: 'chat', action: 'read-own', code: 'chat:read-own', displayName: 'Read own chat history', description: 'Read and manage the user\'s own chat sessions' },

  { module: 'roles', action: 'manage', code: 'roles:manage', displayName: 'Manage roles', description: 'Create and manage company roles' },
  { module: 'audit-logs', action: 'read', code: 'audit-logs:read', displayName: 'View audit logs', description: 'View system audit logs' },
  { module: 'knowledge-sources', action: 'read', code: 'knowledge-sources:read', displayName: 'View knowledge sources', description: 'View connected external knowledge sources' },
  { module: 'knowledge-sources', action: 'create', code: 'knowledge-sources:create', displayName: 'Create knowledge sources', description: 'Create new knowledge source integrations' },
  { module: 'knowledge-sources', action: 'update', code: 'knowledge-sources:update', displayName: 'Update knowledge sources', description: 'Update knowledge source configuration and settings' },
  { module: 'knowledge-sources', action: 'delete', code: 'knowledge-sources:delete', displayName: 'Delete knowledge sources', description: 'Remove knowledge source integrations' },
  { module: 'knowledge-sources', action: 'sync', code: 'knowledge-sources:sync', displayName: 'Sync knowledge sources', description: 'Trigger synchronization of knowledge source documents' },
  { module: 'knowledge-sources', action: 'manage', code: 'knowledge-sources:manage', displayName: 'Manage knowledge sources', description: 'Manage external knowledge source integrations' },
  { module: 'analytics', action: 'read', code: 'analytics:read', displayName: 'View analytics', description: 'View company analytics and administrative overview data' },
  { module: 'settings', action: 'manage', code: 'settings:manage', displayName: 'Manage settings', description: 'Manage system settings and preferences' },
];

/**
 * Seeds the database with the initial system permissions.
 * Uses upsert (updateOne with upsert: true) so it can be run safely multiple times.
 */
const seedPermissions = async () => {
  try {
    console.log('Seeding permissions...');
    let count = 0;
    
    for (const perm of permissionsData) {
      const result = await Permission.updateOne(
        { code: perm.code },
        {
          $set: perm,
          // `name` is retained by the model only for compatibility with the
          // pre-Phase-4.2 schema. New application code always reads `code`.
          $setOnInsert: { name: perm.code },
        },
        { upsert: true }
      );
      if (result.upsertedCount > 0) {
        count++;
      }
    }
    
    console.log(`Successfully seeded ${count} new permissions.`);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  }
};

module.exports = {
  seedPermissions,
  permissionsData
};
