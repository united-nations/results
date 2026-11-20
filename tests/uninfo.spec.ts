import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { formatPlanPeriod, type UninfoManifest } from "../src/lib/uninfo";

const manifest: UninfoManifest = JSON.parse(
  readFileSync("public/data/uninfo/plans/manifest.json", "utf8"),
);
const annual = JSON.parse(
  readFileSync("public/data/uninfo/annual-expenditure-2025.json", "utf8"),
) as {
  year: number;
  workspaces: Record<
    string,
    { expenditure: number | null; countries: string[] }
  >;
};
const world = JSON.parse(
  readFileSync("public/data/world-map.geojson", "utf8"),
) as { features: { properties: { ISO3: string } }[] };

async function showCountryTeams(page: Page) {
  await page.getByRole("tab", { name: "Country teams", exact: true }).click();
}

async function openCountry(page: Page, name: string) {
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill(name);
  await page.getByRole("button", { name, exact: true }).click();
  return page.getByRole("dialog", { name, exact: true });
}

function mapYearPlan(code: string) {
  const country = manifest.countries[code];
  return manifest.plans[
    String(
      country.plan_ids.find((id) => {
        const plan = manifest.plans[String(id)];
        return (
          plan.start &&
          plan.end &&
          plan.start <= `${annual.year}-12-31` &&
          plan.end >= `${annual.year}-01-01`
        );
      }) ?? country.latest_plan_id,
    )
  ];
}

