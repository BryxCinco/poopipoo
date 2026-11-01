import { expect, test } from "@playwright/test";

import { mockServices, TEST_RESTROOM, USER_LOCATION } from "./fixtures";

test.use({ geolocation: USER_LOCATION, permissions: ["geolocation"] });

test.beforeEach(async ({ page }) => {
  await mockServices(page);
});

test("search → open restroom → navigate → route on the map", async ({ page }) => {
  await page.goto("/");

  // The map renders (Leaflet loads in the browser only)
  const map = page.locator(".restroom-map");
  await expect(map).toBeVisible();

  // 1. Search for a place and fly there
  const search = page.getByRole("combobox", { name: "Search for a place" });
  await search.fill("Ayala");
  await page.getByRole("option", { name: /Ayala Avenue/ }).click();

  // 2. The restroom's pin is loaded for the new view; open it
  const pin = page.getByTitle(TEST_RESTROOM.name);
  await expect(pin).toBeVisible();
  await pin.click();
  await page.getByRole("button", { name: "View details" }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: TEST_RESTROOM.name })).toBeVisible();
  await expect(sheet.getByText(TEST_RESTROOM.address)).toBeVisible();

  // 3. Plan a route to it
  await sheet.getByRole("button", { name: "Navigate" }).click();

  // 4. The route preview: navigation panel + the route line drawn on the map
  const panel = page.getByRole("region", { name: "Navigation" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(map.locator(".leaflet-overlay-pane path").first()).toBeVisible();
});

test("only asks Supabase for the restrooms in view, with a limit", async ({ page }) => {
  const request = page.waitForRequest("**/rest/v1/restrooms?**");
  await page.goto("/");

  const url = new URL((await request).url());
  const filters = url.searchParams.getAll("latitude").concat(url.searchParams.getAll("longitude"));
  expect(filters.some((f) => f.startsWith("gte."))).toBe(true);
  expect(filters.some((f) => f.startsWith("lte."))).toBe(true);
  expect(Number(url.searchParams.get("limit"))).toBeGreaterThan(0);
});
