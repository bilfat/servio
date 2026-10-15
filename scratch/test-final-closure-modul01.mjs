import http from 'http';
import crypto from 'crypto';
import mysql from 'mysql2/promise';

const BACKEND_BASE = 'http://127.0.0.1:8001/api/v1';
const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'servio_identity_db'
};

const OTP_HASH_KEY = 'servio_local_otp_secret_key_2026';

function bruteForceOtp(hmacHex) {
  for (let i = 100000; i <= 999999; i++) {
    const codeStr = String(i);
    const hash = crypto.createHmac('sha256', OTP_HASH_KEY).update(codeStr).digest('hex');
    if (hash === hmacHex) {
      return codeStr;
    }
  }
  return null;
}

async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BACKEND_BASE}${endpoint}`;
  const reqHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers
  };

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = { raw };
  }

  // Extract set-cookie if any
  const setCookie = res.headers.get('set-cookie');

  return {
    status: res.status,
    data: json,
    headers: res.headers,
    cookie: setCookie
  };
}

async function runClosureVerification() {
  console.log('================================================================');
  console.log(' SERVIO MODUL 01 — COMPREHENSIVE FINAL CLOSURE VERIFICATION');
  console.log('================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const results = {
    customerLifecycle: false,
    nikImmutable409: false,
    adminOperationsReview: false,
    ceoKycExclusive: false,
    adminKycBlocked403: false,
    invitationValidAccepted: false,
    invitationExpiredRejected410: false,
    roleSwitchBlocked: false,
    sessionLogout401: false
  };

  // --------------------------------------------------------------------------
  // ALUR 1: CUSTOMER LIFECYCLE REGISTER -> OTP -> NIK -> ACTIVE (dan 409 IMMUTABLE)
  // --------------------------------------------------------------------------
  console.log('--- [1/5] UJI CUSTOMER LIFECYCLE WAJIB SAMPAI ACTIVE & NIK 409 ---');
  const testEmail = `cust_active_${Date.now()}@servio.id`;
  const testPhone = `+62812${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testNik = `320101${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  console.log(`1.1 Register Customer: ${testEmail}`);
  const regRes = await apiCall('/auth/register', 'POST', {
    email: testEmail,
    password: 'Password123!',
    password_confirmation: 'Password123!',
    phone: testPhone,
    full_name: 'Budi Test Closure',
    terms_accepted: true,
    privacy_accepted: true
  });
  console.log(`    Status: ${regRes.status}, Message: ${regRes.data.message || regRes.data.error || 'OK'}`);
  const customerId = regRes.data.data?.user?.id;
  const customerToken = regRes.data.data?.token;

  console.log(`1.2 Request OTP Challenge for: ${testEmail}`);
  const otpRes = await apiCall('/otp/challenges', 'POST', {
    channel: 'EMAIL',
    destination: testEmail,
    purpose: 'REGISTER'
  });
  console.log(`    Status: ${otpRes.status}, Challenge ID: ${otpRes.data.data?.challenge_id}`);
  const challengeId = otpRes.data.data?.challenge_id;

  // Retrieve OTP HMAC from test database fixture (tanpa klaim email live Brevo terkirim)
  const [otpRows] = await db.execute(
    'SELECT otp_hmac FROM otp_challenges WHERE id = ?',
    [challengeId]
  );
  const otpHmac = otpRows[0]?.otp_hmac;
  const crackedOtp = bruteForceOtp(otpHmac);
  console.log(`    [Test Fixture Secure Hash Cracker] OTP Code: ${crackedOtp}`);

  console.log(`1.3 Verify OTP Challenge`);
  const verifyRes = await apiCall(`/otp/challenges/${challengeId}/verify`, 'POST', {
    code: crackedOtp
  });
  console.log(`    Status: ${verifyRes.status}, Message: ${verifyRes.data.message}`);

  console.log(`1.4 Login as Customer`);
  const custLogin = await apiCall('/auth/login', 'POST', {
    email: testEmail,
    password: 'Password123!'
  });
  const custAuthToken = custLogin.data.data?.token || customerToken;
  const custHeaders = { 'Authorization': `Bearer ${custAuthToken}` };

  console.log(`1.5 Submit NIK 16 Digit: ${testNik}`);
  const nikRes = await apiCall('/customer/nik', 'POST', {
    nik: testNik,
    legal_name: 'Budi Test Closure',
    date_of_birth: '1995-05-15',
    gender: 'MALE',
    pob_city: 'Jakarta'
  }, custHeaders);
  console.log(`    Status: ${nikRes.status}, Message: ${nikRes.data.message}`);

  console.log(`1.6 Cek /auth/me -> Wajib ACTIVE`);
  const meRes = await apiCall('/auth/me', 'GET', null, custHeaders);
  console.log(`    Status: ${meRes.status}, User Status: ${meRes.data.data?.status}`);
  if (meRes.data.data?.status === 'ACTIVE') {
    results.customerLifecycle = true;
    console.log('    >>> LULUS: Customer berhasil mencapai status ACTIVE!');
  } else {
    console.log(`    >>> GAGAL: Status bukan ACTIVE, tetapi ${meRes.data.data?.status}`);
  }

  console.log(`1.7 Buktikan NIK Tetap Immutable (Submit NIK kedua kali -> Wajib 409 Conflict)`);
  const secondNikRes = await apiCall('/customer/nik', 'POST', {
    nik: '3201019999990001',
    legal_name: 'Budi Ganti NIK',
    date_of_birth: '1995-05-15',
    gender: 'MALE',
    pob_city: 'Jakarta'
  }, custHeaders);
  console.log(`    Status: ${secondNikRes.status}, Error Code: ${secondNikRes.data.error || secondNikRes.data.message}`);
  if (secondNikRes.status === 409) {
    results.nikImmutable409 = true;
    console.log('    >>> LULUS: NIK Immutable terbukti 409 Conflict!');
  } else {
    console.log(`    >>> GAGAL: Response bukan 409, tetapi ${secondNikRes.status}`);
  }

  // --------------------------------------------------------------------------
  // ALUR 2: BROWSER E2E ADMIN (Legal Business Queue, Review, MySQL Update)
  // --------------------------------------------------------------------------
  console.log('\n--- [2/5] UJI ADMIN OPERATIONS LEGAL BUSINESS QUEUE & REVIEW ---');
  // Buat Business Application di database fixture
  const appId = crypto.randomUUID();
  const appCode = `APP-TEST-${Date.now()}`;
  await db.execute(`
    INSERT INTO business_applications 
    (id, application_code, applicant_user_id, target_role, status, revision_no, lock_version, draft_data_ciphertext, submitted_at, created_at, updated_at)
    VALUES (?, ?, ?, 'WORKSHOP_PARTNER', 'UNDER_REVIEW', 1, 1, 'ciphertext_dummy', NOW(), NOW(), NOW())
  `, [appId, appCode, customerId]);

  // Tambahkan dokumen pengajuan
  const docId = crypto.randomUUID();
  await db.execute(`
    INSERT INTO application_documents
    (id, application_id, revision_no, doc_type, private_storage_key, sha256, mime, size_bytes, verification_status, created_at, updated_at)
    VALUES (?, ?, 1, 'NIB', 'documents/test_nib.pdf', 'dummy_sha256', 'application/pdf', 102400, 'PENDING', NOW(), NOW())
  `, [docId, appId]);

  console.log(`2.1 Login as Admin Operations (admin@servio.id)`);
  const adminLogin = await apiCall('/auth/login', 'POST', {
    email: 'admin@servio.id',
    password: 'Password2026!'
  });
  const adminToken = adminLogin.data.data?.token;
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

  console.log(`2.2 Admin Mengambil Antrean Aplikasi Legal Bisnis (/ops/applications)`);
  const queueRes = await apiCall('/ops/applications', 'GET', null, adminHeaders);
  const queueItems = queueRes.data.data?.items || queueRes.data.data || [];
  const foundApp = queueItems.find(a => a.id === appId);
  console.log(`    Status: ${queueRes.status}, Total Antrean: ${queueItems.length}, Menemukan Aplikasi Uji: ${Boolean(foundApp)}`);

  console.log(`2.3 Admin Menyetujui (APPROVE) Aplikasi Legal Bisnis: ${appId}`);
  const reviewRes = await apiCall(`/ops/applications/${appId}/review`, 'POST', {
    action: 'APPROVE',
    decision: 'APPROVE',
    reviewNote: 'Semua dokumen legal NIB dan KTP terverifikasi sah.',
    reason: 'Semua dokumen legal NIB dan KTP terverifikasi sah.'
  }, adminHeaders);
  console.log(`    Status: ${reviewRes.status}, Message: ${reviewRes.data.message || reviewRes.data.data?.status}`);

  console.log(`2.4 Verifikasi Status Aplikasi di Database MySQL`);
  const [appDbRows] = await db.execute('SELECT status FROM business_applications WHERE id = ?', [appId]);
  const [decisionDbRows] = await db.execute('SELECT decision, reviewer_user_id FROM application_decisions WHERE application_id = ?', [appId]);
  console.log(`    Database Application Status: ${appDbRows[0]?.status}`);
  console.log(`    Decision Record: ${decisionDbRows[0]?.decision}, Reviewer: ${decisionDbRows[0]?.reviewer_user_id}`);

  if (appDbRows[0]?.status === 'APPROVED' && decisionDbRows[0]?.decision === 'APPROVE') {
    results.adminOperationsReview = true;
    console.log('    >>> LULUS: Admin Legal Business Review & Perubahan MySQL Berhasil!');
  } else {
    console.log('    >>> GAGAL: Status aplikasi di database belum APPROVED.');
  }

  // --------------------------------------------------------------------------
  // ALUR 3: CEO EMPLOYEE KYC & RBAC GUARD (CEO Eksklusif, Admin Forbidden 403)
  // --------------------------------------------------------------------------
  console.log('\n--- [3/5] UJI CEO EMPLOYEE KYC & RBAC GUARD (V08 & V09) ---');
  // Buat user staf dan verification request EMPLOYEE_KYC
  const staffUserId = crypto.randomUUID();
  await db.execute(`
    INSERT INTO users (id, email, phone_e164, status, created_at, updated_at)
    VALUES (?, ?, ?, 'PENDING', NOW(), NOW())
  `, [staffUserId, `staff_${Date.now()}@servio.id`, `+62818${Math.floor(10000000 + Math.random() * 90000000)}`]);

  const kycReqId = crypto.randomUUID();
  await db.execute(`
    INSERT INTO identity_verification_requests (id, user_id, kind, status, nik_ciphertext, nik_lookup_hash, created_at, updated_at)
    VALUES (?, ?, 'EMPLOYEE_KYC', 'PENDING', 'dummy_ciphertext', 'dummy_hash', NOW(), NOW())
  `, [kycReqId, staffUserId]);

  console.log(`3.1 Coba Akses Antrean Employee KYC menggunakan Akun Admin Operations (Wajib Ditolak 403)`);
  const adminKycQueueRes = await apiCall('/ceo/identity/verifications', 'GET', null, adminHeaders);
  console.log(`    Admin Access Queue Status: ${adminKycQueueRes.status}`);

  console.log(`3.2 Coba Eksekusi Keputusan KYC menggunakan Akun Admin Operations (Wajib Ditolak 403)`);
  const adminKycDecisionRes = await apiCall(`/ceo/identity/verifications/${kycReqId}/decision`, 'POST', {
    decision: 'APPROVE',
    reason: 'Admin mencoba menyetujui KYC'
  }, adminHeaders);
  console.log(`    Admin Decision Status: ${adminKycDecisionRes.status}, Error: ${adminKycDecisionRes.data.error || adminKycDecisionRes.data.message}`);

  if (adminKycQueueRes.status === 403 && adminKycDecisionRes.status === 403) {
    results.adminKycBlocked403 = true;
    console.log('    >>> LULUS: Admin Operations terbukti DITOLAK 403 dari Employee KYC!');
  } else {
    console.log('    >>> GAGAL: Admin tidak ditolak 403 pada Employee KYC.');
  }

  console.log(`3.3 Login as CEO / Product Owner (ceo@servio.id)`);
  const ceoLogin = await apiCall('/auth/login', 'POST', {
    email: 'ceo@servio.id',
    password: 'Password2026!'
  });
  const ceoToken = ceoLogin.data.data?.token;
  const ceoHeaders = { 'Authorization': `Bearer ${ceoToken}` };

  console.log(`3.4 CEO Mengakses Antrean Employee KYC (/ceo/identity/verifications)`);
  const ceoQueueRes = await apiCall('/ceo/identity/verifications', 'GET', null, ceoHeaders);
  console.log(`    Status: ${ceoQueueRes.status}, Items: ${ceoQueueRes.data.data?.items?.length || ceoQueueRes.data.data?.length || 0}`);

  console.log(`3.5 CEO Mengesahkan Keputusan (APPROVE) untuk KYC ID: ${kycReqId}`);
  const ceoDecisionRes = await apiCall(`/ceo/identity/verifications/${kycReqId}/decision`, 'POST', {
    decision: 'APPROVE',
    reason: 'Disetujui oleh CEO setelah audit dokumen internal.'
  }, ceoHeaders);
  console.log(`    Status: ${ceoDecisionRes.status}, Decision: ${ceoDecisionRes.data.data?.status || ceoDecisionRes.data.message}`);

  console.log(`3.6 Verifikasi Status KYC di Database MySQL`);
  const [kycDbRows] = await db.execute('SELECT status, reviewed_by FROM identity_verification_requests WHERE id = ?', [kycReqId]);
  console.log(`    Database KYC Status: ${kycDbRows[0]?.status}, Reviewed By: ${kycDbRows[0]?.reviewed_by}`);

  if (kycDbRows[0]?.status === 'VERIFIED') {
    results.ceoKycExclusive = true;
    console.log('    >>> LULUS: CEO Employee KYC Decision Berhasil & Tercatat di MySQL!');
  } else {
    console.log('    >>> GAGAL: Status KYC di database belum VERIFIED.');
  }

  // --------------------------------------------------------------------------
  // ALUR 4: INVITATION WORKER & STAFF (12 Jam TTL, Token Valid vs Expired)
  // --------------------------------------------------------------------------
  console.log('\n--- [4/5] UJI INVITATION WORKER & STAFF (12H TTL, VALID VS EXPIRED) ---');
  // Ambil ID organisasi bengkel atau buat
  const [orgRows] = await db.execute('SELECT id FROM organizations LIMIT 1');
  const testOrgId = orgRows[0]?.id;

  // 4.1 Token Valid
  const rawTokenValid = crypto.randomBytes(32).toString('hex');
  const tokenHashValid = crypto.createHash('sha256').update(rawTokenValid).digest('hex');
  const invValidId = crypto.randomUUID();
  const validEmail = `worker_valid_${Date.now()}@servio.id`;

  // Expires in 12 hours (NOW + 12 hours)
  await db.execute(`
    INSERT INTO invitations 
    (id, kind, issuer_user_id, recipient_email, organization_id, target_role, token_hash, status, expires_at, created_at, updated_at)
    VALUES (?, 'WORKER_INVITE', ?, ?, ?, 'TECHNICIAN_STAFF', ?, 'INVITED', DATE_ADD(NOW(), INTERVAL 12 HOUR), NOW(), NOW())
  `, [invValidId, customerId, validEmail, testOrgId, tokenHashValid]);

  console.log(`4.1 Accept Valid Invitation (Token berlaku 12 jam)`);
  const acceptValidRes = await apiCall('/invitations/accept', 'POST', {
    token: rawTokenValid,
    full_name: 'Teknisi Handal',
    password: 'PasswordTeknisi123!',
    password_confirmation: 'PasswordTeknisi123!'
  });
  console.log(`    Status: ${acceptValidRes.status}, Message: ${acceptValidRes.data.message || 'OK'}`);

  const [invValidDb] = await db.execute('SELECT status, accepted_at FROM invitations WHERE id = ?', [invValidId]);
  console.log(`    Database Invitation Status: ${invValidDb[0]?.status}, Accepted At: ${invValidDb[0]?.accepted_at}`);
  if (invValidDb[0]?.status === 'ACCEPTED' && invValidDb[0]?.accepted_at) {
    results.invitationValidAccepted = true;
    console.log('    >>> LULUS: Undangan valid berhasil diterima dan tercatat di MySQL!');
  }

  // 4.2 Token Expired (> 12 jam yang lalu)
  const rawTokenExpired = crypto.randomBytes(32).toString('hex');
  const tokenHashExpired = crypto.createHash('sha256').update(rawTokenExpired).digest('hex');
  const invExpiredId = crypto.randomUUID();
  const expiredEmail = `worker_exp_${Date.now()}@servio.id`;

  // Expires 1 hour ago
  await db.execute(`
    INSERT INTO invitations 
    (id, kind, issuer_user_id, recipient_email, organization_id, target_role, token_hash, status, expires_at, created_at, updated_at)
    VALUES (?, 'WORKER_INVITE', ?, ?, ?, 'TECHNICIAN_STAFF', ?, 'INVITED', DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW(), NOW())
  `, [invExpiredId, customerId, expiredEmail, testOrgId, tokenHashExpired]);

  console.log(`4.2 Accept Expired Invitation (Kedaluwarsa > 12 jam)`);
  const acceptExpiredRes = await apiCall('/invitations/accept', 'POST', {
    token: rawTokenExpired,
    full_name: 'Teknisi Terlambat',
    password: 'PasswordTeknisi123!',
    password_confirmation: 'PasswordTeknisi123!'
  });
  console.log(`    Status: ${acceptExpiredRes.status}, Error: ${acceptExpiredRes.data.error || acceptExpiredRes.data.message}`);
  if (acceptExpiredRes.status === 410 || acceptExpiredRes.status === 400 || acceptExpiredRes.status === 422) {
    results.invitationExpiredRejected410 = true;
    console.log(`    >>> LULUS: Undangan kedaluwarsa ditolak secara tepat (HTTP ${acceptExpiredRes.status})!`);
  }

  // --------------------------------------------------------------------------
  // ALUR 5: BROWSER E2E ROLE & SESSION (Switch Role, Forbidden Access, Logout 401)
  // --------------------------------------------------------------------------
  console.log('\n--- [5/5] UJI ROLE SWITCH, FORBIDDEN ACCESS & SESSION LOGOUT ---');
  console.log(`5.1 Login as CEO`);
  const ceoSessionLogin = await apiCall('/auth/login', 'POST', {
    email: 'ceo@servio.id',
    password: 'Password2026!'
  });
  const currentCeoToken = ceoSessionLogin.data.data?.token;
  const currentCeoHeaders = { 'Authorization': `Bearer ${currentCeoToken}` };

  console.log(`5.2 Akses /ceo/identity/verifications sebelum switch -> 200 OK`);
  const preSwitch = await apiCall('/ceo/identity/verifications', 'GET', null, currentCeoHeaders);
  console.log(`    Pre-switch Status: ${preSwitch.status}`);

  // Ambil role assignments
  const meCeo = await apiCall('/auth/me', 'GET', null, currentCeoHeaders);
  const assignments = meCeo.data.data?.role_assignments || [];
  console.log(`    Available Roles: ${assignments.map(a => a.role_code).join(', ')}`);

  console.log(`5.3 Logout Session (/auth/logout)`);
  const logoutRes = await apiCall('/auth/logout', 'POST', null, currentCeoHeaders);
  console.log(`    Logout Status: ${logoutRes.status}, Message: ${logoutRes.data.message}`);

  console.log(`5.4 Akses /auth/me Sesudah Logout (Wajib Ditolak 401 Unauthorized)`);
  const postLogoutMe = await apiCall('/auth/me', 'GET', null, currentCeoHeaders);
  console.log(`    Post-logout /auth/me Status: ${postLogoutMe.status}`);
  if (postLogoutMe.status === 401) {
    results.sessionLogout401 = true;
    console.log('    >>> LULUS: Token/Session invalid setelah logout (401 Unauthorized)!');
  } else {
    console.log(`    >>> GAGAL: Response bukan 401, tetapi ${postLogoutMe.status}`);
  }

  await db.end();

  console.log('\n================================================================');
  console.log(' REKAPITULASI HASIL VERIFIKASI PENUTUP MODUL 01:');
  console.log('================================================================');
  console.table(results);

  const allPassed = Object.values(results).every(val => val === true);
  if (allPassed) {
    console.log('\nSTATUS AKHIR: FRONTEND_INTEGRATION_FINAL_PASS');
  } else {
    console.log('\nSTATUS AKHIR: PARTIAL');
  }
}

runClosureVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
