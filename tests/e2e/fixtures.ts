import type { Page } from "@playwright/test";

/** A restroom near Ayala Avenue, Makati: where the mocked search result is. */
export const TEST_RESTROOM = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "E2E Test CR",
  description: "Malinis, may bidet.",
  address: "Ayala Avenue, Makati City",
  latitude: 14.5547,
  longitude: 121.0244,
  amenities: ["bidet", "tissue"],
  is_free: true,
  images: [],
  rating: 4.5,
  review_count: 12,
  created_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  status: "approved",
  verified_count: 5,
  source: "user",
};

/** Where the (mocked) GPS puts the user: a short walk from the restroom. */
export const USER_LOCATION = { latitude: 14.5535, longitude: 121.0232 };

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

/**
 * Mocks every outside service the map uses, so tests are fast and don't
 * depend on live data or rate limits.
 */
export async function mockServices(page: Page): Promise<void> {
  // Skip the first-visit intro slides (components/onboarding/Onboarding.tsx)
  await page.addInitScript(() => {
    window.localStorage.setItem("poopipoo:onboarding-done", "1");
  });

  // Map tiles: not needed to test behavior
  await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/, (route) => route.abort());

  // Supabase: the restrooms in view (bounding-box query from lib/restroom-store.ts)
  await page.route("**/rest/v1/restrooms?**", (route) => route.fulfill(json([TEST_RESTROOM])));

  // Nominatim place search (lib/search.ts)
  await page.route("https://nominatim.openstreetmap.org/search?**", (route) =>
    route.fulfill(
      json([
        {
          display_name: "Ayala Avenue, Makati, Metro Manila, Philippines",
          name: "Ayala Avenue",
          lat: String(TEST_RESTROOM.latitude),
          lon: String(TEST_RESTROOM.longitude),
          class: "highway",
          type: "primary",
          importance: 0.6,
        },
      ])
    )
  );

  // OSRM walking/driving route (lib/routing.ts)
  const from: [number, number] = [USER_LOCATION.longitude, USER_LOCATION.latitude];
  const to: [number, number] = [TEST_RESTROOM.longitude, TEST_RESTROOM.latitude];
  await page.route("https://routing.openstreetmap.de/**", (route) =>
    route.fulfill(
      json({
        code: "Ok",
        waypoints: [{ distance: 3 }, { distance: 2 }],
        routes: [
          {
            distance: 180,
            duration: 130,
            geometry: { type: "LineString", coordinates: [from, [121.0238, 14.5541], to] },
            legs: [
              {
                steps: [
                  { distance: 180, duration: 130, name: "Ayala Avenue", maneuver: { type: "depart", location: from } },
                  { distance: 0, duration: 0, name: "", maneuver: { type: "arrive", location: to } },
                ],
              },
            ],
          },
        ],
      })
    )
  );
}
