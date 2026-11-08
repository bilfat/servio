const { execSync } = require('child_process');

const ports = [8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008];
console.log('Stopping microservices on ports 8001-8008...');

try {
  const netstat = execSync('netstat -ano').toString();
  const killedPids = new Set();

  for (const port of ports) {
    const regex = new RegExp(`(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::\\]):${port}\\s+.*LISTENING\\s+(\\d+)`, 'gi');
    let match;
    while ((match = regex.exec(netstat)) !== null) {
      const pid = match[1];
      if (pid && !killedPids.has(pid)) {
        killedPids.add(pid);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[STOPPED] Process on port ${port} (PID: ${pid})`);
        } catch (e) {
          // Process might have already exited
        }
      }
    }
  }

  if (killedPids.size === 0) {
    console.log('No running microservice processes found on ports 8001-8008.');
  } else {
    console.log(`Cleaned up ${killedPids.size} processes.`);
  }
} catch (err) {
  console.error('Error stopping services:', err.message);
}

