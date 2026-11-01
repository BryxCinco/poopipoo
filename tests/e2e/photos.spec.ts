import { expect, test } from "@playwright/test";

import { mockServices, TEST_RESTROOM, USER_LOCATION } from "./fixtures";

// Must match the URL the app was built with (CI: the placeholder in ci.yml)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const BUCKET_PHOTO = `${SUPABASE_URL}/storage/v1/object/public/restroom-images/${TEST_RESTROOM.id}/photo.webp`;

test.use({ geolocation: USER_LOCATION, permissions: ["geolocation"] });

test("list thumbnail shows uploaded photos (optimized) and ignores other URLs", async ({ page }) => {
  await mockServices(page);
  // Registered after mockServices, so it takes precedence for this test
  await page.route("**/rest/v1/restrooms?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { ...TEST_RESTROOM, images: [BUCKET_PHOTO] },
        {
          ...TEST_RESTROOM,
          id: "22222222-2222-4222-8222-222222222222",
          name: "E2E Hotlinked CR",
          images: ["https://example.com/not-ours.jpg"],
        },
      ]),
    })
  );

  await page.goto("/list");

  // Our bucket's photo goes through next/image (remotePatterns in next.config.mjs)
  const ours = page.getByRole("link", { name: new RegExp(TEST_RESTROOM.name) }).locator("img");
  await expect(ours).toHaveCount(1);
  const src = await ours.getAttribute("src");
  expect(src).toContain("/_next/image");
  expect(decodeURIComponent(src ?? "")).toContain("/restroom-images/");

  // Any other URL is not shown at all (the toilet icon is used instead)
  const hotlinked = page.getByRole("link", { name: /E2E Hotlinked CR/ });
  await expect(hotlinked).toBeVisible();
  await expect(hotlinked.locator("img")).toHaveCount(0);
});
