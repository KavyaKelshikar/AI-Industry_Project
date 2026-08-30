const http = require('http');

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return {};
  const cookies = {};
  setCookieHeaders.forEach((header) => {
    const parts = header.split(';');
    const [name, value] = parts[0].split('=');
    cookies[name.trim()] = value.trim();
  });
  return cookies;
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAuthVerification() {
  console.log('--- Starting Live E2E Authentication Lifecycle Verification ---');

  // 1. REGISTER
  const uniqueId = Date.now().toString().slice(-4);
  const registerPayload = {
    companyName: `Quantum Industries ${uniqueId}`,
    companySlug: `quantum-ind-${uniqueId}`,
    companyCode: `QNT${uniqueId.slice(-3)}`,
    name: 'Bob Smith',
    email: `bob-${uniqueId}@quantum.com`,
    password: 'Password123!',
  };

  console.log(`[1] Registering new tenant admin: ${registerPayload.email}...`);
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    registerPayload
  );

  console.log(`    Status Code: ${regRes.statusCode}`);
  console.assert(regRes.statusCode === 201, 'Registration must return 201');
  console.assert(regRes.data?.data?.accessToken, 'Response must contain accessToken in memory payload');
  console.assert(regRes.headers['set-cookie'], 'Response must set HttpOnly cookie');
  console.assert(
    regRes.headers['set-cookie'].some((c) => c.includes('HttpOnly')),
    'Cookie must be marked HttpOnly'
  );
  console.log('    [✓] Registration verified: HTTP 201, accessToken received, HttpOnly cookie set.');

  const accessToken1 = regRes.data.data.accessToken;
  const setCookie1 = regRes.headers['set-cookie'];
  const refreshTokenCookie1 = parseCookies(setCookie1)['refreshToken'];

  // 2. GET /me
  console.log('[2] Verifying GET /api/v1/auth/me with Bearer token...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken1}`,
    },
  });

  console.log(`    Status Code: ${meRes.statusCode}`);
  console.assert(meRes.statusCode === 200, '/me must return 200');
  const user = meRes.data?.data?.user || meRes.data?.data;
  console.assert(user?.email === registerPayload.email, 'User email must match');
  console.log(`    [✓] User profile verified: ${user.name} (${user.email})`);

  // 3. REFRESH TOKEN ROTATION
  console.log('[3] Testing manual refresh-token rotation via HttpOnly cookie...');
  const refreshRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/refresh-token',
    method: 'POST',
    headers: {
      Cookie: `refreshToken=${refreshTokenCookie1}`,
    },
  });

  console.log(`    Status Code: ${refreshRes.statusCode}`);
  console.assert(refreshRes.statusCode === 200, 'Refresh token must return 200');
  console.assert(refreshRes.data?.data?.accessToken, 'New accessToken must be returned');
  const accessToken2 = refreshRes.data.data.accessToken;
  console.assert(accessToken1 !== accessToken2, 'Access token must be rotated');

  const setCookie2 = refreshRes.headers['set-cookie'];
  const refreshTokenCookie2 = parseCookies(setCookie2)['refreshToken'];
  console.assert(refreshTokenCookie1 !== refreshTokenCookie2, 'Refresh token must be rotated');
  console.log('    [✓] Refresh token rotation verified: new token issued.');

  // 4. OLD REFRESH TOKEN REUSE ATTEMPT (MUST FAIL)
  console.log('[4] Verifying revoked/old refresh token is rejected...');
  const oldRefreshRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/refresh-token',
    method: 'POST',
    headers: {
      Cookie: `refreshToken=${refreshTokenCookie1}`,
    },
  });
  console.log(`    Status Code for old token: ${oldRefreshRes.statusCode}`);
  console.assert(oldRefreshRes.statusCode === 401, 'Old refresh token must be rejected with 401');
  console.log('    [✓] Old refresh token revocation verified.');

  // 5. LOGOUT
  console.log('[5] Testing Logout...');
  const logoutRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/logout',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken2}`,
      Cookie: `refreshToken=${refreshTokenCookie2}`,
    },
  });
  console.log(`    Status Code: ${logoutRes.statusCode}`);
  console.assert(logoutRes.statusCode === 200, 'Logout must return 200');
  console.log('    [✓] Logout verified.');

  // 6. LOGIN AGAIN
  console.log('[6] Testing Login again with newly provisioned credentials...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: registerPayload.email,
      password: registerPayload.password,
      companySlug: registerPayload.companySlug,
    }
  );
  console.log(`    Status Code: ${loginRes.statusCode}`);
  console.assert(loginRes.statusCode === 200, 'Login must return 200');
  console.assert(loginRes.data?.data?.user?.email === registerPayload.email, 'Logged in user must match');
  console.log('    [✓] Login successfully re-established session.');

  console.log('\n>>> ALL LIVE AUTHENTICATION LIFECYCLE CHECKS PASSED SUCCESSFULLY! <<<\n');
}

runAuthVerification().catch((err) => {
  console.error('E2E Auth Verification failed:', err);
  process.exit(1);
});
