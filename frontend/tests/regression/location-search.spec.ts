import { test, expect, openSearch, searchButton, showMap } from '../fixtures/location';

test('initial StrictMode render waits for location and issues exactly one search', async ({ page, location }) => {
  await openSearch(page);
  await expect(searchButton(page)).toBeDisabled();
  await expect(searchButton(page)).toContainText('Finding your location');
  await expect(page.getByText('No doctors found in this area')).toHaveCount(0);
  await expect(page.getByTestId('location-marker')).toHaveCount(0);
  expect(location.calls).toHaveLength(0);
  await location.resolve();
  await expect(page.getByRole('heading', { name: 'Dr. Search 1' })).toBeVisible();
  expect(location.calls).toEqual([{ lat: 10.5276, lng: 76.2144, specialty: null, radius: 10 }]);
  await expect(page.getByTestId('location-marker')).toHaveAttribute('data-lat', '10.5276');
  await expect(page.getByTestId('map')).toHaveAttribute('data-lng', '76.2144');
  await expect(page.getByRole('button', { name: /Use my current location/i })).toHaveCount(0);
  expect(await page.evaluate(() => window.__geo.calls)).toEqual([{ maximumAge: 0, enableHighAccuracy: true, timeout: 10000 }]);
});

test('each Search refreshes GPS and preserves specialty and radius', async ({ page, location }) => {
  await openSearch(page); await location.resolve();
  await expect(searchButton(page)).toBeEnabled();
  await page.locator('#specialty').selectOption('Cardiologist');
  await page.locator('#radius').fill('5');
  await searchButton(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__geo.calls.length)).toBe(2);
  expect(location.calls).toHaveLength(1);
  await location.resolve(11.2588, 75.7804);
  await expect(page.getByRole('heading', { name: 'Dr. Search 2' })).toBeVisible();
  expect(location.calls[1]).toEqual({lat:11.2588,lng:75.7804,specialty:'Cardiologist',radius:5});
  await expect(page.locator('#specialty')).toHaveValue('Cardiologist');
  await expect(page.locator('#radius')).toHaveValue('5');
  await expect(page.getByTestId('map')).toHaveAttribute('data-lat', '11.2588');
  await expect(page.getByTestId('location-marker')).toHaveAttribute('data-lng', '75.7804');
});

test('rapid form submissions cannot duplicate GPS or API calls during either phase', async ({ page, location }) => {
  await openSearch(page);
  await page.locator('form[aria-label="Search care"]').evaluate(form => {
    for (let i=0; i<6; i++) form.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
  });
  expect(await page.evaluate(() => window.__geo.calls.length)).toBe(1);
  location.mode='hold'; await location.resolve();
  await expect.poll(() => location.calls.length).toBe(1);
  await expect(searchButton(page)).toContainText('Searching');
  await page.locator('form[aria-label="Search care"]').evaluate(form => {
    for (let i=0; i<6; i++) form.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
  });
  expect(location.calls).toHaveLength(1);
  expect(await page.evaluate(() => window.__geo.calls.length)).toBe(1);
  await location.release[0](); await expect(searchButton(page)).toBeEnabled();
});

