import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const schedule = days.map((day, index) => ({ day, is_open: index < 5, start: index < 5 ? '09:00' : null, end: index < 5 ? '17:00' : null }));
const profile = {
  id: 'doctor-1', email: 'doctor@example.com', name: 'Dr. Anjali Rao', specialty: 'Pediatrician',
  license_no: 'REG-101', license_verified: true, active: true, available: false,
  bio: 'Child health specialist', consult_fee: 500, available_days: ['Monday', 'Tuesday'], languages: ['English', 'Hindi'],
  created_at: '2026-01-01T00:00:00Z',
  clinic: { id: 'clinic-1', doctor_id: 'doctor-1', name: 'Sunrise Clinic', address: 'Palakkad, Kerala', phone: '+91 99999 99999', lat: 10.786, lng: 76.6444, opening_hours: 'Mon 09:00–17:00', opening_hours_schedule: schedule },
};

async function authenticate(context: BrowserContext) {
  await context.addInitScript(() => { localStorage.setItem('auth_token', 'doctor-1'); localStorage.setItem('user_id', 'doctor-1'); });
}

async function mockDashboard(context: BrowserContext, clinicHandler?: (route: Route) => Promise<void>) {
  await context.route('**/api/v1/doctors/me', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ json: profile });
    else if (route.request().method() === 'PUT') await route.fulfill({ json: { ...profile, ...route.request().postDataJSON() } });
    else if (clinicHandler) await clinicHandler(route);
    else await route.fulfill({ json: profile.clinic });
  });
  await context.route('**/api/v1/doctors/me/clinic', clinicHandler || (route => route.fulfill({ json: profile.clinic })));
  await context.route('**/api/v1/doctors/me/availability', route => route.fulfill({ json: { available: true } }));
}

async function openDashboard(page: Page) {
  await page.goto('/doctor/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome, Anjali.' })).toBeVisible();
}

test.beforeEach(async ({ context }) => { await authenticate(context); });

test('loads existing professional, practice, and schedule values', async ({ page, context }) => {
  await mockDashboard(context);
  await openDashboard(page);
  await expect(page.locator('#doctor-name')).toHaveValue('Dr. Anjali Rao');
  await expect(page.locator('#clinic-name')).toHaveValue('Sunrise Clinic');
  await expect(page.locator('#clinic-address')).toHaveValue('Palakkad, Kerala');
  await expect(page.locator('#Monday-start')).toHaveValue('09:00');
  await expect(page.locator('#Sunday-start')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('validates a day inline and prevents an invalid schedule save', async ({ page, context }) => {
  let saves = 0;
  await mockDashboard(context, async route => { saves += 1; await route.fulfill({ json: profile.clinic }); });
  await openDashboard(page);
  await page.locator('#Monday-start').selectOption('18:00');
  await page.locator('#Monday-end').selectOption('09:00');
  await page.getByRole('button', { name: 'Save practice details' }).click();
  await expect(page.getByText('Closing time must be later than opening time.')).toBeVisible();
  expect(saves).toBe(0);
});

test('prevents duplicate saves and shows successful persistence feedback', async ({ page, context }) => {
  let saves = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await mockDashboard(context, async route => { saves += 1; await pending; await route.fulfill({ json: profile.clinic }); });
  await openDashboard(page);
  const save = page.getByRole('button', { name: 'Save practice details' });
  await save.click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(saves).toBe(1);
  release?.();
  await expect(page.getByText('Practice details and opening hours saved.')).toBeVisible();
  expect(saves).toBe(1);
});

test('preserves form values and shows API failure feedback', async ({ page, context }) => {
  await mockDashboard(context, route => route.fulfill({ status: 503, json: { detail: 'Practice service unavailable' } }));
  await openDashboard(page);
  await page.locator('#clinic-phone').fill('+91 88888 88888');
  await page.getByRole('button', { name: 'Save practice details' }).click();
  await expect(page.getByRole('alert')).toContainText('Practice service unavailable');
  await expect(page.locator('#clinic-phone')).toHaveValue('+91 88888 88888');
});
