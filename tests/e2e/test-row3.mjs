import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('http://localhost:3000/auth/register');
  await page.waitForTimeout(1000);
  
  // 1. Select Customer
  await page.click('button:has-text("PELANGGAN")');
  await page.waitForTimeout(500);

  // 2. Step 1: Account info
  await page.fill('input[placeholder*="Budi Santoso"]', 'E2E Customer Test');
  const ts = Date.now();
  await page.fill('input[placeholder*="budi@example.com"]', `cust_${ts}@fixture.test`);
  await page.fill('input[placeholder*="+628123456789"]', `+62812999${String(ts).slice(-6)}`);
  await page.fill('input[placeholder*="Minimal 8"]', 'Password123!');
  await page.fill('input[placeholder*="Ulangi"]', 'Password123!');
  await page.click('button:has-text("Lanjut ke Verifikasi")');
  await page.waitForTimeout(500);

  // 3. Step 2: NIK
  await page.fill('input[placeholder*="3201"]', '3174051208880001');
  const [res] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/register')),
    page.click('button[type="submit"]'),
  ]);
  console.log('REGISTER RESPONSE STATUS:', res.status(), await res.json());

  await browser.close();
})();
