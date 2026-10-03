import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e',
  timeout: 30000,
  use: {
    browserName: process.env.PROFILE_BROWSER === 'firefox' ? 'firefox' : 'chromium',
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    launchOptions: {
      args:
        process.env.PROFILE_BROWSER === 'firefox'
          ? []
          : process.env.PROFILE_GPU === 'hardware'
          ? [
              '--no-sandbox',
              '--enable-gpu',
              '--use-gl=angle',
              '--use-angle=gl-egl',
              '--ignore-gpu-blocklist',
            ]
          : ['--no-sandbox', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
        deviceScaleFactor: Number(process.env.PROFILE_DPR || 1),
      },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
})
