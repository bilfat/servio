const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    // Set cookie for active role WORKER
    await context.addCookies([
      { name: 'servio_role', value: 'WORKER_TECHNICIAN', domain: 'localhost', path: '/' },
      { name: 'servio_user_id', value: 'acfdfc27-9ba5-472f-bec1-3c372f47fff6', domain: 'localhost', path: '/' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/worker/jobs?tab=SELESAI', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratch/worker_jobs_selesai.png', fullPage: true });
    console.log('Screenshot saved to scratch/worker_jobs_selesai.png');
    await browser.close();
  } catch (e) {
    console.error('Playwright error:', e.message);
  }
})();

