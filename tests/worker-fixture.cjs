const http = require('node:http');

const SECRET = 'playwright-test-line-secret';
const PORT = 4173;
const state = { patches: [], inserts: [], lineMessages: [], patchedReqIds: new Set() };
const env = {
  SUPABASE_URL: 'https://supabase.test.local',
  SUPABASE_SECRET_KEY: 'test-supabase-key',
  LINE_CHANNEL_SECRET: SECRET,
  LINE_CHANNEL_ACCESS_TOKEN: 'test-line-token',
  HR_LINE_USER_IDS: 'HR-1',
  APPROVER_LINE_USER_IDS: 'MANAGER-1,HR-1',
  LIFF_ID_PORTAL: '2011955364-wZgUDTq6',
  LIFF_ID_REGISTER: '2011955364-O2qTmo0r',
  LIFF_ID_LEAVE: '2011955364-FCY27ABh'
};

function leaveRequest(reqId) {
  const isGmStage = reqId.includes('GM');
  return {
    request_id: reqId,
    employee_line_id: 'EMPLOYEE-1',
    employee_name: 'ทดสอบ ระบบ',
    company: 'บริษัททดสอบ',
    division: 'Operate',
    department: 'ระบบติดตามหนี้',
    position: 'พนักงาน',
    leave_type: 'ลาป่วย',
    other_leave_detail: null,
    start_date: '2026-11-20',
    end_date: '2026-11-20',
    total_days: 1,
    reason: 'เหตุผลทดสอบ',
    status: isGmStage ? 'PENDING_GM' : 'PENDING_MANAGER',
    manager_line_id: 'MANAGER-1',
    gm_line_id: 'GM-1'
  };
}

async function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);

  if (url.hostname === 'api.line.me' && url.pathname === '/oauth2/v2.1/verify') {
    const form = new URLSearchParams(init.body || '');
    const lineUserId = {
      'valid-hr-token': 'HR-1',
      'valid-manager-token': 'MANAGER-1',
      'valid-gm-token': 'GM-1',
      'valid-employee-token': 'EMPLOYEE-1'
    }[form.get('id_token')];
    return lineUserId
      ? jsonResponse({ aud: '2011955364', sub: lineUserId })
      : jsonResponse({ error: 'invalid token' }, 401);
  }

  if (url.hostname === 'api.line.me' && url.pathname.startsWith('/v2/bot/message/')) {
    state.lineMessages.push({ path: url.pathname, body: init.body || '' });
    return new Response('', { status: 200 });
  }

  if (url.hostname === 'supabase.test.local') {
    if (url.pathname.endsWith('/hr_overview')) {
      return jsonResponse([
        {
          'บริษัท': 'บริษัททดสอบ',
          'ชื่อ-สกุล': 'ทดสอบ ระบบ',
          'รายละเอียดเพิ่มเติม': '=SUM(A1:A2)',
          'เหตุผลการลา': 'ข้อมูลเฉพาะ HR'
        },
        {
          'บริษัท': 'บริษัททดสอบ',
          'ชื่อ-สกุล': '+Admin',
          'รายละเอียดเพิ่มเติม': '-1+1',
          'เหตุผลการลา': '@IMPORT'
        }
      ]);
    }
    if (url.pathname.endsWith('/leave_requests')) {
      const reqId = (url.searchParams.get('request_id') || '').replace(/^eq\./, '');
      if (init.method === 'POST') {
        state.inserts.push(init.body || '');
        return jsonResponse([JSON.parse(init.body || '{}')], 201);
      }
      if (init.method === 'PATCH') {
        state.patches.push({ reqId, search: url.search, body: init.body || '' });
        if (state.patchedReqIds.has(reqId)) {
          return jsonResponse([]);
        }
        state.patchedReqIds.add(reqId);
        return jsonResponse([{ request_id: reqId }]);
      }
      return jsonResponse([leaveRequest(reqId)]);
    }
    if (url.pathname.endsWith('/employees')) {
      const userId = (url.searchParams.get('line_user_id') || '').replace(/^eq\./, '');
      if (url.searchParams.has('select') && url.searchParams.get('select') === 'count') {
        return new Response('', { status: 200, headers: { 'content-range': '0-0/0' } });
      }
      return jsonResponse(userId ? [{
        line_user_id: userId,
        full_name: userId,
        title: '',
        company: 'บริษัททดสอบ',
        division: 'Operate',
        department: 'ระบบติดตามหนี้',
        position: userId === 'MANAGER-1' ? 'Manager' : 'พนักงาน',
        manager_line_id: userId === 'EMPLOYEE-1' ? 'MANAGER-1' : null,
        approval_role: userId === 'MANAGER-1' ? 'MANAGER' : 'EMPLOYEE',
        registration_status: 'ACTIVE'
      }] : []);
    }
  }

  return nativeFetch(input, init);
};

(async () => {
  const { default: worker } = await import('../worker.js');
  const server = http.createServer(async (incoming, outgoing) => {
    const url = new URL(incoming.url, `http://${incoming.headers.host}`);
    if (url.pathname === '/__test/reset') {
      state.patches.length = 0;
      state.inserts.length = 0;
      state.lineMessages.length = 0;
      state.patchedReqIds.clear();
      outgoing.writeHead(204).end();
      return;
    }
    if (url.pathname === '/__test/state') {
      outgoing.writeHead(200, { 'content-type': 'application/json' });
      outgoing.end(JSON.stringify({
        patches: state.patches,
        inserts: state.inserts,
        lineMessages: state.lineMessages
      }));
      return;
    }
    if (url.pathname === '/__test/stop') {
      outgoing.writeHead(204).end();
      setImmediate(() => server.close(() => process.exit(0)));
      return;
    }

    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const request = new Request(url, {
        method: incoming.method,
        headers: incoming.headers,
        ...(body.length && incoming.method !== 'GET' && incoming.method !== 'HEAD'
          ? { body }
          : {})
      });
      const pending = [];
      const response = await worker.fetch(request, env, {
        waitUntil(promise) { pending.push(promise); }
      });
      await Promise.all(pending);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(500, { 'content-type': 'text/plain' });
      outgoing.end(error.stack || error.message);
    }
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(PORT, '127.0.0.1');
})();
