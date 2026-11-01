import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (tests/e2e). They run against a production build:
 *   npm run build && npm run test:e2e
 *
 * The tests mock every outside service (Supabase, Nominatim, OSRM, map tiles)
 * with page.route, so they need no secrets and don't depend on live data.
 * The build only needs *some* Supabase URL/key (see .github/workflows/ci.yml).
 */
const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // English UI (the app picks the language from Accept-Language)
    locale: "en-US",
  },
  projects: [
    // Mobile first: the app is built for phone screens
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
