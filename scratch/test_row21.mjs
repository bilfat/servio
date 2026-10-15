import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'id-ID' });
  const page = await context.newPage();
  
  // Track network
  page.on('response', res => {
    if (res.url().includes('registration-applications')) {
      console.log(`[NET] ${res.status()} ${res.url()}`);
    }
  });

  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'admin@servio.id');
  await page.fill('input[type="password"]', '12345678');
  await Promise.all([
    page.waitForResponse(res => res.url().includes('/auth/login') && res.status() === 200),
    page.click('button[type="submit"]')
  ]);
  console.log('Logged in successfully!');

  await page.waitForTimeout(1000);
  await page.goto('http://localhost:3000/admin/registration-applications');
  await page.waitForTimeout(3000);

  const html = await page.content();
  console.log('Page URL:', page.url());
  console.log('Contains table:', html.includes('<table'));
  console.log('Contains Belum ada permohonan:', html.includes('Belum ada permohonan'));
  console.log('Contains Memuat:', html.includes('Memuat data aplikasi'));
  console.log('Body text snippet:', (await page.textContent('body')).slice(0, 300));

  await browser.close();
}

test().catch(console.error);
