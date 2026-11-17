import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync("public/data/uninfo/manifest.json", "utf8"),
);
const year = manifest.default_year as number;
const countries = JSON.parse(
  readFileSync(
    `public/data/uninfo/${year}/uninfo-countries-index.json`,
    "utf8",
  ),
) as Record<string, { name: string; has_framework: boolean }>;
const world = JSON.parse(
  readFileSync("public/data/world-map.geojson", "utf8"),
) as {
  features: { properties: { ISO3: string } }[];
};

test("map highlights exactly the countries with published frameworks", async ({
  page,
}) => {
  await page.goto("/system/");
  const covered = world.features.filter(
    ({ properties }) => countries[properties.ISO3]?.has_framework,
  );
  const highlighted = page
    .getByTestId("uninfo-map")
    .locator("svg > g > g:has(> path[fill])");
  await expect(highlighted).toHaveCount(covered.length);
  await expect(
    page.getByText("155 countries with available results frameworks"),
  ).toBeVisible();
  await highlighted.first().dispatchEvent("click");
  const dialog = page.getByRole("dialog", {
    name: countries[covered[0].properties.ISO3].name,
    exact: true,
  });
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  await expect(
    page.getByRole("button", { name: "Choose a country or area" }),
  ).toBeFocused();
  await expect(
    page.getByText(/retained snapshot|unverified|imported from open/i),
  ).toHaveCount(0);
});

test("shared year controls change coverage and the open country panel together", async ({
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
    dialog.getByRole("heading", { name: "Overall", exact: true }),
  ).toBeVisible();
  const priority = dialog.getByRole("button", {
    name: /Strategic priority.*Sustained Essential Services/,
  });
  await priority.click();
  const outcome = dialog
    .getByRole("button", { name: /Outcome.*By the end of 2027/ })
    .first();
  await expect(outcome).toBeVisible();
  await outcome.click();
  await expect(
    dialog.getByRole("button", { name: /Output/ }).first(),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2022", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  await expect(
    page.getByText("130 countries with available results frameworks"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select year", exact: true }).click();
  await page.getByRole("button", { name: "2026", exact: true }).click();
  await expect(
    page.getByText("147 countries with available results frameworks"),
  ).toBeVisible();
});

test("shared workspace shows the shared resource view and country fetch can retry", async ({
  page,
}) => {
  await page.goto("/system/");
  let fail = true;
  await page.route(
    `**/data/uninfo/${year}/countries/COK.json`,
    async (route) => {
      if (fail) {
        fail = false;
        await route.fulfill({ status: 503, body: "unavailable" });
      } else await route.continue();
    },
  );
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
  await expect(dialog.locator("[data-resource]").first()).toBeVisible();
});

test("mobile picker opens a framework without finances when the basemap fails", async ({
  page,
}) => {
  const code = Object.keys(countries).find((code) => {
    const country = JSON.parse(
      readFileSync(`public/data/uninfo/${year}/countries/${code}.json`, "utf8"),
    );
    return (
      countries[code].has_framework && Object.keys(country.sdgs).length === 0
    );
  })!;
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
    .fill(countries[code].name);
  await page
    .getByRole("button", { name: countries[code].name, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: countries[code].name,
    exact: true,
  });
  await expect(
    dialog.getByText(`No financial observations reported for ${year}.`),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("Ethiopia 2024 has historical funding, visible row amounts and full narrative", async ({
  page,
}) => {
  const country = JSON.parse(
    readFileSync("public/data/uninfo/2024/countries/ETH.json", "utf8"),
  );
  await page.goto("/system/");
  await page.getByRole("button", { name: "Select year", exact: true }).click();
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill("Ethiopia");
  await page.getByRole("button", { name: "Ethiopia", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ethiopia", exact: true });
  await expect(
    dialog.getByRole("heading", { name: "Overall", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/No financial observations/)).toHaveCount(0);
  const framework = dialog.getByRole("region", {
    name: "Results framework",
    exact: true,
  });
  await expect(
    framework.getByText("Available resources (USD)", { exact: true }),
  ).toBeVisible();
  const priority = framework.getByRole("button").first();
  await expect(
    priority.locator('[aria-label^="Available resources"]'),
  ).toBeVisible();
  await expect(
    priority.locator('[aria-label^="Available resources"]'),
  ).toHaveText(/\$[\d.]+[MBK]?/);
  await priority.click();
  await expect(
    framework.getByRole("button", { name: /Outcome/ }).first(),
  ).toBeVisible();
  await expect(
    framework.getByText(country.framework[0].description, { exact: true }),
  ).toBeVisible();
});
