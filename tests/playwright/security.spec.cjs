const { test, expect } = require('playwright/test');
const { createHmac } = require('node:crypto');

const SECRET = 'playwright-test-line-secret';

// Managed by Playwright webServer; stop endpoint only needed if run manually

test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset');
});

test('HR report requires an authorized LINE identity', async ({ request }) => {
  const publicDownload = await request.get('/export-hr');
  expect(publicDownload.status()).toBe(200);
  expect(publicDownload.headers()['content-type']).toContain('text/html');
  const reportPage = await publicDownload.text();
  expect(reportPage).toContain('รายงาน HR');
  expect(reportPage).not.toContain('ข้อมูลเฉพาะ HR');

  const noLogin = await request.post('/api', {
    data: { fn: 'exportHr', args: [{}] }
  });
  expect(noLogin.status()).toBe(401);

  const employee = await request.post('/api', {
    data: { fn: 'exportHr', args: [{ lineUserId: 'EMPLOYEE-1', idToken: 'valid-employee-token' }] }
  });
  expect(employee.status()).toBe(403);
  expect(await employee.text()).not.toContain('ข้อมูลเฉพาะ HR');

  const hr = await request.post('/api', {
    data: { fn: 'exportHr', args: [{ lineUserId: 'HR-1', idToken: 'valid-hr-token' }] }
  });
  expect(hr.status()).toBe(200);
  expect(hr.headers()['content-type']).toContain('text/csv');
  expect(await hr.text()).toContain('ข้อมูลเฉพาะ HR');
});

test('leave details require authentication and the assigned approver', async ({ request }) => {
  const anonymous = await request.post('/api', {
    data: { fn: 'getLeaveRequestDetail', args: [{ reqId: 'LV-DETAIL' }] }
  });
  expect(anonymous.status()).toBe(401);

  const unrelatedUser = await request.post('/api', {
    data: {
      fn: 'getLeaveRequestDetail',
      args: [{ reqId: 'LV-DETAIL', approverLineId: 'HR-1', idToken: 'valid-hr-token' }]
    }
  });
  expect(unrelatedUser.status()).toBe(403);
  expect(await unrelatedUser.text()).not.toContain('เหตุผลทดสอบ');

  const manager = await request.post('/api', {
    data: {
      fn: 'getLeaveRequestDetail',
      args: [{ reqId: 'LV-DETAIL', approverLineId: 'MANAGER-1', idToken: 'valid-manager-token' }]
    }
  });
  expect(manager.status()).toBe(200);
  const detail = await manager.json();
  expect(JSON.stringify(detail)).toContain('เหตุผลทดสอบ');
  expect(detail.result).not.toHaveProperty('manager_line_id');
  expect(detail.result).not.toHaveProperty('gm_line_id');

  const expiresAt = Math.floor(Date.now() / 1000) - 1;
  const expiredSig = createHmac('sha256', SECRET)
    .update(`LV-DETAIL:MANAGER-1:${expiresAt}`)
    .digest('hex')
    .slice(0, 32);
  const expiredLink = await request.post('/api', {
    data: {
      fn: 'getLeaveRequestDetail',
      args: [{ reqId: 'LV-DETAIL', approverLineId: 'MANAGER-1', expiresAt, sig: expiredSig }]
    }
  });
  expect(expiredLink.status()).toBe(401);
});

test('reject action is limited to the assigned approver', async ({ request }) => {
  const response = await request.post('/api', {
    data: {
      fn: 'rejectLeaveRequest',
      args: [{ reqId: 'LV-REJECT', reason: 'ไม่อนุมัติ', approverLineId: 'HR-1', idToken: 'valid-hr-token' }]
    }
  });
  expect(response.status()).toBe(403);

  const state = await (await request.get('/__test/state')).json();
  expect(state.patches).toHaveLength(0);
});

test('postback approval cannot use a global allow-list to bypass request assignment', async ({ request }) => {
  const body = JSON.stringify({
    events: [{
      type: 'postback',
      replyToken: 'reply-token',
      postback: { data: 'action=approve&reqId=LV-APPROVAL' },
      source: { type: 'user', userId: 'HR-1' }
    }]
  });
  const signature = createHmac('sha256', SECRET).update(body).digest('base64');
  const response = await request.post('/webhook', {
    data: body,
    headers: { 'x-line-signature': signature, 'content-type': 'application/json' }
  });
  expect(response.status()).toBe(200);

  const state = await (await request.get('/__test/state')).json();
  expect(state.patches).toHaveLength(0);
});

