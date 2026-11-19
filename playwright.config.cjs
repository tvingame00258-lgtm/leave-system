const { defineConfig } = require('playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: 'msedge'
  },
  webServer: {
    command: 'node build.js && node tests/worker-fixture.cjs',
    url: 'http://127.0.0.1:4173/ping',
    reuseExistingServer: false,
    timeout: 30000
  }
});
