const { execFileSync } = require('node:child_process');

module.exports = async () => {
  execFileSync(process.execPath, ['build.js'], { stdio: 'inherit' });
};
