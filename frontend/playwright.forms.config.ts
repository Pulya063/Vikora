import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/forms',
  workers: 1,
  use: {baseURL: 'http://127.0.0.1:3105', headless: true, channel: process.env.FORM_BROWSER_CHANNEL || undefined},
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3105',
    env: {NEXT_DEV_DIST_DIR: '.next-form-tests'},
    url: 'http://127.0.0.1:3105/contacts',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
