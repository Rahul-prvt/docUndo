import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/regression',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/location.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --config tests/vite.config.ts',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