for (const [code, message] of [[1,'Location permission is denied'],[2,'Your device location is unavailable'],[3,'Finding your location took too long']] as const) {
  test(`geolocation error ${code} allows manual search without a default-coordinate request`, async ({ page, location }) => {
    await openSearch(page); await location.reject(code);
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(searchButton(page)).toBeEnabled();
    expect(location.calls).toHaveLength(0);
    await expect(page.locator('#location-source')).toHaveValue('manual');
    await page.getByRole('button', {name:'Select Kochi'}).click();
    await searchButton(page).click();
    await expect(page.getByRole('heading', {name:'Doctors near Kochi, Kerala'})).toBeVisible();
    expect(location.calls[0]).toMatchObject({lat:9.9312,lng:76.2673});
    expect(await page.evaluate(() => window.__geo.calls.length)).toBe(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('permission prompt cannot leave the page waiting beyond the deadline', async ({ page, location }) => {
  await page.clock.install();
  await openSearch(page);
  await page.clock.runFor(10001);
  await expect(page.getByRole('alert')).toContainText('took too long');
  await expect(searchButton(page)).toBeEnabled();
  await location.resolve(); // Even a very late native callback must be ignored.
  expect(location.calls).toHaveLength(0);
});

test('unsupported geolocation offers manual search', async ({ page, context, location }) => {
  await context.addInitScript(() => Object.defineProperty(navigator,'geolocation',{configurable:true,value:undefined}));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('does not support');
  expect(location.calls).toHaveLength(0);
  await expect(page.getByRole('button',{name:'Select Kochi'})).toBeVisible();
});

test('manual override wins over a late initial GPS callback and typing never asks for GPS', async ({ page, location }) => {
  await openSearch(page);
  await page.locator('#location-source').selectOption('manual');
  await page.getByRole('textbox',{name:'Test place input'}).fill('Kochi');
  expect(await page.evaluate(() => window.__geo.calls.length)).toBe(1);
  await page.getByRole('button',{name:'Select Kochi'}).click();
  await location.resolve(28.6,77.2,0);
  await searchButton(page).click();
  await expect(page.getByRole('heading',{name:'Dr. Search 1'})).toBeVisible();
  expect(location.calls).toEqual([{lat:9.9312,lng:76.2673,specialty:null,radius:10}]);
  await searchButton(page).click();
  await expect(page.getByRole('heading',{name:'Dr. Search 2'})).toBeVisible();
  expect(location.calls[1]).toEqual(location.calls[0]);
  expect(await page.evaluate(() => window.__geo.calls.length)).toBe(1);
});

test('an older API response cannot overwrite newer manual results', async ({ page, location }) => {
  await openSearch(page);location.mode='hold';await location.resolve();
  await expect.poll(() => location.release.length).toBe(1);
  await page.locator('#location-source').selectOption('manual');
  await page.getByRole('button',{name:'Select Kochi'}).click();
  location.mode='success';await searchButton(page).click();
  await expect(page.getByRole('heading',{name:'Dr. Search 2'})).toBeVisible();
  await location.release[0]();
  await expect(page.getByRole('heading',{name:'Dr. Search 1'})).toHaveCount(0);
  await expect(page.getByTestId('location-marker')).toHaveAttribute('data-lat','9.9312');
});

test('failed refresh never silently searches with the old device position', async ({ page, location }) => {
  await openSearch(page);await location.resolve();await expect(searchButton(page)).toBeEnabled();
  await searchButton(page).click();await location.reject(2);
  await expect(page.getByRole('alert')).toContainText('unavailable');
  expect(location.calls).toHaveLength(1);
  await expect(page.getByTestId('location-marker')).toHaveAttribute('data-lat','10.5276');
});

test('map pan and zoom survive filter changes and small GPS differences', async ({ page, location }) => {
  await openSearch(page);await location.resolve();await expect(searchButton(page)).toBeEnabled();
  await showMap(page);await page.getByRole('button',{name:'Zoom in'}).click();await page.getByRole('button',{name:'Pan map'}).click();
  await page.locator('#specialty').selectOption('Cardiologist');
  await expect(page.getByTestId('map')).toHaveAttribute('data-lat','12');
  await searchButton(page).click();await location.resolve(10.52761,76.21441);
  await expect(searchButton(page)).toBeEnabled();
  await expect(page.getByTestId('map')).toHaveAttribute('data-lat','12');
  await expect(page.getByTestId('map')).toHaveAttribute('data-zoom','14');
  await expect(page.getByTestId('location-marker')).toHaveAttribute('data-lat','10.52761');
});

test('map choice is a manual override and switching back refreshes device location', async ({ page, location }) => {
  await openSearch(page);await location.resolve();await expect(searchButton(page)).toBeEnabled();
  await showMap(page);await page.getByRole('button',{name:'Select Kozhikode on map'}).click();
  await searchButton(page).click();await expect(searchButton(page)).toBeEnabled();
  expect(location.calls[1]).toMatchObject({lat:11.2588,lng:75.7804});
  await page.locator('#location-source').selectOption('device');await searchButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__geo.calls.length)).toBe(2);
  await location.resolve(12,77);await expect(searchButton(page)).toBeEnabled();
  expect(location.calls[2]).toMatchObject({lat:12,lng:77});
});

test('empty results offer a wider search and API errors have a retry', async ({ page, location }) => {
  await openSearch(page);location.mode='empty';await location.resolve();
  await expect(page.getByText('No doctors found in this area')).toBeVisible();
  await page.getByRole('button',{name:'Search all specialties within 50 km'}).click();
  await location.resolve();await expect(searchButton(page)).toBeEnabled();
  expect(location.calls[1].radius).toBe(50);
  location.mode='error';await searchButton(page).click();await location.resolve();
  await expect(page.getByRole('alert')).toContainText('Could not load doctors');
  location.mode='success';await page.getByRole('button',{name:'Try again',exact:true}).click();await location.resolve();
  await expect(searchButton(page)).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('location failures remain usable without horizontal overflow', async ({ page, location }) => {
  await openSearch(page);await location.reject(1);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Select Kochi'}).click();await searchButton(page).click();
  await expect(page.getByRole('heading',{name:'Dr. Search 1'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
