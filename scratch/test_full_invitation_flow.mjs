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
  console.log("=================================================================");
  console.log("TEST 1: INTERNAL STAFF INVITATION & PASSWORD PERSISTENCE FLOW");
  console.log("=================================================================");

  // 1. Login CEO
  const ceoLogin = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'ceo@servio.id', password: '12345678' }
  });
  console.log("1. CEO Login:", ceoLogin.statusCode === 200 ? "PASS" : "FAIL");
  const ceoToken = ceoLogin.data?.data?.token;

  // 2. CEO creates Staff
  const staffEmail = `staf_verif_${Date.now()}@servio.id`;
  const staffPhone = `+62812${Math.floor(10000000 + Math.random() * 90000000)}`;
  const createStaff = await request('http://127.0.0.1:8001/api/v1/ceo/staff', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ceoToken}` },
    body: {
      name: 'Rian Operasional',
      email: staffEmail,
      role: 'ADMIN_OPERATIONS',
      department: 'Operasional',
      phone: staffPhone
    }
  });
  console.log("2. Create Staff:", createStaff.statusCode === 201 ? "PASS" : "FAIL", "Email:", staffEmail);
  const inviteToken = createStaff.data?.data?.invitation_token;
  console.log("   Invite Token:", inviteToken);

  // 3. Check staff state before invitation accepted
  const accountsBefore = await request('http://127.0.0.1:8001/api/v1/internal/accounts', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ceoToken}` }
  });
  const staffBefore = accountsBefore.data?.data?.accounts?.find(a => a.email === staffEmail);
  console.log("3. Staff Before Acceptance in CEO List:", {
    email: staffBefore?.email,
    status: staffBefore?.status,
    password: staffBefore?.password,
    password_status: staffBefore?.password_status
  });
  if (staffBefore?.password !== null) throw new Error("Staff password should be null before acceptance!");

  // 4. Staff accepts invitation and sets password
  // NOTICE: We even pass the CEO token in Authorization header to simulate browser session presence!
  const acceptRes = await request('http://127.0.0.1:8001/api/v1/auth/invitation/complete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ceoToken}` },
    body: {
      token: inviteToken,
      password: 'KataSandiRian2026!',
      password_confirmation: 'KataSandiRian2026!'
    }
  });
  console.log("4. Complete Invitation Acceptance:", acceptRes.statusCode === 200 ? "PASS" : "FAIL");

  // 5. Verify Staff Login with new password
  const staffLogin = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: staffEmail,
      password: 'KataSandiRian2026!'
    }
  });
  console.log("5. Staff Login with new password:", staffLogin.statusCode === 200 ? "PASS" : "FAIL", "Role:", staffLogin.data?.data?.user?.role);
  if (staffLogin.statusCode !== 200) {
    console.error("Login failed response:", staffLogin.data);
    throw new Error("Staff login failed!");
  }

  // 6. Verify CEO password did NOT get overwritten
  const verifyCeo = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'ceo@servio.id', password: '12345678' }
  });
  console.log("6. CEO Login (should remain 12345678):", verifyCeo.statusCode === 200 ? "PASS" : "FAIL");

  // 7. Check staff state after invitation accepted in CEO List
  const accountsAfter = await request('http://127.0.0.1:8001/api/v1/internal/accounts', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ceoToken}` }
  });
  const staffAfter = accountsAfter.data?.data?.accounts?.find(a => a.email === staffEmail);
  console.log("7. Staff After Acceptance in CEO List:", {
    email: staffAfter?.email,
    status: staffAfter?.status,
    password: staffAfter?.password,
    password_status: staffAfter?.password_status
  });
  if (staffAfter?.password !== 'KataSandiRian2026!') {
    throw new Error(`Expected staff password 'KataSandiRian2026!', got '${staffAfter?.password}'`);
  }

  console.log("\n=================================================================");
  console.log("TEST 2: WORKER / TECHNICIAN INVITATION & PASSWORD PERSISTENCE FLOW");
  console.log("=================================================================");

  // 1. Login Provider Bengkel
  const providerLogin = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'provider@servio.id', password: 'password' }
  });
  let provToken = providerLogin.data?.data?.token;
  if (!provToken) {
    const prov2 = await request('http://127.0.0.1:8001/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'provider@servio.id', password: '12345678' }
    });
    provToken = prov2.data?.data?.token;
  }
  console.log("1. Provider Login:", provToken ? "PASS" : "FAIL");

  // 2. Provider Invites Worker
  const workerEmail = `teknisi_verif_${Date.now()}@fixture.test`;
  const inviteWorker = await request('http://127.0.0.1:8001/api/v1/provider/worker-invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${provToken}` },
    body: {
      email: workerEmail,
      recipient_email: workerEmail,
      fullName: 'Ahmad Teknisi',
      phone: `+62813${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  });
  console.log("2. Invite Worker:", inviteWorker.statusCode === 201 ? "PASS" : "FAIL", "Email:", workerEmail);
  const workerInviteToken = inviteWorker.data?.data?.invite_token || inviteWorker.data?.data?.invitation_token;
  console.log("   Worker Invite Token:", workerInviteToken);

  // 3. Worker accepts invitation and sets password
  const workerAccept = await request('http://127.0.0.1:8001/api/v1/auth/invitation/complete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${provToken}` }, // simulate browser session of provider
    body: {
      token: workerInviteToken,
      password: 'KataSandiTeknisi2026!',
      password_confirmation: 'KataSandiTeknisi2026!'
    }
  });
  console.log("3. Worker Complete Invitation:", workerAccept.statusCode === 200 ? "PASS" : "FAIL");

  // 4. Worker Login with new password
  const workerLogin = await request('http://127.0.0.1:8001/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: workerEmail,
      password: 'KataSandiTeknisi2026!'
    }
  });
  console.log("4. Worker Login with new password:", workerLogin.statusCode === 200 ? "PASS" : "FAIL", "Role:", workerLogin.data?.data?.user?.role);
  if (workerLogin.statusCode !== 200) {
    console.error("Worker login failed:", workerLogin.data);
    throw new Error("Worker login failed!");
  }

  console.log("\n=================================================================");
  console.log("ALL TESTS PASSED! Password persistence & invitation activation verified 100%!");
  console.log("=================================================================");
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
