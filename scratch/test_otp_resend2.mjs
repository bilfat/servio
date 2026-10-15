import { execSync } from 'child_process';

const createRes = await fetch('http://localhost:3000/api/v1/otp/challenges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ purpose: 'ACCOUNT_VERIFICATION', identifier: 'customer@servio.id' })
});
const createJson = await createRes.json();
const chId = createJson.data.challenge_id;

// Fast forward resend_available_at in DB
execSync(`php artisan tinker --execute="$c = App\\Models\\OtpChallenge::find('${chId}'); $c->resend_available_at = now()->subSecond(); $c->save();"`, {
  cwd: 'D:/website latihan/servio_web_13/backend/services/identity-service'
});

const res = await fetch(`http://localhost:3000/api/v1/otp/challenges/${chId}/resend`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ identifier: 'customer@servio.id' })
});
console.log('Fast-forward Resend Status:', res.status);
console.log('Fast-forward Resend Body:', await res.json());
