/**
 * Live E2E Employee Management Lifecycle Verification Script.
 * Verifies Module 8 end-to-end on the running system.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('=== STARTING MODULE 8 EMPLOYEE MANAGEMENT LIVE E2E VERIFICATION ===\n');

  // Step 0: Check Health
  console.log('Step 0: Probing aggregate system health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('  Health response:', JSON.stringify(health.data?.status || health));
  if (health.data?.status !== 'healthy') {
    console.warn('  [WARNING] Platform status is:', health.data?.status);
  }

  // Step 1: Register or Login Company Admin
  console.log('\nStep 1: Authenticating Company Admin...');
  const uniqueCode = Math.floor(1000 + Math.random() * 9000);
  const companySlug = `acme-emp-test-${uniqueCode}`;
  const adminEmail = `admin-${uniqueCode}@acme.com`;
  const adminPassword = 'Password123!';

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Acme Corp ${uniqueCode}`,
      companySlug,
      companyCode: `AC${uniqueCode.toString().slice(0, 4)}`,
      name: 'Alice Johnson',
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const regData = await regRes.json();
  let adminToken = regData.data?.accessToken;
  const companyId = regData.data?.company?.id;

  if (!adminToken) {
    console.log('  Registering failed or user exists, attempting login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        companySlug,
      }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData.data?.accessToken;
  }

  if (!adminToken) {
    throw new Error('Failed to obtain admin token: ' + JSON.stringify(regData));
  }
  console.log('  Admin token acquired. Company ID:', companyId);

  // Step 2: Fetch Current Employee Stats
  console.log('\nStep 2: Fetching Employee Overview Stats...');
  const statsRes = await fetch(`${BASE_URL}/employees/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsData = await statsRes.json();
  console.log('  Current stats:', statsData.data);

  // Step 3: Create New Employee
  console.log('\nStep 3: Creating New Employee...');
  const empEmail = `marcus-${uniqueCode}@acme.com`;
  const empPassword = 'EmployeePassword123!';
  const createEmpRes = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Marcus Vance',
      email: empEmail,
      password: empPassword,
      employeeId: `EMP-${uniqueCode}`,
      roleId: regData.data?.user?.roleId || regData.data?.user?.role?.id,
      status: 'active',
    }),
  });
  const createdEmp = await createEmpRes.json();
  console.log('  Employee created:', createdEmp.data?.id, createdEmp.data?.email);
  if (!createdEmp.data?.id) {
    throw new Error('Employee creation failed: ' + JSON.stringify(createdEmp));
  }
  const employeeId = createdEmp.data.id;

  // Step 4: Verify Employee Appears in List
  console.log('\nStep 4: Verifying Employee in Directory List...');
  const listRes = await fetch(`${BASE_URL}/employees?search=marcus`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listData = await listRes.json();
  console.log('  Employees found in search:', listData.data?.items?.length);
  const found = listData.data?.items?.find((e) => e.id === employeeId);
  if (!found) throw new Error('Created employee not found in directory search');
  console.log('  Found employee record:', found.name, found.status);

  // Step 5: Edit Employee
  console.log('\nStep 5: Editing Employee Profile...');
  const updateRes = await fetch(`${BASE_URL}/employees/${employeeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Marcus Vance Senior',
      employeeId: `EMP-${uniqueCode}-SR`,
    }),
  });
  const updatedData = await updateRes.json();
  console.log('  Updated employee name:', updatedData.data?.name, 'ID:', updatedData.data?.employeeId);

  // Step 6: Verify Active Employee Login
  console.log('\nStep 6: Verifying Active Employee Login...');
  const empLoginActiveRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: empEmail,
      password: empPassword,
      companySlug,
    }),
  });
  const empLoginActive = await empLoginActiveRes.json();
  console.log('  Active employee login status:', empLoginActiveRes.status, 'Success:', empLoginActive.success);
  if (empLoginActiveRes.status !== 200) {
    throw new Error('Active employee failed to log in');
  }

  // Step 7: Deactivate Employee
  console.log('\nStep 7: Deactivating Employee...');
  const deactRes = await fetch(`${BASE_URL}/employees/${employeeId}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deactData = await deactRes.json();
  console.log('  Employee status after deactivation:', deactData.data?.status);

  // Step 8: Verify Deactivated Employee Login is REJECTED
  console.log('\nStep 8: Verifying Deactivated Employee Login is Blocked...');
  const empLoginDeactRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: empEmail,
      password: empPassword,
      companySlug,
    }),
  });
  console.log('  Deactivated login response HTTP status:', empLoginDeactRes.status, '(Expected 401)');
  if (empLoginDeactRes.status !== 401) {
    throw new Error(`Expected 401 for deactivated user login, received ${empLoginDeactRes.status}`);
  }

  // Step 9: Reactivate Employee
  console.log('\nStep 9: Reactivating Employee...');
  const actRes = await fetch(`${BASE_URL}/employees/${employeeId}/activate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const actData = await actRes.json();
  console.log('  Employee status after reactivation:', actData.data?.status);

  // Step 10: Verify Reactivated Employee Login Succeeds
  console.log('\nStep 10: Verifying Reactivated Employee Login Succeeds...');
  const empLoginReactivatedRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: empEmail,
      password: empPassword,
      companySlug,
    }),
  });
  console.log('  Reactivated employee login status:', empLoginReactivatedRes.status, '(Expected 200)');
  if (empLoginReactivatedRes.status !== 200) {
    throw new Error('Reactivated employee failed to log in');
  }

  // Step 11: Delete Employee
  console.log('\nStep 11: Deleting Employee...');
  const deleteRes = await fetch(`${BASE_URL}/employees/${employeeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deleteData = await deleteRes.json();
  console.log('  Delete response:', deleteData.data);

  // Step 12: Verify Deleted Employee is 404
  console.log('\nStep 12: Verifying Deleted Employee Returns 404...');
  const getDeletedRes = await fetch(`${BASE_URL}/employees/${employeeId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('  Get deleted employee status:', getDeletedRes.status, '(Expected 404)');
  if (getDeletedRes.status !== 404) {
    throw new Error(`Expected 404 for deleted employee, got ${getDeletedRes.status}`);
  }

  // Step 13: Final Health Check
  console.log('\nStep 13: Verifying System Health after Operations...');
  const finalHealthRes = await fetch(`${BASE_URL}/health`);
  const finalHealth = await finalHealthRes.json();
  console.log('  Final Aggregate Health Status:', finalHealth.data?.status);

  console.log('\n✅ ALL MODULE 8 EMPLOYEE MANAGEMENT LIVE E2E STEPS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('\n❌ LIVE E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
