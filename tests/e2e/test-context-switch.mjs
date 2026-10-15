import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const role of ['customer@servio.id', 'admin@servio.id', 'provider@servio.id']) {
    console.log('Testing fresh context for:', role);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', role);
    await page.fill('input[type="password"]', '12345678');
    
    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/auth/login') && res.status() === 200,
      { timeout: 7000 }
    ).catch(() => null);

    await page.click('button[type="submit"]');
    const res = await loginPromise;
    console.log('  Login status:', res ? res.status() : 'null', 'URL:', page.url());
    await context.close();
  }

  await browser.close();
  console.log('ALL PASSED!');
}

test();
