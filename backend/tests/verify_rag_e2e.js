/**
 * Live E2E Enterprise RAG & Conversational Assistant Verification Script.
 * Verifies Module 11 end-to-end against live running services.
 *
 * Verifies:
 * A. Service health (Backend on port 5000, AI Service on port 8002)
 * B. Authentication (Company Admin flow, JWT/RBAC)
 * C. Knowledge Source discovery & pending document indexing
 * D. AI Vector ingestion & ChromaDB collection storage
 * E. Grounded single-turn RAG query & security sanitization
 * F. Multi-turn conversational RAG chat with conversation history
 * G. Insufficient documentation detection (no hallucination)
 * H. Cross-tenant isolation enforcement
 * I. Clean teardown and vector purging
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('=== STARTING MODULE 11 ENTERPRISE RAG LIVE E2E VERIFICATION ===\n');

  // -------------------------------------------------------------
  // Step A: Service Health Probes
  // -------------------------------------------------------------
  console.log('Step A: Probing live service health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Platform health check failed with HTTP ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  console.log('  Health status:', healthData.data?.status || 'unknown');
  console.log('  Service matrix:', JSON.stringify(healthData.data?.services || {}));

  if (healthData.data?.services?.backend !== 'up') {
    throw new Error('Backend service is not healthy');
  }
  if (healthData.data?.services?.aiService !== 'up') {
    throw new Error('AI Service is not healthy');
  }

  // -------------------------------------------------------------
  // Step B: Authenticate Company Admin (Tenant 1)
  // -------------------------------------------------------------
  console.log('\nStep B: Authenticating Tenant 1 Company Admin...');
  const uniqueCode1 = Math.floor(1000 + Math.random() * 9000);
  const companySlug1 = `rag-tenant1-${uniqueCode1}`;
  const adminEmail1 = `admin-rag1-${uniqueCode1}@tenant1.com`;
  const adminPassword = 'Password123!';

  const regRes1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Tenant 1 RAG Corp ${uniqueCode1}`,
      companySlug: companySlug1,
      companyCode: `R1${uniqueCode1}`,
      name: 'Tenant1 Admin',
      email: adminEmail1,
      password: adminPassword,
    }),
  });

  const regData1 = await regRes1.json();
  const tokenTenant1 = regData1.data?.accessToken;
  const company1Id = regData1.data?.company?.id;

  if (!tokenTenant1) {
    throw new Error('Failed to obtain Tenant 1 admin token: ' + JSON.stringify(regData1));
  }
  console.log(`  Tenant 1 Admin authenticated (Company ID: ${company1Id})`);

  // -------------------------------------------------------------
  // Step C: Create Approved Knowledge Source & Sample Documents
  // -------------------------------------------------------------
  console.log('\nStep C: Setting up temporary approved knowledge source & test files...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-e2e-live-'));
  
  // Create document with specific factual data to test grounding and answer quality
  const plantSafetyFilename = 'acme-plant-emergency-sop.txt';
  const plantSafetyContent = `ACME INDUSTRIAL PLANT EMERGENCY STANDARD OPERATING PROCEDURE (SOP-902)
Section 1: Primary Evacuation Protocol
In the event of a Grade-2 thermal alarm or chemical pressure release, all personnel must immediately proceed to Assembly Point Delta, located 150 meters north of the main centrifugal turbine hall.

Section 2: High-Pressure Steam Valve Isolation
The primary isolation valve (Valve HV-404) must be manually locked in the closed position using the red mechanical spindle located on Sub-level 2. Under no circumstances should Valve HV-404 be reopened without written clearance from the Chief Safety Officer.

Section 3: Mandatory PPE Requirements
All technicians operating within Sector 7 must wear Level-B Nomex fire-retardant suits, Class-3 hard hats, and steel-toed boots rated for 15kV dielectric protection.`;

  fs.writeFileSync(path.join(tempDir, plantSafetyFilename), plantSafetyContent);

  const maintenanceFilename = 'turbine-maintenance-schedule.txt';
  const maintenanceContent = `TURBINE MAINTENANCE PROTOCOL (TMP-2026)
Daily vibration analysis of the Westinghouse Model 4A turbine rotor must be conducted at 07:00 and 19:00 hours.
Any harmonic anomaly exceeding 0.045 inches per second peak velocity triggers an immediate precautionary spin-down.`;

  fs.writeFileSync(path.join(tempDir, maintenanceFilename), maintenanceContent);
  console.log('  Created 2 factual sample documents in temporary directory.');

  let sourceId = null;
  let documentIds = [];
  let tokenTenant2 = null;
  let company2Id = null;

  try {
    // Register Knowledge Source
    const createKsRes = await fetch(`${BASE_URL}/knowledge-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant1}`,
      },
      body: JSON.stringify({
        name: `Plant Safety & Turbines ${uniqueCode1}`,
        type: 'local_folder',
        folderPath: tempDir,
        description: 'Temporary approved directory for RAG verification',
      }),
    });
    const createKsData = await createKsRes.json();
    if (createKsRes.status !== 201) {
      throw new Error('Failed to create knowledge source: ' + JSON.stringify(createKsData));
    }
    sourceId = createKsData.data.id;
    console.log(`  Approved Knowledge Source created: ${sourceId}`);

    // Sync Knowledge Source
    console.log('  Syncing knowledge source to discover files...');
    const syncRes = await fetch(`${BASE_URL}/knowledge-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTenant1}` },
    });
    const syncData = await syncRes.json();
    console.log(`  Discovered documents: ${syncData.data?.newDocuments || 0}`);
    if (syncData.data?.newDocuments !== 2) {
      throw new Error(`Expected 2 discovered documents, received: ${syncData.data?.newDocuments}`);
    }

    // Verify pending indexing status
    const listDocsRes = await fetch(`${BASE_URL}/documents?knowledgeSourceId=${sourceId}`, {
      headers: { Authorization: `Bearer ${tokenTenant1}` },
    });
    const listDocsData = await listDocsRes.json();
    documentIds = listDocsData.data.items.map((d) => d.id);
    console.log(`  Discovered Document IDs: ${documentIds.join(', ')}`);

    for (const doc of listDocsData.data.items) {
      if (doc.indexingStatus !== 'pending') {
        throw new Error(`Expected document ${doc.id} to be 'pending', got '${doc.indexingStatus}'`);
      }
    }

    // -------------------------------------------------------------
    // Step D: Vector Ingestion Pipeline
    // -------------------------------------------------------------
    console.log('\nStep D: Ingesting documents into ChromaDB vector store...');
    for (const docId of documentIds) {
      const processRes = await fetch(`${BASE_URL}/documents/${docId}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenTenant1}` },
      });
      const processData = await processRes.json();
      if (processRes.status !== 200 || processData.data?.indexingStatus !== 'indexed') {
        throw new Error(`Document ${docId} processing failed: ` + JSON.stringify(processData));
      }
      console.log(`  Document ${processData.data.originalFilename} indexed: ${processData.data.chunksCount} chunks, ${processData.data.vectorsCount} vectors`);
    }

    // -------------------------------------------------------------
    // Step E: Single-turn Grounded RAG Query Verification
    // -------------------------------------------------------------
    console.log('\nStep E: Executing single-turn grounded RAG query (POST /api/v1/rag/query)...');
    const queryPayload = {
      query: 'Where is Assembly Point Delta located and when should personnel proceed there?',
      top_k: 3,
    };

    const queryRes = await fetch(`${BASE_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant1}`,
      },
      body: JSON.stringify(queryPayload),
    });

    const queryData = await queryRes.json();
    console.log('  RAG Query HTTP Status:', queryRes.status);
    console.log('  Grounded:', queryData.data?.grounded);
    console.log('  Retrieved Count:', queryData.data?.retrievedCount);
    console.log('  LLM Provider:', queryData.data?.llmProvider);
    console.log('  Answer Excerpt:', (queryData.data?.answer || '').slice(0, 120) + '...');

    if (queryRes.status !== 200 || !queryData.success) {
      throw new Error('RAG Query request returned non-200 or unsuccesful: ' + JSON.stringify(queryData));
    }
    if (!queryData.data?.grounded) {
      throw new Error('Expected query to be grounded in company documentation');
    }
    if (!queryData.data?.retrievedCount || queryData.data.retrievedCount < 1) {
      throw new Error('Expected retrievedCount >= 1');
    }
    if (!queryData.data?.sources || queryData.data.sources.length === 0) {
      throw new Error('Expected at least 1 citation source');
    }

    // Verify answer contains relevant factual keywords from the document
    const answerLower = (queryData.data.answer || '').toLowerCase();
    if (!answerLower.includes('assembly point delta') && !answerLower.includes('150 meters') && !answerLower.includes('turbine')) {
      throw new Error('Answer does not appear relevant to Assembly Point Delta: ' + queryData.data.answer);
    }

    // Security & Provenance checks on citations
    for (const src of queryData.data.sources) {
      console.log('    Citation:', JSON.stringify({
        source: src.source,
        similarity: src.similarity,
        classification: src.classification,
        page: src.page,
        snippet: src.snippet?.slice(0, 50) + '...',
      }));

      if (!src.source || !src.source.includes(plantSafetyFilename)) {
        throw new Error(`Expected source to reference ${plantSafetyFilename}, got: ${src.source}`);
      }
      if (typeof src.similarity !== 'number' || src.similarity < 0) {
        throw new Error('Expected non-negative similarity score on citation');
      }
      if (src.source.includes('\\') || src.source.includes('/') || src.source.startsWith('C:') || src.source.startsWith('/tmp')) {
        throw new Error('SECURITY VIOLATION: Absolute filesystem path leaked in citation source: ' + src.source);
      }
      if (JSON.stringify(src).includes('localhost:8002') || JSON.stringify(src).includes('http://')) {
        throw new Error('SECURITY VIOLATION: Internal service URL leaked in citation: ' + JSON.stringify(src));
      }
    }
    if (queryData.data.sources[0].similarity <= 0) {
      throw new Error('Expected top citation to have positive similarity score');
    }
    console.log('  Grounded RAG Query & Provenance verification PASSED.');

    // -------------------------------------------------------------
    // Step F: Multi-turn Conversational RAG Chat Verification
    // -------------------------------------------------------------
    console.log('\nStep F: Executing multi-turn conversational RAG chat (POST /api/v1/rag/chat)...');
    const chatPayload = {
      query: 'What valve needs to be closed and where is its mechanical spindle?',
      chat_history: [
        {
          role: 'user',
          content: 'I need to know about emergency procedures.',
        },
        {
          role: 'assistant',
          content: 'Our plant has specific protocols including evacuation to Assembly Point Delta and steam valve isolation.',
        },
      ],
      top_k: 3,
    };

    const chatRes = await fetch(`${BASE_URL}/rag/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant1}`,
      },
      body: JSON.stringify(chatPayload),
    });

    const chatData = await chatRes.json();
    console.log('  RAG Chat HTTP Status:', chatRes.status);
    console.log('  Chat Grounded:', chatData.data?.grounded);
    console.log('  Chat Answer Excerpt:', (chatData.data?.answer || '').slice(0, 120) + '...');

    if (chatRes.status !== 200 || !chatData.success) {
      throw new Error('RAG Chat returned non-200 or unsuccessful: ' + JSON.stringify(chatData));
    }
    if (!chatData.data?.grounded) {
      throw new Error('Expected chat response to be grounded');
    }
    const chatAnswerLower = (chatData.data.answer || '').toLowerCase();
    if (!chatAnswerLower.includes('hv-404') && !chatAnswerLower.includes('sub-level 2')) {
      throw new Error('Chat answer did not identify Valve HV-404 or Sub-level 2: ' + chatData.data.answer);
    }
    if (!chatData.data.sources || chatData.data.sources.length === 0) {
      throw new Error('Expected citations in chat response');
    }
    console.log('  Multi-turn Conversational RAG Chat verification PASSED.');

    // -------------------------------------------------------------
    // Step G: Insufficient Documentation & Hallucination Prevention
    // -------------------------------------------------------------
    console.log('\nStep G: Testing insufficient documentation query (unknown topic)...');
    const ungroundedPayload = {
      query: 'What is the recipe for baking sourdough bread in the cafeteria kitchen?',
      score_threshold: 0.05,
      top_k: 3,
    };

    const ungroundedRes = await fetch(`${BASE_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant1}`,
      },
      body: JSON.stringify(ungroundedPayload),
    });

    const ungroundedData = await ungroundedRes.json();
    console.log('  Ungrounded Query HTTP Status:', ungroundedRes.status);
    console.log('  Grounded flag:', ungroundedData.data?.grounded);
    console.log('  Answer text:', ungroundedData.data?.answer);

    if (ungroundedRes.status !== 200) {
      throw new Error('Ungrounded query returned non-200: ' + JSON.stringify(ungroundedData));
    }
    if (ungroundedData.data?.grounded !== false) {
      throw new Error('Expected grounded = false for topic not present in company documents');
    }
    const ungroundedLower = (ungroundedData.data?.answer || '').toLowerCase();
    if (
      !ungroundedLower.includes('not found') &&
      !ungroundedLower.includes('insufficient') &&
      !ungroundedLower.includes('no documents') &&
      !ungroundedLower.includes('not contain') &&
      !ungroundedLower.includes('do not contain') &&
      !ungroundedLower.includes('does not contain') &&
      !ungroundedLower.includes('does not provide') &&
      !ungroundedLower.includes('not provide') &&
      !ungroundedLower.includes('enough information')
    ) {
      throw new Error('Expected standard insufficient documentation disclaimer, got: ' + ungroundedData.data?.answer);
    }
    console.log('  Insufficient documentation detection PASSED (No hallucination).');

    // -------------------------------------------------------------
    // Step H: Cross-Tenant Isolation Verification
    // -------------------------------------------------------------
    console.log('\nStep H: Verifying strict cross-tenant RAG isolation...');
    const uniqueCode2 = Math.floor(1000 + Math.random() * 9000);
    const companySlug2 = `rag-tenant2-${uniqueCode2}`;
    const adminEmail2 = `admin-rag2-${uniqueCode2}@tenant2.com`;

    const regRes2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: `Tenant 2 Competitor Corp ${uniqueCode2}`,
        companySlug: companySlug2,
        companyCode: `R2${uniqueCode2}`,
        name: 'Tenant2 Admin',
        email: adminEmail2,
        password: adminPassword,
      }),
    });
    const regData2 = await regRes2.json();
    tokenTenant2 = regData2.data?.accessToken;
    company2Id = regData2.data?.company?.id;

    if (!tokenTenant2) {
      throw new Error('Failed to register Tenant 2 admin: ' + JSON.stringify(regData2));
    }
    console.log(`  Tenant 2 authenticated (Company ID: ${company2Id})`);

    // Tenant 2 queries Tenant 1's secret SOP content
    console.log('  Tenant 2 querying Tenant 1 emergency valve info...');
    const crossTenantQueryRes = await fetch(`${BASE_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant2}`,
      },
      body: JSON.stringify({
        query: 'What is the exact mechanical procedure for Valve HV-404 on Sub-level 2?',
        top_k: 5,
      }),
    });

    const crossTenantData = await crossTenantQueryRes.json();
    console.log('  Tenant 2 Query HTTP Status:', crossTenantQueryRes.status);
    console.log('  Tenant 2 Grounded:', crossTenantData.data?.grounded);
    console.log('  Tenant 2 Retrieved Count:', crossTenantData.data?.retrievedCount);

    if (crossTenantData.data?.retrievedCount !== 0) {
      throw new Error(`SECURITY LEAK: Tenant 2 retrieved ${crossTenantData.data?.retrievedCount} chunks belonging to Tenant 1!`);
    }
    if (crossTenantData.data?.grounded !== false) {
      throw new Error('SECURITY LEAK: Tenant 2 query unexpectedly grounded with Tenant 1 data!');
    }
    if (crossTenantData.data?.sources && crossTenantData.data.sources.length > 0) {
      throw new Error('SECURITY LEAK: Tenant 2 received citations for Tenant 1 documents!');
    }
    console.log('  Cross-tenant isolation successfully verified: Zero Tenant 1 records accessible to Tenant 2.');

    // Attempt client-side companyId override injection
    console.log('  Attempting spoofed companyId parameter in RAG query...');
    const spoofRes = await fetch(`${BASE_URL}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenant2}`,
      },
      body: JSON.stringify({
        query: 'Valve HV-404',
        companyId: company1Id, // Spoofed target company ID
        top_k: 5,
      }),
    });
    const spoofData = await spoofRes.json();
    if (spoofData.data?.retrievedCount > 0) {
      throw new Error('SECURITY CRITICAL: Client-controlled companyId override allowed tenant boundary escape!');
    }
    console.log('  Spoofed companyId override successfully ignored/scoped to authenticated tenant.');

    console.log('\n=== ALL MODULE 11 RAG E2E TESTS COMPLETED WITH 100% SUCCESS ===');
  } finally {
    // -------------------------------------------------------------
    // Step I: Cleanup and Vector Purging
    // -------------------------------------------------------------
    console.log('\nStep I: Cleaning up temporary documents, knowledge sources & vectors...');
    if (tokenTenant1 && documentIds.length > 0) {
      for (const docId of documentIds) {
        try {
          const delRes = await fetch(`${BASE_URL}/documents/${docId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenTenant1}` },
          });
          const delData = await delRes.json();
          console.log(`  Purged document ${docId} & ChromaDB vectors:`, delData.data?.deleted || false);
        } catch (err) {
          console.error(`  Failed to delete document ${docId}:`, err.message);
        }
      }
    }

    if (tokenTenant1 && sourceId) {
      try {
        await fetch(`${BASE_URL}/knowledge-sources/${sourceId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenTenant1}` },
        });
        console.log(`  Deleted Knowledge Source ${sourceId}`);
      } catch (err) {
        console.error(`  Failed to delete knowledge source ${sourceId}:`, err.message);
      }
    }

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('  Cleaned up temporary filesystem directory.');
    } catch {
      // Ignore
    }
  }
}

main().catch((err) => {
  console.error('\n❌ MODULE 11 LIVE RAG E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
