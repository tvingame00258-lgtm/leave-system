const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const DEFAULT_SUPABASE_URL = 'https://tsjfqjisabmbrgbdgyif.supabase.co';

function getSupabaseConfig(env) {
  return {
    url: (env && env.SUPABASE_URL) || DEFAULT_SUPABASE_URL,
    key: (env && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) || ''
  };
}

function getSupabaseHeaders(key) {
  const headers = { 'apikey': key };
  // New sb_secret keys are API keys, not JWTs. Legacy service_role keys are JWTs and need Authorization too.
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  return headers;
}
async function supabaseQuery(env, path, options = {}) {
  const sb = getSupabaseConfig(env);
  if (!sb.key) throw new Error('SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) is not configured');
  const url = `${sb.url}/rest/v1/${path}`;
  const headers = {
    ...getSupabaseHeaders(sb.key),
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

function renderPage(name, env) {
  const html = PAGES[name];
  if (!html) return null;

  const regId = ((env && env.LIFF_ID_REGISTER) || LIFF_ID_REGISTER).trim();
  const leaveId = ((env && env.LIFF_ID_LEAVE) || LIFF_ID_LEAVE).trim();

  const ids = (name === 'register' || name === 'reject')
    ? { __LIFF_ID__: regId, __REGISTER_LIFF_ID__: regId }
    : { __LIFF_ID__: leaveId, __REGISTER_LIFF_ID__: regId };

  let out = html;
  for (const key of Object.keys(ids)) {
    if (!SAFE_ID.test(ids[key])) throw new Error('LIFF ID ไม่ถูกต้อง');
    out = out.split(key).join(ids[key]);
  }
  return out;
}

function formatThaiDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const dtMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(:(\d{2}))?$/);
  if (dtMatch) {
    const yearBe = parseInt(dtMatch[1], 10) + 543;
    const time = dtMatch[4] + ':' + dtMatch[5] + (dtMatch[7] ? ':' + dtMatch[7] : '');
    return dtMatch[3] + '/' + dtMatch[2] + '/' + yearBe + ' ' + time;
  }
  if (dateStr.includes(' ถึง ')) {
    return dateStr.split(' ถึง ').map(d => formatThaiDate(d)).join(' ถึง ');
  }
  const dMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dMatch) {
    const yearBe = parseInt(dMatch[1], 10) + 543;
    return dMatch[3] + '/' + dMatch[2] + '/' + yearBe;
  }
  return dateStr;
}

function jsonToCsv(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))
  ];
  return '\uFEFF' + lines.join('\r\n');
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function generateHmacSignature(message, secret) {
  if (!message || !secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyHmacSignature(message, sig, secret) {
  if (!sig || !secret || !message) return false;
  const expected = await generateHmacSignature(message, secret);
  return safeEqual(expected.toLowerCase(), sig.toLowerCase());
}

async function buildRejectUrl(reqId, approverUid, env) {
  const secret = (env && (env.LINE_CHANNEL_SECRET || env.CHANNEL_SECRET)) || '';
  if (!secret || !approverUid) {
    return 'https://line-leave-relay.finnlution.workers.dev/reject?reqId=' + encodeURIComponent(reqId);
  }
  const sig = await generateHmacSignature(reqId + ':' + approverUid, secret);
  return `https://line-leave-relay.finnlution.workers.dev/reject?reqId=${encodeURIComponent(reqId)}&uid=${encodeURIComponent(approverUid)}&sig=${sig}`;
}

// ---------------------------------------------------------------------------
// LINE Messaging API Helpers
// ---------------------------------------------------------------------------
async function lineApiCall(endpoint, token, payload) {
  if (!token) {
    console.error(`lineApiCall: no token provided for ${endpoint}`);
    return { success: false, error: 'no_token' };
  }
  try {
    const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`LINE API ${endpoint} failed [HTTP ${res.status}]:`, text);
    }
    return { success: res.ok, status: res.status, text };
  } catch (err) {
    console.error(`LINE API ${endpoint} exception:`, err.message);
    return { success: false, error: err.message };
  }
}

