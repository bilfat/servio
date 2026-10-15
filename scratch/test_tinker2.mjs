import { execSync } from 'child_process';

const code = `$u = App\\Models\\User::firstOrCreate(['email' => 'reset_test@servio.id'], ['phone_e164' => '+628123456789', 'password_hash' => password_hash('Pass123!', 1), 'status' => 'ACTIVE', 'authz_version' => 1]); $token = 'valid_grant_test_123'; App\\Models\\PasswordResetGrant::create(['user_id' => $u->id, 'challenge_id' => null, 'grant_token_hash' => hash('sha256', $token), 'expires_at' => now()->addMinutes(10)]); echo json_encode(['token' => $token, 'userId' => $u->id]);`;

const sanitized = code.replace(/"/g, '\\"');
const cmd = `php artisan tinker --execute="${sanitized}"`;
const out = execSync(cmd, { cwd: 'D:/website latihan/servio_web_13/backend/services/identity-service', encoding: 'utf-8' }).trim();
console.log('Raw output:', out);
console.log('Parsed:', JSON.parse(out));
