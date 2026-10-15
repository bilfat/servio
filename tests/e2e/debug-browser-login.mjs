import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('request', req => {
    if (req.url().includes('login') || req.url().includes('api')) {
      console.log('REQ:', req.method(), req.url());
    }
  });
  page.on('response', res => {
    if (res.url().includes('login') || res.url().includes('api')) {
      console.log('RES:', res.status(), res.url());
    }
  });

  console.log('Navigating to /auth/login...');
  await page.goto('http://localhost:3000/auth/login');
  await page.waitForSelector('input[type="email"]');

  console.log('Filling form...');
  await page.fill('input[type="email"]', 'customer@servio.id');
  await page.fill('input[type="password"]', '12345678');

  console.log('Clicking submit...');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('Current URL after submit:', page.url());

  await browser.close();
}

test();
