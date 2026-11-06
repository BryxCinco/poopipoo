import { expect, test } from "@playwright/test";

import { mockServices, TEST_RESTROOM } from "./fixtures";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("list beside the map opens a restroom; navigation moves to the top bar", async ({ page, context }) => {
    await context.clearPermissions();
    await mockServices(page);
    await page.goto("/");

    await expect(page.locator(".restroom-map")).toBeVisible();

    // One visible navigation, in the header
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toHaveCount(1);
    await expect(page.locator("header").getByRole("link", { name: "List" })).toBeVisible();

    // List and search are beside the map, not on top of it
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByRole("combobox", { name: "Search for a place" })).toBeVisible();
    const box = await sidebar.boundingBox();
    const mapBox = await page.locator(".restroom-map").boundingBox();
    expect(box && mapBox && box.x + box.width <= mapBox.x + 1).toBe(true);

    // Choosing a restroom opens its details without leaving the map
    await sidebar.getByRole("link", { name: new RegExp(TEST_RESTROOM.name) }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("dialog").getByRole("heading", { name: TEST_RESTROOM.name })).toBeVisible();
    await expect(page.locator(".restroom-map")).toBeVisible();
  });
});

test("phone keeps the full-screen map: no list beside it, bottom navigation", async ({ page }) => {
  await mockServices(page);
  await page.goto("/");

  await expect(page.locator(".restroom-map")).toBeVisible();
  await expect(page.getByRole("complementary")).toBeHidden();
  await expect(page.locator("header").getByRole("link", { name: "List" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "List" })).toBeVisible();
});