test("organizations open by default, keep one group open, and retain view state across tabs", async ({
  page,
}) => {
  await page.goto("/system/");
  await expect(
    page.getByRole("tab", { name: "Organizations", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const directory = page.getByRole("region", {
    name: "UN system entities",
    exact: true,
  });
  await expect(directory.getByRole("heading", { level: 3 })).toHaveCount(18);
  await expect(
    page.getByRole("button", { name: "Choose a country or area" }),
  ).toHaveCount(0);
  const hunger = directory.getByRole("button", { name: /^Goal 2 Zero Hunger/ });
  await hunger.click();
  await expect(hunger).toHaveAttribute("aria-expanded", "true");
  const wfp = directory.locator('article[aria-label="World Food Programme"]');
  await expect(wfp).toBeVisible();
  await expect(
    wfp.getByRole("link", { name: /^Strategic plan for WFP/ }),
  ).toHaveAttribute(
    "href",
    "https://executiveboard.wfp.org/document_download/WFP-0000132205",
  );
  await expect(
    wfp.getByText("Annual report · Coming soon", { exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(wfp.getByRole("link", { name: /Annual report/ })).toHaveCount(0);
  await expect(
    wfp.getByText("Illustrative impact statements", { exact: true }),
  ).toBeVisible();
  const health = directory.getByRole("button", { name: /^Goal 3 Good Health/ });
  await health.click();
  await expect(hunger).toHaveAttribute("aria-expanded", "false");
  await expect(health).toHaveAttribute("aria-expanded", "true");
  await directory.getByText("By System Chart", { exact: true }).click();
  const funds = directory.getByRole("button", {
    name: /^UN System Chart Funds & Programmes/,
  });
  await funds.click();
  await expect(wfp).toBeVisible();
  await showCountryTeams(page);
  await page.getByRole("tab", { name: "Organizations", exact: true }).click();
  await expect(funds).toHaveAttribute("aria-expanded", "true");
  await expect(wfp).toBeVisible();
});

test("map shows annual circles once per workspace, shared colors, and a plan overlapping the map year", async ({
  page,
}) => {
  await page.goto("/system/");
  await showCountryTeams(page);
  await expect(
    page.getByRole("button", { name: "Select year", exact: true }),
  ).toHaveCount(0);
  const map = page.getByTestId("uninfo-map");
  const covered = world.features.filter(
    ({ properties }) => manifest.countries[properties.ISO3],
  );
  const highlighted = map.locator("svg > g > g:has(> path[fill])");
  await expect(highlighted).toHaveCount(covered.length);
  const circles = map.locator('circle[cx="0"][cy="0"]');
  const positive = Object.values(annual.workspaces).filter(
    (workspace) => (workspace.expenditure ?? 0) > 0,
  );
  await expect(circles).toHaveCount(positive.length);
  const sharedCount = positive.filter(
    (workspace) => workspace.countries.length > 1,
  ).length;
  await expect
    .poll(() =>
      circles.evaluateAll((nodes) => {
        const orange = getComputedStyle(document.documentElement)
          .getPropertyValue("--color-un-orange")
          .trim();
        const sample = document.createElement("span");
        sample.style.color = orange;
        document.body.append(sample);
        const expected = getComputedStyle(sample).color;
        sample.remove();
        return nodes.filter((node) => getComputedStyle(node).fill === expected)
          .length;
      }),
    )
    .toBe(sharedCount);
  const country = manifest.countries[covered[0].properties.ISO3];
  await highlighted.first().dispatchEvent("click");
  const dialog = page.getByRole("dialog", { name: country.name, exact: true });
  await expect(
    dialog.getByRole("button", { name: "Select plan period" }),
  ).toHaveText(formatPlanPeriod(mapYearPlan(covered[0].properties.ISO3)));
  await expect(
    dialog.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  await expect(
    page.getByRole("button", { name: "Choose a country or area" }),
  ).toBeFocused();
  const marker = circles.first();
  const reference = map.locator('circle[cx="14"][cy="14"]');
  const markerWidth = (await marker.boundingBox())!.width;
  const referenceWidth = (await reference.boundingBox())!.width;
  await map.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(map.locator("svg > g").first()).toHaveAttribute(
    "transform",
    /scale\(1\.[1-9]/,
  );
  await expect
    .poll(async () =>
      Math.abs((await marker.boundingBox())!.width - markerWidth),
    )
    .toBeLessThan(0.5);
  expect(
    Math.abs((await reference.boundingBox())!.width - referenceWidth),
  ).toBeLessThan(0.5);
});

test("sidebar changes plan periods and offers collapsed entity and resource views", async ({
  page,
}) => {
  await page.goto("/un-system/");
  await showCountryTeams(page);
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
  await expect(framework.getByRole("button").first()).toContainText("People");
  const overview = dialog.getByRole("region", {
    name: "Framework expenditure overview",
  });
  await expect(
    overview.getByText("Required resources", { exact: true }),
  ).toBeHidden();
  const entities = overview.locator("details").nth(0);
  await expect(entities).not.toHaveAttribute("open", "");
  await entities.locator("summary").click();
  await expect(entities.getByText("UNICEF", { exact: true })).toBeVisible();
  const resources = overview.locator("details").nth(1);
  await resources.locator("summary").click();
  await expect(
    resources.getByText("Required resources", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close country results" }).click();
  const reopened = await openCountry(page, "Ethiopia");
  await expect(
    reopened.getByRole("button", { name: "Select plan period" }),
  ).toHaveText("Jul 2025–Jun 2030");
});

test("framework expenditure rows keep descriptions before children and drilldowns at each level", async ({
  page,
}) => {
  const plan = JSON.parse(
    readFileSync("public/data/uninfo/plans/794.json", "utf8"),
  );
  await page.goto("/system/");
  await showCountryTeams(page);
  const dialog = await openCountry(page, "Ethiopia");
  await dialog.getByRole("button", { name: "Select plan period" }).click();
  await page
    .getByRole("button", { name: "Jul 2020–Jun 2025", exact: true })
    .click();
  const framework = dialog.getByRole("region", {
    name: "Results framework",
    exact: true,
  });
  const priorityItem = framework.locator(":scope > ul > li").first();
  const priority = priorityItem.getByRole("button").first();
  await expect(priority).toContainText("People");
  await priority.click();
  const description = priorityItem.getByText(plan.framework[0].description, {
    exact: true,
  });
  await expect(description).toBeVisible();
  const outcome = priorityItem.getByRole("button").nth(1);
  await expect(outcome).toBeVisible();
  const textBounds = await description.boundingBox();
  const childBounds = await outcome.boundingBox();
  expect(textBounds!.y + textBounds!.height).toBeLessThanOrEqual(
    childBounds!.y,
  );
  const priorityEntities = priorityItem.locator("details").nth(0);
  await priorityEntities.locator("summary").click();
  await expect(
    priorityEntities.getByText("UNICEF", { exact: true }),
  ).toBeVisible();
  await outcome.click();
  const outcomeItem = outcome.locator("xpath=ancestor::li[1]");
  await expect(
    outcomeItem.locator("details").first().locator("summary"),
  ).toHaveText("Expenditure by entity");
  await expect(
    outcomeItem.locator("details").nth(1).locator("summary"),
  ).toHaveText("Required, available and expenditure");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("shared-workspace plan data can be retried after a failed request", async ({
  page,
}) => {
  const planId = mapYearPlan("COK").id;
  await page.goto("/system/");
  await showCountryTeams(page);
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
    dialog.getByRole("heading", {
      name: "Shared framework overview",
      exact: true,
    }),
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
  await showCountryTeams(page);
  await expect(page.getByRole("status")).toContainText(
    "Use the country selector",
  );
  const dialog = await openCountry(page, "Ethiopia");
  await dialog.getByRole("button", { name: "Select plan period" }).click();
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
