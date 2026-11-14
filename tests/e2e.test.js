/**
 * Playwright E2E Test - ระบบลางานผ่าน LINE
 * ทดสอบหน้าเว็บทั้ง 3 หน้า: ลงทะเบียน, ยื่นใบลา, ไม่อนุมัติ
 * ทดสอบทั้งมุมมอง Desktop PC และ Mobile
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://line-leave-relay.finnlution.workers.dev';

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

let passed = 0;
let failed = 0;

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function assert(name, condition) {
  if (condition) {
    passed++;
    log('✅', name);
  } else {
    failed++;
    log('❌', `FAIL: ${name}`);
  }
}

async function testPingEndpoint() {
  console.log('\n📡 Test 1: Ping Endpoint (API Health Check)');
  const res = await fetch(`${BASE_URL}/ping`);
  const data = await res.json();
  await assert('Status HTTP 200', res.status === 200);
  await assert('status = ok', data.status === 'ok');
  await assert('supabaseConnected = true', data.supabaseConnected === true);
  await assert('hasChannelSecret = true', data.hasChannelSecret === true);
  await assert('hasChannelAccessToken = true', data.hasChannelAccessToken === true);
}

async function testExportHrEndpoint() {
  console.log('\n📊 Test 2: Export HR CSV Endpoint');
  const res = await fetch(`${BASE_URL}/export-hr`);
  const text = await res.text();
  await assert('Status HTTP 200', res.status === 200);
  await assert('Content-Type = text/csv', res.headers.get('content-type').includes('text/csv'));
  await assert('CSV มีหัวตาราง "บริษัท"', text.includes('บริษัท'));
  await assert('CSV มีหัวตาราง "เหตุผลที่ไม่อนุมัติ"', text.includes('เหตุผลที่ไม่อนุมัติ'));
  await assert('CSV มีรูปแบบวันที่ พ.ศ.', text.includes('/2569') || text.includes('/2570'));
}

async function testRegisterPage(browser, viewportName, viewport) {
  console.log(`\n📝 Test 3: Register Page (${viewportName})`);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await assert(`[${viewportName}] หน้าโหลดสำเร็จ (Title)`, (await page.title()).includes('ลงทะเบียน'));
  await assert(`[${viewportName}] มี LIFF SDK โหลดอยู่`, await page.evaluate(() => typeof liff !== 'undefined'));
  await assert(`[${viewportName}] มีฟอร์ม #registerForm`, await page.locator('#registerForm').count() > 0);
  await assert(`[${viewportName}] มีฟิลด์ #company`, await page.locator('#company').count() > 0);
  await assert(`[${viewportName}] มีฟิลด์ #employeeId`, await page.locator('#employeeId').count() > 0);
  await assert(`[${viewportName}] มีฟิลด์ #fullName`, await page.locator('#fullName').count() > 0);
  await assert(`[${viewportName}] มีฟิลด์ #division`, await page.locator('#division').count() > 0);
  await assert(`[${viewportName}] มีฟิลด์ #department`, await page.locator('#department').count() > 0);

  // Check PC auto-login: script should call liff.login() instead of showing error
  const scriptContent = await page.content();
  await assert(`[${viewportName}] มี liff.login() สำหรับ PC auto-login`, scriptContent.includes('liff.login('));
  await assert(`[${viewportName}] ไม่มีข้อความ "กรุณาเปิดหน้านี้ผ่าน LINE LIFF" (PC block removed)`, !scriptContent.includes('กรุณาเปิดหน้านี้ผ่าน LINE LIFF'));

  await context.close();
}

async function testLeavePage(browser, viewportName, viewport) {
  console.log(`\n📋 Test 4: Leave Request Page (${viewportName})`);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/leave`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await assert(`[${viewportName}] หน้าโหลดสำเร็จ (Title)`, (await page.title()).includes('ยื่นใบลา') || (await page.title()).includes('ลา'));
  await assert(`[${viewportName}] มี LIFF SDK`, await page.evaluate(() => typeof liff !== 'undefined'));

  const scriptContent = await page.content();
  await assert(`[${viewportName}] มี liff.login() สำหรับ PC auto-login`, scriptContent.includes('liff.login('));
  await assert(`[${viewportName}] ไม่มี PC block message`, !scriptContent.includes('กรุณาเปิดหน้านี้ผ่าน LINE LIFF'));

  await context.close();
}

async function testRejectPage(browser, viewportName, viewport) {
  console.log(`\n🛑 Test 5: Reject Reason Page (${viewportName})`);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/reject?reqId=TEST-001`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await assert(`[${viewportName}] หน้าโหลดสำเร็จ (Title)`, (await page.title()).includes('ไม่อนุมัติ'));
  await assert(`[${viewportName}] มี LIFF SDK`, await page.evaluate(() => typeof liff !== 'undefined'));
  await assert(`[${viewportName}] มีฟอร์ม #rejectForm`, await page.locator('#rejectForm').count() > 0);
  await assert(`[${viewportName}] มี textarea #rejectReason`, await page.locator('#rejectReason').count() > 0);
  await assert(`[${viewportName}] มีปุ่ม submitBtn`, await page.locator('#submitBtn').count() > 0);
  await assert(`[${viewportName}] แสดงรหัสคำขอ TEST-001`, (await page.locator('#displayReqId').textContent()) === 'TEST-001');
  await assert(`[${viewportName}] มีข้อความ "เหตุผลที่ไม่อนุมัติ"`, (await page.content()).includes('เหตุผลที่ไม่อนุมัติ'));
  await assert(`[${viewportName}] มี liff.login() สำหรับ PC auto-login`, (await page.content()).includes('liff.login('));

  await context.close();
}

async function testRootPage() {
  console.log('\n🌐 Test 6: Root Portal Page (/)');
  const res = await fetch(BASE_URL);
  const text = await res.text();
  await assert('Status HTTP 200', res.status === 200);
  await assert('มีข้อความระบบลางาน', text.includes('ระบบบริหารการลางาน') || text.includes('LINE Leave'));
  await assert('มีปุ่มไปหน้า /register', text.includes('href="/register"'));
  await assert('มีปุ่มไปหน้า /leave', text.includes('href="/leave"'));
}

(async () => {
  console.log('======================================================');
  console.log(' 🧪 Playwright E2E Test: ระบบลางาน LINE + Supabase + Cloudflare');
  console.log('======================================================');

  // API Tests (no browser needed)
  await testPingEndpoint();
  await testExportHrEndpoint();
  await testRootPage();

  // Browser Tests
  const browser = await chromium.launch({ headless: true });

  // Desktop PC Tests
  await testRegisterPage(browser, 'Desktop PC', DESKTOP_VIEWPORT);
  await testLeavePage(browser, 'Desktop PC', DESKTOP_VIEWPORT);
  await testRejectPage(browser, 'Desktop PC', DESKTOP_VIEWPORT);

  // Mobile Tests
  await testRegisterPage(browser, 'Mobile', MOBILE_VIEWPORT);
  await testLeavePage(browser, 'Mobile', MOBILE_VIEWPORT);
  await testRejectPage(browser, 'Mobile', MOBILE_VIEWPORT);

  await browser.close();

  // Summary
  console.log('\n======================================================');
  console.log(` 📊 ผลการทดสอบรวม: ✅ ผ่าน ${passed} รายการ / ❌ ไม่ผ่าน ${failed} รายการ`);
  console.log('======================================================');

  if (failed > 0) {
    console.log('\n⚠️ มีบางรายการทดสอบไม่ผ่าน กรุณาตรวจสอบข้อผิดพลาดด้านบน');
    process.exit(1);
  } else {
    console.log('\n🎉 ผ่านทุกรายการทดสอบ ระบบพร้อมใช้งานสมบูรณ์!');
  }
})();
