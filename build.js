const fs = require('fs');
const path = require('path');

const regHtml = fs.readFileSync(path.join(__dirname, 'src/views/register.html'), 'utf8');
const leaveHtml = fs.readFileSync(path.join(__dirname, 'src/views/leave.html'), 'utf8');
const rejectHtml = fs.readFileSync(path.join(__dirname, 'src/views/reject.html'), 'utf8');
const portalHtml = fs.readFileSync(path.join(__dirname, 'src/views/portal.html'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, 'src/worker-core.js'), 'utf8');

const header = [
  '/**',
  ' * Cloudflare Worker Bundle for LINE Leave System',
  ' * Multi-level Approval (Manager -> GM), Rejection Reason & PC Support',
  ' */',
  '',
  "const LIFF_ID_REGISTER = '2011955364-O2qTmo0r';",
  "const LIFF_ID_LEAVE = '2011955364-FCY27ABh';",
  '',
  'const PAGES = {',
  '  register: ' + JSON.stringify(regHtml) + ',',
  '  leave: ' + JSON.stringify(leaveHtml) + ',',
  '  reject: ' + JSON.stringify(rejectHtml) + ',',
  '  portal: ' + JSON.stringify(portalHtml),
  '};',
  '',
  ''
].join('\n');

const fullWorker = header + core + '\n';
fs.writeFileSync(path.join(__dirname, 'worker.js'), fullWorker, 'utf8');
console.log('Successfully bundled worker.js. Length:', fullWorker.length);