test('portal provides a protected download action and reject page hides unauthenticated form', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>false,login:()=>{window.__liffLoginCalled=true},getIDToken:()=>"",getProfile:async()=>({userId:"EMPLOYEE-1"})};'
  }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ดาวน์โหลดรายงาน HR/i })).toBeVisible();
  await expect(page.locator('a[href="/export-hr"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i })).toBeVisible();
  await page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i }).click();
  expect(await page.evaluate(() => window.__liffLoginCalled)).toBe(true);
  await page.getByRole('button', { name: /ดาวน์โหลดรายงาน HR/i }).click();
  await expect(page).toHaveURL(/\/export-hr$/);
  await expect(page.locator('#hrReportStatus')).toContainText(/กำลังเข้าสู่ระบบ LINE/i);
  expect(await page.evaluate(() => window.__liffLoginCalled)).toBe(true);

  await page.goto('/register');
  await expect(page.locator('#registerForm')).toHaveCount(1);
  await expect(page).toHaveTitle(/ลงทะเบียน/);

  await page.goto('/leave');
  await expect(page).toHaveTitle(/ยื่นใบลา|ลา/);

  await page.goto('/reject?reqId=LV-UNSIGNED');
  await expect(page.locator('#rejectForm')).toBeHidden();
  await expect(page.getByText(/กำลังเข้าสู่ระบบ LINE/i)).toBeVisible();
  expect(await page.evaluate(() => window.__liffLoginCalled)).toBe(true);
});

test('portal shows the active LINE profile and logout action when signed in', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},logout:()=>{},getIDToken:()=>"valid-manager-token",getProfile:async()=>({userId:"MANAGER-1",displayName:"หัวหน้าทดสอบ",pictureUrl:"https://example.test/avatar.png"})};'
  }));
  await page.goto('/');
  await expect(page.locator('#accountName')).toHaveText('หัวหน้าทดสอบ');
  await expect(page.locator('#cardLeaveBadge')).toContainText('พร้อมยื่นใบลา');
  await expect(page.locator('#cardRegisterBadge')).toContainText('ลงทะเบียนแล้ว');
  await expect(page.getByRole('button', { name: /ออกจากระบบ/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i })).toBeHidden();
  await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
  await expect(page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i })).toBeVisible();
  await expect(page.locator('#accountName')).toBeHidden();
});

