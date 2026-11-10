// Browser checks run only against the unpublished local prototype.
module.exports = {
  testDir: './tests',
  testMatch: '**/*.browser.spec.cjs',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  outputDir: 'test-results',
};
