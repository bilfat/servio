import { chromium } from 'playwright';

async function testProviderLogin() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', async (res) => {
    if (res.url().includes('/auth/login')) {
      console.log('Login response status:', res.status());
      console.log('Login response text:', await res.text());
    }
  });

  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'provider@servio.id');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await browser.close();
}

testProviderLogin().catch(console.error);
