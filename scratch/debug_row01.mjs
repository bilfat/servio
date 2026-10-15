import { chromium } from 'playwright';

async function debugRow01() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.url().includes('/auth/login') || res.url().includes('/auth/me') || res.url().includes('/sanctum/csrf-cookie')) {
      console.log('HTTP RESP:', res.status(), res.url());
    }
  });

  await page.goto('http://localhost:3000/auth/login');
  await page.waitForSelector('input[type="email"]');

  // Submit wrong credentials
  console.log('--- 1. Submitting wrong credentials ---');
  await page.fill('input[type="email"]', 'wrong@fixture.test');
  await page.fill('input[type="password"]', 'WrongPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Submit valid credentials
  console.log('--- 2. Submitting valid credentials ---');
  await page.fill('input[type="email"]', 'customer@servio.id');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL((url) => !url.pathname.endsWith('/auth/login'), { timeout: 8000 });
    console.log('SUCCESS! Current URL:', page.url());
  } catch (err) {
    console.log('TIMEOUT! Current URL:', page.url());
    const errMsg = await page.$eval('.text-rose-700', el => el.textContent).catch(() => 'No error el');
    console.log('Page error element:', errMsg);
  }

  await browser.close();
}

debugRow01();
