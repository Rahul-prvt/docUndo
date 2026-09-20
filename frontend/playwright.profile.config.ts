import { defineConfig } from '@playwright/test';
import regression from './playwright.config';

export default defineConfig({
  ...regression,
  testDir: './tests/performance',
  workers: 1,
  reporter: 'list',
});
