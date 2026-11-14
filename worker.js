/**
 * Cloudflare Worker Bundle for LINE Leave System
 * Multi-level Approval (Manager -> GM), Rejection Reason & PC Support
 */

const LIFF_ID_REGISTER = '2011955364-O2qTmo0r';
const LIFF_ID_LEAVE = '2011955364-FCY27ABh';

const PAGES = {
  register: "<!DOCTYPE html>\n<html lang=\"th\">\n\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n  <title>ลงทะเบียนพนักงาน</title>\n\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">\n\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">\n  <script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script>\n  <script charset=\"utf-8\" src=\"https://static.line-scdn.net/liff/edge/2/sdk.js\"></script>\n\n  <style>\n    body {\n      font-family: 'Prompt', sans-serif;\n      background-color: #F3F4F6;\n    }\n  </style>\n</head>\n\n<body class=\"min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6\">\n\n  <div class=\"max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100\">\n\n    <!-- HEADER -->\n    <div class=\"bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-6 text-white text-center\">\n      <div\n        class=\"w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner\">\n        <i class=\"fa-solid fa-id-card text-2xl text-white\"></i>\n      </div>\n      <h1 class=\"text-xl font-bold tracking-wide\">ลงทะเบียนพนักงาน</h1>\n      <p class=\"text-xs text-blue-200 mt-1\">เข้าสู่ระบบยื่นใบลาและอนุมัติผ่าน LINE</p>\n    </div>\n\n    <!-- LOADING -->\n    <div id=\"loadingOverlay\" class=\"p-8 text-center\">\n      <div class=\"inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3\">\n      </div>\n      <p id=\"loadingText\" class=\"text-sm text-gray-500 font-medium\">กำลังเชื่อมต่อ LINE LIFF...</p>\n      <p id=\"loadingTime\" class=\"text-[10px] text-gray-400 mt-2\"></p>\n    </div>\n\n    <!-- FORM -->\n    <form id=\"registerForm\" class=\"p-6 space-y-4 hidden\">\n\n      <!-- LINE PROFILE -->\n      <div class=\"flex items-center space-x-3 p-3 bg-blue-50/70 rounded-xl border border-blue-100\">\n        <img id=\"userPicture\"\n             src=\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23CBD5E1'/%3E%3Ccircle cx='30' cy='23' r='11' fill='%23fff'/%3E%3Cellipse cx='30' cy='54' rx='20' ry='15' fill='%23fff'/%3E%3C/svg%3E\"\n             alt=\"Avatar\"\n             class=\"w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover\">\n        <div class=\"flex-1 min-w-0\">\n          <p class=\"text-xs text-gray-500 font-medium\">บัญชี LINE ที่เชื่อมต่อ</p>\n          <p id=\"userNameDisplay\" class=\"text-sm font-semibold text-gray-800 truncate\">กำลังโหลด...</p>\n          <p id=\"userIdDisplay\" class=\"text-[10px] text-gray-400 font-mono truncate\">ID: -</p>\n        </div>\n      </div>\n\n      <input type=\"hidden\" id=\"lineUserId\">\n\n      <!-- COMPANY -->\n      <div>\n        <label for=\"company\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n          บริษัทในเครือ <span class=\"text-red-500\">*</span>\n        </label>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-building text-xs\"></i>\n          </div>\n          <select id=\"company\" required\n                  class=\"w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white\">\n            <option value=\"\" disabled selected>เลือกบริษัทของคุณ</option>\n            <option value=\"บริษัท ฟินน์ลูชั่น จำกัด\">บริษัท ฟินน์ลูชั่น จำกัด</option>\n            <option value=\"บริษัท ฟินน์เจนติก จำกัด\">บริษัท ฟินน์เจนติก จำกัด</option>\n            <option value=\"บริษัท สบายโก จำกัด\">บริษัท สบายโก จำกัด</option>\n            <option value=\"บริษัท เทวาพาวเวอร์ จํากัด\">บริษัท เทวาพาวเวอร์ จํากัด</option>\n            <option value=\"บริษัท เบเนฟินน์ จํากัด\">บริษัท เบเนฟินน์ จํากัด</option>\n            <option value=\"บริษัท อินฟินิท ซัคเซส คอนซัลติ้ง จำกัด\">บริษัท อินฟินิท ซัคเซส คอนซัลติ้ง จำกัด</option>\n          </select>\n          <div class=\"absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-chevron-down text-xs\"></i>\n          </div>\n        </div>\n      </div>\n\n      <!-- EMPLOYEE ID (ตัวเลขเท่านั้น) -->\n      <div>\n        <label for=\"employeeId\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n          รหัสพนักงาน <span class=\"text-red-500\">*</span>\n        </label>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-barcode text-xs\"></i>\n          </div>\n          <input type=\"text\" id=\"employeeId\" required inputmode=\"numeric\" pattern=\"[0-9]+\" autocomplete=\"off\"\n                 placeholder=\"กรอกรหัสพนักงานเป็นตัวเลขเท่านั้น\"\n                 class=\"w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono\">\n        </div>\n      </div>\n\n      <!-- TITLE & FULL NAME (GRID) -->\n      <div class=\"grid grid-cols-3 gap-2\">\n        <div class=\"col-span-1\">\n          <label for=\"title\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            คำนำหน้า <span class=\"text-red-500\">*</span>\n          </label>\n          <div class=\"relative\">\n            <select id=\"title\" required\n                    class=\"w-full px-2.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white\">\n              <option value=\"\" disabled selected>เลือก</option>\n              <option value=\"นาย\">นาย</option>\n              <option value=\"นาง\">นาง</option>\n              <option value=\"นางสาว\">นางสาว</option>\n              <option value=\"อื่นๆ\">อื่นๆ</option>\n            </select>\n            <div class=\"absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400\">\n              <i class=\"fa-solid fa-chevron-down text-[10px]\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"col-span-2\">\n          <label for=\"fullName\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            ชื่อ-นามสกุล <span class=\"text-red-500\">*</span>\n          </label>\n          <div class=\"relative\">\n            <div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400\">\n              <i class=\"fa-solid fa-user text-xs\"></i>\n            </div>\n            <input type=\"text\" id=\"fullName\" required placeholder=\"สมชาย ใจดี\"\n                   class=\"w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none\">\n          </div>\n        </div>\n      </div>\n\n      <!-- DIVISION (ซ้าย) & DEPARTMENT (ขวา) -->\n      <div class=\"grid grid-cols-2 gap-2\">\n        <div>\n          <label for=\"division\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            ฝ่าย <span class=\"text-red-500\">*</span>\n          </label>\n          <div class=\"relative\">\n            <div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400\">\n              <i class=\"fa-solid fa-sitemap text-xs\"></i>\n            </div>\n            <select id=\"division\" required class=\"w-full pl-8 pr-3 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none\"><option value=\"\" disabled selected>เลือกฝ่าย</option><option value=\"Support\">Support</option><option value=\"Operate\">Operate</option><option value=\"Management\">ผู้บริหาร</option></select>\n          </div>\n        </div>\n\n        <div>\n          <label for=\"department\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            แผนก <span class=\"text-red-500\">*</span>\n          </label>\n          <div class=\"relative\">\n            <div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400\">\n              <i class=\"fa-solid fa-layer-group text-xs\"></i>\n            </div>\n            <select id=\"department\" required class=\"w-full pl-8 pr-3 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none\"><option value=\"\" disabled selected>เลือกแผนก/ทีม</option></select>\n          </div>\n        </div>\n      </div>\n\n      <!-- POSITION -->\n      <div>\n        <label for=\"position\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n          ตำแหน่งงาน <span class=\"text-red-500\">*</span>\n        </label>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-briefcase text-xs\"></i>\n          </div>\n          <select id=\"position\" required class=\"w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none\"><option value=\"\" disabled selected>เลือกบทบาท</option><option value=\"EMPLOYEE\">พนักงาน</option><option value=\"MANAGER\">Manager</option></select>\n        </div>\n      </div>\n\n      <!-- MANAGER -->\n      <div>\n        <div class=\"flex items-center justify-between mb-1\">\n          <label for=\"managerLineId\" class=\"block text-xs font-semibold text-gray-700\">\n            หัวหน้าผู้อนุมัติของคุณ <span class=\"text-red-500\">*</span>\n          </label>\n          <button id=\"refreshMgrBtn\" type=\"button\" class=\"text-[11px] text-blue-600 hover:underline\">\n            <i class=\"fa-solid fa-rotate-right\"></i> รีเฟรชรายชื่อ\n          </button>\n        </div>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-user-tie text-xs\"></i>\n          </div>\n          <select id=\"managerLineId\" required\n                  class=\"w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white\">\n            <option value=\"\" disabled selected>กำลังโหลดรายชื่อหัวหน้า...</option>\n          </select>\n          <div class=\"absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-chevron-down text-xs\"></i>\n          </div>\n        </div>\n        <p class=\"text-[11px] text-gray-400 mt-1\">\n          * เมื่อคุณยื่นใบลา ระบบจะส่งข้อความขออนุมัติไปยังหัวหน้าคนนี้\n        </p>\n      </div>\n\n      <!-- SUBMIT -->\n      <div class=\"pt-2\">\n        <button type=\"submit\" id=\"submitBtn\"\n                class=\"w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2\">\n          <i class=\"fa-solid fa-circle-check\"></i>\n          <span>บันทึกข้อมูลการลงทะเบียน</span>\n        </button>\n      </div>\n\n    </form>\n  </div>\n\n  <div class=\"text-center text-xs text-gray-400 mt-6\">\n    ระบบลาและอนุมัติงาน &bull; ขับเคลื่อนด้วย Google Sheets &amp; LINE LIFF\n  </div>\n\n  <script>\n    /* ===================== CONFIG ===================== */\n\nconst LIFF_ID = \"__LIFF_ID__\";\nconst API_URL = \"/api\";\nconst SUBMIT_LABEL = `\n  <i class=\"fa-solid fa-circle-check\"></i>\n  <span>บันทึกข้อมูลการลงทะเบียน</span>`;\n\nlet idToken = \"\";\nlet currentUserId = \"\";\nlet submitting = false;\nlet bootstrapMode = false;\nlet cachedManagers = [];\n\n/* ===================== DOM ===================== */\n\nconst $ = (id) => document.getElementById(id);\n\nconst loadingOverlay = $(\"loadingOverlay\");\nconst loadingText = $(\"loadingText\");\nconst loadingTime = $(\"loadingTime\");\nconst registerForm = $(\"registerForm\");\nconst userPicture = $(\"userPicture\");\nconst userNameDisplay = $(\"userNameDisplay\");\nconst userIdDisplay = $(\"userIdDisplay\");\nconst lineUserIdInput = $(\"lineUserId\");\nconst companySelect = $(\"company\");\nconst employeeIdInput = $(\"employeeId\");\n\n// รหัสพนักงาน: ตัวเลขเท่านั้น (แปลงเลขไทย ๐-๙ เป็นเลขอารบิก แล้วตัดอักขระอื่นทิ้ง)\nemployeeIdInput.addEventListener(\"input\", function () {\n  this.value = this.value\n    .replace(/[๐-๙]/g, function (d) { return \"๐๑๒๓๔๕๖๗๘๙\".indexOf(d); })\n    .replace(/[^0-9]/g, \"\");\n});\n\nconst titleSelect = $(\"title\");\nconst fullNameInput = $(\"fullName\");\nconst divisionInput = $(\"division\");\nconst departmentInput = $(\"department\");\nconst positionInput = $(\"position\");\nconst managerSelect = $(\"managerLineId\");\nconst refreshMgrBtn = $(\"refreshMgrBtn\");\nconst submitBtn = $(\"submitBtn\");\n\n/* ===================== UTIL ===================== */\n\nfunction escapeHtml(v) {\n  return String(v === null || v === undefined ? \"\" : v)\n    .replace(/&/g, \"&amp;\")\n    .replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\")\n    .replace(/\"/g, \"&quot;\")\n    .replace(/'/g, \"&#39;\");\n}\n\nfunction setLoading(text) {\n  loadingText.textContent = text || \"กำลังโหลด...\";\n}\n\nfunction hideLoading() {\n  loadingOverlay.classList.add(\"hidden\");\n}\n\n/* ===================== API (ผ่าน Cloudflare Worker /api) ===================== */\n\nasync function callApi(fn, args = [], timeout = 20000) {\n  const started = performance.now();\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), timeout);\n\n  try {\n    console.log(\"[API START]\", fn);\n\n    const response = await fetch(API_URL, {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ fn: fn, args: args }),\n      cache: \"no-store\",\n      signal: controller.signal\n    });\n\n    const text = await response.text();\n    let data;\n\n    try {\n      data = JSON.parse(text);\n    } catch (e) {\n      throw new Error(\"ระบบตอบกลับไม่ใช่ JSON (HTTP \" + response.status + \")\");\n    }\n\n    console.log(\"[API END]\", fn, Math.round(performance.now() - started) + \" ms\");\n\n    if (!response.ok || !data.ok) {\n      throw new Error(data && data.error ? data.error : \"HTTP \" + response.status);\n    }\n\n    return data.result;\n\n  } catch (error) {\n    console.error(\"[API ERROR]\", fn, error);\n\n    if (error.name === \"AbortError\") {\n      throw new Error(fn + \" ใช้เวลานานเกิน \" + timeout / 1000 + \" วินาที\");\n    }\n    throw error;\n\n  } finally {\n    clearTimeout(timer);\n  }\n}\n\n/* ===================== LIFF DIAGNOSTIC ===================== */\n\nfunction liffDiag() {\n  const d = {\n    sdkLoaded: typeof liff !== \"undefined\",\n    liffId: LIFF_ID,\n    href: window.location.href.slice(0, 200),\n    ua: navigator.userAgent.slice(0, 120)\n  };\n\n  if (typeof liff !== \"undefined\") {\n    try { d.inClient = liff.isInClient(); } catch (e) {}\n    try { d.os = liff.getOS(); } catch (e) {}\n    try { d.loggedIn = liff.isLoggedIn(); } catch (e) {}\n  }\n\n  return d;\n}\n\nfunction showLiffProblem(title, detail, login = false) {\n  loadingOverlay.classList.remove(\"hidden\");\n\n  loadingOverlay.innerHTML = `\n    <div class=\"text-red-500 text-left\">\n      <p class=\"font-semibold text-sm text-center\">\n        <i class=\"fa-solid fa-triangle-exclamation\"></i>\n        ${escapeHtml(title)}\n      </p>\n      <p class=\"text-xs text-gray-500 mt-2\">${escapeHtml(detail)}</p>\n      ${login ? `\n        <div class=\"text-center mt-3\">\n          <button type=\"button\" onclick=\"liff.login()\"\n                  class=\"px-4 py-2 rounded-lg bg-green-500 text-white text-sm\">\n            ลองเข้าสู่ระบบ LINE\n          </button>\n        </div>` : \"\"}\n      <pre class=\"text-[10px] text-gray-400 mt-3 whitespace-pre-wrap break-all bg-gray-50 p-2 rounded\">${escapeHtml(JSON.stringify(liffDiag(), null, 2))}</pre>\n    </div>`;\n}\n\n/* ===================== INIT LIFF ===================== */\n\nasync function initializeLiff() {\n  const started = performance.now();\n\n  try {\n    setLoading(\"กำลังเชื่อมต่อ LINE LIFF...\");\n\n    if (typeof liff === \"undefined\") {\n      showLiffProblem(\"โหลด LIFF SDK ไม่สำเร็จ\", \"ไม่สามารถโหลด LINE LIFF SDK ได้\");\n      return;\n    }\n\n    const timeoutPromise = new Promise((_, reject) =>\n      setTimeout(\n        () => reject(new Error(\"การเชื่อมต่อ LINE LIFF ใช้เวลานานเกินไป (เกิน 15 วินาที)\")),\n        15000\n      )\n    );\n\n    await Promise.race([liff.init({ liffId: LIFF_ID }), timeoutPromise]);\n\n    console.log(\"[LIFF INIT]\", Math.round(performance.now() - started), \"ms\");\n\n    if (!liff.isLoggedIn()) {\n      // Auto login on PC / external browser\n      liff.login({ redirectUri: window.location.href });\n      return;\n    }\n\n    idToken = liff.getIDToken() || \"\";\n\n    setLoading(\"กำลังอ่านข้อมูลบัญชี LINE...\");\n\n    const profile = await liff.getProfile();\n\n    currentUserId = profile.userId;\n    lineUserIdInput.value = profile.userId;\n    userNameDisplay.textContent = profile.displayName || \"LINE User\";\n    userIdDisplay.textContent = \"ID: \" + profile.userId;\n\n    if (profile.pictureUrl) userPicture.src = profile.pictureUrl;\n\n    console.log(\"[PROFILE]\", Math.round(performance.now() - started), \"ms\");\n\n    setLoading(\"กำลังโหลดข้อมูลพนักงานและรายชื่อหัวหน้า...\");\n\n    await loadPageData();\n\n    loadingTime.textContent =\n      \"โหลดเสร็จใน \" + Math.round(performance.now() - started) + \" ms\";\n\n  } catch (error) {\n    console.error(\"LIFF ERROR\", error);\n    showLiffProblem(\"เกิดข้อผิดพลาดในการเชื่อมต่อ LINE LIFF\", error.message, true);\n  }\n}\n\n/* ===================== LOAD PAGE DATA ===================== */\n\nasync function loadPageData() {\n  // Profile และรายชื่อหัวหน้ามาจาก request เดียว พร้อม verify ID Token ครั้งเดียว\n  const pageData = await callApi(\"getRegisterPageData\", [currentUserId, idToken]);\n\n  const profile = pageData && pageData.profile;\n  const managers = pageData && Array.isArray(pageData.managers) ? pageData.managers : [];\n  bootstrapMode = !!(pageData && pageData.bootstrapMode);\n  cachedManagers = managers;\n\n  // เติมข้อมูลเดิม\n  if (profile && profile.isRegistered) {\n    if (profile.company) companySelect.value = profile.company;\n    employeeIdInput.value = String(profile.employeeId || \"\").replace(/[^0-9]/g, \"\");\n    if (profile.title) titleSelect.value = profile.title;\n    fullNameInput.value = profile.fullName || \"\";\n    divisionInput.value = profile.division || \"\";\n    updateDepartmentOptions(profile.department || \"\");\n    positionInput.value = profile.approvalRole || (profile.position === \"Manager\" ? \"MANAGER\" : profile.position ? \"EMPLOYEE\" : \"\");\n\n    managerSelect.setAttribute(\n      \"data-saved-manager\",\n      profile.managerLineId || \"TOP_MANAGEMENT\"\n    );\n  }\n\n  if (!departmentInput.value) updateDepartmentOptions(\"\");\n  renderManagers(managers);\n\n  hideLoading();\n  registerForm.classList.remove(\"hidden\");\n}\n\nfunction updateDepartmentOptions(selectedValue) {\n  const optionsByDivision = {\n    Support: [\"HR\", \"บัญชี\", \"กฎหมาย\", \"ธุรการกฎหมาย\", \"IT\"],\n    Operate: [\"ระบบติดตามหนี้\"],\n    Management: [\"ผู้จัดการทั่วไป\"]\n  };\n  const departments = optionsByDivision[divisionInput.value] || [];\n  const managerOption = Array.from(positionInput.options).find(option => option.value === \"MANAGER\");\n  if (managerOption) {\n    managerOption.textContent = divisionInput.value === \"Support\" ? \"หัวหน้าแผนก\"\n      : divisionInput.value === \"Management\" ? \"ผู้จัดการทั่วไป\" : \"Manager\";\n  }\n  departmentInput.innerHTML = \"\";\n  const placeholder = document.createElement(\"option\");\n  placeholder.value = \"\";\n  placeholder.textContent = \"เลือกแผนก/ทีม\";\n  placeholder.disabled = true;\n  placeholder.selected = !selectedValue;\n  departmentInput.appendChild(placeholder);\n  departments.forEach(function (name) {\n    const option = document.createElement(\"option\");\n    option.value = name;\n    option.textContent = name;\n    departmentInput.appendChild(option);\n  });\n  if (departments.includes(selectedValue)) departmentInput.value = selectedValue;\n}\n\n/* ===================== RENDER MANAGER ===================== */\n\nfunction filterEligibleManagers(managers) {\n  const isGeneralManager = function (manager) {\n    return manager.division === \"Management\" && manager.department === \"ผู้จัดการทั่วไป\";\n  };\n  return (managers || []).filter(function (manager) {\n    if (!manager || manager.approvalRole !== \"MANAGER\") return false;\n    if (positionInput.value === \"MANAGER\") return isGeneralManager(manager);\n    if (divisionInput.value === \"Operate\") {\n      return manager.division === \"Operate\" && manager.company === companySelect.value;\n    }\n    if (divisionInput.value === \"Support\") {\n      if (departmentInput.value === \"IT\") {\n        return isGeneralManager(manager) || (manager.division === \"Operate\" && manager.company === companySelect.value);\n      }\n      return manager.division === \"Support\" && manager.department === departmentInput.value;\n    }\n    return false;\n  });\n}\n\nfunction renderManagers(managers) {\n  const savedManager = managerSelect.getAttribute(\"data-saved-manager\");\n\n  managerSelect.innerHTML = \"\";\n\n  const defaultOption = document.createElement(\"option\");\n  defaultOption.value = \"\";\n  defaultOption.textContent = \"-- กรุณาเลือกหัวหน้าผู้อนุมัติ --\";\n  defaultOption.disabled = true;\n  defaultOption.selected = !savedManager;\n  managerSelect.appendChild(defaultOption);\n\n  const mayBootstrapWithoutManager = bootstrapMode && positionInput.value === \"MANAGER\";\n  managerSelect.required = true;\n  if (mayBootstrapWithoutManager) {\n    const topOption = document.createElement(\"option\");\n    topOption.value = \"TOP_MANAGEMENT\";\n    topOption.textContent = \"ไม่มีหัวหน้า (ชั่วคราวระหว่างตั้งค่าระบบ)\";\n    topOption.selected = savedManager === \"TOP_MANAGEMENT\";\n    managerSelect.appendChild(topOption);\n  }\n\n  const eligibleManagers = filterEligibleManagers(managers);\n  if (Array.isArray(eligibleManagers)) {\n    eligibleManagers.forEach(function (mgr) {\n      if (!mgr || !mgr.lineUserId || mgr.lineUserId === currentUserId) return;\n\n      const option = document.createElement(\"option\");\n      option.value = mgr.lineUserId;\n\n      const position = mgr.position ? \" (\" + mgr.position + \")\" : \"\";\n\n      option.textContent =\n        (mgr.fullName || \"-\") + position + \" - \" + (mgr.department || \"ไม่ระบุแผนก\");\n\n      if (savedManager && savedManager === mgr.lineUserId) {\n        option.selected = true;\n        defaultOption.selected = false;\n      }\n\n      managerSelect.appendChild(option);\n    });\n  }\n\n  if (savedManager === \"TOP_MANAGEMENT\" && mayBootstrapWithoutManager) {\n    const topOption = Array.from(managerSelect.options).find(option => option.value === \"TOP_MANAGEMENT\");\n    if (topOption) { topOption.selected = true; defaultOption.selected = false; }\n  }\n}\n\ndivisionInput.addEventListener(\"change\", function () { updateDepartmentOptions(\"\"); renderManagers(cachedManagers); });\ndepartmentInput.addEventListener(\"change\", function () { renderManagers(cachedManagers); });\npositionInput.addEventListener(\"change\", function () { renderManagers(cachedManagers); });\ncompanySelect.addEventListener(\"change\", function () { renderManagers(cachedManagers); });\n\n/* ===================== REFRESH MANAGER ===================== */\n\nrefreshMgrBtn.addEventListener(\"click\", async function () {\n  if (refreshMgrBtn.disabled) return;\n\n  refreshMgrBtn.disabled = true;\n  refreshMgrBtn.innerHTML = `<i class=\"fa-solid fa-spinner animate-spin\"></i> กำลังโหลด...`;\n\n  try {\n    const pageData = await callApi(\"getRegisterPageData\", [currentUserId, idToken], 20000);\n    const managers = pageData && Array.isArray(pageData.managers) ? pageData.managers : [];\n    bootstrapMode = !!(pageData && pageData.bootstrapMode);\n    cachedManagers = managers;\n\n    renderManagers(managers);\n\n    Swal.fire({\n      toast: true,\n      position: \"top-end\",\n      icon: \"success\",\n      title: \"อัปเดตรายชื่อแล้ว\",\n      showConfirmButton: false,\n      timer: 1200\n    });\n\n  } catch (error) {\n    console.error(\"REFRESH MANAGER ERROR\", error);\n    Swal.fire(\"ไม่สามารถโหลดรายชื่อได้\", error.message, \"error\");\n\n  } finally {\n    refreshMgrBtn.disabled = false;\n    refreshMgrBtn.innerHTML = `<i class=\"fa-solid fa-rotate-right\"></i> รีเฟรชรายชื่อ`;\n  }\n});\n\n/* ===================== SUBMIT REGISTER ===================== */\n\nregisterForm.addEventListener(\"submit\", async function (e) {\n  e.preventDefault();\n\n  if (submitting) return;\n\n  const lineUserId = lineUserIdInput.value;\n  const company = companySelect.value;\n  const employeeId = employeeIdInput.value.trim();\n  const title = titleSelect.value;\n  const fullName = fullNameInput.value.trim();\n  const division = divisionInput.value.trim();\n  const department = departmentInput.value.trim();\n  const position = positionInput.value.trim();\n  let managerLineId = managerSelect.value;\n\n  if (!/^[0-9]+$/.test(employeeId)) {\n    Swal.fire(\"รหัสพนักงานไม่ถูกต้อง\", \"กรุณากรอกรหัสพนักงานเป็นตัวเลขเท่านั้น\", \"warning\");\n    employeeIdInput.focus();\n    return;\n  }\n\n  if (!lineUserId) {\n    Swal.fire(\"แจ้งเตือน\", \"ไม่พบ LINE User ID กรุณาเข้าใช้งานผ่าน LINE\", \"warning\");\n    return;\n  }\n\n  if (!company || !employeeId || !title || !fullName || !division || !department || !position || !managerLineId) {\n    Swal.fire(\n      \"กรุณากรอกข้อมูลให้ครบถ้วน\",\n      \"โปรดระบุ บริษัท, รหัสพนักงาน, คำนำหน้า, ชื่อ-สกุล, ฝ่าย, แผนก, ตำแหน่ง และหัวหน้าผู้อนุมัติ\",\n      \"warning\"\n    );\n    return;\n  }\n\n  if (managerLineId === \"TOP_MANAGEMENT\") managerLineId = \"\";\n\n  const payload = {\n    lineUserId: lineUserId,\n    company: company,\n    employeeId: employeeId,\n    title: title,\n    fullName: fullName,\n    division: division,\n    department: department,\n    position: position,\n    managerLineId: managerLineId,\n    approvalRole: positionInput.value,\n    idToken: idToken\n  };\n\n  const confirm = await Swal.fire({\n    title: \"ยืนยันข้อมูลลงทะเบียน?\",\n    html: `\n      <div class=\"text-left text-xs bg-gray-50 p-3 rounded-lg space-y-1\">\n        <p><strong>บริษัท:</strong> ${escapeHtml(company)}</p>\n        <p><strong>รหัสพนักงาน:</strong> ${escapeHtml(employeeId)}</p>\n        <p><strong>ชื่อ-สกุล:</strong> ${escapeHtml(title)} ${escapeHtml(fullName)}</p>\n        <p><strong>ฝ่าย:</strong> ${escapeHtml(division)}</p>\n        <p><strong>แผนก:</strong> ${escapeHtml(department)}</p>\n        <p><strong>ตำแหน่ง:</strong> ${escapeHtml(position)}</p>\n      </div>`,\n    icon: \"question\",\n    showCancelButton: true,\n    confirmButtonColor: \"#2563EB\",\n    confirmButtonText: \"บันทึก\",\n    cancelButtonText: \"ยกเลิก\"\n  });\n\n  if (!confirm.isConfirmed) return;\n\n  await executeRegister(payload);\n});\n\n/* ===================== REGISTER API ===================== */\n\nasync function executeRegister(payload) {\n  submitting = true;\n  submitBtn.disabled = true;\n  submitBtn.innerHTML = `\n    <i class=\"fa-solid fa-spinner animate-spin\"></i>\n    <span>กำลังบันทึกข้อมูล...</span>`;\n\n  try {\n    const result = await callApi(\"registerEmployee\", [payload], 30000);\n    handleSuccess(result);\n  } catch (error) {\n    handleError(error);\n  }\n}\n\nfunction resetSubmitButton() {\n  submitting = false;\n  submitBtn.disabled = false;\n  submitBtn.innerHTML = SUBMIT_LABEL;\n}\n\nfunction handleSuccess(res) {\n  if (res && res.success) {\n\n    submitBtn.innerHTML = `\n      <i class=\"fa-solid fa-circle-check\"></i>\n      <span>บันทึกเรียบร้อยแล้ว</span>`;\n\n    Swal.fire({\n      icon: \"success\",\n      title: \"สำเร็จ!\",\n      text: res.message || \"บันทึกข้อมูลพนักงานเรียบร้อยแล้ว\",\n      confirmButtonColor: \"#2563EB\",\n      confirmButtonText: \"ตกลง\",\n      timer: 2000,\n      timerProgressBar: true\n    }).then(function () {\n      try {\n        if (liff.isInClient()) liff.closeWindow();\n      } catch (e) {}\n    });\n\n  } else {\n    resetSubmitButton();\n\n    Swal.fire(\n      \"ไม่สำเร็จ\",\n      res && res.message ? res.message : \"เกิดข้อผิดพลาดในการบันทึก\",\n      \"error\"\n    );\n  }\n}\n\nfunction handleError(error) {\n  resetSubmitButton();\n  console.error(\"REGISTER ERROR\", error);\n\n  Swal.fire(\n    \"เกิดข้อผิดพลาด\",\n    error && error.message ? error.message : \"ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้\",\n    \"error\"\n  );\n}\n\n/* ===================== START ===================== */\n\nwindow.addEventListener(\"DOMContentLoaded\", initializeLiff);\n  </script>\n\n</body>\n\n</html>",
  leave: "<!DOCTYPE html>\n<html lang=\"th\">\n\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n  <title>ระบบยื่นใบลา</title>\n\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">\n\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">\n  <script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script>\n  <script charset=\"utf-8\" src=\"https://static.line-scdn.net/liff/edge/2/sdk.js\"></script>\n\n  <style>\n    body { font-family: 'Prompt', sans-serif; background-color: #F3F4F6; }\n\n    .leave-type-card input:checked + label {\n      border-color: #2563EB;\n      background-color: #EFF6FF;\n      color: #1E40AF;\n      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06);\n    }\n  </style>\n</head>\n\n<body class=\"min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6\">\n\n  <div class=\"max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100\">\n\n    <!-- HEADER -->\n    <div class=\"bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-6 py-6 text-white text-center\">\n      <div class=\"w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner\">\n        <i class=\"fa-solid fa-calendar-check text-2xl text-white\"></i>\n      </div>\n      <h1 class=\"text-xl font-bold tracking-wide\">แบบฟอร์มยื่นใบลา</h1>\n      <p class=\"text-xs text-blue-100 mt-1\">ส่งคำขออนุมัติไปยังหัวหน้างานอัตโนมัติ</p>\n    </div>\n\n    <!-- LOADING -->\n    <div id=\"loadingOverlay\" class=\"p-8 text-center\">\n      <div class=\"inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3\"></div>\n      <p id=\"loadingText\" class=\"text-sm text-gray-500 font-medium\">กำลังเชื่อมต่อ LINE LIFF...</p>\n      <p id=\"loadingTime\" class=\"text-[10px] text-gray-400 mt-2\"></p>\n    </div>\n\n    <!-- UNREGISTERED -->\n    <div id=\"unregisteredBox\" class=\"p-6 text-center hidden space-y-4\">\n      <div class=\"w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl\">\n        <i class=\"fa-solid fa-user-xmark\"></i>\n      </div>\n      <h2 class=\"text-lg font-bold text-gray-800\">ยังไม่พบข้อมูลการลงทะเบียน</h2>\n      <p class=\"text-sm text-gray-600\">\n        คุณจำเป็นต้องลงทะเบียนข้อมูลพนักงานและระบุหัวหน้าผู้อนุมัติก่อน\n        จึงจะสามารถเริ่มยื่นใบลาได้\n      </p>\n      <div class=\"pt-3\">\n        <button id=\"goToRegisterBtn\" type=\"button\"\n                class=\"w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-md transition-all\">\n          <i class=\"fa-solid fa-user-plus mr-1\"></i>\n          ไปยังหน้าลงทะเบียนพนักงาน\n        </button>\n      </div>\n    </div>\n\n    <!-- LEAVE FORM -->\n    <form id=\"leaveForm\" class=\"p-6 space-y-4 hidden\">\n\n      <!-- EMPLOYEE PROFILE CARD -->\n      <div class=\"p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200\">\n        <div class=\"flex items-start justify-between mb-2\">\n          <div class=\"flex items-center space-x-2\">\n            <div class=\"w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0\">\n              <i class=\"fa-solid fa-user\"></i>\n            </div>\n            <div>\n              <span id=\"empNameDisplay\" class=\"text-sm font-bold text-gray-900 block leading-tight\">พนักงาน</span>\n              <span id=\"empIdDisplay\" class=\"text-[10px] font-mono text-gray-500\">รหัส: -</span>\n            </div>\n          </div>\n          <span id=\"empCompanyDisplay\" class=\"text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-medium text-right max-w-[170px] truncate\">\n            บริษัท\n          </span>\n        </div>\n\n        <div class=\"pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-gray-600\">\n          <div>\n            <span class=\"text-gray-400 text-[10px] block\">ฝ่าย / แผนก</span>\n            <span id=\"empDeptDivDisplay\" class=\"font-medium text-gray-800 text-[11px]\">-</span>\n          </div>\n          <div class=\"text-right\">\n            <span class=\"text-gray-400 text-[10px] block\">ตำแหน่ง</span>\n            <span id=\"empPosDisplay\" class=\"font-medium text-gray-800 text-[11px]\">-</span>\n          </div>\n        </div>\n      </div>\n\n      <!-- HIDDEN -->\n      <input type=\"hidden\" id=\"employeeLineId\">\n      <input type=\"hidden\" id=\"employeeName\">\n      <input type=\"hidden\" id=\"department\">\n      <input type=\"hidden\" id=\"managerLineId\">\n\n      <!-- LEAVE TYPE -->\n      <div>\n        <label class=\"block text-xs font-semibold text-gray-700 mb-2\">\n          ประเภทการลา <span class=\"text-red-500\">*</span>\n        </label>\n\n        <div class=\"grid grid-cols-3 gap-2\">\n\n          <div class=\"leave-type-card\">\n            <input type=\"radio\" id=\"typeSick\" name=\"leaveType\" value=\"ลาป่วย\" class=\"hidden\" checked>\n            <label for=\"typeSick\"\n                   class=\"flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-gray-200 cursor-pointer transition-all hover:border-blue-400 text-center\">\n              <i class=\"fa-solid fa-notes-medical text-base text-emerald-500 mb-1\"></i>\n              <span class=\"text-xs font-semibold\">ลาป่วย</span>\n            </label>\n          </div>\n\n          <div class=\"leave-type-card\">\n            <input type=\"radio\" id=\"typeBusiness\" name=\"leaveType\" value=\"ลากิจ\" class=\"hidden\">\n            <label for=\"typeBusiness\"\n                   class=\"flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-gray-200 cursor-pointer transition-all hover:border-blue-400 text-center\">\n              <i class=\"fa-solid fa-briefcase text-base text-amber-500 mb-1\"></i>\n              <span class=\"text-xs font-semibold\">ลากิจ</span>\n            </label>\n          </div>\n\n          <div class=\"leave-type-card\">\n            <input type=\"radio\" id=\"typeVacation\" name=\"leaveType\" value=\"ลาพักร้อน\" class=\"hidden\">\n            <label for=\"typeVacation\"\n                   class=\"flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-gray-200 cursor-pointer transition-all hover:border-blue-400 text-center\">\n              <i class=\"fa-solid fa-umbrella-beach text-base text-sky-500 mb-1\"></i>\n              <span class=\"text-xs font-semibold\">ลาพักร้อน</span>\n            </label>\n          </div>\n\n          <div class=\"leave-type-card col-span-1\">\n            <input type=\"radio\" id=\"typeUnpaid\" name=\"leaveType\" value=\"ลาไม่ได้รับค่าจ้าง\" class=\"hidden\">\n            <label for=\"typeUnpaid\"\n                   class=\"flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-gray-200 cursor-pointer transition-all hover:border-blue-400 text-center\">\n              <i class=\"fa-solid fa-money-bill-wave text-base text-rose-500 mb-1\"></i>\n              <span class=\"text-xs font-semibold\">ไม่รับค่าจ้าง</span>\n            </label>\n          </div>\n\n          <div class=\"leave-type-card col-span-2\">\n            <input type=\"radio\" id=\"typeOther\" name=\"leaveType\" value=\"อื่นๆ\" class=\"hidden\">\n            <label for=\"typeOther\"\n                   class=\"flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-gray-200 cursor-pointer transition-all hover:border-blue-400 text-center\">\n              <i class=\"fa-solid fa-ellipsis text-base text-indigo-500 mb-1\"></i>\n              <span class=\"text-xs font-semibold\">อื่นๆ (ระบุ)</span>\n            </label>\n          </div>\n\n        </div>\n      </div>\n\n      <!-- OTHER LEAVE DETAIL (CONDITIONAL) -->\n      <div id=\"otherDetailBox\" class=\"hidden animate-fadeIn\">\n        <label for=\"otherLeaveDetail\" class=\"block text-xs font-semibold text-indigo-700 mb-1\">\n          ระบุประเภทการลาเพิ่มเติม <span class=\"text-red-500\">*</span>\n        </label>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400\">\n            <i class=\"fa-solid fa-pen text-xs\"></i>\n          </div>\n          <input type=\"text\" id=\"otherLeaveDetail\" placeholder=\"เช่น ลาคลอด, ลาอุปสมบท, ลาฝึกอบรม\"\n                 class=\"w-full pl-8 pr-3 py-2 text-xs border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-indigo-50/30\">\n        </div>\n      </div>\n\n      <!-- BUSINESS LEAVE NOTICE -->\n      <div id=\"businessNoticeBox\" class=\"p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-2\">\n        <i class=\"fa-solid fa-circle-info mt-0.5 text-amber-600 text-xs\"></i>\n        <div class=\"flex-1 leading-snug\">\n          <strong>หมายเหตุ:</strong> การลากิจควรยื่นคำขอล่วงหน้า ระบบจะบันทึกทั้งวันที่ลงคำขอและช่วงวันที่ลาใช้สิทธิจริงสำหรับ HR ตรวจสอบ\n        </div>\n      </div>\n\n      <!-- DATE -->\n      <div class=\"grid grid-cols-2 gap-3\">\n        <div>\n          <label for=\"startDate\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            วันที่เริ่มต้น <span class=\"text-red-500\">*</span>\n          </label>\n          <input type=\"date\" id=\"startDate\" required\n                 class=\"w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white\">\n        </div>\n        <div>\n          <label for=\"endDate\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n            วันที่สิ้นสุด <span class=\"text-red-500\">*</span>\n          </label>\n          <input type=\"date\" id=\"endDate\" required\n                 class=\"w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white\">\n        </div>\n      </div>\n\n      <!-- TOTAL DAYS -->\n      <div>\n        <label for=\"totalDays\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n          จำนวนวันลา (วัน) <span class=\"text-red-500\">*</span>\n        </label>\n        <div class=\"relative\">\n          <div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400\">\n            <i class=\"fa-solid fa-clock text-xs\"></i>\n          </div>\n          <input type=\"number\" id=\"totalDays\" step=\"0.5\" min=\"0.5\" value=\"1\" required\n                 class=\"w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-blue-700\">\n        </div>\n        <p class=\"text-[11px] text-gray-400 mt-0.5\">* คำนวณอัตโนมัติ หรือปรับแก้ได้ (เช่น 0.5 วัน)</p>\n      </div>\n\n      <!-- REASON -->\n      <div>\n        <label for=\"reason\" class=\"block text-xs font-semibold text-gray-700 mb-1\">\n          เหตุผลการลา <span class=\"text-red-500\">*</span>\n        </label>\n        <textarea id=\"reason\" rows=\"3\" required maxlength=\"500\"\n                  placeholder=\"ระบุเหตุผลความจำเป็นในการลา...\"\n                  class=\"w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none\"></textarea>\n      </div>\n\n      <!-- NOTICE -->\n      <div id=\"managerNoticeBox\"\n           class=\"p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start space-x-2\">\n        <i class=\"fa-solid fa-paper-plane mt-0.5 text-blue-600\"></i>\n        <div class=\"flex-1\">คำขอนี้จะถูกส่งตรงไปยัง LINE ของหัวหน้าเพื่อพิจารณาอนุมัติ</div>\n      </div>\n\n      <!-- SUBMIT -->\n      <div class=\"pt-2\">\n        <button type=\"submit\" id=\"submitBtn\"\n                class=\"w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2\">\n          <i class=\"fa-solid fa-paper-plane\"></i>\n          <span>ส่งใบลาเพื่อขออนุมัติ</span>\n        </button>\n      </div>\n\n    </form>\n  </div>\n\n  <!-- FOOTER -->\n  <div class=\"text-center text-xs text-gray-400 mt-6\">\n    ระบบลาและอนุมัติงาน &bull; ขับเคลื่อนด้วย Google Sheets &amp; LINE Messaging API\n  </div>\n\n  <script>\n/* ===================== CONFIG ===================== */\n\nconst LIFF_ID = \"__LIFF_ID__\";\nconst REGISTER_LIFF_ID = \"__REGISTER_LIFF_ID__\";\nconst API_URL = \"/api\";\nconst SUBMIT_LABEL = `\n  <i class=\"fa-solid fa-paper-plane\"></i>\n  <span>ส่งใบลาเพื่อขออนุมัติ</span>`;\n\nlet idToken = \"\";\nlet currentProfile = null;\nlet submitting = false;\n\n/* ===================== DOM ===================== */\n\nconst $ = (id) => document.getElementById(id);\n\nconst loadingOverlay = $(\"loadingOverlay\");\nconst loadingText = $(\"loadingText\");\nconst loadingTime = $(\"loadingTime\");\nconst unregisteredBox = $(\"unregisteredBox\");\nconst leaveForm = $(\"leaveForm\");\nconst empNameDisplay = $(\"empNameDisplay\");\nconst empIdDisplay = $(\"empIdDisplay\");\nconst empCompanyDisplay = $(\"empCompanyDisplay\");\nconst empDeptDivDisplay = $(\"empDeptDivDisplay\");\nconst empPosDisplay = $(\"empPosDisplay\");\nconst employeeLineIdInput = $(\"employeeLineId\");\nconst employeeNameInput = $(\"employeeName\");\nconst departmentInput = $(\"department\");\nconst managerLineIdInput = $(\"managerLineId\");\nconst managerNoticeBox = $(\"managerNoticeBox\");\nconst otherDetailBox = $(\"otherDetailBox\");\nconst otherLeaveDetailInput = $(\"otherLeaveDetail\");\nconst startDateInput = $(\"startDate\");\nconst endDateInput = $(\"endDate\");\nconst totalDaysInput = $(\"totalDays\");\nconst reasonInput = $(\"reason\");\nconst submitBtn = $(\"submitBtn\");\n\n/* ===================== UTIL ===================== */\n\nfunction escapeHtml(v) {\n  return String(v === null || v === undefined ? \"\" : v)\n    .replace(/&/g, \"&amp;\")\n    .replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\")\n    .replace(/\"/g, \"&quot;\")\n    .replace(/'/g, \"&#39;\");\n}\n\nfunction setLoading(text) {\n  loadingText.textContent = text || \"กำลังโหลด...\";\n}\n\nfunction hideLoading() {\n  loadingOverlay.classList.add(\"hidden\");\n}\n\nfunction showError(title, message) {\n  loadingOverlay.classList.remove(\"hidden\");\n\n  loadingOverlay.innerHTML = `\n    <div class=\"text-red-500\">\n      <i class=\"fa-solid fa-triangle-exclamation text-3xl mb-2\"></i>\n      <p class=\"font-semibold text-sm\">${escapeHtml(title)}</p>\n      <p class=\"text-xs text-gray-500 mt-2\">${escapeHtml(message)}</p>\n    </div>`;\n}\n\n/* ===================== API (ผ่าน Cloudflare Worker /api) ===================== */\n\nasync function callApi(fn, args = [], timeout = 20000) {\n  const started = performance.now();\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), timeout);\n\n  try {\n    console.log(\"[API START]\", fn);\n\n    const response = await fetch(API_URL, {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ fn: fn, args: args }),\n      cache: \"no-store\",\n      signal: controller.signal\n    });\n\n    const text = await response.text();\n    let data;\n\n    try {\n      data = JSON.parse(text);\n    } catch (e) {\n      throw new Error(\"ระบบตอบกลับไม่ใช่ JSON (HTTP \" + response.status + \")\");\n    }\n\n    console.log(\"[API END]\", fn, Math.round(performance.now() - started) + \" ms\");\n\n    if (!response.ok || !data.ok) {\n      throw new Error(data && data.error ? data.error : \"HTTP \" + response.status);\n    }\n\n    return data.result;\n\n  } catch (error) {\n    console.error(\"[API ERROR]\", fn, Math.round(performance.now() - started) + \" ms\", error);\n\n    if (error.name === \"AbortError\") {\n      throw new Error(fn + \" ใช้เวลานานเกิน \" + timeout / 1000 + \" วินาที\");\n    }\n    throw error;\n\n  } finally {\n    clearTimeout(timer);\n  }\n}\n\n/* ===================== LIFF DIAGNOSTIC ===================== */\n\nfunction liffDiag() {\n  const d = {\n    sdkLoaded: typeof liff !== \"undefined\",\n    liffId: LIFF_ID,\n    href: window.location.href.slice(0, 200),\n    ua: navigator.userAgent.slice(0, 120)\n  };\n\n  if (typeof liff !== \"undefined\") {\n    try { d.inClient = liff.isInClient(); } catch (e) { d.inClient = \"error\"; }\n    try { d.os = liff.getOS(); } catch (e) {}\n    try { d.loggedIn = liff.isLoggedIn(); } catch (e) { d.loggedIn = \"error\"; }\n  }\n\n  return d;\n}\n\nfunction showLiffProblem(title, detail, showLogin = false) {\n  loadingOverlay.classList.remove(\"hidden\");\n\n  loadingOverlay.innerHTML = `\n    <div class=\"text-red-500 text-left\">\n      <p class=\"font-semibold text-sm text-center\">\n        <i class=\"fa-solid fa-triangle-exclamation\"></i>\n        ${escapeHtml(title)}\n      </p>\n      <p class=\"text-xs text-gray-500 mt-2\">${escapeHtml(detail)}</p>\n      ${showLogin ? `\n        <div class=\"text-center mt-3\">\n          <button type=\"button\" onclick=\"liff.login()\"\n                  class=\"px-4 py-2 rounded-lg bg-green-500 text-white text-sm\">\n            ลองเข้าสู่ระบบ LINE\n          </button>\n        </div>` : \"\"}\n      <pre class=\"text-[10px] text-gray-400 mt-3 whitespace-pre-wrap break-all bg-gray-50 p-2 rounded\">${escapeHtml(JSON.stringify(liffDiag(), null, 2))}</pre>\n    </div>`;\n}\n\n/* ===================== INIT LIFF ===================== */\n\nasync function initializeLiff() {\n  const started = performance.now();\n\n  try {\n    setLoading(\"กำลังเชื่อมต่อ LINE LIFF...\");\n\n    if (typeof liff === \"undefined\") {\n      showLiffProblem(\"โหลด LIFF SDK ไม่สำเร็จ\", \"ไม่สามารถโหลด LINE LIFF SDK ได้\");\n      return;\n    }\n\n    const timeoutPromise = new Promise((_, reject) =>\n      setTimeout(\n        () => reject(new Error(\"การเชื่อมต่อ LINE LIFF ใช้เวลานานเกินไป (เกิน 15 วินาที)\")),\n        15000\n      )\n    );\n\n    await Promise.race([liff.init({ liffId: LIFF_ID }), timeoutPromise]);\n\n    console.log(\"[LIFF] init =\", Math.round(performance.now() - started), \"ms\");\n\n    if (!liff.isLoggedIn()) {\n      // Auto login on PC / external browser\n      liff.login({ redirectUri: window.location.href });\n      return;\n    }\n\n    setLoading(\"กำลังอ่านข้อมูลบัญชี LINE...\");\n\n    idToken = liff.getIDToken() || \"\";\n\n    const profile = await liff.getProfile();\n\n    currentProfile = profile;\n    employeeLineIdInput.value = profile.userId;\n\n    console.log(\"[LIFF] getProfile =\", Math.round(performance.now() - started), \"ms\");\n\n    setLoading(\"กำลังตรวจสอบข้อมูลพนักงาน...\");\n\n    await checkEmployeeRegistration(profile.userId);\n\n    loadingTime.textContent = \"ใช้เวลา \" + Math.round(performance.now() - started) + \" ms\";\n\n  } catch (error) {\n    console.error(\"LIFF ERROR\", error);\n    showLiffProblem(\"เกิดข้อผิดพลาดในการเชื่อมต่อ LINE LIFF\", error.message, true);\n  }\n}\n\n/* ===================== CHECK EMPLOYEE ===================== */\n\nasync function checkEmployeeRegistration(lineUserId) {\n  try {\n    const profile = await callApi(\"getEmployeeProfile\", [lineUserId, idToken]);\n\n    if (profile && profile.isRegistered) {\n      renderEmployeeInfo(profile);\n      return;\n    }\n\n    hideLoading();\n    unregisteredBox.classList.remove(\"hidden\");\n\n  } catch (error) {\n    console.error(\"CHECK EMPLOYEE ERROR\", error);\n    showError(\"ไม่สามารถตรวจสอบข้อมูลพนักงานได้\", error.message);\n  }\n}\n\n/* ===================== RENDER EMPLOYEE ===================== */\n\nfunction renderEmployeeInfo(profile) {\n  const displayName = (profile.title ? profile.title + ' ' : '') + (profile.fullName || '-');\n  empNameDisplay.textContent = displayName;\n  empIdDisplay.textContent = 'รหัส: ' + (profile.employeeId || '-');\n  empCompanyDisplay.textContent = profile.company || 'บริษัทในเครือ';\n  empDeptDivDisplay.textContent = [profile.division, profile.department].filter(Boolean).join(' / ') || '-';\n  empPosDisplay.textContent = profile.position || '-';\n\n  employeeLineIdInput.value = currentProfile ? currentProfile.userId : \"\";\n  employeeNameInput.value = profile.fullName || \"\";\n  departmentInput.value = profile.department || \"\";\n  managerLineIdInput.value = profile.managerLineId || \"\";\n\n  // ไม่มีหัวหน้า -> ระบบอนุมัติอัตโนมัติ\n  if (!profile.managerLineId) {\n    managerNoticeBox.innerHTML = `\n      <i class=\"fa-solid fa-circle-check mt-0.5 text-emerald-600\"></i>\n      <div class=\"flex-1\">คุณไม่มีหัวหน้าผู้อนุมัติ ระบบจะบันทึกและอนุมัติใบลาให้อัตโนมัติ</div>`;\n    managerNoticeBox.className =\n      \"p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2\";\n  }\n\n  hideLoading();\n  leaveForm.classList.remove(\"hidden\");\n}\n\n/* ===================== LEAVE TYPE LISTENER ===================== */\n\ndocument.querySelectorAll('input[name=\"leaveType\"]').forEach(function (radio) {\n  radio.addEventListener('change', function () {\n    if (this.value === 'อื่นๆ') {\n      otherDetailBox.classList.remove('hidden');\n      if (otherLeaveDetailInput) otherLeaveDetailInput.focus();\n    } else {\n      otherDetailBox.classList.add('hidden');\n    }\n  });\n});\n\n/* ===================== GO REGISTER ===================== */\n\nconst goToRegisterBtn = $(\"goToRegisterBtn\");\nif (goToRegisterBtn) {\n  goToRegisterBtn.addEventListener(\"click\", function () {\n    const url = \"https://liff.line.me/\" + REGISTER_LIFF_ID;\n    try {\n      liff.openWindow({ url: url, external: false });\n    } catch (error) {\n      window.location.href = url;\n    }\n  });\n}\n\n/* ===================== DATE ===================== */\n\nfunction getTodayLocal() {\n  const now = new Date();\n  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)\n    .toISOString()\n    .split(\"T\")[0];\n}\n\nconst today = getTodayLocal();\n\nstartDateInput.value = today;\nendDateInput.value = today;\n\nfunction calculateDays() {\n  if (!startDateInput.value || !endDateInput.value) return;\n\n  const start = new Date(startDateInput.value);\n  const end = new Date(endDateInput.value);\n\n  if (isNaN(start.getTime()) || isNaN(end.getTime())) return;\n\n  if (end < start) {\n    endDateInput.value = startDateInput.value;\n    totalDaysInput.value = \"1\";\n    return;\n  }\n\n  totalDaysInput.value =\n    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;\n}\n\nstartDateInput.addEventListener(\"change\", calculateDays);\nendDateInput.addEventListener(\"change\", calculateDays);\n\n/* ===================== SUBMIT FORM ===================== */\n\nleaveForm.addEventListener(\"submit\", async function (e) {\n  e.preventDefault();\n\n  if (submitting) return;\n\n  const selectedType = document.querySelector('input[name=\"leaveType\"]:checked');\n  const leaveType = selectedType ? selectedType.value : \"ลาป่วย\";\n  const otherLeaveDetail = otherLeaveDetailInput ? otherLeaveDetailInput.value.trim() : \"\";\n\n  if (leaveType === \"อื่นๆ\" && !otherLeaveDetail) {\n    Swal.fire(\"กรุณาระบุรายละเอียด\", \"โปรดระบุประเภทการลาเพิ่มเติมสำหรับตัวเลือกอื่นๆ\", \"warning\");\n    if (otherLeaveDetailInput) otherLeaveDetailInput.focus();\n    return;\n  }\n\n  const startDate = startDateInput.value;\n  const endDate = endDateInput.value;\n  const totalDays = parseFloat(totalDaysInput.value);\n  const reason = reasonInput.value.trim();\n\n  if (new Date(endDate) < new Date(startDate)) {\n    Swal.fire(\"วันที่ไม่ถูกต้อง\", \"วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น\", \"warning\");\n    return;\n  }\n\n  if (isNaN(totalDays) || totalDays <= 0) {\n    Swal.fire(\"จำนวนวันไม่ถูกต้อง\", \"กรุณาระบุจำนวนวันลามากกว่า 0\", \"warning\");\n    return;\n  }\n\n  if (!reason) {\n    Swal.fire(\"กรุณาระบุเหตุผล\", \"โปรดระบุเหตุผลการลาให้ชัดเจน\", \"warning\");\n    return;\n  }\n\n  const displayLeave = (leaveType === \"อื่นๆ\" && otherLeaveDetail) ? `อื่นๆ (${escapeHtml(otherLeaveDetail)})` : escapeHtml(leaveType);\n\n  const result = await Swal.fire({\n    title: \"ยืนยันการยื่นใบลา?\",\n    html: `\n      <div class=\"text-left text-xs space-y-1.5 p-3 bg-gray-50 rounded-lg\">\n        <p><strong>ประเภท:</strong> ${displayLeave}</p>\n        <p><strong>ช่วงวันที่ลาใช้สิทธิ:</strong> ${escapeHtml(startDate)} ถึง ${escapeHtml(endDate)} (${escapeHtml(totalDays)} วัน)</p>\n        <p><strong>เหตุผล:</strong> ${escapeHtml(reason)}</p>\n      </div>`,\n    icon: \"question\",\n    showCancelButton: true,\n    confirmButtonColor: \"#2563EB\",\n    cancelButtonColor: \"#9CA3AF\",\n    confirmButtonText: \"ยืนยันยื่นใบลา\",\n    cancelButtonText: \"ยกเลิก\"\n  });\n\n  if (!result.isConfirmed) return;\n\n  executeSubmit({\n    employeeLineId: employeeLineIdInput.value,\n    leaveType: leaveType,\n    otherLeaveDetail: otherLeaveDetail,\n    startDate: startDate,\n    endDate: endDate,\n    totalDays: totalDays,\n    reason: reason,\n    idToken: idToken\n  });\n});\n\n/* ===================== SUBMIT API ===================== */\n\nasync function executeSubmit(payload) {\n  if (submitting) return;\n\n  submitting = true;\n  submitBtn.disabled = true;\n  submitBtn.innerHTML = `\n    <i class=\"fa-solid fa-spinner animate-spin\"></i>\n    <span>กำลังส่งคำขอ...</span>`;\n\n  try {\n    const result = await callApi(\"submitLeaveRequest\", [payload], 30000);\n    handleSubmitSuccess(result);\n  } catch (error) {\n    handleSubmitError(error);\n  }\n}\n\nfunction resetSubmitButton() {\n  submitting = false;\n  submitBtn.disabled = false;\n  submitBtn.innerHTML = SUBMIT_LABEL;\n}\n\nfunction handleSubmitSuccess(res) {\n  if (res && res.success) {\n\n    submitBtn.innerHTML = `\n      <i class=\"fa-solid fa-circle-check\"></i>\n      <span>ส่งใบลาเรียบร้อยแล้ว</span>`;\n\n    const isWarn = !!res.warning;\n\n    const title = isWarn\n      ? \"บันทึกแล้ว แต่ยังแจ้งหัวหน้าไม่สำเร็จ\"\n      : (res.autoApproved ? \"บันทึกและอนุมัติอัตโนมัติ\" : \"ยื่นใบลาสำเร็จ!\");\n\n    Swal.fire({\n      icon: isWarn ? \"warning\" : \"success\",\n      title: title,\n      html: `\n        <p class=\"text-sm text-gray-600 mb-2\">\n          รหัสคำขอ:\n          <span class=\"font-bold text-blue-600\">${escapeHtml(res.requestId || \"-\")}</span>\n        </p>\n        <p class=\"text-xs text-gray-500\">${escapeHtml(res.message || \"\")}</p>`,\n      confirmButtonColor: \"#2563EB\",\n      confirmButtonText: \"เรียบร้อย\",\n      timer: isWarn ? undefined : 3000,\n      timerProgressBar: !isWarn\n    }).then(() => {\n      try {\n        if (liff.isInClient()) liff.closeWindow();\n      } catch (e) {}\n    });\n\n  } else {\n    resetSubmitButton();\n\n    Swal.fire(\n      \"ไม่สำเร็จ\",\n      res && res.message ? res.message : \"เกิดข้อผิดพลาดในการยื่นใบลา\",\n      \"error\"\n    );\n  }\n}\n\nfunction handleSubmitError(error) {\n  resetSubmitButton();\n  console.error(\"SUBMIT ERROR\", error);\n\n  Swal.fire(\n    \"เกิดข้อผิดพลาด\",\n    error && error.message\n      ? error.message\n      : \"ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง\",\n    \"error\"\n  );\n}\n\n/* ===================== START ===================== */\n\nwindow.addEventListener(\"DOMContentLoaded\", initializeLiff);\n  </script>\n\n</body>\n\n</html>",
  reject: "<!DOCTYPE html>\n<html lang=\"th\">\n\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n  <title>พิจารณาไม่อนุมัติคำขอลา</title>\n\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">\n\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">\n  <script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script>\n  <script charset=\"utf-8\" src=\"https://static.line-scdn.net/liff/edge/2/sdk.js\"></script>\n\n  <style>\n    body {\n      font-family: 'Prompt', sans-serif;\n      background-color: #F8FAFC;\n    }\n  </style>\n</head>\n\n<body class=\"min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6\">\n\n  <div class=\"max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100\">\n\n    <!-- HEADER (RED / DANGER) -->\n    <div class=\"bg-gradient-to-r from-red-600 to-rose-700 px-6 py-6 text-white text-center\">\n      <div class=\"w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner\">\n        <i class=\"fa-solid fa-circle-xmark text-2xl text-white\"></i>\n      </div>\n      <h1 class=\"text-xl font-bold tracking-wide\">ไม่อนุมัติคำขอลา</h1>\n      <p class=\"text-xs text-red-100 mt-1\">กรุณาระบุเหตุผลเพื่อแจ้งพนักงานและฝ่ายบุคคล</p>\n    </div>\n\n    <!-- LOADING -->\n    <div id=\"loadingOverlay\" class=\"p-8 text-center\">\n      <div class=\"inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent mb-3\"></div>\n      <p id=\"loadingText\" class=\"text-sm text-gray-500 font-medium\">กำลังโหลดข้อมูล...</p>\n    </div>\n\n    <!-- FORM -->\n    <form id=\"rejectForm\" class=\"p-6 space-y-4 hidden\">\n\n      <!-- REQUEST INFO CARD -->\n      <div class=\"p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2\">\n        <div class=\"flex justify-between items-center\">\n          <span class=\"text-xs text-gray-500\">รหัสคำขอ:</span>\n          <span id=\"displayReqId\" class=\"text-xs font-mono font-bold text-gray-800\">-</span>\n        </div>\n        <div class=\"flex justify-between items-center\">\n          <span class=\"text-xs text-gray-500\">พนักงานผู้ขอลา:</span>\n          <span id=\"displayEmpName\" class=\"text-xs font-medium text-gray-800\">กำลังโหลด...</span>\n        </div>\n        <div class=\"flex justify-between items-center\">\n          <span class=\"text-xs text-gray-500\">ประเภทการลา:</span>\n          <span id=\"displayLeaveType\" class=\"text-xs font-medium text-red-600\">-</span>\n        </div>\n        <div class=\"flex justify-between items-center\">\n          <span class=\"text-xs text-gray-500\">ช่วงวันที่ลา:</span>\n          <span id=\"displayDates\" class=\"text-xs font-medium text-gray-700\">-</span>\n        </div>\n      </div>\n\n      <!-- REASON INPUT -->\n      <div>\n        <label for=\"rejectReason\" class=\"block text-xs font-semibold text-gray-700 mb-1.5\">\n          เหตุผลที่ไม่อนุมัติ <span class=\"text-red-500\">*</span>\n        </label>\n        <textarea id=\"rejectReason\" required rows=\"4\"\n                  placeholder=\"เช่น ติดภารกิจงานด่วนส่งมอบลูกค้า, อัตรากำลังในทีมไม่เพียงพอในวันดังกล่าว...\"\n                  class=\"w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition\"></textarea>\n        <p class=\"text-[11px] text-gray-400 mt-1\">\n          * ข้อความนี้จะถูกส่งแจ้งไปยัง LINE ของพนักงาน และส่งรายงานให้ฝ่ายบุคคล (HR) ทราบ\n        </p>\n      </div>\n\n      <!-- SUBMIT BUTTON -->\n      <div class=\"pt-2\">\n        <button type=\"submit\" id=\"submitBtn\"\n                class=\"w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-red-500/30 transition transform active:scale-[0.98] flex items-center justify-center space-x-2\">\n          <i class=\"fa-solid fa-circle-xmark\"></i>\n          <span>ยืนยันการไม่อนุมัติ</span>\n        </button>\n      </div>\n\n    </form>\n  </div>\n\n  <div class=\"text-center text-xs text-gray-400 mt-6\">\n    ระบบบริหารการลา &bull; Connected with LINE &amp; Supabase\n  </div>\n\n  <script>\n    const LIFF_ID = \"__LIFF_ID__\";\n    const API_BASE = window.location.origin;\n    const API_URL = API_BASE + \"/api\";\n\n    const urlParams = new URLSearchParams(window.location.search);\n    const reqId = urlParams.get(\"reqId\") || \"\";\n    const urlUid = urlParams.get(\"uid\") || \"\";\n    const sig = urlParams.get(\"sig\") || \"\";\n\n    const loadingOverlay = document.getElementById(\"loadingOverlay\");\n    const loadingText = document.getElementById(\"loadingText\");\n    const rejectForm = document.getElementById(\"rejectForm\");\n    const displayReqId = document.getElementById(\"displayReqId\");\n    const displayEmpName = document.getElementById(\"displayEmpName\");\n    const displayLeaveType = document.getElementById(\"displayLeaveType\");\n    const displayDates = document.getElementById(\"displayDates\");\n    const rejectReasonInput = document.getElementById(\"rejectReason\");\n    const submitBtn = document.getElementById(\"submitBtn\");\n\n    let idToken = \"\";\n    let approverUserId = urlUid || \"\";\n\n    async function initializeLiff() {\n      try {\n        if (!reqId) {\n          throw new Error(\"ไม่พบรหัสคำขอลา (reqId)\");\n        }\n        displayReqId.textContent = reqId;\n\n        // Try LIFF init gracefully if available\n        try {\n          if (typeof liff !== \"undefined\" && LIFF_ID && !LIFF_ID.startsWith(\"__\")) {\n            await liff.init({ liffId: LIFF_ID });\n            if (liff.isLoggedIn()) {\n              idToken = liff.getIDToken() || \"\";\n              try {\n                const profile = await liff.getProfile();\n                if (profile && profile.userId) {\n                  approverUserId = profile.userId;\n                }\n              } catch (pe) {\n                console.warn(\"Could not get LIFF profile:\", pe);\n              }\n            }\n          }\n        } catch (liffErr) {\n          console.warn(\"LIFF init skipped/failed:\", liffErr);\n        }\n\n        // Only redirect to login if we have NO signature AND NO login session\n        if (!sig && !idToken && typeof liff !== \"undefined\" && liff.isLoggedIn && !liff.isLoggedIn()) {\n          loadingText.textContent = \"กำลังเข้าสู่ระบบ LINE...\";\n          liff.login({ redirectUri: window.location.href });\n          return;\n        }\n\n        // Fetch request detail\n        const response = await fetch(API_URL, {\n          method: \"POST\",\n          headers: { \"Content-Type\": \"application/json\" },\n          body: JSON.stringify({\n            fn: \"getLeaveRequestDetail\",\n            args: [reqId]\n          })\n        });\n\n        const data = await response.json();\n        if (data && data.ok && data.result) {\n          const req = data.result;\n          displayEmpName.textContent = req.employee_name || \"ไม่ระบุ\";\n          displayLeaveType.textContent = req.leave_type || \"-\";\n          displayDates.textContent = (req.start_date === req.end_date)\n            ? req.start_date + \" (\" + req.total_days + \" วัน)\"\n            : req.start_date + \" ถึง \" + req.end_date + \" (\" + req.total_days + \" วัน)\";\n        } else {\n          displayEmpName.textContent = \"คำขอ: \" + reqId;\n        }\n\n        loadingOverlay.classList.add(\"hidden\");\n        rejectForm.classList.remove(\"hidden\");\n\n      } catch (err) {\n        console.error(\"Init error:\", err);\n        loadingOverlay.innerHTML = `\n          <div class=\"text-red-500 text-center p-4\">\n            <i class=\"fa-solid fa-triangle-exclamation text-3xl mb-2\"></i>\n            <p class=\"font-semibold text-sm\">${err.message || \"เกิดข้อผิดพลาดในการโหลดข้อมูล\"}</p>\n          </div>\n        `;\n      }\n    }\n\n    rejectForm.addEventListener(\"submit\", async function(e) {\n      e.preventDefault();\n      const reason = rejectReasonInput.value.trim();\n      if (!reason) {\n        Swal.fire({ icon: \"warning\", title: \"กรุณาระบุเหตุผล\", text: \"ต้องระบุเหตุผลเพื่อแจ้งพนักงานและฝ่ายบุคคล\" });\n        return;\n      }\n\n      submitBtn.disabled = true;\n      submitBtn.innerHTML = '<i class=\"fa-solid fa-spinner animate-spin\"></i> กำลังบันทึก...';\n\n      try {\n        const response = await fetch(API_URL, {\n          method: \"POST\",\n          headers: { \"Content-Type\": \"application/json\" },\n          body: JSON.stringify({\n            fn: \"rejectLeaveRequest\",\n            args: [{ reqId, reason, idToken, approverLineId: approverUserId, sig }]\n          })\n        });\n\n        if (!response.ok) {\n          const errText = await response.text();\n          throw new Error(`เซิร์ฟเวอร์ตอบกลับ HTTP ${response.status}: ${errText}`);\n        }\n\n        const result = await response.json();\n        if (!result.ok) throw new Error(result.error || (result.result && result.result.message) || \"บันทึกไม่สำเร็จ\");\n\n        await Swal.fire({\n          icon: \"success\",\n          title: \"บันทึกผลเรียบร้อย\",\n          text: \"ระบบได้บันทึกการไม่อนุมัติ และแจ้งผลไปยังพนักงานและ HR แล้ว\",\n          confirmButtonColor: \"#EF4444\"\n        });\n\n        if (typeof liff !== \"undefined\" && liff.isInClient && liff.isInClient()) {\n          liff.closeWindow();\n        } else {\n          window.close();\n          document.body.innerHTML = `\n            <div class=\"min-h-screen flex items-center justify-center p-6 text-center\">\n              <div class=\"bg-white p-8 rounded-2xl shadow-lg max-w-sm\">\n                <i class=\"fa-solid fa-circle-check text-green-500 text-5xl mb-4\"></i>\n                <h2 class=\"text-lg font-bold text-gray-800\">ดำเนินการเรียบร้อยแล้ว</h2>\n                <p class=\"text-xs text-gray-500 mt-2\">คุณสามารถปิดหน้าต่างเบราว์เซอร์นี้ได้เลยครับ</p>\n              </div>\n            </div>`;\n        }\n      } catch (err) {\n        console.error(\"Submit error:\", err);\n        Swal.fire({ icon: \"error\", title: \"เกิดข้อผิดพลาด\", text: err.message });\n        submitBtn.disabled = false;\n        submitBtn.innerHTML = '<i class=\"fa-solid fa-circle-xmark\"></i> ยืนยันการไม่อนุมัติ';\n      }\n    });\n\n    window.addEventListener(\"DOMContentLoaded\", initializeLiff);\n  </script>\n\n</body>\n\n</html>\n",
  portal: "<!DOCTYPE html>\n<html lang=\"th\">\n\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>ระบบบริหารการลางานพนักงาน (LINE Leave Portal)</title>\n\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">\n\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">\n  <script src=\"https://cdn.jsdelivr.net/npm/sweetalert2@11\"></script>\n\n  <style>\n    body {\n      font-family: 'Prompt', sans-serif;\n      background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%);\n    }\n  </style>\n</head>\n\n<body class=\"min-h-screen flex flex-col justify-between text-gray-800\">\n\n  <!-- TOP NAV -->\n  <header class=\"bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30\">\n    <div class=\"max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between\">\n      <div class=\"flex items-center space-x-3\">\n        <div class=\"w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20\">\n          <i class=\"fa-solid fa-calendar-check text-lg\"></i>\n        </div>\n        <div>\n          <h1 class=\"text-base font-bold text-gray-900 tracking-tight leading-tight\">ระบบบริหารการลางาน</h1>\n          <p class=\"text-[11px] text-gray-500\">Connected with LINE &amp; Supabase</p>\n        </div>\n      </div>\n      <div class=\"flex items-center space-x-2\">\n        <span class=\"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800\">\n          <span class=\"w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse\"></span>\n          ระบบออนไลน์\n        </span>\n      </div>\n    </div>\n  </header>\n\n  <!-- MAIN CONTENT -->\n  <main class=\"max-w-5xl mx-auto px-4 sm:px-6 py-10 flex-grow w-full flex flex-col justify-center\">\n\n    <!-- HERO -->\n    <div class=\"text-center mb-10\">\n      <div class=\"inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-3 border border-blue-200\">\n        <i class=\"fa-solid fa-desktop\"></i>\n        <span>ระบบบริการพนักงานบนคอมพิวเตอร์และมือถือ</span>\n      </div>\n      <h2 class=\"text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight\">\n        ยินดีต้อนรับสู่ระบบลางานพนักงาน\n      </h2>\n      <p class=\"text-sm sm:text-base text-gray-600 mt-2 max-w-xl mx-auto\">\n        สะดวก รวดเร็ว และปลอดภัย เลือกเมนูที่ต้องการทำรายการด้านล่างได้ทันที\n      </p>\n    </div>\n\n    <!-- ACTION CARDS (2 PRIMARY OPTIONS) -->\n    <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full mb-10\">\n\n      <!-- CARD 1: REGISTER -->\n      <a href=\"/register\"\n         class=\"group bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl border border-gray-200/80 hover:border-blue-400 transition-all duration-200 transform hover:-translate-y-1 flex flex-col justify-between\">\n        <div>\n          <div class=\"w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform\">\n            <i class=\"fa-solid fa-id-card\"></i>\n          </div>\n          <div class=\"flex items-center justify-between\">\n            <h3 class=\"text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors\">\n              ลงทะเบียนพนักงาน\n            </h3>\n            <span class=\"text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-md border border-blue-100\">\n              ครั้งแรก\n            </span>\n          </div>\n          <p class=\"text-xs text-gray-500 mt-2 leading-relaxed\">\n            ผูกบัญชี LINE กับรหัสพนักงาน ตรวจสอบชื่อ-สกุล สังกัดบริษัท ฝ่าย แผนก และเลือกหัวหน้าผู้อนุมัติงาน\n          </p>\n        </div>\n        <div class=\"mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-blue-600 font-semibold text-sm\">\n          <span>เข้าสู่หน้าลงทะเบียน</span>\n          <i class=\"fa-solid fa-arrow-right group-hover:translate-x-1.5 transition-transform\"></i>\n        </div>\n      </a>\n\n      <!-- CARD 2: LEAVE REQUEST -->\n      <a href=\"/leave\"\n         class=\"group bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl border border-gray-200/80 hover:border-emerald-400 transition-all duration-200 transform hover:-translate-y-1 flex flex-col justify-between\">\n        <div>\n          <div class=\"w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform\">\n            <i class=\"fa-solid fa-file-signature\"></i>\n          </div>\n          <div class=\"flex items-center justify-between\">\n            <h3 class=\"text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors\">\n              ยื่นใบลาออนไลน์\n            </h3>\n            <span class=\"text-xs bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-md border border-emerald-100\">\n              ยื่นขอลา\n            </span>\n          </div>\n          <p class=\"text-xs text-gray-500 mt-2 leading-relaxed\">\n            เลือกประเภทการลา (ลาป่วย, ลากิจ, ลาพักร้อน) ระบุวันที่และเหตุผล ระบบจะส่งการ์ดแจ้งเตือนหาหัวหน้างานอัตโนมัติ\n          </p>\n        </div>\n        <div class=\"mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-emerald-600 font-semibold text-sm\">\n          <span>เข้าสู่หน้าขอยื่นใบลา</span>\n          <i class=\"fa-solid fa-arrow-right group-hover:translate-x-1.5 transition-transform\"></i>\n        </div>\n      </a>\n\n    </div>\n\n    <!-- HR REPORT ACCORDION / LINK -->\n    <div class=\"max-w-3xl mx-auto w-full bg-white rounded-xl p-4 sm:p-5 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm\">\n      <div class=\"flex items-center space-x-3\">\n        <div class=\"w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg flex-shrink-0\">\n          <i class=\"fa-solid fa-file-excel\"></i>\n        </div>\n        <div>\n          <h4 class=\"text-sm font-bold text-gray-800\">สำหรับฝ่ายบุคคล (HR Report)</h4>\n          <p class=\"text-xs text-gray-500\">ดาวน์โหลดสรุปข้อมูลการลาเป็น CSV หรือดึงเข้า Excel Power Query</p>\n        </div>\n      </div>\n      <div class=\"flex items-center space-x-2 flex-shrink-0\">\n        <button onclick=\"copyHrLink()\"\n                class=\"px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center space-x-1\">\n          <i class=\"fa-regular fa-copy\"></i>\n          <span>คัดลอกลิงก์ Excel</span>\n        </button>\n        <a href=\"/export-hr\"\n           class=\"px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center space-x-1\">\n          <i class=\"fa-solid fa-download\"></i>\n          <span>โหลด CSV</span>\n        </a>\n      </div>\n    </div>\n\n    <!-- PC USER GUIDE CARD -->\n    <div class=\"max-w-3xl mx-auto w-full mt-6 bg-blue-50/70 rounded-xl p-4 border border-blue-200/80 text-xs text-gray-600\">\n      <div class=\"flex items-start space-x-2.5\">\n        <i class=\"fa-solid fa-circle-info text-blue-600 text-sm mt-0.5\"></i>\n        <div>\n          <span class=\"font-bold text-gray-800\">คำแนะนำสำหรับพนักงานบนคอมพิวเตอร์ (PC):</span>\n          <p class=\"mt-0.5 text-gray-600 leading-relaxed\">\n            เมื่อคลิกเลือกเมนู ระบบจะเปิดหน้าต่าง <strong>LINE Login</strong> ให้คุณเปิดแอป LINE บนมือถือขึ้นมาแล้วสแกน <strong>QR Code</strong> บนหน้าจอคอมพิวเตอร์เพียงครั้งเดียว ระบบจะจำบัญชีและเข้าสู่หน้าทำรายการได้ทันทีครับ\n          </p>\n        </div>\n      </div>\n    </div>\n\n  </main>\n\n  <!-- FOOTER -->\n  <footer class=\"bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400\">\n    <div class=\"max-w-5xl mx-auto px-4\">\n      <p>ระบบบริหารการลางาน &bull; พัฒนาด้วย Cloudflare Workers &amp; Supabase</p>\n      <p class=\"mt-1 text-[11px] text-gray-400\">รองรับการใช้งานผ่าน LINE บนมือถือ และเว็บเบราว์เซอร์บนคอมพิวเตอร์</p>\n    </div>\n  </footer>\n\n  <script>\n    function copyHrLink() {\n      const url = window.location.origin + '/export-hr';\n      navigator.clipboard.writeText(url).then(() => {\n        Swal.fire({\n          icon: 'success',\n          title: 'คัดลอกลิงก์สำเร็จ',\n          text: url,\n          timer: 2000,\n          showConfirmButton: false\n        });\n      }).catch(() => {\n        prompt('คัดลอกลิงก์นี้ไปใส่ใน Excel (Data -> From Web):', url);\n      });\n    }\n  </script>\n\n</body>\n\n</html>\n"
};

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
  const configuredLiffId = (env && env.LIFF_ID_REGISTER) || LIFF_ID_REGISTER;
  const channelId = ((env && env.LINE_LOGIN_CHANNEL_ID) || configuredLiffId.split('-')[0] || '').trim();
  if (!/^\d+$/.test(channelId)) return null;
  const form = new URLSearchParams({ id_token: idToken, client_id: channelId });
  if (typeof expectedLineUserId === 'string' && expectedLineUserId.trim()) form.set('user_id', expectedLineUserId.trim());
  try {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!response.ok) return null;
    const claims = await response.json();
    if (!claims || claims.aud !== channelId || typeof claims.sub !== 'string' || !claims.sub) return null;
    if (expectedLineUserId && claims.sub !== expectedLineUserId) return null;
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
