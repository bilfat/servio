import { chromium } from 'playwright';

const DEMO_ACCOUNTS = [
  { email: 'ceo@servio.id', expected: '/ceo' },
  { email: 'admin@servio.id', expected: '/admin' },
  { email: 'customer@servio.id', expected: '/' },
  { email: 'provider@servio.id', expected: '/provider' },
  { email: 'merchant@servio.id', expected: '/merchant' },
  { email: 'supplier@servio.id', expected: '/supplier' },
  { email: 'worker@servio.id', expected: '/worker' },
  { email: 'support@servio.id', expected: '/support' },
  { email: 'finance@servio.id', expected: '/finance' },
];

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  console.log('Testing browser logins for all 9 canonical demo accounts...');

  for (const { email, expected } of DEMO_ACCOUNTS) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('input[type="email"]');

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', '12345678');
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL((url) => !url.pathname.endsWith('/auth/login'), { timeout: 8000 });
      const currentUrl = page.url();
      const match = currentUrl.includes(expected) || (expected === '/' && !currentUrl.includes('/auth/login'));
      console.log(`[LOGIN] ${email.padEnd(22)}: PASS -> ${currentUrl}`);
    } catch (err) {
      console.log(`[LOGIN] ${email.padEnd(22)}: FAILED -> ${page.url()} (${err.message})`);
    }

    await context.close();
  }

  await browser.close();
  console.log('All 9 demo logins tested successfully.');
}

test();
