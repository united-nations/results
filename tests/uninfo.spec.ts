import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const countries = JSON.parse(
  readFileSync("public/data/uninfo-countries-index.json", "utf8"),
) as Record<string, { name: string }>;
const world = JSON.parse(
  readFileSync("public/data/world-map.geojson", "utf8"),
) as {
  features: { properties: { ISO3: string } }[];
};

test("UN INFO highlights every country feature and opens results from the map", async ({
  page,
}) => {
  await page.goto("/system/");
  await expect(
    page.getByRole("heading", { name: "Country Results Frameworks" }),
  ).toBeVisible();
  const map = page.getByTestId("uninfo-map");
  const highlighted = map.locator("svg > g > g:has(> path[fill])");
  const coveredFeatures = world.features.filter(
    (feature) => countries[feature.properties.ISO3],
  );
  await expect(highlighted).toHaveCount(coveredFeatures.length);
  const firstCode = coveredFeatures[0].properties.ISO3;
  await highlighted.first().dispatchEvent("click");
  const dialog = page.getByRole("dialog", {
    name: countries[firstCode].name,
    exact: true,
  });
  await expect(
    dialog.getByRole("heading", { name: "Results framework", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  await expect(
    page.getByRole("button", { name: "Choose a country or area" }),
  ).toBeFocused();
});

test("country picker opens full framework hierarchy with reporting-period qualification", async ({
  page,
}) => {
  await page.goto("/un-system/");
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill("Afghanistan");
  await page.getByRole("button", { name: "Afghanistan", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Afghanistan", exact: true });
  await expect(
    dialog.getByText(
      "The financial reporting period for this framework is unverified",
      { exact: false },
    ),
  ).toBeVisible();
  const strategicPriority = dialog.locator("details").first();
  await strategicPriority.locator("> summary").click();
  await expect(
    strategicPriority.locator("details > summary").first(),
  ).toContainText("Outcome");
  await strategicPriority.locator("details > summary").first().click();
  await expect(
    strategicPriority.locator("details details > summary").first(),
  ).toContainText("Output");
  await expect(
    dialog.getByText("Financial year 2024.", { exact: false }),
  ).toBeVisible();
});

test("shared workspace qualifies resources and country fetch can be retried", async ({
  page,
}) => {
  await page.goto("/system/");
  let fail = true;
  await page.route("**/data/uninfo-countries/COK.json", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, body: "unavailable" });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill("Cook Islands");
  await page.getByRole("button", { name: "Cook Islands", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Cook Islands",
    exact: true,
  });
  await expect(dialog.getByRole("alert")).toContainText("could not be loaded");
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText(/Shared workspace covering/)).toContainText(
    "Samoa",
  );
});

test("country picker works on mobile when the basemap fails", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/data/world-map.geojson", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/system/");
  await expect(page.getByRole("status")).toContainText(
    "Use the country selector",
  );
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill("Bahrain");
  await page.getByRole("button", { name: "Bahrain", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Bahrain", exact: true });
  await expect(
    dialog
      .getByText("Financial reporting period unverified.", { exact: false })
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
