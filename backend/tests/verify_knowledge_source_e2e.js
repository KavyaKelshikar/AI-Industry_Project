/**
 * Live E2E Knowledge Source Lifecycle Verification Script.
 * Verifies Module 9 end-to-end on the running system.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('=== STARTING MODULE 9 KNOWLEDGE SOURCE LIVE E2E VERIFICATION ===\n');

  // Step 0: Check Health
  console.log('Step 0: Probing aggregate system health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('  Health response:', JSON.stringify(health.data?.status || health));

  // Step 1: Register or Login Company Admin
  console.log('\nStep 1: Authenticating Company Admin...');
  const uniqueCode = Math.floor(1000 + Math.random() * 9000);
  const companySlug = `acme-ks-test-${uniqueCode}`;
  const adminEmail = `admin-ks-${uniqueCode}@acme.com`;
  const adminPassword = 'Password123!';

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Acme KS Corp ${uniqueCode}`,
      companySlug,
      companyCode: `KS${uniqueCode.toString().slice(0, 4)}`,
      name: 'Knowledge Admin',
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const regData = await regRes.json();
  const adminToken = regData.data?.accessToken;

  if (!adminToken) {
    throw new Error('Failed to obtain admin token: ' + JSON.stringify(regData));
  }
  console.log('  Admin Authenticated. Token acquired.');

  // Step 2: Create a dedicated temporary test directory with files
  console.log('\nStep 2: Creating dedicated temporary test directory...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-e2e-live-'));
  fs.writeFileSync(path.join(tempDir, 'company-handbook.pdf'), 'Dummy PDF content for handbook');
  fs.writeFileSync(path.join(tempDir, 'security-policy.txt'), 'Security guidelines for employees');
  console.log('  Temporary directory created with 2 test files.');

  let sourceId = null;

  try {
    // Step 3: Create Approved Local Knowledge Source
    console.log('\nStep 3: Creating approved local knowledge source...');
    const createRes = await fetch(`${BASE_URL}/knowledge-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `HR Policies ${uniqueCode}`,
        type: 'local_folder',
        folderPath: tempDir,
        description: 'Approved HR documents folder',
      }),
    });
    const createData = await createRes.json();
    console.log('  Create Response Status:', createRes.status);
    console.log('  Created Source:', JSON.stringify(createData.data?.name || createData));

    if (createRes.status !== 201) {
      throw new Error('Failed to create knowledge source: ' + JSON.stringify(createData));
    }
    sourceId = createData.data.id;

    // Verify sanitization — no raw path leaked
    if (createData.data.approvedPath) {
      throw new Error('SECURITY VIOLATION: Raw approvedPath leaked in API response!');
    }
    console.log('  Security check passed: Raw approvedPath was not leaked.');

    // Step 4: Get Source by ID
    console.log('\nStep 4: Retrieving single source details...');
    const getRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getData = await getRes.json();
    console.log('  Retrieved status:', getData.data?.status);
    console.log('  Has approved path flag:', getData.data?.hasApprovedPath);

    // Step 5: List Sources & Metrics
    console.log('\nStep 5: Listing knowledge sources and metrics...');
    const listRes = await fetch(`${BASE_URL}/knowledge-sources`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    console.log(`  Found ${listData.data?.items?.length} sources for tenant.`);

    const statsRes = await fetch(`${BASE_URL}/knowledge-sources/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    console.log('  Tenant metrics:', JSON.stringify(statsData.data));

    // Step 6: Trigger Synchronization
    console.log('\nStep 6: Triggering synchronization...');
    const syncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const syncData = await syncRes.json();
    console.log('  Sync Result:', JSON.stringify(syncData.data));
    if (syncData.data?.newDocuments !== 2) {
      throw new Error('Expected 2 new documents imported, got: ' + syncData.data?.newDocuments);
    }

    // Step 7: Repeat Sync (Deduplication Check)
    console.log('\nStep 7: Verifying deduplication on repeated sync...');
    const repeatSyncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repeatSyncData = await repeatSyncRes.json();
    console.log('  Repeat Sync Result:', JSON.stringify(repeatSyncData.data));
    if (repeatSyncData.data?.newDocuments !== 0 || repeatSyncData.data?.skippedDocuments !== 2) {
      throw new Error('Deduplication failed on repeated sync!');
    }
    console.log('  Deduplication verified: 0 new, 2 skipped.');

    // Step 8: Update Source
    console.log('\nStep 8: Updating knowledge source...');
    const updateRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `HR Policies (Updated) ${uniqueCode}`,
        description: 'Updated HR documents folder description',
      }),
    });
    const updateData = await updateRes.json();
    console.log('  Updated Name:', updateData.data?.name);

    // Step 9: Deactivate and Reactivate
    console.log('\nStep 9: Testing deactivate and reactivate...');
    const deactRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deactData = await deactRes.json();
    console.log('  Deactivated Status:', deactData.data?.status);

    // Attempting sync on inactive source should fail with 400
    const inactiveSyncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('  Sync inactive source rejection status:', inactiveSyncRes.status);
    if (inactiveSyncRes.status !== 400) {
      throw new Error('Expected 400 when syncing inactive source, got: ' + inactiveSyncRes.status);
    }

    const actRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const actData = await actRes.json();
    console.log('  Reactivated Status:', actData.data?.status);

    // Step 10: Delete Source
    console.log('\nStep 10: Deleting knowledge source...');
    const deleteRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();
    console.log('  Delete Response:', JSON.stringify(deleteData));

    // Step 11: Verify Deletion
    console.log('\nStep 11: Verifying deleted source cannot be retrieved...');
    const checkDeletedRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('  Get deleted source status:', checkDeletedRes.status);
    if (checkDeletedRes.status !== 404) {
      throw new Error('Expected 404 for deleted source, got: ' + checkDeletedRes.status);
    }

    console.log('\n=== ALL MODULE 9 KNOWLEDGE SOURCE E2E TESTS PASSED SUCCESSFULLY ===');
  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleaned up temporary test directory.');
    } catch {
      // Ignore
    }
  }
}

main().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err.message);
  process.exit(1);
});