function buildApprovalFlex(data) {
  const deptInfo = [data.division, data.department].filter(Boolean).join(' / ') || '-';
  const datesText = `${data.startDate} ถึง ${data.endDate} (${data.totalDays} วัน)`;
  const stageTitle = data.stage === 'GM' 
    ? 'รอ ผจก.ทั่วไป พิจารณา (ขั้นที่ 2)' 
    : (data.stage === 'DIRECT_GM' ? 'รอ ผจก.ทั่วไป พิจารณา' : 'รอหัวหน้าแผนกพิจารณา (ขั้นที่ 1)');
  const rejectUrl = data.rejectUrl || ('https://line-leave-relay.finnlution.workers.dev/reject?reqId=' + encodeURIComponent(data.requestId));

  const bodyContents = [
    flexRow('บริษัท:', data.company, true),
    flexRow('ผู้ขอลา:', data.employeeName, true),
    flexRow('ฝ่าย/แผนก:', deptInfo),
    flexRow('ตำแหน่ง:', data.position),
    { type: 'separator', margin: 'md' },
    flexRow('ประเภทการลา:', data.leaveType, true, '#2563EB', 'sm'),
    flexRow('ช่วงวันที่ลา:', datesText, true),
    flexRow('เหตุผลการลา:', data.reason || '-')
  ];

  if (data.managerApprovedBy) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push(flexRow('หัวหน้าแผนก:', data.managerApprovedBy + ' (อนุมัติแล้ว ✅)', true, '#16A34A'));
  }
  bodyContents.push({ type: 'separator', margin: 'md' });

  return {
    type: 'flex',
    altText: `📋 คำขออนุมัติการลา: ${data.employeeName} (${data.leaveType})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E3A8A',
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'คำขออนุมัติการลา', weight: 'bold', color: '#FFFFFF', size: 'md', flex: 3 },
              { type: 'text', text: stageTitle, weight: 'bold', color: '#FEF08A', size: 'xxs', align: 'end', gravity: 'center', flex: 3, wrap: true }
            ]
          },
          {
            type: 'text',
            text: (data.company ? `${data.company} • ` : '') + `รหัส: ${data.requestId}`,
            color: '#93C5FD',
            size: 'xxs',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#16A34A',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'อนุมัติ',
              data: `action=approve&reqId=${data.requestId}`,
              displayText: `อนุมัติคำขอ ${data.requestId}`
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#DC2626',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'ไม่อนุมัติ',
              uri: rejectUrl
            }
          }
        ]
      }
    }
  };
}

function buildResultFlex(data) {
  const isApproved = data.status === 'APPROVED';
  const color = isApproved ? '#16A34A' : '#DC2626';
  const titleText = isApproved ? 'คำขอลาได้รับการอนุมัติ' : 'คำขอลาไม่ได้รับการอนุมัติ';
  const statusEmoji = isApproved ? 'อนุมัติแล้ว ✅' : 'ไม่อนุมัติ ❌';
  const icon = isApproved ? '✅' : '❌';

  const rows = [];
  if (data.company) {
    rows.push(flexRow('บริษัท:', data.company, true));
  }
  rows.push(flexRow('ผู้ขอลา:', data.employeeName, true));
  rows.push(flexRow('ประเภทการลา:', data.leaveType, true, '#2563EB', 'sm'));
  rows.push(flexRow('ช่วงวันที่ลา:', `${data.startDate} ถึง ${data.endDate} (${data.totalDays} วัน)`, true));
  rows.push({ type: 'separator', margin: 'md' });
  rows.push(flexRow('สถานะ:', statusEmoji, true, color, 'sm'));
  if (data.approverName) {
    rows.push(flexRow('พิจารณาโดย:', data.approverName));
  }

  return {
    type: 'flex',
    altText: `${icon} ผลการพิจารณาคำขอลา: ${data.requestId}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingAll: '18px',
        contents: [
          { type: 'text', text: `${icon} ${titleText}`, weight: 'bold', color: '#FFFFFF', size: 'md' },
          { type: 'text', text: (data.company ? `${data.company} • ` : '') + `รหัสคำขอ: ${data.requestId}`, color: '#F3F4F6', size: 'xxs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        contents: rows
      }
    }
  };
}

function buildHrApprovalFlex(data) {
  const leaveType = data.leaveType + (data.otherLeaveDetail ? ` (${data.otherLeaveDetail})` : '');
  const days = `${data.startDate} ถึง ${data.endDate} (${data.totalDays} วัน)`;
  return {
    type: 'flex',
    altText: `HR: อนุมัติใบลา ${data.employeeName} วันที่ ${data.startDate} ถึง ${data.endDate}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#166534',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'แจ้ง HR: อนุมัติใบลาแล้ว', weight: 'bold', color: '#FFFFFF', size: 'md', wrap: true },
          { type: 'text', text: `รหัสคำขอ: ${data.requestId}`, color: '#DCFCE7', size: 'xs', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        contents: [
          flexRow('พนักงาน:', data.employeeName, true),
          flexRow('บริษัท:', data.company),
          flexRow('ฝ่าย/แผนก:', [data.division, data.department].filter(Boolean).join(' / ') || '-'),
          { type: 'separator', margin: 'md' },
          flexRow('ประเภทการลา:', leaveType, true, '#166534'),
          flexRow('วันที่ลา:', days, true),
          flexRow('เหตุผล:', data.reason || '-'),
          { type: 'separator', margin: 'md' },
          flexRow('หัวหน้าผู้อนุมัติ:', data.approverName, true)
        ]
      }
    }
  };
}


function buildHrRejectFlex(data) {
  const leaveType = data.leaveType + (data.otherLeaveDetail ? ' (' + data.otherLeaveDetail + ')' : '');
  const days = data.startDate + ' ถึง ' + data.endDate + ' (' + data.totalDays + ' วัน)';
  return {
    type: 'flex',
    altText: 'HR: ไม่อนุมัติใบลา ' + data.employeeName + ' (' + data.leaveType + ')',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#991B1B',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'แจ้ง HR: ไม่อนุมัติใบลา ❌', weight: 'bold', color: '#FFFFFF', size: 'md', wrap: true },
          { type: 'text', text: 'รหัสคำขอ: ' + data.requestId, color: '#FEE2E2', size: 'xs', margin: 'sm' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        contents: [
          flexRow('พนักงาน:', data.employeeName, true),
          flexRow('บริษัท:', data.company),
          flexRow('ฝ่าย/แผนก:', [data.division, data.department].filter(Boolean).join(' / ') || '-'),
          { type: 'separator', margin: 'md' },
          flexRow('ประเภทการลา:', leaveType, true, '#DC2626'),
          flexRow('วันที่ลา:', days, true),
          { type: 'separator', margin: 'md' },
          flexRow('พิจารณาโดย:', data.approverName, true),
          flexRow('เหตุผลที่ไม่อนุมัติ:', data.actionReason || '-', true, '#DC2626', 'sm')
        ]
      }
    }
  };
}

function flexRow(label, value, bold = false, color = '#111827', size = 'xs') {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: label, color: '#6B7280', size: 'xs', flex: 3 },
      { type: 'text', text: String(value || '-'), color: color, size: size, weight: bold ? 'bold' : 'regular', flex: 5, wrap: true }
    ]
  };
}

function buildMenuFlex(baseUrl = 'https://line-leave-relay.finnlution.workers.dev') {
  return {
    type: 'flex',
    altText: '📋 เมนูหลักระบบลางาน',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E3A8A',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '🏢 ระบบบริหารการลางาน',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md'
          },
          {
            type: 'text',
            text: 'กรุณาเลือกรายการที่ต้องการดำเนินการ',
            color: '#93C5FD',
            size: 'xs',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#2563EB',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📝 ลงทะเบียนพนักงาน',
              uri: `${baseUrl}/register`
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#16A34A',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📋 ขอยื่นใบลา',
              uri: `${baseUrl}/leave`
            }
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🌐 หน้าเว็บหลัก (Portal)',
              uri: `${baseUrl}/`
            }
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        contents: [
          {
            type: 'text',
            text: '💡 ใช้งานได้ทั้งบนคอมพิวเตอร์และมือถือ',
            color: '#9CA3AF',
            size: 'xxs',
            align: 'center'
          }
        ]
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Supabase Backend Handlers
// ---------------------------------------------------------------------------
function getConfiguredLineIds(env, name) {
  return new Set(String((env && env[name]) || '').split(',').map(value => value.trim()).filter(Boolean));
}
async function getVerifiedLineUserId(idToken, expectedLineUserId, env) {
  if (typeof idToken !== 'string' || !idToken.trim()) return null;
  const configuredRegLiffId = (env && env.LIFF_ID_REGISTER) || LIFF_ID_REGISTER;
  const configuredLeaveLiffId = (env && env.LIFF_ID_LEAVE) || LIFF_ID_LEAVE;
  const channelId = ((env && env.LINE_LOGIN_CHANNEL_ID) || configuredRegLiffId.split('-')[0] || '').trim();
  if (!/^\d+$/.test(channelId)) return null;

  const validChannels = new Set([
    channelId,
    (configuredRegLiffId.split('-')[0] || '').trim(),
    (configuredLeaveLiffId.split('-')[0] || '').trim()
  ].filter(id => /^\d+$/.test(id)));

  const form = new URLSearchParams({ id_token: idToken.trim(), client_id: channelId });
  try {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!response.ok) {
      const errText = await response.text();
      console.warn('LINE verify endpoint returned error:', response.status, errText);
      return null;
    }
    const claims = await response.json();
    if (!claims || !validChannels.has(claims.aud) || typeof claims.sub !== 'string' || !claims.sub) {
      console.warn('LINE verify claims invalid:', claims ? { aud: claims.aud, expectedChannels: Array.from(validChannels) } : 'no claims');
      return null;
    }
    if (expectedLineUserId && claims.sub !== expectedLineUserId) {
      console.warn('LINE verify user ID mismatch:', { tokenSub: claims.sub, expected: expectedLineUserId });
      return null;
    }
    return claims.sub;
  } catch (err) {
    console.error('LINE ID token verification failed:', err.message);
    return null;
  }
}
async function handleGetRegisterPageData(env, currentUserId) {
  const empPromise = supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(currentUserId)}&select=*`);
  const mgrPromise = supabaseQuery(env, `employees?select=line_user_id,full_name,department,division,position,company,approval_role,registration_status&order=full_name.asc`);

  const [empRes, mgrRes] = await Promise.all([empPromise, mgrPromise]);
  const empList = empRes.ok ? await empRes.json() : [];
  const mgrList = mgrRes.ok ? await mgrRes.json() : [];

  const emp = empList && empList[0];
  const profile = {
    isRegistered: !!emp,
    lineUserId: currentUserId,
    company: emp ? emp.company : '',
    employeeId: emp ? emp.employee_id : '',
    title: emp ? emp.title : '',
    fullName: emp ? emp.full_name : '',
    division: emp ? emp.division : '',
    department: emp ? emp.department : '',
    position: emp ? emp.position : '',
    managerLineId: emp ? (emp.manager_line_id || '') : '',
    approvalRole: emp ? (emp.approval_role || 'EMPLOYEE') : 'EMPLOYEE',
    registrationStatus: emp ? (emp.registration_status || 'ACTIVE') : ''
  };

  const allowedManagers = getConfiguredLineIds(env, 'APPROVER_LINE_USER_IDS');
  const managers = (mgrList || []).filter(m => allowedManagers.has(m.line_user_id) && m.registration_status === 'ACTIVE').map(m => ({
    lineUserId: m.line_user_id,
    fullName: m.full_name,
    department: m.department,
    division: m.division,
    position: m.position,
    company: m.company,
    approvalRole: m.approval_role
  }));

  return { profile, managers, bootstrapMode: String(env.ALLOW_ROOT_MANAGER_REGISTRATION || '').toLowerCase() === 'true' };
}

