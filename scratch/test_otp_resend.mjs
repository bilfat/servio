const createRes = await fetch('http://localhost:3000/api/v1/otp/challenges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ purpose: 'ACCOUNT_VERIFICATION', identifier: 'customer@servio.id' })
});
const createJson = await createRes.json();
const chId = createJson.data.challenge_id;

const res = await fetch(`http://localhost:3000/api/v1/otp/challenges/${chId}/resend`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ identifier: 'customer@servio.id' })
});
console.log('Resend Status:', res.status);
console.log('Resend Body:', await res.json());
