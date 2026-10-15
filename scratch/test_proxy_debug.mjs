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
          resolve({ status: res.status, statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.status, statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log("=== Testing through Next.js proxy (http://localhost:3000) ===");
  const res = await request('http://localhost:3000/api/v1/auth/invitations/test-invalid/accept', {
    method: 'POST',
    body: { password: 'TestPassword123!', password_confirmation: 'TestPassword123!' }
  });
  console.log("Proxy response status:", res.statusCode, "Data:", res.data || res.raw);

  const res2 = await request('http://localhost:3000/api/v1/auth/invitation/complete', {
    method: 'POST',
    body: { token: 'test-invalid', password: 'TestPassword123!', password_confirmation: 'TestPassword123!' }
  });
  console.log("Proxy complete status:", res2.statusCode, "Data:", res2.data || res2.raw);
}

run().catch(console.error);
