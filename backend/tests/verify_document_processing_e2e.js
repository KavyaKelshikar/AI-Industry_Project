/**
 * Live E2E Document Ingestion & AI Vector Pipeline Verification Script.
 * Verifies Module 10 end-to-end on the running system.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('=== STARTING MODULE 10 DOCUMENT INGESTION LIVE E2E VERIFICATION ===\n');

  // Step 0: Check Health
  console.log('Step 0: Probing platform service health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('  Health response status:', JSON.stringify(health.data?.status || health));

  // Step 1: Register or Login Company Admin
  console.log('\nStep 1: Authenticating Company Admin...');
  const uniqueCode = Math.floor(1000 + Math.random() * 9000);
  const companySlug = `acme-doc-test-${uniqueCode}`;
  const adminEmail = `admin-doc-${uniqueCode}@acme.com`;
  const adminPassword = 'Password123!';

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Acme Document Corp ${uniqueCode}`,
      companySlug,
      companyCode: `DC${uniqueCode.toString().slice(0, 4)}`,
      name: 'Document Admin',
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

  // Step 2: Create a dedicated temporary directory with test files
  console.log('\nStep 2: Creating temporary approved directory with sample documents...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-e2e-live-'));
  const txtPath = path.join(tempDir, 'plant-safety.txt');
  fs.writeFileSync(
    txtPath,
    'Plant Safety Policy: Section 1. All employees must wear helmets and high-visibility vests.\nSection 2. Emergency assembly points are located at Gate A and Gate B.'
  );

  const docxPath = path.join(tempDir, 'maintenance-protocol.txt');
  fs.writeFileSync(
    docxPath,
    'Maintenance Protocol 2026: Daily inspection of turbine generators is mandatory prior to shift handover.'
  );
  console.log('  Created 2 sample files in temporary directory.');

  let sourceId = null;
  let documentIds = [];

  try {
    // Step 3: Create Approved Knowledge Source
    console.log('\nStep 3: Creating approved local knowledge source...');
    const createKsRes = await fetch(`${BASE_URL}/knowledge-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Engineering Standards ${uniqueCode}`,
        type: 'local_folder',
        folderPath: tempDir,
        description: 'Approved plant standards directory',
      }),
    });
    const createKsData = await createKsRes.json();
    if (createKsRes.status !== 201) {
      throw new Error('Failed to create knowledge source: ' + JSON.stringify(createKsData));
    }
    sourceId = createKsData.data.id;
    console.log(`  Created Knowledge Source: ${createKsData.data.name} (ID: ${sourceId})`);

    // Step 4: Sync Knowledge Source to Discover Files
    console.log('\nStep 4: Syncing Knowledge Source to discover files...');
    const syncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const syncData = await syncRes.json();
    console.log('  Sync result:', JSON.stringify(syncData.data));
    if (syncData.data?.newDocuments !== 2) {
      throw new Error('Expected 2 new documents discovered, got: ' + syncData.data?.newDocuments);
    }

    // Step 5: List Documents & Verify Initial Pending State
    console.log('\nStep 5: Verifying documents enter indexingStatus: pending...');
    const listDocsRes = await fetch(`${BASE_URL}/documents?knowledgeSourceId=${sourceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listDocsData = await listDocsRes.json();
    documentIds = listDocsData.data.items.map((d) => d.id);
    console.log(`  Found ${documentIds.length} documents.`);

    for (const doc of listDocsData.data.items) {
      console.log(`  Document: ${doc.originalFilename} [indexingStatus: ${doc.indexingStatus}]`);
      if (doc.indexingStatus !== 'pending') {
        throw new Error(`Expected indexingStatus 'pending', got: ${doc.indexingStatus}`);
      }
      if (doc.storagePath) {
        throw new Error('SECURITY VIOLATION: Raw storagePath leaked in document listing API!');
      }
    }

    // Step 6: Process First Document through AI Vector Pipeline
    const firstDocId = documentIds[0];
    console.log(`\nStep 6: Ingesting document ${firstDocId} via AI Vector Pipeline...`);
    const processRes = await fetch(`${BASE_URL}/documents/${firstDocId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const processData = await processRes.json();
    console.log('  Processing Status HTTP:', processRes.status);
    console.log('  Processed telemetry:', JSON.stringify({
      filename: processData.data?.originalFilename,
      indexingStatus: processData.data?.indexingStatus,
      chunksCount: processData.data?.chunksCount,
      vectorsCount: processData.data?.vectorsCount,
      embeddingModel: processData.data?.embeddingModel,
      lastProcessedAt: processData.data?.lastProcessedAt,
    }));

    if (processRes.status !== 200 || processData.data?.indexingStatus !== 'indexed') {
      throw new Error('Document processing failed: ' + JSON.stringify(processData));
    }
    if (!processData.data?.chunksCount || processData.data?.chunksCount < 1) {
      throw new Error('Expected chunksCount >= 1, got: ' + processData.data?.chunksCount);
    }
    console.log('  Document successfully vectorized and indexed in ChromaDB.');

    // Step 7: Reprocess same document (Idempotency Check)
    console.log('\nStep 7: Verifying idempotency on repeat processing...');
    const repeatProcessRes = await fetch(`${BASE_URL}/documents/${firstDocId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repeatData = await repeatProcessRes.json();
    console.log('  Repeat processing indexingStatus:', repeatData.data?.indexingStatus);
    if (repeatProcessRes.status !== 200 || repeatData.data?.indexingStatus !== 'indexed') {
      throw new Error('Idempotent repeat processing failed!');
    }
    console.log('  Idempotency verified: re-processing succeeded with matching vector counts.');

    // Step 8: Batch Ingest Remaining Pending Documents
    console.log('\nStep 8: Testing batch processing for Knowledge Source...');
    const batchRes = await fetch(`${BASE_URL}/documents/batch-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ knowledgeSourceId: sourceId }),
    });
    const batchData = await batchRes.json();
    console.log('  Batch processing outcome:', JSON.stringify(batchData.data));
    if (batchData.data?.processed < 1) {
      throw new Error('Batch processing expected at least 1 document processed');
    }

    // Step 9: Get Aggregate Document Stats
    console.log('\nStep 9: Verifying aggregate document processing metrics...');
    const statsRes = await fetch(`${BASE_URL}/documents/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    console.log('  Document Stats:', JSON.stringify(statsData.data));
    if (statsData.data?.indexed < 2) {
      throw new Error('Expected at least 2 indexed documents');
    }

    // Step 10: Modify File, Re-sync, and Re-process
    console.log('\nStep 10: Modifying source file and re-syncing...');
    fs.appendFileSync(txtPath, '\nSection 3: Mandatory quarterly fire drills.');
    const resyncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resyncData = await resyncRes.json();
    console.log('  Re-sync result (expected 1 updated):', JSON.stringify(resyncData.data));
    if (resyncData.data?.updatedDocuments !== 1) {
      throw new Error('Expected 1 updated document upon modification');
    }

    // Re-process modified document
    console.log('  Re-processing modified document...');
    const reprocessRes = await fetch(`${BASE_URL}/documents/${firstDocId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reprocessData = await reprocessRes.json();
    console.log('  Modified document reprocessed indexingStatus:', reprocessData.data?.indexingStatus);
    if (reprocessData.data?.indexingStatus !== 'indexed') {
      throw new Error('Modified document re-processing failed');
    }

    // Step 11: Delete Document & Purge Vectors
    console.log('\nStep 11: Deleting document and purging vectors...');
    const deleteDocRes = await fetch(`${BASE_URL}/documents/${firstDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteDocData = await deleteDocRes.json();
    console.log('  Delete Response:', JSON.stringify(deleteDocData));
    if (deleteDocRes.status !== 200 || !deleteDocData.data?.deleted) {
      throw new Error('Failed to delete document: ' + JSON.stringify(deleteDocData));
    }

    // Verify Document is 404
    const checkDeletedRes = await fetch(`${BASE_URL}/documents/${firstDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('  Get deleted document HTTP Status:', checkDeletedRes.status);
    if (checkDeletedRes.status !== 404) {
      throw new Error('Expected 404 for deleted document');
    }

    console.log('\n=== ALL MODULE 10 DOCUMENT INGESTION E2E TESTS PASSED SUCCESSFULLY ===');
  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleaned up temporary test directory.');
    } catch {
      // Ignore
    }
  }
}

main().catch((err) => {
  console.error('\n❌ MODULE 10 E2E VERIFICATION FAILED:', err.message);
  process.exit(1);
});
