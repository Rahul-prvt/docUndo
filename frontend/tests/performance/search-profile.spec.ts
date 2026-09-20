import { writeFileSync, mkdirSync } from 'node:fs';
import { test, expect, openSearch, searchButton } from '../fixtures/location';

// Controlled providers, real React/DOM: these are NOT live GPS/Google timings.
test('profile search rendering and refresh continuity', async ({ page, location }, testInfo) => {
  await page.addInitScript(() => {
    const times: Record<string, number> = {};
    Object.assign(window, { __searchTimes: times });
    new MutationObserver(() => {
      if (document.querySelector('form button[disabled]')?.textContent?.includes('Finding your location')) times.locationVisible ??= performance.now();
      if (document.querySelector('article')) times.cardsVisible ??= performance.now();
      if (document.querySelector('[data-testid="map"]')) times.mapVisible ??= performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.route('**/api/v1/search**', async route => {
    await page.evaluate(() => Object.assign((window as any).__searchTimes, { apiStart: performance.now() }));
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.evaluate(() => Object.assign((window as any).__searchTimes, { apiRelease: performance.now() }));
    await route.fulfill({ json: Array.from({ length: 30 }, (_, i) => ({
      id: `profile-${i}`, name: `Dr. Profile ${i}`, specialty: 'General Practitioner', available: i % 2 === 0,
      active: true, distance_km: 1, clinic: { id: `c-${i}`, doctor_id: `profile-${i}`, address: 'Fixture clinic', lat: 10.786, lng: 76.6444 },
    })) });
  });
  await openSearch(page);
  await page.evaluate(() => Object.assign((window as any).__searchTimes, { geoRequested: performance.now() }));
  await new Promise(resolve => setTimeout(resolve, 200));
  await location.resolve();
  await expect(page.locator('article')).toHaveCount(30);
  await expect(searchButton(page)).toBeEnabled();
  const initial = await page.evaluate(() => (window as any).__searchTimes);
  await searchButton(page).click();
  const cardsDuringGps = await page.locator('article').count();
  await location.resolve();
  const cardsDuringApi = await page.locator('article').count();
  await expect(searchButton(page)).toBeEnabled();
  const result = { project: testInfo.project.name, providers: 'GPS held 200ms; API held 300ms; map fixture',
    locationWaitMs: initial.apiStart - initial.geoRequested,
    apiWaitMs: initial.apiRelease - initial.apiStart,
    responseToCardsMs: initial.cardsVisible - initial.apiRelease,
    responseToMapFixtureMs: initial.mapVisible - initial.apiRelease,
    renderedCards: 30, cardsDuringGps, cardsDuringApi };
  mkdirSync('../.pytest_cache', { recursive: true });
  writeFileSync(`../.pytest_cache/search-browser-${process.env.SEARCH_PROFILE_LABEL || 'current'}-${testInfo.project.name}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
});
