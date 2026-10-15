import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', res => {
    if (res.url().includes('login')) {
      console.log('RES URL:', res.url(), 'STATUS:', res.status());
      res.text().then(t => console.log('RES BODY:', t.slice(0, 200))).catch(() => {});
    }
  });

  await page.goto('http://localhost:3000/auth/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'ceo@servio.id');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('PAGE URL AFTER SUBMIT:', page.url());

  await browser.close();
}

test();
