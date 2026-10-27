const services = [
  { name: "Identity Service (Modul 01)", port: 8001, url: "http://127.0.0.1:8001/api/v1/auth/login" },
  { name: "Category Service (Modul 02)", port: 8002, url: "http://127.0.0.1:8002/api/v1/categories" },
  { name: "Product Service (Modul 03)", port: 8003, url: "http://127.0.0.1:8003/api/v1/products" },
  { name: "Service Offering (Modul 04)", port: 8004, url: "http://127.0.0.1:8004/api/v1/services" },
  { name: "Order Barang Service (Modul 05)", port: 8005, url: "http://127.0.0.1:8005/api/v1/order-barang/cart" },
  { name: "Finance Service (Modul 06)", port: 8006, url: "http://127.0.0.1:8006/api/v1/finance/spay/me" },
];

async function runHealthCheck() {
  console.log("\n========================================================");
  console.log("       SERVIO MICROSERVICES REAL-TIME HEALTH CHECK       ");
  console.log("========================================================");

  for (const svc of services) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(svc.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const duration = Date.now() - start;
      console.log(`[BERJALAN] ${svc.name.padEnd(32)} -> Port ${svc.port} | HTTP ${res.status} (${duration}ms)`);
    } catch (err) {
      console.log(`[GAGAL]    ${svc.name.padEnd(32)} -> Port ${svc.port} | Error: ${err.message}`);
    }
  }
  console.log("========================================================\n");
}

runHealthCheck();