async function handleGetEmployeeProfile(env, lineUserId) {
  const res = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(lineUserId)}&select=*`);
  if (!res.ok) return { isRegistered: false, lineUserId };
  const list = await res.json();
  const emp = list && list[0];
  if (!emp) return { isRegistered: false, lineUserId };

  return {
    isRegistered: true,
    lineUserId: emp.line_user_id,
    company: emp.company,
    employeeId: emp.employee_id,
    title: emp.title,
    fullName: emp.full_name,
    division: emp.division,
    department: emp.department,
    position: emp.position,
    managerLineId: emp.manager_line_id || '',
    approvalRole: emp.approval_role || 'EMPLOYEE',
    registrationStatus: emp.registration_status || 'ACTIVE'
  };
}

function isEligibleReportingManager(employee, manager) {
  if (!manager || manager.registration_status !== 'ACTIVE' || manager.approval_role !== 'MANAGER') return false;
  const isGeneralManager = manager.division === 'Management' && manager.department === 'ผู้จัดการทั่วไป';
  if (employee.approval_role === 'MANAGER') return isGeneralManager;
  if (employee.division === 'Operate') {
    return manager.division === 'Operate' && manager.company === employee.company;
  }
  if (employee.division === 'Support') {
    if (employee.department === 'IT') {
      return isGeneralManager || (manager.division === 'Operate' && manager.company === employee.company);
    }
    return manager.division === 'Support' && manager.department === employee.department;
  }
  return false;
}

async function handleRegisterEmployee(env, payload) {
  if (!payload || !payload.lineUserId || !payload.fullName || !payload.company || !payload.employeeId) return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  const employeeId = String(payload.employeeId).trim();
  const company = String(payload.company).trim();
  if (!/^\d+$/.test(employeeId)) return { success: false, message: 'รหัสพนักงานต้องเป็นตัวเลขเท่านั้น' };
  const division = String(payload.division || '').trim();
  const department = String(payload.department || '').trim();
  const departmentsByDivision = {
    Support: ['HR', 'บัญชี', 'กฎหมาย', 'ธุรการกฎหมาย', 'IT'],
    Operate: ['ระบบติดตามหนี้'],
    Management: ['ผู้จัดการทั่วไป']
  };
  if (!departmentsByDivision[division] || !departmentsByDivision[division].includes(department)) {
    return { success: false, message: 'แผนกไม่ตรงกับฝ่าย กรุณาเลือกจากรายการ' };
  }
  const approvalRole = String(payload.approvalRole || 'EMPLOYEE').trim().toUpperCase();
  const eligibleBootstrapRoles = new Set(['MANAGER']);
  if (!['EMPLOYEE', ...eligibleBootstrapRoles].includes(approvalRole)) return { success: false, message: 'ประเภทผู้สมัครไม่ถูกต้อง' };
  const existingRes = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(payload.lineUserId)}&select=manager_line_id,registration_status,approval_role`);
  if (!existingRes.ok) return { success: false, message: 'ตรวจสอบข้อมูลพนักงานไม่สำเร็จ' };
  const existingRows = await existingRes.json();
  const existingEmployee = Array.isArray(existingRows) ? existingRows[0] : null;
  const requestedManagerLineId = existingEmployee
    ? String(existingEmployee.manager_line_id || '').trim()
    : String(payload.managerLineId || '').trim();
  const noManagerSelected = !requestedManagerLineId || requestedManagerLineId === 'TOP_MANAGEMENT';
  const managerLineId = noManagerSelected ? '' : requestedManagerLineId;
  const bootstrapMode = String(env.ALLOW_ROOT_MANAGER_REGISTRATION || '').toLowerCase() === 'true';
  if (noManagerSelected && (!bootstrapMode || !eligibleBootstrapRoles.has(approvalRole))) {
    return { success: false, message: bootstrapMode ? 'เลือกไม่มีหัวหน้าได้เฉพาะหัวหน้าทีมเท่านั้น' : 'เลือกไม่มีหัวหน้าได้เฉพาะช่วงตั้งต้น กรุณาเลือกหัวหน้าผู้อนุมัติ' };
  }
  const approvedManagers = getConfiguredLineIds(env, 'APPROVER_LINE_USER_IDS');
  if (!noManagerSelected && (managerLineId === payload.lineUserId || !approvedManagers.has(managerLineId))) {
    return { success: false, message: 'กรุณาเลือกหัวหน้าที่ฝ่ายบุคคลกำหนดไว้' };
  }
  if (!noManagerSelected) {
    const managerRes = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(managerLineId)}&select=line_user_id,company,division,department,approval_role,registration_status`);
    const managerRows = managerRes.ok ? await managerRes.json() : [];
    if (!managerRes.ok || !isEligibleReportingManager({ company, division, department, approval_role: approvalRole }, managerRows[0])) {
      return { success: false, message: 'หัวหน้าที่เลือกไม่ตรงกับสายงานหรือแผนก กรุณาเลือกหัวหน้าที่ถูกต้อง' };
    }
  }
  const duplicateRes = await supabaseQuery(env,
    `employees?company=eq.${encodeURIComponent(company)}&employee_id=eq.${encodeURIComponent(employeeId)}&line_user_id=neq.${encodeURIComponent(payload.lineUserId)}&select=id`
  );
  if (!duplicateRes.ok) return { success: false, message: 'ตรวจสอบรหัสพนักงานไม่สำเร็จ' };
  const duplicateRows = await duplicateRes.json();
  if (Array.isArray(duplicateRows) && duplicateRows.length) {
    return { success: false, message: 'รหัสพนักงานนี้ถูกลงทะเบียนแล้ว กรุณาติดต่อฝ่ายบุคคล' };
  }
  const row = {
    line_user_id: payload.lineUserId,
    company,
    employee_id: employeeId,
    title: String(payload.title || '').trim(),
    full_name: String(payload.fullName).trim(),
    division,
    department,
    position: approvalRole === 'MANAGER'
      ? (division === 'Support' ? 'หัวหน้าแผนก' : division === 'Management' ? 'ผู้จัดการทั่วไป' : 'Manager')
      : 'พนักงาน',
    approval_role: approvalRole,
    registration_status: existingEmployee ? (existingEmployee.registration_status || 'ACTIVE') : 'PENDING',
    manager_line_id: managerLineId || null,
    updated_at: new Date().toISOString()
  };
  const res = await supabaseQuery(env, 'employees?on_conflict=line_user_id', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    console.error('Employee registration failed:', res.status);
    return { success: false, message: 'บันทึกข้อมูลไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ' };
  }
  const pendingApproval = row.registration_status === 'PENDING';
  return { success: true, pendingApproval, message: pendingApproval ? 'ส่งข้อมูลแล้ว กรุณารอผู้ดูแลระบบยืนยันบัญชีก่อนใช้งาน' : 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว' };
}
async function handleSubmitLeaveRequest(env, payload) {
  if (!payload || !payload.employeeLineId || !payload.leaveType || !payload.startDate || !payload.endDate) {
    return { success: false, message: 'ข้อมูลการลาไม่ครบถ้วน' };
  }

  // Get employee details
  const empRes = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(payload.employeeLineId)}&select=*`);
  const empList = empRes.ok ? await empRes.json() : [];
  const emp = empList && empList[0];
  if (!emp) return { success: false, message: 'ไม่พบข้อมูลพนักงาน กรุณาลงทะเบียนก่อนยื่นใบลา' };
  if (emp.registration_status && emp.registration_status !== 'ACTIVE') return { success: false, message: 'บัญชีกำลังรอผู้ดูแลยืนยัน จึงยังยื่นใบลาไม่ได้' };

  // Determine General Manager (GM) LINE ID (same for all companies)
  let gmLineId = 'U7c04ba211a5fc02c29f834adf9fbc538';
  try {
    const gmRes = await supabaseQuery(env, `employees?department=eq.${encodeURIComponent('ผู้จัดการทั่วไป')}&select=line_user_id&limit=1`);
    if (gmRes.ok) {
      const gms = await gmRes.json();
      if (gms && gms[0] && gms[0].line_user_id) gmLineId = gms[0].line_user_id;
    }
  } catch (e) {
    console.error('GM lookup error:', e);
  }

  const isManager = emp.approval_role === 'MANAGER' || emp.position === 'ผู้จัดการทั่วไป' || emp.department === 'ผู้จัดการทั่วไป';

  if (!isManager) {
    const approvedManagers = getConfiguredLineIds(env, 'APPROVER_LINE_USER_IDS');
    const noManagerAssigned = !emp.manager_line_id || emp.manager_line_id === 'TOP_MANAGEMENT';
    if (noManagerAssigned) return { success: false, message: 'ยังไม่ได้กำหนดหัวหน้าผู้อนุมัติ กรุณาติดต่อผู้ดูแลระบบ' };
    if (!approvedManagers.has(emp.manager_line_id)) return { success: false, message: 'ยังไม่ได้กำหนดหัวหน้าผู้อนุมัติ กรุณาติดต่อฝ่ายบุคคล' };
  }

  const now = new Date();
  const dateNum = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const requestId = `LV-${dateNum}-${rand}`;

  const initialStatus = isManager ? 'PENDING_GM' : 'PENDING_MANAGER';

  const row = {
    request_id: requestId,
    employee_line_id: payload.employeeLineId,
    employee_name: emp ? (emp.title ? emp.title + ' ' : '') + emp.full_name : '',
    company: emp ? emp.company : '',
    division: emp ? emp.division : '',
    department: emp ? emp.department : '',
    position: emp ? emp.position : '',
    leave_type: payload.leaveType,
    other_leave_detail: payload.otherLeaveDetail || null,
    start_date: payload.startDate,
    end_date: payload.endDate,
    total_days: Number(payload.totalDays) || 1,
    reason: payload.reason,
    status: initialStatus,
    manager_line_id: isManager ? gmLineId : emp.manager_line_id,
    gm_line_id: gmLineId,
    manager_status: isManager ? 'SKIPPED' : 'PENDING',
    gm_status: 'PENDING',
    created_at: now.toISOString()
  };

  const insertRes = await supabaseQuery(env, 'leave_requests', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(row)
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return { success: false, message: `บันทึกคำขอลาไม่สำเร็จ: ${err}` };
  }

  const token = (env && (env.LINE_CHANNEL_ACCESS_TOKEN || env.CHANNEL_ACCESS_TOKEN)) || '';
  if (token) {
    const targetApprover = isManager ? gmLineId : emp.manager_line_id;
    const stage = isManager ? 'DIRECT_GM' : 'MANAGER';
    const rejectUrl = await buildRejectUrl(requestId, targetApprover, env);

    const flex = buildApprovalFlex({
      requestId,
      company: emp.company,
      employeeName: (emp.title ? emp.title + ' ' : '') + emp.full_name,
      division: emp.division,
      department: emp.department,
      position: emp.position,
      leaveType: payload.leaveType + (payload.otherLeaveDetail ? ` (${payload.otherLeaveDetail})` : ''),
      startDate: payload.startDate,
      endDate: payload.endDate,
      totalDays: payload.totalDays,
      reason: payload.reason,
      stage,
      rejectUrl
    });

    const pushRes = await lineApiCall('push', token, {
      to: targetApprover,
      messages: [flex]
    });

    if (!pushRes.success) {
      return {
        success: true,
        requestId,
        warning: true,
        message: 'บันทึกใบลาแล้ว แต่ยังส่งการ์ดหาผู้อนุมัติไม่สำเร็จ กรุณาแจ้งโดยตรง'
      };
    }
  }

  const targetRoleText = isManager ? 'ผู้จัดการทั่วไป' : 'หัวหน้าแผนกของคุณ';
  return {
    success: true,
    requestId,
    autoApproved: false,
    message: `ระบบได้ส่งการ์ดขออนุมัติไปยัง LINE ${targetRoleText} เรียบร้อยแล้ว`
  };
}

