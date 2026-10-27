const http = require('http');

const services = [
  { name: 'Identity Service (Modul 01)', port: 8001, path: '/api/v1/auth/login' },
  { name: 'Category Service (Modul 02)', port: 8002, path: '/api/v1/categories' },
  { name: 'Product Service (Modul 03)', port: 8003, path: '/api/v1/products' },
  { name: 'Service Offering (Modul 04)', port: 8004, path: '/api/v1/services' },
  { name: 'Order Barang (Modul 05)', port: 8005, path: '/api/v1/order-barang/cart' },
  { name: 'Finance Service (Modul 06)', port: 8006, path: '/api/v1/finance/spay/me' },
];

Promise.all(
  services.map(
    (svc) =>
      new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port: svc.port, path: svc.path, timeout: 15000 }, (res) => {
          resolve({ ...svc, status: res.statusCode, active: true });
        });
        req.on('error', (err) => {
          resolve({ ...svc, error: err.message, active: false });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve({ ...svc, error: 'TIMEOUT', active: false });
        });
      })
  )
).then((results) => {
  console.log('\n=== SERVIO MICROSERVICES HEALTH REPORT ===');
  results.forEach((r) => {
    if (r.active) {
      console.log(`[PASS] ${r.name} on PORT ${r.port} -> HTTP ${r.status} (BERJALAN)`);
    } else {
      console.log(`[FAIL] ${r.name} on PORT ${r.port} -> ERROR: ${r.error}`);
    }
  });
});
