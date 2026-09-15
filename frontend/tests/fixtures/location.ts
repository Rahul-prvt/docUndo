import { test as base, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __geo: {
      calls: PositionOptions[];
      resolve: (lat: number, lng: number, index?: number) => void;
      reject: (code: number, index?: number) => void;
    };
  }
}

export interface SearchCall { lat: number; lng: number; specialty: string | null; radius: number }
interface Harness {
  calls: SearchCall[];
  mode: 'success' | 'error' | 'hold' | 'empty';
  release: (() => Promise<void>)[];
  resolve: (lat?: number, lng?: number, index?: number) => Promise<void>;
  reject: (code: number, index?: number) => Promise<void>;
}

export const test = base.extend<{ location: Harness }>({
  location: [async ({ page, context }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(() => {
      const pending: { success: PositionCallback; failure?: PositionErrorCallback | null }[] = [];
      window.__geo = {
        calls: [],
        resolve: (lat, lng, index = pending.length - 1) => pending[index].success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition),
        reject: (code, index = pending.length - 1) => pending[index].failure?.({ code } as GeolocationPositionError),
      };
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
        getCurrentPosition(success: PositionCallback, failure: PositionErrorCallback, options: PositionOptions) {
          window.__geo.calls.push(options);
          pending.push({ success, failure });
        },
        watchPosition() { throw new Error('Continuous GPS tracking is not allowed'); },
      } });
    });
    const harness: Harness = {
      calls: [], mode: 'success', release: [],
      resolve: (lat = 10.5276, lng = 76.2144, index) => page.evaluate(({lat,lng,index}) => window.__geo.resolve(lat,lng,index), {lat,lng,index}),
      reject: (code, index) => page.evaluate(({code,index}) => window.__geo.reject(code,index), {code,index}),
    };
    const unknownRequests: string[] = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:4178') {
        // Fonts are optional; all other external traffic is an unexpected leak.
        if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) unknownRequests.push(url.origin);
        await route.abort();
      } else if (url.pathname === '/api/v1/search') {
        const call = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')),
          specialty: url.searchParams.get('specialty'), radius: Number(url.searchParams.get('radius_km')) };
        harness.calls.push(call);
        const count = harness.calls.length;
        const fulfill = async () => route.fulfill({ json: harness.mode === 'empty' ? [] : [{
          id: `doctor-${count}`, name: `Dr. Search ${count}`, specialty: call.specialty || 'General Practitioner',
          available: true, distance_km: 1, consult_fee: 300,
          clinic: { id: 'clinic-1', doctor_id: `doctor-${count}`, address: 'Test clinic', lat: call.lat + 0.001, lng: call.lng + 0.001 },
        }] });
        if (harness.mode === 'hold') harness.release.push(fulfill);
        else if (harness.mode === 'error') await route.fulfill({ status: 503, json: { detail: 'Search unavailable' } });
        else await fulfill();
      } else if (url.pathname.startsWith('/api/')) {
        unknownRequests.push(url.pathname);
        await route.abort();
      } else await route.continue();
    });
    await use(harness);
    expect(unknownRequests, 'All API/provider traffic must be isolated').toEqual([]);
    expect(errors, 'No uncaught browser exceptions').toEqual([]);
  }, { auto: true }],
});

export { expect };
export const searchButton = (page: Page) => page.locator('form[aria-label="Search care"] button[type="submit"]');
export async function openSearch(page: Page) {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__geo.calls.length)).toBe(1);
}
export async function showMap(page: Page) {
  const toggle = page.getByRole('button', { name: 'Map', exact: true });
  if (await toggle.isVisible()) await toggle.click();
}
