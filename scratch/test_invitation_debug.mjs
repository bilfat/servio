import http from 'http';

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.status, statusCode: res.statusCode, data: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.status, statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log("=== 1. Login CEO to get token ===");
  const loginRes = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'ceo@servio.id', password: '12345678' }
  });
  console.log("Login CEO status:", loginRes.statusCode, "Token:", loginRes.data?.data?.token ? "OK" : "NO TOKEN");
  const ceoToken = loginRes.data?.data?.token;

  console.log("\n=== 2. CEO creates a new staff ===");
  const testStaffEmail = `test_staf_${Date.now()}@servio.id`;
  const randomPhone = `+62812${Math.floor(10000000 + Math.random() * 90000000)}`;
  const createStaffRes = await request('http://127.0.0.1:8001/api/v1/ceo/staff', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ceoToken}` },
    body: {
      name: 'Budi Tester',
      email: testStaffEmail,
      role: 'ADMIN_OPERATIONS',
      department: 'Operasional',
      phone: randomPhone
    }
  });
  console.log("Create Staff status:", createStaffRes.statusCode, "Response:", createStaffRes.data);
  const inviteToken = createStaffRes.data?.data?.invitation_token || createStaffRes.data?.data?.token;
  console.log("Invitation Token:", inviteToken);

  console.log("\n=== 3. Preview invitation ===");
  const previewRes = await request(`http://127.0.0.1:8001/api/v1/auth/invitations/${inviteToken}`);
  console.log("Preview status:", previewRes.statusCode, "Preview data:", previewRes.data);

  console.log("\n=== 4. Test Frontend completeInvitation endpoint: POST /api/v1/auth/invitation/complete ===");
  const completeRes = await request('http://127.0.0.1:8001/api/v1/auth/invitation/complete', {
    method: 'POST',
    body: {
      token: inviteToken,
      password: 'KataSandiBaru123!',
      password_confirmation: 'KataSandiBaru123!'
    }
  });
  console.log("Complete invitation status:", completeRes.statusCode);
  if (completeRes.data) {
    console.log("Error message:", completeRes.data.message);
    console.log("Error exception:", completeRes.data.exception);
    console.log("Error file:", completeRes.data.file, "line:", completeRes.data.line);
  } else {
    console.log("Raw response:", completeRes.raw);
  }

  console.log("\n=== 5. Try Login with new password KataSandiBaru123! ===");
  const loginNewStaffRes = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: testStaffEmail,
      password: 'KataSandiBaru123!'
    }
  });
  console.log("Login New Staff status:", loginNewStaffRes.statusCode, "Response:", loginNewStaffRes.data || loginNewStaffRes.raw);

  console.log("\n=== 6. Check Staff Account list for CEO ===");
  const listAccountsRes = await request('http://127.0.0.1:8001/api/v1/internal/accounts', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ceoToken}` }
  });
  const staffAccount = listAccountsRes.data?.data?.accounts?.find(a => a.email === testStaffEmail);
  console.log("Staff in Accounts list:", {
    email: staffAccount?.email,
    status: staffAccount?.status,
    onboardingStatus: staffAccount?.onboardingStatus,
    password: staffAccount?.password,
    password_status: staffAccount?.password_status
  });
}

run().catch(console.error);
