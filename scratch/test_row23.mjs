import { execSync } from 'child_process';

const BACKEND_DIR = 'D:/website latihan/servio_web_13/backend/services/identity-service';
function runTinker(code) {
  const sanitized = code.replace(/"/g, '\\"');
  const cmd = `php artisan tinker --execute="${sanitized}"`;
  return execSync(cmd, { cwd: BACKEND_DIR, encoding: 'utf-8' }).trim();
}

async function testRow23() {
  const loginAdmin = await fetch(`http://localhost:3000/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: 'admin@servio.id', password: '12345678' }),
  });
  const adminJson = await loginAdmin.json();
  const adminTokenForOps = adminJson.data?.token;
  console.log('Admin Token:', adminTokenForOps ? 'OK' : 'FAIL');

  const appRevId = runTinker(
    `$user = App\\Models\\User::where('email', 'like', 'mitra_%')->first() ?? App\\Models\\User::first(); $app = App\\Models\\BusinessApplication::create(['application_code' => 'REG-E2E-REV-' . time(), 'applicant_user_id' => $user->id, 'target_role' => 'SERVICE_PROVIDER', 'status' => 'PENDING_REVIEW', 'lock_version' => 1, 'draft_data_ciphertext' => Illuminate\\Support\\Facades\\Crypt::encryptString(json_encode(['business' => ['legal_name' => 'PT Rev Test']]))]); echo $app->id;`
  );
  console.log('AppRevId raw:', JSON.stringify(appRevId));

  const url = `http://localhost:3000/api/v1/registration-applications/${appRevId}/review`;
  console.log('Fetching:', url);
  const revDecisionRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${adminTokenForOps}`,
    },
    body: JSON.stringify({
      decision: 'REQUEST_REVISION',
      reason: 'Harap lampirkan NIB terbaru dari OSS RBA',
      required_changes: ['NIB'],
      lock_version: 1,
    }),
  });
  console.log('revDecisionRes status:', revDecisionRes.status);
  const revJson = await revDecisionRes.json().catch(() => ({}));
  console.log('revDecisionRes body:', revJson);
}

testRow23();
