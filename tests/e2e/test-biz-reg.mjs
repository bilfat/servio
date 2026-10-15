import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('http://localhost:3000/auth/register');
  await page.waitForTimeout(1000);

  // 1. Click BISNIS & MITRA
  await page.click('button:has-text("BISNIS & MITRA")');
  await page.waitForTimeout(500);

  // 2. Select Provider Jasa
  await page.click('button:has-text("Provider Jasa")');
  await page.waitForTimeout(500);

  // 3. Step 1: PIC Data
  await page.fill('input[placeholder*="Budi Santoso"]', 'PIC Mitra E2E');
  await page.fill('input[placeholder*="3201"]', '3174051208880003');
  await page.fill('input[placeholder*="Direktur"]', 'Direktur');
  const ts = Date.now();
  await page.fill('input[placeholder*="+628123456789"]', `+62812999${String(ts).slice(-6)}`);
  await page.fill('input[placeholder*="budi@perusahaan.com"]', `pic_${ts}@fixture.test`);
  await page.click('button:has-text("Lanjut ke Data Perusahaan")');
  await page.waitForTimeout(500);

  // 4. Step 2: Legal Data
  await page.fill('input[placeholder*="PT Maju Jaya"]', 'PT Mitra Servio Mandiri E2E');
  await page.fill('input[placeholder*="Maju Jaya Teknik"]', 'Servio Mandiri Teknik E2E');
  await page.fill('input[placeholder*="0123456789012"]', '9120000000002');
  await page.fill('input[placeholder*="01.234.567.8"]', '01.234.567.8-012.000');
  await page.fill('input[placeholder*="admin@maju"]', `biz_${ts}@fixture.test`);
  await page.fill('input[placeholder*="021-1234567"]', '+628129998877');
  await page.fill('input[placeholder*="Jl. Industri"]', 'Jl. Otista Raya No. 100');
  await page.click('button:has-text("Lanjut ke Spesialisasi")');
  await page.waitForTimeout(500);

  // 5. Step 3: Specialization -> Submit Draft
  const [draftRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/registration-applications')),
    page.click('button:has-text("Simpan Draf")'),
  ]);
  console.log('BIZ DRAFT RESPONSE STATUS:', draftRes.status(), await draftRes.json());

  await browser.close();
})();
