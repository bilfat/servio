import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('login') || req.url().includes('csrf')) {
      console.log('REQ:', req.method(), req.url());
      console.log('   Headers:', req.headers());
    }
  });
  page.on('response', res => {
    if (res.url().includes('login') || res.url().includes('csrf')) {
      console.log('RES:', res.status(), res.url());
    }
  });

  await page.goto('http://localhost:3000/auth/login');
  await page.waitForSelector('input[type="email"]');

  await page.fill('input[type="email"]', 'customer@servio.id');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('URL after login:', page.url());

  await browser.close();
}

test();