// ---------------------------------------------------------------------------
// LINE Webhook & Postback Handling (Approve / Reject)
// ---------------------------------------------------------------------------
async function handleWebhook(request, env, ctx) {
  const secret = (env && (env.LINE_CHANNEL_SECRET || env.CHANNEL_SECRET)) || '';
  if (!secret) {
    console.error('Webhook error: LINE_CHANNEL_SECRET is not configured');
    return new Response('Server not configured', { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get('x-line-signature') || '';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  if (!safeEqual(expected, sig)) return new Response('Forbidden', { status: 403 });

  // The Worker owns Supabase approval postbacks. Don't send those same actions
  // to the legacy GAS handler, which still looks up requests in its old store.
  const gasBody = removeWorkerHandledApprovalEvents(body);
  if (env.GAS_URL && gasBody) {
    ctx.waitUntil(
      fetch(env.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: gasBody,
        redirect: 'follow'
      }).catch(e => console.log('GAS forward error:', e.message))
    );
  }

  // Process LINE events in background
  ctx.waitUntil(processLineEvents(body, env));

  return new Response('OK', { status: 200 });
}

function removeWorkerHandledApprovalEvents(rawBody) {
  try {
    const payload = JSON.parse(rawBody);
    if (!Array.isArray(payload.events)) return rawBody;
    const remainingEvents = payload.events.filter(event => {
      if (event.type !== 'postback' || !event.postback || !event.postback.data) return true;
      const action = new URLSearchParams(event.postback.data).get('action');
      return !['approve', 'reject'].includes(action);
    });
    if (remainingEvents.length === payload.events.length) return rawBody;
    if (remainingEvents.length === 0) return '';
    return JSON.stringify({ ...payload, events: remainingEvents });
  } catch (err) {
    console.warn('Could not filter GAS webhook events; forwarding original body:', err.message);
    return rawBody;
  }
}

async function processLineEvents(rawBody, env) {
  try {
    const data = JSON.parse(rawBody);
    const events = data.events || [];
    const token = (env && (env.LINE_CHANNEL_ACCESS_TOKEN || env.CHANNEL_ACCESS_TOKEN)) || '';

    if (!token) {
      console.warn('processLineEvents: LINE_CHANNEL_ACCESS_TOKEN is not configured');
    }

    for (const ev of events) {
      if (ev.type === 'postback' && ev.postback && ev.postback.data) {
        await handlePostback(ev, env, token);
      } else if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
        await handleIncomingMessage(ev, env, token);
      }
    }
  } catch (err) {
    console.error('Error processing LINE events:', err);
  }
}

async function handleIncomingMessage(ev, env, token) {
  if (!token || !ev.replyToken) return;
  const menuFlex = buildMenuFlex();
  await lineApiCall('reply', token, {
    replyToken: ev.replyToken,
    messages: [menuFlex]
  });
}

async function handlePostback(ev, env, token) {
  const params = new URLSearchParams(ev.postback.data);
  const action = params.get('action'); // 'approve' | 'reject'
  const reqId = params.get('reqId');
  const approverUserId = ev.source && ev.source.userId;

  if (!reqId || !approverUserId || !['approve', 'reject'].includes(action)) return;

  const res = await supabaseQuery(env, `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&select=*`);
  if (!res.ok) return;
  const list = await res.json();
  const req = list && list[0];
  if (!req) return;

  if (action === 'reject') {
    if (token && ev.replyToken) {
      const rejectUrl = await buildRejectUrl(reqId, approverUserId, env);
      await lineApiCall('reply', token, {
        replyToken: ev.replyToken,
        messages: [{
          type: 'text',
          text: `⚠️ กรุณาระบุเหตุผลการไม่อนุมัติคำขอ ${reqId}\n\nคลิกเปิดลิงก์นี้เพื่อระบุเหตุผล:\n${rejectUrl}`
        }]
      });
    }
    return;
  }

  const allowedApprovers = getConfiguredLineIds(env, 'APPROVER_LINE_USER_IDS');
  const nowIso = new Date().toISOString();

  const appRes = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(approverUserId)}&select=full_name,title`);
  const appList = appRes.ok ? await appRes.json() : [];
  const appEmp = appList && appList[0];
  const approverName = appEmp ? (appEmp.title ? appEmp.title + ' ' : '') + appEmp.full_name : 'ผู้อนุมัติ';

  // CASE 1: Step 1 Approval by Department Head / Manager (PENDING_MANAGER -> PENDING_GM)
  if (req.status === 'PENDING_MANAGER') {
    if (req.manager_line_id !== approverUserId && !allowedApprovers.has(approverUserId)) {
      if (token && ev.replyToken) {
        await lineApiCall('reply', token, {
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: '⛔ ขออภัย คุณไม่มีสิทธิ์อนุมัติคำขอนี้ เนื่องจากไม่ใช่หัวหน้าที่ได้รับมอบหมาย' }]
        });
      }
      return;
    }

    const updateRes = await supabaseQuery(env,
      `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&status=eq.PENDING_MANAGER&select=request_id`,
      {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          status: 'PENDING_GM',
          manager_status: 'APPROVED',
          manager_action_date: nowIso,
          action_by_name: approverName
        })
      }
    );

    if (!updateRes.ok) return;

    if (token && ev.replyToken) {
      await lineApiCall('reply', token, {
        replyToken: ev.replyToken,
        messages: [{
          type: 'text',
          text: `บันทึกผลการอนุมัติ (ขั้นที่ 1: หัวหน้างาน) เรียบร้อยแล้ว ✅\n\n📋 รหัสคำขอ: ${reqId}\n👤 พนักงาน: ${req.employee_name}\n📅 วันที่ลา: ${req.start_date} ถึง ${req.end_date}\n\nระบบได้ส่งคำขอต่อไปยัง 'ผู้จัดการทั่วไป' เพื่อพิจารณาขั้นสุดท้ายแล้วครับ`
        }]
      });
    }

    if (token && req.employee_line_id) {
      await lineApiCall('push', token, {
        to: req.employee_line_id,
        messages: [{
          type: 'text',
          text: `🔔 แจ้งความคืบหน้าคำขอลา (${reqId})\n\nหัวหน้าแผนกของคุณ (${approverName}) ได้อนุมัติคำขอแล้ว ✅\nขณะนี้ระบบได้ส่งต่อให้ 'ผู้จัดการทั่วไป' เพื่อพิจารณาขั้นสุดท้ายครับ`
        }]
      });
    }

    const gmTarget = req.gm_line_id || 'U7c04ba211a5fc02c29f834adf9fbc538';
    if (token && gmTarget) {
      const rejectUrl = await buildRejectUrl(reqId, gmTarget, env);
      const gmFlex = buildApprovalFlex({
        requestId: reqId,
        company: req.company,
        employeeName: req.employee_name,
        division: req.division,
        department: req.department,
        position: req.position,
        leaveType: req.leave_type + (req.other_leave_detail ? ` (${req.other_leave_detail})` : ''),
        startDate: req.start_date,
        endDate: req.end_date,
        totalDays: req.total_days,
        reason: req.reason,
        stage: 'GM',
        managerApprovedBy: approverName,
        rejectUrl
      });
      await lineApiCall('push', token, {
        to: gmTarget,
        messages: [gmFlex]
      });
    }
    return;
  }

  // CASE 2: Step 2 Approval by General Manager (PENDING_GM -> APPROVED)
  if (req.status === 'PENDING_GM') {
    const isGm = (req.gm_line_id && req.gm_line_id === approverUserId) || allowedApprovers.has(approverUserId);
    if (!isGm) {
      if (token && ev.replyToken) {
        await lineApiCall('reply', token, {
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: '⛔ ขออภัย คุณไม่มีสิทธิ์อนุมัติในขั้นตอนนี้ เนื่องจากต้องเป็นผู้จัดการทั่วไป' }]
        });
      }
      return;
    }

    const updateRes = await supabaseQuery(env,
      `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&status=eq.PENDING_GM&select=request_id`,
      {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          status: 'APPROVED',
          gm_status: 'APPROVED',
          gm_action_date: nowIso,
          action_by_name: approverName,
          action_date: nowIso
        })
      }
    );

    if (!updateRes.ok) return;

    if (token && ev.replyToken) {
      await lineApiCall('reply', token, {
        replyToken: ev.replyToken,
        messages: [{
          type: 'text',
          text: `อนุมัติคำขอลาเรียบร้อยแล้ว ✅ (อนุมัติสมบูรณ์)\n\n📋 รหัสคำขอ: ${reqId}\n👤 พนักงาน: ${req.employee_name}\n📅 วันที่ลา: ${req.start_date} ถึง ${req.end_date}\n\nระบบได้แจ้งผลไปยังพนักงานและฝ่ายบุคคล (HR) เรียบร้อยแล้วครับ`
        }]
      });
    }

    if (token && req.employee_line_id) {
      const resultFlex = buildResultFlex({
        requestId: reqId,
        company: req.company,
        employeeName: req.employee_name,
        leaveType: req.leave_type,
        startDate: req.start_date,
        endDate: req.end_date,
        totalDays: req.total_days,
        approverName: approverName,
        status: 'APPROVED'
      });
      await lineApiCall('push', token, {
        to: req.employee_line_id,
        messages: [resultFlex]
      });
    }

    if (token) {
      const hrLineIds = getConfiguredLineIds(env, 'HR_LINE_USER_IDS');
      const hrFlex = buildHrApprovalFlex({
        requestId: reqId,
        employeeName: req.employee_name,
        company: req.company,
        division: req.division,
        department: req.department,
        leaveType: req.leave_type,
        otherLeaveDetail: req.other_leave_detail,
        startDate: req.start_date,
        endDate: req.end_date,
        totalDays: req.total_days,
        reason: req.reason,
        approverName
      });
      for (const hrLineId of hrLineIds) {
        await lineApiCall('push', token, {
          to: hrLineId,
          messages: [hrFlex]
        });
      }
    }
    return;
  }

  if (token && ev.replyToken) {
    const st = req.status === 'APPROVED' ? 'อนุมัติเรียบร้อยแล้ว ✅' : (req.status === 'REJECTED' ? 'ไม่อนุมัติแล้ว ❌' : req.status);
    await lineApiCall('reply', token, {
      replyToken: ev.replyToken,
      messages: [{ type: 'text', text: `ℹ️ คำขอ ${reqId} นี้ได้รับการดำเนินการไปแล้ว\nสถานะปัจจุบัน: ${st}` }]
    });
  }
}

async function handleGetLeaveRequestDetail(env, reqId) {
  if (!reqId) return null;
  const res = await supabaseQuery(env, `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&select=request_id,employee_name,leave_type,start_date,end_date,total_days,reason,company,department,status`);
  if (!res.ok) return null;
  const list = await res.json();
  return list && list[0] ? list[0] : null;
}

async function handleRejectLeaveRequest(env, payload) {
  if (!payload || !payload.reqId || !payload.reason) {
    return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
  }
  const reqId = payload.reqId;
  const reason = payload.reason.trim();
  const token = (env && (env.LINE_CHANNEL_ACCESS_TOKEN || env.CHANNEL_ACCESS_TOKEN)) || '';

  const res = await supabaseQuery(env, `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&select=*`);
  if (!res.ok) return { success: false, message: 'ไม่พบคำขอลา' };
  const list = await res.json();
  const req = list && list[0];
  if (!req) return { success: false, message: 'ไม่พบคำขอลา' };

  if (req.status === 'APPROVED' || req.status === 'REJECTED') {
    return { success: false, message: `คำขอนี้ได้รับการพิจารณาไปแล้ว (สถานะ: ${req.status})` };
  }

  const approverUserId = payload.approverLineId || '';
  const nowIso = new Date().toISOString();

  let approverName = 'หัวหน้างาน / ผู้จัดการทั่วไป';
  if (approverUserId) {
    const appRes = await supabaseQuery(env, `employees?line_user_id=eq.${encodeURIComponent(approverUserId)}&select=full_name,title`);
    const appList = appRes.ok ? await appRes.json() : [];
    const appEmp = appList && appList[0];
    if (appEmp) approverName = (appEmp.title ? appEmp.title + ' ' : '') + appEmp.full_name;
  }

  const updateBody = {
    status: 'REJECTED',
    action_by_name: approverName,
    action_reason: reason,
    action_date: nowIso
  };

  if (req.status === 'PENDING_MANAGER') {
    updateBody.manager_status = 'REJECTED';
    updateBody.manager_action_date = nowIso;
  } else if (req.status === 'PENDING_GM') {
    updateBody.gm_status = 'REJECTED';
    updateBody.gm_action_date = nowIso;
  }

  const updateRes = await supabaseQuery(env,
    `leave_requests?request_id=eq.${encodeURIComponent(reqId)}&select=request_id`,
    {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(updateBody)
    }
  );

  if (!updateRes.ok) {
    return { success: false, message: 'บันทึกการไม่อนุมัติไม่สำเร็จ' };
  }

  // Notify Employee via LINE
  if (token && req.employee_line_id) {
    const resultFlex = buildResultFlex({
      requestId: reqId,
      company: req.company,
      employeeName: req.employee_name,
      leaveType: req.leave_type,
      startDate: req.start_date,
      endDate: req.end_date,
      totalDays: req.total_days,
      approverName,
      status: 'REJECTED',
      actionReason: reason
    });
    await lineApiCall('push', token, {
      to: req.employee_line_id,
      messages: [resultFlex]
    });
  }

  // Notify HR via LINE with rejection reason
  if (token) {
    const hrLineIds = getConfiguredLineIds(env, 'HR_LINE_USER_IDS');
    const hrRejectFlex = buildHrRejectFlex({
      requestId: reqId,
      employeeName: req.employee_name,
      company: req.company,
      division: req.division,
      department: req.department,
      leaveType: req.leave_type,
      otherLeaveDetail: req.other_leave_detail,
      startDate: req.start_date,
      endDate: req.end_date,
      totalDays: req.total_days,
      approverName,
      actionReason: reason
    });
    for (const hrLineId of hrLineIds) {
      await lineApiCall('push', token, {
        to: hrLineId,
        messages: [hrRejectFlex]
      });
    }
  }

  return { success: true, message: 'บันทึกการไม่อนุมัติและแจ้งผลเรียบร้อยแล้ว' };
}

async function handleApi(request, env, ctx) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return jsonResponse({ ok: false, error: 'forbidden origin' }, 403);
  const text = await request.text();
  if (text.length > 20000) return jsonResponse({ ok: false, error: 'payload too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return jsonResponse({ ok: false, error: 'bad json' }, 400); }
  if (!body || typeof body.fn !== 'string' || !Array.isArray(body.args)) return jsonResponse({ ok: false, error: 'bad request' }, 400);

  const fn = body.fn;
  const allowed = ['getRegisterPageData', 'getEmployeeProfile', 'registerEmployee', 'submitLeaveRequest', 'getLeaveRequestDetail', 'rejectLeaveRequest'];
  if (!allowed.includes(fn)) return jsonResponse({ ok: false, error: 'unknown function' }, 400);
  let idToken = '';
  let expectedLineUserId = '';
  const payload = body.args[0];
  if (fn === 'getRegisterPageData' || fn === 'getEmployeeProfile') {
    expectedLineUserId = body.args[0];
    idToken = body.args[1];
  } else if (payload && typeof payload === 'object') {
    if (fn === 'registerEmployee') {
      expectedLineUserId = payload.lineUserId;
    } else if (fn === 'rejectLeaveRequest') {
      expectedLineUserId = payload.approverLineId || '';
    } else {
      expectedLineUserId = payload.employeeLineId;
    }
    idToken = payload.idToken;
  }
  if (fn === 'getLeaveRequestDetail') {
    const reqId = body.args[0];
    const result = await handleGetLeaveRequestDetail(env, reqId);
    return jsonResponse({ ok: true, result }, 200);
  }

  let verifiedLineUserId = null;
  if (fn === 'rejectLeaveRequest' && payload && payload.sig && payload.approverLineId && payload.reqId) {
    const secret = (env && (env.LINE_CHANNEL_SECRET || env.CHANNEL_SECRET)) || '';
    const isValid = await verifyHmacSignature(payload.reqId + ':' + payload.approverLineId, payload.sig, secret);
    if (isValid) {
      verifiedLineUserId = payload.approverLineId;
    }
  }

  if (!verifiedLineUserId) {
    verifiedLineUserId = await getVerifiedLineUserId(idToken, expectedLineUserId, env);
  }
  if (!verifiedLineUserId) return jsonResponse({ ok: false, error: 'LINE authentication required' }, 401);
  try {
    let result;
    if (fn === 'getRegisterPageData') result = await handleGetRegisterPageData(env, verifiedLineUserId);
    else if (fn === 'getEmployeeProfile') result = await handleGetEmployeeProfile(env, verifiedLineUserId);
    else if (fn === 'registerEmployee') result = await handleRegisterEmployee(env, { ...payload, lineUserId: verifiedLineUserId });
    else if (fn === 'submitLeaveRequest') result = await handleSubmitLeaveRequest(env, { ...payload, employeeLineId: verifiedLineUserId });
    else if (fn === 'rejectLeaveRequest') result = await handleRejectLeaveRequest(env, { ...payload, approverLineId: verifiedLineUserId });
    return jsonResponse({ ok: true, result }, 200);
  } catch (err) {
    console.error(`API Error in ${fn}:`, err.message);
    return jsonResponse({ ok: false, error: 'request failed' }, 500);
  }
}
// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (path === '/export-hr' || path === '/api/export-hr') {
        const sb = getSupabaseConfig(env);
        const res = await fetch(`${sb.url}/rest/v1/hr_overview?select=*`, {
          headers: getSupabaseHeaders(sb.key)
        });
        if (!res.ok) {
          return new Response('Error loading data from Supabase: ' + res.status, { status: 500 });
        }
        const rows = await res.json();
        const formattedRows = (rows || []).map(r => {
          const rowCopy = { ...r };
          ['วันที่ลงบันทึกการขอลา', 'วันที่ลาใช้สิทธิ', 'วันที่พิจารณา'].forEach(k => {
            if (rowCopy[k]) rowCopy[k] = formatThaiDate(rowCopy[k]);
          });
          // Clean up duplicate title prefix if present (e.g. "นาย นาย ...")
          if (rowCopy['ชื่อ-สกุล']) {
            rowCopy['ชื่อ-สกุล'] = rowCopy['ชื่อ-สกุล'].replace(/^(\S+)\s+\1\s+/, '$1 ');
          }
          return rowCopy;
        });
        const csv = jsonToCsv(formattedRows);
        return new Response(csv, {
          status: 200,
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'inline; filename="leave_summary.csv"',
            'cache-control': 'no-store'
          }
        });
      }

      if (path === '/ping') {
        const sb = getSupabaseConfig(env);
        const sbPing = await fetch(`${sb.url}/rest/v1/employees?select=count`, {
          headers: getSupabaseHeaders(sb.key)
        }).then(r => r.ok).catch(() => false);

        return jsonResponse({
          status: 'ok',
          time: new Date().toISOString(),
          supabaseConnected: sbPing,
          hasChannelSecret: !!(env && (env.LINE_CHANNEL_SECRET || env.CHANNEL_SECRET)),
          hasChannelAccessToken: !!(env && (env.LINE_CHANNEL_ACCESS_TOKEN || env.CHANNEL_ACCESS_TOKEN))
        });
      }

      const name = path === '/register'
        ? 'register'
        : (path === '/leave'
          ? 'leave'
          : (path === '/reject'
            ? 'reject'
            : (path === '/' || path === '/portal' ? 'portal' : null)));
      if (name) {
        return new Response(renderPage(name, env), {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
          }
        });
      }

      return new Response('LINE Leave System (Powered by Supabase & Cloudflare) is running.', { status: 200 });
    }

    if (request.method === 'POST') {
      if (path === '/api') return handleApi(request, env, ctx);
      return handleWebhook(request, env, ctx);
    }

    return new Response('Method Not Allowed', { status: 405 });
  },

  async scheduled(controller, env, ctx) {
    try {
      const sb = getSupabaseConfig(env);
      const res = await fetch(`${sb.url}/rest/v1/employees?select=count`, {
        headers: getSupabaseHeaders(sb.key)
      });
      console.log('Cron keep-alive ping to Supabase status:', res.status);
    } catch (err) {
      console.error('Cron keep-alive ping error:', err.message);
    }
  }
};