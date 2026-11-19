import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { formatPlanPeriod, type UninfoManifest } from "../src/lib/uninfo";

const manifest: UninfoManifest = JSON.parse(
  readFileSync("public/data/uninfo/plans/manifest.json", "utf8"),
);
const world = JSON.parse(
  readFileSync("public/data/world-map.geojson", "utf8"),
) as {
  features: { properties: { ISO3: string } }[];
};

async function openCountry(page: Page, name: string) {
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill(name);
  await page.getByRole("button", { name, exact: true }).click();
  return page.getByRole("dialog", { name, exact: true });
}

test("entity documents are grouped by System Chart category", async ({
  page,
}) => {
  await page.goto("/system/");
  await page
    .getByRole("link", { name: "Browse entity reports and plans" })
    .click();
  await expect(page).toHaveURL(/\/system\/#entity-documents$/);

  const directory = page.getByRole("region", {
    name: "Entity reports and plans",
  });
  const funds = directory.getByRole("list", {
    name: "Funds and Programmes",
    exact: true,
  });
  const wfp = funds
    .getByRole("listitem")
    .filter({ hasText: "World Food Programme (WFP)" });
  await expect(wfp.getByRole("link")).toHaveCount(3);
  await expect(
    wfp.getByRole("link", {
      name: "Strategic plan for World Food Programme (WFP)",
    }),
  ).toHaveAttribute(
    "href",
    "https://executiveboard.wfp.org/document_download/WFP-0000132205",
  );

  const secretariat = directory.getByRole("list", {
    name: "Secretariat",
    exact: true,
  });
  const dco = secretariat
    .getByRole("listitem")
    .filter({ hasText: "Development Coordination Office (DCO)" });
  await expect(dco.getByRole("link")).toHaveCount(1);
  await expect(
    dco.getByRole("link", {
      name: "Reports for Development Coordination Office (DCO)",
    }),
  ).toBeVisible();
});

test("map has no year selector and opens the latest plan for each country", async ({
  page,
}) => {
  await page.goto("/system/");
  await expect(
    page.getByRole("button", { name: "Select year", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Select plan period" }),
  ).toHaveCount(0);
  const covered = world.features.filter(
    ({ properties }) => manifest.countries[properties.ISO3],
  );
  const highlighted = page
    .getByTestId("uninfo-map")
    .locator("svg > g > g:has(> path[fill])");
  await expect(highlighted).toHaveCount(covered.length);
  await highlighted.first().dispatchEvent("click");
  const country = manifest.countries[covered[0].properties.ISO3];
  const dialog = page.getByRole("dialog", { name: country.name, exact: true });
  const latest = manifest.plans[String(country.latest_plan_id)];
  await expect(
    dialog.getByRole("button", { name: "Select plan period" }),
  ).toHaveText(formatPlanPeriod(latest));
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  await expect(
    page.getByRole("button", { name: "Choose a country or area" }),
  ).toBeFocused();
});

test("sidebar switches between actual plan periods and reopens at the latest plan", async ({
  page,
}) => {
  await page.goto("/un-system/");
  const dialog = await openCountry(page, "Ethiopia");
  const period = dialog.getByRole("button", { name: "Select plan period" });
  await expect(period).toHaveText("Jul 2025–Jun 2030");
  const framework = dialog.getByRole("region", {
    name: "Results framework",
    exact: true,
  });
  await expect(framework.getByRole("button").first()).toContainText(
    "Peace and Governance",
  );
  await period.click();
  await page
    .getByRole("button", { name: "Jul 2020–Jun 2025", exact: true })
    .click();
  await expect(period).toHaveText("Jul 2020–Jun 2025");
  await expect(framework.getByRole("button").first()).toContainText("People");
  await expect(framework.getByRole("button").first()).not.toContainText(
    "PEOPLE",
  );
  await expect(
    dialog.getByRole("heading", { name: "Overall", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("heading", { name: "By SDG", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close country results" }).click();
  const reopened = await openCountry(page, "Ethiopia");
  await expect(
    reopened.getByRole("button", { name: "Select plan period" }),
  ).toHaveText("Jul 2025–Jun 2030");
});

test("framework descriptions precede children and align with their parent titles", async ({
  page,
}) => {
  const plan = JSON.parse(
    readFileSync("public/data/uninfo/plans/794.json", "utf8"),
  );
  await page.goto("/system/");
  const dialog = await openCountry(page, "Ethiopia");
  await dialog.getByRole("button", { name: "Select plan period" }).click();
  await page
    .getByRole("button", { name: "Jul 2020–Jun 2025", exact: true })
    .click();
  const framework = dialog.getByRole("region", {
    name: "Results framework",
    exact: true,
  });
  await expect(dialog.getByRole("heading", { name: /^Projects/ })).toHaveCount(
    0,
  );
  const priority = framework.getByRole("button").first();
  await expect(priority).toContainText("People");
  await expect(
    priority.locator('[aria-label^="Available resources"]'),
  ).toHaveText(/\$[\d.]+[MBK]?/);
  await expect(
    priority.getByText("Strategic priority", { exact: true }),
  ).toBeVisible();
  await priority.click();
  const outcome = framework.getByRole("button", { name: /Outcome/ }).first();
  await expect(outcome.getByText("Outcome", { exact: true })).toBeVisible();
  const description = framework.getByText(plan.framework[0].description, {
    exact: true,
  });
  await expect(description).toBeVisible();
  const titleBounds = await priority.locator(".ms-12").boundingBox();
  const textBounds = await description.boundingBox();
  expect(Math.abs(titleBounds!.x - textBounds!.x)).toBeLessThan(1);
  const childBounds = await outcome.boundingBox();
  expect(textBounds!.y + textBounds!.height).toBeLessThanOrEqual(
    childBounds!.y,
  );
});

test("shared-workspace plan data can be retried after a failed request", async ({
  page,
}) => {
  const planId = manifest.countries.COK.latest_plan_id;
  await page.goto("/system/");
  let fail = true;
  await page.route(`**/data/uninfo/plans/${planId}.json`, async (route) => {
    if (fail) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  const dialog = await openCountry(page, "Cook Islands");
  await expect(dialog.getByRole("alert")).toContainText(
    "Plan data could not be loaded",
  );
  fail = false;
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText(/Shared workspace covering/)).toContainText(
    "Samoa",
  );
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
});

test("mobile country and period controls work when the basemap fails", async ({
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
  const dialog = await openCountry(page, "Ethiopia");
  const period = dialog.getByRole("button", { name: "Select plan period" });
  await expect(period).toHaveText("Jul 2025–Jun 2030");
  await period.click();
  await page
    .getByRole("button", { name: "Jul 2020–Jun 2025", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