test('portal logout clears the leave LIFF session and leaves it ready for explicit login', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const sessionKey='test-liff-sessions';
      if(!localStorage.getItem(sessionKey)) localStorage.setItem(sessionKey,JSON.stringify({"2011955364-wZgUDTq6":true,"2011955364-O2qTmo0r":true,"2011955364-FCY27ABh":true}));
      let activeId='';
      const getSessions=()=>JSON.parse(localStorage.getItem(sessionKey)||'{}');
      window.liff={
        init:async({liffId})=>{activeId=liffId;window.__activeLiffId=liffId},
        isLoggedIn:()=>getSessions()[activeId]===true,
        login:()=>{window.__liffLoginCalled=true},
        logout:()=>{const sessions=getSessions();sessions[activeId]=false;localStorage.setItem(sessionKey,JSON.stringify(sessions))},
        getIDToken:()=>"valid-employee-token",
        getProfile:async()=>({userId:"EMPLOYEE-1",displayName:"พนักงานทดสอบ"}),
        isInClient:()=>false
      };
    `
  }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /ออกจากระบบ/i })).toBeVisible();
  await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
  await expect(page.locator('#cardLeaveBadge')).toContainText('ต้องเข้าสู่ระบบก่อน');
  await page.goto('/leave');
  await expect.poll(async () => page.evaluate(() => window.__activeLiffId)).toBe('2011955364-FCY27ABh');
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('test-liff-sessions')));
  expect(sessions['2011955364-FCY27ABh']).toBe(false);
  await expect(page.getByRole('button', { name: /เข้าสู่ระบบ LINE ใหม่อีกครั้ง/i })).toBeVisible();
});

test('signed reject link shows the request only to the assigned approver', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>false,login:()=>{},getIDToken:()=>"",getProfile:async()=>({userId:"MANAGER-1"})};'
  }));
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const sig = createHmac('sha256', SECRET)
    .update(`LV-DETAIL:MANAGER-1:${expiresAt}`)
    .digest('hex')
    .slice(0, 32);
  await page.goto(`/reject?reqId=LV-DETAIL&uid=MANAGER-1&exp=${expiresAt}&sig=${sig}`);
  await expect(page.locator('#displayEmpName')).toHaveText('ทดสอบ ระบบ');
  await expect(page.locator('#rejectForm')).toBeVisible();
});

test('HR can download CSV after the report page verifies the LINE identity', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},getIDToken:()=>"valid-hr-token",getProfile:async()=>({userId:"HR-1"})};'
  }));
  await page.goto('/');
  await page.getByRole('button', { name: /ดาวน์โหลดรายงาน HR/i }).click();
  await expect(page).toHaveURL(/\/export-hr$/);
  await expect(page.locator('#hrReportStatus')).toContainText(/ยืนยันสิทธิ์ HR แล้ว/i);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#downloadLink').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('leave_summary.csv');
});

test('HR report button checks LINE identity, then shows an access-denied card to non-HR users', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},getIDToken:()=>"valid-employee-token",getProfile:async()=>({userId:"EMPLOYEE-1"})};'
  }));
  await page.goto('/');
  await page.getByRole('button', { name: /ดาวน์โหลดรายงาน HR/i }).click();
  await expect(page).toHaveURL(/\/export-hr$/);
  await expect(page.locator('#hrReportStatus')).toContainText(/ไม่มีสิทธิ์/i);
  await expect(page.locator('#hrReportCard')).toBeVisible();
  await expect(page.locator('#downloadLink')).toBeHidden();
});

test('assigned approver can open leave details after LINE login without a signed link', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},getIDToken:()=>"valid-manager-token",getProfile:async()=>({userId:"MANAGER-1"})};'
  }));
  await page.goto('/reject?reqId=LV-LOGIN');
  await expect(page.locator('#displayEmpName')).toHaveText('ทดสอบ ระบบ');
  await expect(page.locator('#rejectForm')).toBeVisible();
});

test('logged-in user without assignment sees a denial card for leave details', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},getIDToken:()=>"valid-hr-token",getProfile:async()=>({userId:"HR-1"})};'
  }));
  await page.goto('/reject?reqId=LV-LOGIN');
  await expect(page.locator('#rejectForm')).toBeHidden();
  await expect(page.locator('#loadingOverlay')).toContainText(/ไม่มีสิทธิ์พิจารณา/i);
});

test('shared login connects portal cards and allows seamless navigation to leave form', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const sessionKey = 'test-liff-sessions';
      const getSessions = () => JSON.parse(localStorage.getItem(sessionKey) || '{}');
      let activeId = '';
      window.liff = {
        init: async ({ liffId }) => {
          activeId = liffId;
          window.__activeLiffId = liffId;
        },
        isLoggedIn: () => getSessions()[activeId] === true,
        login: () => {
          const sessions = getSessions();
          sessions[activeId] = true;
          localStorage.setItem(sessionKey, JSON.stringify(sessions));
          window.location.reload();
        },
        logout: () => {
          const sessions = getSessions();
          sessions[activeId] = false;
          localStorage.setItem(sessionKey, JSON.stringify(sessions));
        },
        getIDToken: () => 'valid-employee-token',
        getProfile: async () => ({ userId: 'EMPLOYEE-1', displayName: 'พนักงานทดสอบ' }),
        isInClient: () => false
      };
    `
  }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i })).toBeVisible();
  await page.getByRole('button', { name: /เข้าสู่ระบบ LINE/i }).click();

  // After logging in on portal, cards reflect employee status
  await expect(page.locator('#accountName')).toHaveText('พนักงานทดสอบ');
  await expect(page.locator('#cardLeaveBadge')).toContainText('พร้อมยื่นใบลา');
  await expect(page.locator('#cardRegisterBadge')).toContainText('ลงทะเบียนแล้ว');

  // Click card to open leave request form
  await page.getByRole('link', { name: /ยื่นใบลาออนไลน์/i }).click();
  await expect(page).toHaveURL(/\/leave$/);

  // Leave form should be rendered and ready without asking to login again
  await expect(page.locator('#empNameDisplay')).toContainText('EMPLOYEE-1');
  await expect(page.locator('#leaveForm')).toBeVisible();
});

test('duplicate postback approval does not send duplicate push notifications', async ({ request }) => {
  const payload = JSON.stringify({
    events: [{
      type: 'postback',
      replyToken: 'reply-token',
      postback: { data: 'action=approve&reqId=LV-DUP-1' },
      source: { type: 'user', userId: 'MANAGER-1' }
    }]
  });
  const signature = createHmac('sha256', SECRET).update(payload).digest('base64');

  const first = await request.post('/webhook', {
    data: payload,
    headers: { 'x-line-signature': signature, 'content-type': 'application/json' }
  });
  expect(first.status()).toBe(200);

  const afterFirst = await (await request.get('/__test/state')).json();
  const pushCountAfterFirst = afterFirst.lineMessages.filter(m => m.path.endsWith('/push')).length;
  expect(pushCountAfterFirst).toBe(2);

  const second = await request.post('/webhook', {
    data: payload,
    headers: { 'x-line-signature': signature, 'content-type': 'application/json' }
  });
  expect(second.status()).toBe(200);

  const afterSecond = await (await request.get('/__test/state')).json();
  const pushCountAfterSecond = afterSecond.lineMessages.filter(m => m.path.endsWith('/push')).length;
  expect(pushCountAfterSecond).toBe(pushCountAfterFirst);
  const lastReply = afterSecond.lineMessages.filter(m => m.path.endsWith('/reply')).pop();
  expect(lastReply.body).toContain('ดำเนินการไปแล้ว');
});

