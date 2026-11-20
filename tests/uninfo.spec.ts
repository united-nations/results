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

test("three system tabs expose their own ordered resources and support keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/system/");
  const organizations = page.getByRole("tab", {
    name: "Organizations",
    exact: true,
  });
  const countryTeams = page.getByRole("tab", {
    name: "Country teams",
    exact: true,
  });
  const evaluations = page.getByRole("tab", {
    name: "Evaluations",
    exact: true,
  });
  await expect(page.getByRole("tab")).toHaveCount(3);

  async function expectResources(hrefs: string[]) {
    const region = page.getByRole("region", {
      name: "Related resources",
      exact: true,
    });
    await expect(region).toHaveCount(1);
    const links = region.getByRole("link");
    await expect(links).toHaveCount(hrefs.length);
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("href")),
      ),
    ).toEqual(hrefs);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);
      await expect(link).toHaveAccessibleName(/\(opens in new tab\)$/);
    }
  }

  await expectResources([
    "https://systemchart.un.org/",
    "https://open.un.org/",
  ]);
  await organizations.focus();
  await page.keyboard.press("End");
  await expect(evaluations).toBeFocused();
  await expect(evaluations).toHaveAttribute("aria-selected", "true");
  await expectResources([
    "https://unsdg.un.org/resources/unct-key-documents?f%5B0%5D=country_document_type_api:Eval&page=0",
    "https://www.un.org/system-wide-evaluation-office/en",
    "https://www.unevaluation.org/",
    "https://www.sdgsynthesiscoalition.org/",
  ]);
  const evidenceMaps = page.getByRole("region", {
    name: "Evaluation evidence maps",
    exact: true,
  });
  expect(
    await evidenceMaps
      .getByRole("link")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
  ).toEqual([
    "https://system-wide-evaluation-office.github.io/UN_evaluation_evidence_map/#",
    "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_SDGs_v1.0.html",
    "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_QCPR_coverage_v1.0.html",
    "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_QCPR_detailed%20evidence_V1.0.html",
    "https://www.un.org/system-wide-evaluation-office/en/evidence-maps",
  ]);
  await expect(
    page.getByRole("link", { name: /^UN System Chart/ }),
  ).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(countryTeams).toBeFocused();
  await expect(countryTeams).toHaveAttribute("aria-selected", "true");
  await expectResources([
    "https://uninfo.org/",
    "https://open.un.org/",
    "https://unsdg.un.org/",
  ]);
  await expect(
    page.getByRole("link", { name: /^Country-team evaluations/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Home");
  await expect(organizations).toBeFocused();
  await expect(organizations).toHaveAttribute("aria-selected", "true");
  await expectResources([
    "https://systemchart.un.org/",
    "https://open.un.org/",
  ]);
  await page.keyboard.press("ArrowLeft");
  await expect(evaluations).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(organizations).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

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

test("map shows annual circles once per workspace in one blue style and a plan overlapping the map year", async ({
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
  await expect
    .poll(() =>
      circles.evaluateAll((nodes) => {
        const blue = getComputedStyle(document.documentElement)
          .getPropertyValue("--color-un-blue")
          .trim();
        const sample = document.createElement("span");
        sample.style.color = blue;
        document.body.append(sample);
        const expected = getComputedStyle(sample).color;
        sample.remove();
        return nodes.filter((node) => getComputedStyle(node).fill === expected)
          .length;
      }),
    )
    .toBe(positive.length);
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

test("sidebar changes plan periods and keeps expenditure without financial disclosures", async ({
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
  await expect(
    overview.getByText("Expenditure", { exact: true }),
  ).toBeVisible();
  await expect(overview.locator("details")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close country results" }).click();
  const reopened = await openCountry(page, "Ethiopia");
  await expect(
    reopened.getByRole("button", { name: "Select plan period" }),
  ).toHaveText("Jul 2025–Jun 2030");
});

test("all country evaluation reports stay grouped by current and previous periods when the financial period changes", async ({
  page,
}) => {
  await page.goto("/system/");
  await showCountryTeams(page);
  const kenya = await openCountry(page, "Kenya");
  const period = kenya.getByRole("button", { name: "Select plan period" });
  const evaluations = kenya.getByRole("region", {
    name: "Framework evaluations",
    exact: true,
  });
  const currentGroup = evaluations.getByRole("region", {
    name: "Current period evaluations",
    exact: true,
  });
  const previousGroup = evaluations.getByRole("region", {
    name: "Previous period evaluations",
    exact: true,
  });
  const current = currentGroup.getByRole("link", {
    name: /^Kenya 2022–2027 framework evaluation/,
  });
  const past = previousGroup.getByRole("link", {
    name: /^Kenya 2018–2022 framework evaluation/,
  });
  await expect(period).toHaveText(formatPlanPeriod(manifest.plans["1488"]));
  await expect(current).toHaveAttribute(
    "href",
    "https://document.ess.uninfo.org/uninfo-production-main/c855f461-6678-4032-bfde-dcc166724932_FinalUNSDCFEvaluationKenya.pdf",
  );
  await expect(current).toHaveAttribute("target", "_blank");
  await expect(current).toHaveAccessibleName(/\(opens in new tab\)$/);
  await expect(past).toHaveAttribute(
    "href",
    "https://document.ess.uninfo.org/uninfo-production-main/cce7e9d4-ca27-46f7-b264-0a28848ecec5_Final_UNDAF_Kenya_Evaluation_Report_25_01_2022_(005).pdf",
  );
  await expect(
    evaluations.getByText("Cover preview", { exact: true }),
  ).toHaveCount(2);
  await period.click();
  await page
    .getByRole("button", {
      name: formatPlanPeriod(manifest.plans["838"]),
      exact: true,
    })
    .click();
  await expect(past).toHaveAttribute(
    "href",
    "https://document.ess.uninfo.org/uninfo-production-main/cce7e9d4-ca27-46f7-b264-0a28848ecec5_Final_UNDAF_Kenya_Evaluation_Report_25_01_2022_(005).pdf",
  );
  await expect(current).toBeVisible();
  await expect(
    currentGroup.getByRole("heading", { name: /^Current period/ }),
  ).toHaveText("Current period (Jul 2022–Jun 2027)");
  await period.click();
  await page
    .getByRole("button", {
      name: formatPlanPeriod(manifest.plans["1488"]),
      exact: true,
    })
    .click();
  await expect(current).toBeVisible();
  await expect(past).toBeVisible();
  await kenya.getByRole("button", { name: "Close country results" }).click();

  const india = await openCountry(page, "India");
  await expect(
    india.getByRole("region", {
      name: "Current period evaluations",
      exact: true,
    }),
  ).toContainText("No verified report for the current period.");
  await expect(
    india
      .getByRole("region", { name: "Previous period evaluations", exact: true })
      .getByRole("link", { name: /^India 2018–2022 framework evaluation/ }),
  ).toBeVisible();
  await india.getByRole("button", { name: "Close country results" }).click();

  const bangladesh = await openCountry(page, "Bangladesh");
  await expect(
    bangladesh
      .getByRole("region", { name: "Previous period evaluations", exact: true })
      .getByRole("link", {
        name: /^Bangladesh 2017–2021 framework evaluation/,
      }),
  ).toBeVisible();
  await bangladesh
    .getByRole("button", { name: "Close country results" })
    .click();

  const bahrain = await openCountry(page, "Bahrain");
  const unmatched = bahrain.getByRole("region", {
    name: "Framework evaluations",
    exact: true,
  });
  await expect(unmatched).toContainText(
    "No verified report for the current period.",
  );
  await expect(unmatched).toContainText(
    "No verified reports for previous periods.",
  );
  await expect(unmatched.getByRole("link")).toHaveCount(2);
  await expect(
    unmatched.getByRole("link", { name: /^Evaluating impact/ }),
  ).toHaveAttribute("href", "https://unsdg.un.org/evaluating-impact");
  expect(
    await bahrain.evaluate((node) => {
      const framework = node.querySelector(
        'section[aria-label="Results framework"]',
      );
      const reports = node.querySelector(
        'section[aria-label="Framework evaluations"]',
      );
      return (
        !!framework &&
        !!reports &&
        !!(
          framework.compareDocumentPosition(reports) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      );
    }),
  ).toBe(true);
  await expect(
    unmatched.getByRole("link", {
      name: /^Browse all country-team evaluation documents/,
    }),
  ).toHaveAttribute(
    "href",
    "https://unsdg.un.org/resources/unct-key-documents?f%5B0%5D=country_document_type_api:Eval&page=0",
  );
  await expect(
    bahrain.getByRole("region", { name: "Framework expenditure overview" }),
  ).toBeVisible();
  await expect(
    bahrain.getByRole("heading", { name: "Results Framework", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await bahrain.getByRole("button", { name: "Close country results" }).click();
  const mobileKenya = await openCountry(page, "Kenya");
  await expect(
    mobileKenya.getByRole("link", {
      name: /^Kenya 2018–2022 framework evaluation/,
    }),
  ).toBeVisible();
  expect(
    await mobileKenya.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
});

test("framework expenditure rows keep descriptions before children without financial drilldowns", async ({
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
  await expect(priorityItem.locator("details")).toHaveCount(0);
  await outcome.click();
  const outcomeItem = outcome.locator("xpath=ancestor::li[1]");
  await expect(outcomeItem.locator("details")).toHaveCount(0);
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
