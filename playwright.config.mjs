// E2E (npm test). A extensão roda numa página de WhatsApp de mentira servida
// por scripts/serve-fixtures.mjs, no Firefox (o navegador da extensão).
// Artefatos: playwright-report/ (HTML), test-results/results.json, e trace,
// screenshot e vídeo de cada falha em test-results/.
import { defineConfig, devices } from '@playwright/test';

const port = 5178; // 5177 fica livre para o `npm run fixtures` manual

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000
  },
  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // som liberado como num WhatsApp já usado (o caso bloqueado vai pelo background)
        launchOptions: { firefoxUserPrefs: { 'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0 } }
      }
    }
  ],
  webServer: {
    command: `node scripts/serve-fixtures.mjs ${port}`,
    url: `http://127.0.0.1:${port}/tests/fixtures/wa-calls.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
