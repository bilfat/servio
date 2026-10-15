const res = await fetch('http://localhost:3000/api/v1/otp/challenges', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ purpose: 'ACCOUNT_VERIFICATION', identifier: 'customer@servio.id' })
});
console.log('Status:', res.status);
console.log('Body:', await res.json());
