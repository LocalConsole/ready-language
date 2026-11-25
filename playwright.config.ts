import { defineConfig, devices } from '@playwright/test';

// В облачной песочнице нет скачанного Chromium — можно указать системный Chrome: CHROME_PATH=/usr/bin/google-chrome
const executablePath = process.env.CHROME_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173/ready-language/',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    launchOptions: { executablePath, args: ['--no-sandbox'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 850 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/ready-language/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
