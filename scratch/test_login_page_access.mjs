import { chromium } from 'playwright';

async function testLoginPageAccess() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();

  // Set cookies seolah-olah user pernah login sebagai ADMIN_OPERATIONS
  await context.addCookies([
    { name: 'servio_active_role', value: 'ADMIN_OPERATIONS', domain: 'localhost', path: '/' },
    { name: 'servio_guest', value: '0', domain: 'localhost', path: '/' },
    { name: 'servio_token', value: 'servio-demo-token-123', domain: 'localhost', path: '/' },
  ]);

  const page = await context.newPage();

  console.log('1. Mengunjungi halaman utama http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('2. Mengklik atau membuka halaman /auth/login ...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  console.log('Current URL setelah membuka /auth/login:', currentUrl);

  const emailInput = await page.$('input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');
  const submitButton = await page.$('button[type="submit"]');

  console.log('Verifikasi elemen form login:');
  console.log('- Input Email ditemukan  :', Boolean(emailInput));
  console.log('- Input Password ditemukan:', Boolean(passwordInput));
  console.log('- Tombol Submit ditemukan:', Boolean(submitButton));

  const isStayOnLogin = currentUrl.includes('/auth/login');
  if (isStayOnLogin && emailInput && passwordInput && submitButton) {
    console.log('\n>>> SUKSES: Halaman form login tetap terbuka dan TIDAK auto-redirect ke dashboard admin!');
  } else {
    console.log('\n>>> GAGAL: Terjadi redirect atau form login tidak tampil.');
  }

  await browser.close();
}

testLoginPageAccess();
