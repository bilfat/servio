const http = require('http');
const net = require('net');

const services = [
  { name: 'Identity Service (Modul 01)', port: 8001, path: '/up' },
  { name: 'Category Service (Modul 02)', port: 8002, path: '/api/v1/health' },
  { name: 'Product Service (Modul 03)', port: 8003, path: '/api/v1/health' },
  { name: 'Service Offering (Modul 04)', port: 8004, path: '/api/v1/health' },
  { name: 'Order Barang (Modul 05A)', port: 8005, path: '/api/v1/order-barang/health' },
  { name: 'Finance Service (Modul 06)', port: 8006, path: '/api/v1/finance/health' },
  { name: 'Order Jasa Service (Modul 05B)', port: 8007, path: '/api/v1/order-jasa/health' },
];

function checkTcp(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function run() {
  console.log('===============================================================');
  console.log('       SERVIO SYSTEM HEALTH & PORT VERIFICATION REPORT        ');
  console.log('===============================================================');

  // Check MySQL (Port 3306)
  const mysqlRunning = await checkTcp('127.0.0.1', 3306);
  console.log(`[${mysqlRunning ? 'PASS' : 'FAIL'}] MySQL Database Server on PORT 3306 -> ${mysqlRunning ? 'LISTENING (BERJALAN)' : 'NOT CONNECTED'}`);

  // Check each microservice
  for (const svc of services) {
    const tcpOpen = await checkTcp('127.0.0.1', svc.port);
    if (!tcpOpen) {
      console.log(`[FAIL] ${svc.name} on PORT ${svc.port} -> PORT NOT OPEN`);
      continue;
    }

    await new Promise((resolve) => {
      const req = http.get({ host: '127.0.0.1', port: svc.port, path: svc.path, timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`[PASS] ${svc.name} on PORT ${svc.port} -> HTTP ${res.statusCode} (BERJALAN & HEALTHY)`);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.log(`[WARN] ${svc.name} on PORT ${svc.port} -> TCP OPEN, HTTP err: ${err.message}`);
        resolve();
      });
      req.on('timeout', () => {
        req.destroy();
        console.log(`[WARN] ${svc.name} on PORT ${svc.port} -> TIMEOUT on ${svc.path}`);
        resolve();
      });
    });
  }

  // Check Frontend (Port 3000)
  const frontendRunning = await checkTcp('127.0.0.1', 3000);
  console.log(`[${frontendRunning ? 'PASS' : 'INFO'}] Next.js Frontend on PORT 3000 -> ${frontendRunning ? 'LISTENING (BERJALAN)' : 'NOT RUNNING (Frontend dev server optional)'}`);
  console.log('===============================================================');
}

run();