test('rejectLeaveRequest sends actionReason to employee and checks status in PATCH', async ({ request }) => {
  const response = await request.post('/api', {
    data: {
      fn: 'rejectLeaveRequest',
      args: [{
        reqId: 'LV-REJECT-REASON',
        reason: 'ช่วงปิดงบไม่สามารถลาได้',
        approverLineId: 'MANAGER-1',
        idToken: 'valid-manager-token'
      }]
    }
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.result.success).toBe(true);

  const state = await (await request.get('/__test/state')).json();
  expect(state.patches).toHaveLength(1);
  expect(state.patches[0].search).toContain('status=eq.PENDING_MANAGER');
  const employeePush = state.lineMessages.find(m => m.path.endsWith('/push') && JSON.parse(m.body).to === 'EMPLOYEE-1');
  expect(employeePush).toBeTruthy();
  expect(employeePush.body).toContain('ช่วงปิดงบไม่สามารถลาได้');

  // Second rejection attempt on same request must not send notifications again
  const second = await request.post('/api', {
    data: {
      fn: 'rejectLeaveRequest',
      args: [{
        reqId: 'LV-REJECT-REASON',
        reason: 'ซ้ำ',
        approverLineId: 'MANAGER-1',
        idToken: 'valid-manager-token'
      }]
    }
  });
  expect(second.status()).toBe(200);
  const secondBody = await second.json();
  expect(secondBody.result.success).toBe(false);
});

test('HR CSV export neutralizes formula injection prefixes', async ({ request }) => {
  const hr = await request.post('/api', {
    data: { fn: 'exportHr', args: [{ lineUserId: 'HR-1', idToken: 'valid-hr-token' }] }
  });
  expect(hr.status()).toBe(200);
  const csv = await hr.text();
  expect(csv).toContain("'=SUM(A1:A2)");
  expect(csv).toContain("'+Admin");
  expect(csv).toContain("'-1+1");
  expect(csv).toContain("'@IMPORT");
});

test('submitLeaveRequest validates dates, totalDays, and reason on backend', async ({ request }) => {
  const badDateOrder = await request.post('/api', {
    data: {
      fn: 'submitLeaveRequest',
      args: [{
        employeeLineId: 'EMPLOYEE-1',
        idToken: 'valid-employee-token',
        leaveType: 'ลาป่วย',
        startDate: '2026-11-25',
        endDate: '2026-11-20',
        totalDays: 1,
        reason: 'ป่วย'
      }]
    }
  });
  expect((await badDateOrder.json()).result.success).toBe(false);

  const badDays = await request.post('/api', {
    data: {
      fn: 'submitLeaveRequest',
      args: [{
        employeeLineId: 'EMPLOYEE-1',
        idToken: 'valid-employee-token',
        leaveType: 'ลาป่วย',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        totalDays: -2,
        reason: 'ป่วย'
      }]
    }
  });
  expect((await badDays.json()).result.success).toBe(false);

  const emptyReason = await request.post('/api', {
    data: {
      fn: 'submitLeaveRequest',
      args: [{
        employeeLineId: 'EMPLOYEE-1',
        idToken: 'valid-employee-token',
        leaveType: 'ลาป่วย',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        totalDays: 1,
        reason: '   '
      }]
    }
  });
  expect((await emptyReason.json()).result.success).toBe(false);

  const valid = await request.post('/api', {
    data: {
      fn: 'submitLeaveRequest',
      args: [{
        employeeLineId: 'EMPLOYEE-1',
        idToken: 'valid-employee-token',
        leaveType: 'ลาป่วย',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        totalDays: 1,
        reason: 'ป่วย'
      }]
    }
  });
  const validJson = await valid.json();
  expect(validJson.result.success).toBe(true);
  expect(validJson.result.requestId).toMatch(/^LV-\d{8}-\d{6}$/);
});

test('HR report page fetches exportHr only once across load and download', async ({ page }) => {
  await page.route('https://static.line-scdn.net/liff/edge/2/sdk.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.liff={init:async()=>{},isLoggedIn:()=>true,login:()=>{},getIDToken:()=>"valid-hr-token",getProfile:async()=>({userId:"HR-1"})};'
  }));
  let exportApiCalls = 0;
  page.on('request', req => {
    if (req.url().endsWith('/api') && req.method() === 'POST' && (req.postData() || '').includes('"exportHr"')) {
      exportApiCalls++;
    }
  });
  await page.goto('/export-hr');
  await expect(page.locator('#hrReportStatus')).toContainText(/ยืนยันสิทธิ์ HR แล้ว/i);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#downloadLink').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('leave_summary.csv');
  expect(exportApiCalls).toBe(1);
});
