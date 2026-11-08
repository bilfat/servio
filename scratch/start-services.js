const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const services = [
  { name: 'Identity Service', dir: 'backend/services/identity-service', port: 8001 },
  { name: 'Category Service', dir: 'backend/services/category-service', port: 8002 },
  { name: 'Product Service', dir: 'backend/services/product-service', port: 8003 },
  { name: 'Service Offering Service', dir: 'backend/services/service-service', port: 8004 },
  { name: 'Order Barang Service', dir: 'backend/services/order-barang-service', port: 8005 },
  { name: 'Finance Service', dir: 'backend/services/finance-service', port: 8006 },
  { name: 'Order Jasa Service', dir: 'backend/services/order-jasa-service', port: 8007 },
  { name: 'After-Sales Service', dir: 'backend/services/after-sales-service', port: 8008 },
];

const repoRoot = path.resolve(__dirname, '..');
const logsDir = path.join(repoRoot, 'scratch', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 1. Ensure MySQL is running on port 3306
try {
  const netstat = execSync('netstat -ano').toString();
  const mysqlRunning = /:(?:3306)\s+.*LISTENING/i.test(netstat);
  if (!mysqlRunning) {
    console.log('MySQL (port 3306) is not active. Attempting to start XAMPP MySQL in background...');
    const xamppMysql = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
    if (fs.existsSync(xamppMysql)) {
      const mysqlChild = spawn(xamppMysql, ['--defaults-file=C:\\xampp\\mysql\\bin\\my.ini', '--standalone'], {
        cwd: 'C:\\xampp',
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
      });
      mysqlChild.unref();
      console.log('Started XAMPP MySQL in background.');
    } else {
      console.warn('Warning: XAMPP MySQL not found at C:\\xampp. Please ensure MySQL is running.');
    }
  } else {
    console.log('[OK] MySQL (port 3306) is running.');
  }
} catch (e) {
  console.warn('Could not check MySQL status:', e.message);
}

// 2. Kill existing processes on ports 8001..8008
try {
  const netstat = execSync('netstat -ano').toString();
  for (const svc of services) {
    const regex = new RegExp(`(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::\\]):${svc.port}\\s+.*LISTENING\\s+(\\d+)`, 'gi');
    let match;
    while ((match = regex.exec(netstat)) !== null) {
      const pid = match[1];
      if (pid) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[CLEANUP] Stopped existing process on port ${svc.port} (PID: ${pid})`);
        } catch (_) {}
      }
    }
  }
} catch (e) {}

// 3. Start each service detached & hidden (zero popups/windows)
console.log('\nLaunching all 8 SERVIO Microservices in background...');
for (const svc of services) {
  const cwd = path.join(repoRoot, svc.dir);
  const outLog = path.join(logsDir, `service-${svc.port}.log`);
  const errLog = path.join(logsDir, `service-${svc.port}-err.log`);

  const out = fs.openSync(outLog, 'w');
  const err = fs.openSync(errLog, 'w');

  const child = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', `--port=${svc.port}`, '--no-reload'], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', out, err],
    env: {
      ...process.env,
      PHP_CLI_SERVER_WORKERS: '4',
    },
  });

  child.unref();
  console.log(`  -> [STARTED] ${svc.name} on http://127.0.0.1:${svc.port} (PID: ${child.pid})`);
}

console.log('\nAll 8 microservices initiated.');
