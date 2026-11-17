import { test, expect, type Page } from "@playwright/test";

test("beneficiaries open programme budget results by entity", async ({
  page,
}) => {
  await page.goto("/");
  const tabs = page.getByRole("navigation", {
    name: "Browse Secretariat results",
  });
  await expect(
    tabs.getByRole("link", { name: "Entities and priority areas" }),
  ).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Beneficiaries" }).click();
  await expect(
    tabs.getByRole("link", { name: "Beneficiaries" }),
  ).toHaveAttribute("aria-current", "page");
  const heading = page.getByRole("heading", {
    name: "Women and girls",
    exact: true,
  });
  const beneficiary = page.locator("details").filter({ has: heading });
  await expect(beneficiary.locator("summary").first()).toContainText(
    "41 results",
  );
  await heading.click();
  const result = beneficiary.getByRole("button", {
    name: /Strengthened national ownership to prevent conflict-related sexual violence/,
  });
  await result.click();
  const sidebar = page.getByRole("dialog", {
    name: /Strengthened national ownership/,
  });
  await expect(
    sidebar.getByText(/Since 2022, in response to allegations/),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: /View budget document/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    sidebar
      .getByRole("navigation", { name: "Result context" })
      .getByRole("link", {
        name: /Office of the Special Representative.*Sexual Violence in Conflict/,
      }),
  ).toHaveAttribute("href", "/entities/osrsg-svc/");
  await sidebar.getByRole("button", { name: "Close result" }).click();
  await expect(result).toBeFocused();

  const oceanConference =
    "Accelerated progress for Sustainable Development Goal 14 through the third United Nations Ocean Conference";
  await page.getByRole("heading", { name: "Climate and environment" }).click();
  await page
    .getByRole("button", { name: oceanConference, exact: true })
    .click();
  const oceanSidebar = page.getByRole("dialog", { name: oceanConference });
  await expect(
    oceanSidebar.getByText("Programme budget result", { exact: true }),
  ).toBeVisible();
  await expect(oceanSidebar.getByText("Result 1", { exact: true })).toHaveCount(
    0,
  );

  const context = oceanSidebar.getByRole("navigation", {
    name: "Result context",
  });
  await expect(
    context.getByRole("link", {
      name: /DESA · Department of Economic and Social Affairs/,
    }),
  ).toHaveAttribute("href", "/entities/desa/");
  const subprogramme = context.getByRole("link", {
    name: "Subprogramme 3 · Sustainable development",
    exact: true,
  });
  await expect(subprogramme).toHaveAttribute("href", "/entities/desa/9-sp-3/");
  await subprogramme.click();
  await expect(page).toHaveURL(/\/entities\/desa\/9-sp-3\/?$/);
  await expect(
    page.getByRole("button", { name: `Result 1 ${oceanConference}` }),
  ).toBeVisible();
});

test("Member States opens nested beneficiary categories", async ({ page }) => {
  await page.goto("/beneficiaries/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Refugees, minorities and other groups in vulnerable situations",
    "Women and girls",
    "Youth",
    "Member States",
    "Public administration",
    "Climate and environment",
    "Enabling services",
    "Private sector, including micro, small and medium-sized enterprises",
    "International community",
  ]);
  const parent = page.getByRole("heading", {
    name: "Member States",
    exact: true,
  });
  const region = page.getByRole("heading", {
    name: "Member States in Africa",
    exact: true,
  });
  await expect(region).toBeHidden();
  await expect(parent.locator("..")).toContainText("271 results");
  await parent.click();
  await expect(region.locator("..")).toContainText("77 results");
  const regionGroup = region.locator("../..");
  await expect(regionGroup.getByRole("button").first()).toBeHidden();
  await region.click();
  await expect(
    regionGroup.getByRole("heading", { level: 4 }).first(),
  ).toBeVisible();
  await expect(regionGroup.getByRole("button").first()).toBeVisible();
});

async function chooseLocation(page: Page, name: string) {
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill(name);
  await page.getByRole("button", { name, exact: true }).press("Enter");
}

test("both Secretariat directories search untagged programme budget results", async ({
  page,
}) => {
  const resultName =
    /Afghans retain access to dialogue and coordinated assistance/;
  for (const { path, label, query } of [
    {
      path: "/beneficiaries/",
      label: "Search all results",
      query:
        "amid heightened human rights, political, civic and economic constraints",
    },
    {
      path: "/",
      label: "Search entities, priority areas or results",
      query: "Afghans retain access to dialogue",
    },
  ]) {
    await page.goto(path);
    const search = page.getByRole("searchbox", { name: label });
    await search.fill(query);
    const result = page.getByRole("button", { name: resultName });
    await expect(result).toContainText("2025 programme performance");
    if (path === "/") {
      const entity = page.getByRole("link", { name: /^UNAMA,/ }).locator("..");
      await expect(
        entity.getByRole("button", { name: resultName }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Matching programme budget results",
        }),
      ).toHaveCount(0);
    }
    await result.click();
    const panel = page.getByRole("dialog", { name: resultName });
    await expect(panel.getByText("2025 programme performance")).toBeVisible();
    await expect(panel.getByText(/amid heightened human rights/)).toBeVisible();
    await panel.getByRole("button", { name: "Close result" }).click();
    await search.clear();
    await expect(result).toBeHidden();
  }
});

test("locations distinguish local, multi-location, and global results", async ({
  page,
}) => {
  await page.goto("/locations/");
  const tabs = page.getByRole("navigation", {
    name: "Browse Secretariat results",
  });
  await expect(tabs.getByRole("link", { name: "Locations" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const map = page.getByTestId("results-location-map");
  const countries = map.locator("svg path:not([style*='--color-muted'])");
  const legend = map.getByRole("list", {
    name: "Most specific results by location",
  });
  await expect(legend.getByRole("listitem")).toHaveText([
    "Global only",
    "Across multiple locations",
    "Country-specific",
  ]);
  await expect
    .poll(() =>
      countries.evaluateAll((paths) =>
        [...new Set(paths.map((path) => getComputedStyle(path).fill))].sort(),
      ),
    )
    .toEqual(["rgb(0, 158, 219)", "rgb(0, 73, 135)", "rgb(197, 223, 239)"]);

  const point = await countries.evaluateAll((paths) => {
    for (const path of paths) {
      if (!(path instanceof SVGPathElement)) continue;
      const box = path.getBBox();
      const matrix = path.getScreenCTM();
      if (!matrix || box.width < 8 || box.height < 8) continue;
      const center = new DOMPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      const screen = center.matrixTransform(matrix);
      if (document.elementFromPoint(screen.x, screen.y) === path)
        return { x: screen.x, y: screen.y };
    }
  });
  expect(point).toBeDefined();
  await page.mouse.click(point!.x, point!.y);
  const closeLocation = page.getByRole("button", { name: "Close location" });
  await expect(closeLocation).toBeVisible();
  await closeLocation.click();

  await chooseLocation(page, "Greenland");
  const globalOnly = page.getByRole("dialog", {
    name: "Greenland",
    exact: true,
  });
  await expect(
    globalOnly.getByRole("heading", { name: /Global/ }),
  ).toBeVisible();
  await expect(
    globalOnly.getByRole("heading", { name: /Country-specific/ }),
  ).toHaveCount(0);
  await globalOnly
    .getByRole("heading", { name: "Global", exact: true })
    .click();
  await expect(
    globalOnly.getByRole("heading", { level: 3 }).first(),
  ).toBeVisible();
  await closeLocation.click();

  const picker = page.getByRole("button", { name: "Choose a country or area" });
  await chooseLocation(page, "Ukraine");
  const sidebar = page.getByRole("dialog", { name: "Ukraine", exact: true });
  await expect(
    sidebar.getByText("Country-specific", { exact: false }),
  ).toBeVisible();
  await expect(
    sidebar.getByText("Across multiple locations", { exact: false }),
  ).toBeVisible();
  await expect(
    sidebar.getByText(/Central African Republic.*Colombia.*Ukraine/).first(),
  ).toBeVisible();
  await expect(
    sidebar.locator("summary").filter({ hasText: /^Global/ }),
  ).toBeVisible();
  const result = sidebar.getByRole("button", {
    name: /Strengthened national ownership to prevent conflict-related sexual violence/,
  });
  await result.click();
  const detail = page.getByRole("dialog", {
    name: /Strengthened national ownership/,
  });
  await expect(
    detail.getByText(/Since 2022, in response to allegations/),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Close result" }).click();
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole("button", { name: "Close location" }).click();
  await expect(picker).toBeFocused();

  await chooseLocation(page, "South Sudan");
  const countrySpecific = page
    .getByRole("heading", { name: "Country-specific", exact: true })
    .locator("../..");
  await expect(
    countrySpecific.getByRole("heading", {
      level: 3,
      name: /Department of Peace Operations/,
    }),
  ).toBeVisible();
  await expect(
    countrySpecific.getByRole("button", {
      name: /Progress in the implementation of the 2018 Revitalized Agreement/,
    }),
  ).toBeVisible();
});

test("shared location results are grouped by entity with their own coverage", async ({
  page,
}) => {
  await page.goto("/locations/");
  await chooseLocation(page, "Barbados");
  const sidebar = page.getByRole("dialog", { name: "Barbados", exact: true });
  const multiLocation = sidebar
    .getByRole("heading", {
      name: "Across multiple locations",
    })
    .locator("../..");
  await expect(multiLocation.locator("summary").first()).toContainText(
    "44 results",
  );
  const group = multiLocation.locator("section").filter({
    has: page.getByRole("heading", {
      level: 3,
      name: /Economic Commission for Latin America and the Caribbean/,
    }),
  });
  await expect(group).toHaveCount(1);
  await expect(group.getByRole("button")).toHaveCount(44);
  await expect(
    multiLocation.getByRole("heading", { name: /ECLAC Caribbean subregion/ }),
  ).toHaveCount(0);
  const coverage = group
    .getByText("60 tagged countries and areas", {
      exact: true,
    })
    .first();
  await expect(coverage).toHaveClass(/\btext-muted-foreground\b/);
  await coverage.click();
  await expect(
    coverage.locator("..").getByText(/Barbados, Belize, Bermuda/),
  ).toBeVisible();
  await expect(group.getByText(/Bangladesh/)).toHaveCount(0);
  await group.getByRole("button").first().click();
  await expect(
    page.getByRole("button", { name: "Close result" }),
  ).toBeVisible();
});

test("budget hierarchy filters entity counts and programme results", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Filter by budget structure",
  });
  await expect(trigger).toHaveClass(/\bbg-muted\b/);
  await trigger.click();
  const picker = page.getByRole("dialog", {
    name: "Filter by budget structure",
  });
  await picker
    .getByRole("button", {
      name: /^Expand Part IV — International cooperation/,
    })
    .click();
  await expect(
    picker.getByRole("button", {
      name: "Programme 10 · Section 13 — Trade and development / International Trade Centre",
      exact: true,
    }),
  ).toBeVisible();

  await picker
    .getByRole("searchbox", { name: "Search budget structure" })
    .fill("DESA subprogramme 2");
  await picker
    .getByRole("button", {
      name: "Subprogramme 2 · Inclusive social development",
      exact: true,
    })
    .click();
  await expect(picker).toBeHidden();
  const priorities = page.getByRole("heading", {
    name: "Forging pathways for sustainable development",
    exact: true,
  });
  await expect(priorities.locator("..")).toContainText("1 entity");
  const entity = page.getByRole("link", { name: /^DESA,/ });
  await expect(entity).toHaveAttribute("href", "/entities/desa/9-sp-2/");

  await expect(entity.locator("..").getByRole("button")).toHaveCount(4);
  await expect(
    page.getByRole("button", {
      name: /The World Social Report 2025 informed social policy/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Reaffirmed political commitments/ }),
  ).toBeHidden();

  await page
    .getByRole("button", {
      name: /^Filter by budget structure: Subprogramme 2/,
    })
    .click();
  await expect(picker.getByRole("searchbox")).toHaveValue("");
  await picker.getByRole("button", { name: "All budget locations" }).click();
  await expect(priorities.locator("..")).not.toContainText("1 entity");
});

test("sticky subprogramme navigation meets the site header", async ({
  page,
}) => {
  await page.goto("/entities/desa/9-sp-1/");
  await expect(
    page.getByRole("link", { name: "All priority areas" }),
  ).toHaveAttribute("href", "/");
  const navigation = page.getByRole("navigation", { name: "Subprogrammes" });

  for (const width of [820, 1600, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect
      .poll(() =>
        navigation.evaluate((nav) => {
          const header = document.querySelector("header")!;
          return Math.abs(
            nav.getBoundingClientRect().top -
              header.getBoundingClientRect().bottom,
          );
        }),
      )
      .toBeLessThan(1);
  }
});

test("Peace and Security clusters are collapsed and searchable", async ({
  page,
}) => {
  await page.goto("/");
  const priorityHeading = page.getByRole("heading", {
    name: "Fostering peace and security",
    exact: true,
  });
  const priority = page.locator("section").filter({
    has: priorityHeading,
  });
  await expect(page.locator("main details[open]")).toHaveCount(0);
  const officialName = priority.getByText(
    "Maintenance of international peace and security",
    { exact: true },
  );
  await expect(officialName).toBeHidden();
  await expect(priority.getByRole("link", { name: /^DPO,/ })).toBeHidden();
  await priorityHeading.click();
  await expect(officialName).toBeVisible();
  await expect(priority.locator("details details")).toHaveCount(4);
  await expect(priority.locator("details details[open]")).toHaveCount(0);
  await expect(priority.getByRole("link")).toHaveCount(5);
  for (const code of ["DPPA", "DPO", "OOSA", "UNAOC"]) {
    await expect(
      priority.getByRole("link", { name: new RegExp(`^${code},`) }),
    ).toBeVisible();
  }

  const more = priority.getByRole("button", { name: "Show 4 more entities" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(priority.getByRole("link")).toHaveCount(9);
  for (const code of ["UNOAU", "UNRoD", "UNSCO", "UNMOGIP", "UNTSO"]) {
    await expect(
      priority.getByRole("link", { name: new RegExp(`^${code},`) }),
    ).toBeVisible();
  }
  const fewer = priority.getByRole("button", { name: "Show fewer" });
  await expect(fewer).toHaveAttribute("aria-expanded", "true");
  await fewer.click();
  await expect(priority.getByRole("link")).toHaveCount(5);

  const protectionHeading = page.getByRole("heading", {
    name: "Special representatives and coordinators for protection",
    exact: true,
  });
  const protection = priority
    .locator("details details")
    .filter({ has: protectionHeading });
  await protectionHeading.click();
  await expect(protection.getByRole("link")).toHaveCount(4);
  for (const code of ["OSC-SEA", "OSRSG-CAAC", "OSRSG-SVC", "OSRSG-VAC"]) {
    await expect(
      protection.getByRole("link", { name: new RegExp(`^${code},`) }),
    ).toBeVisible();
  }
  await protectionHeading.click();

  const envoys = priority.getByText("Envoys, advisers and representatives");
  const cyprus = priority.getByRole("link", { name: /^GOM-Cyprus,/ });
  await expect(cyprus).toBeHidden();
  await envoys.click();
  await expect(cyprus).toBeVisible();
  await envoys.click();
  await expect(cyprus).toBeHidden();

  const search = page.getByRole("searchbox", {
    name: "Search entities, priority areas or results",
  });
  await search.fill("build trust and pursue a negotiated settlement");
  await expect(cyprus).toBeVisible();
  await expect(cyprus).toHaveAccessibleDescription(/build trust/);
  await expect(priority.locator("details details[open]")).toHaveCount(1);
  await search.clear();
  await expect(priority.locator("details[open]")).toHaveCount(0);
  await priorityHeading.click();
  await envoys.click();
  await cyprus.click();
  await expect(
    page.getByText(/build trust and pursue a negotiated settlement/),
  ).toBeVisible();
  const citation = page.getByRole("link", {
    name: /III\.1, Strategy and external factors/,
  });
  await expect(citation).toHaveAttribute("href", /documents\.un\.org/);
  await expect(citation).toHaveAttribute("target", "_blank");
});

test("public pages share navigation, branded footer and keyboard skip link", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "UN Secretariat Results" }),
  ).toBeVisible();
  const budgetSource = page.getByRole("link", {
    name: "2027 proposed programme budget",
  });
  await expect(budgetSource).toHaveAttribute(
    "href",
    "https://www.un.org/en/ga/fifth/81/ppb2027.shtml",
  );
  await expect(budgetSource).toHaveAttribute("target", "_blank");
  const directorySearch = page.getByRole("searchbox", {
    name: "Search entities, priority areas or results",
  });
  await expect(
    page.locator("main section > details > summary > h2"),
  ).toHaveText([
    "Forging pathways for sustainable development",
    "Fostering peace and security",
    "Propelling African growth",
    "Upholding human rights",
    "Securing humanitarian assistance",
    "Advancing justice and international law",
    "Championing disarmament",
    "Combating drugs, crime and terrorism",
    "Enhancing our operations",
    "Other",
  ]);
  const otherHeading = page.getByRole("heading", {
    name: "Other",
    exact: true,
  });
  const other = page.locator("section").filter({ has: otherHeading });
  await otherHeading.click();
  await expect(other.getByRole("link")).toHaveCount(4);
  await expect(other.getByRole("link", { name: /^IIMA,/ })).toBeVisible();
  await expect(
    other.getByRole("link", {
      name: "Sectoral advisory services",
      exact: true,
    }),
  ).toBeVisible();
  await otherHeading.click();
  await directorySearch.fill("economic commission for africa");
  await expect(
    page.getByRole("link", {
      name: "ECA, Economic Commission for Africa",
      exact: true,
    }),
  ).toHaveCount(1);
  const africanGrowth = page.getByRole("heading", {
    name: "Propelling African growth",
    exact: true,
  });
  await expect(africanGrowth).toBeVisible();
  await expect(
    page.getByText("Development in Africa", { exact: true }),
  ).toBeVisible();
  await expect(
    africanGrowth.locator("../..").getByRole("link", {
      name: "ECA, Economic Commission for Africa",
      exact: true,
    }),
  ).toBeVisible();
  await directorySearch.fill("non-proliferation");
  await expect(
    page.getByRole("heading", { name: "Championing disarmament", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /ODA, Office for Disarmament Affairs/ }),
  ).toBeVisible();
  await directorySearch.fill("");
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "UN Secretariat", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const effectiveFunctioning = page.getByRole("heading", {
    name: "Enhancing our operations",
    exact: true,
  });
  await effectiveFunctioning.click();
  await page
    .locator("section")
    .filter({ has: effectiveFunctioning })
    .getByRole("button", { name: "Show 13 more entities" })
    .click();
  await page
    .getByRole("link", {
      name: "OICT, Office of Information and Communications Technology",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Office of Information and Communications Technology",
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Subprogrammes" })
    .getByRole("link", { name: "SP 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Strategy and technology innovation" }),
  ).toBeVisible();
  for (const name of [
    "Objective",
    "Strategy",
    "Programme performance in 2025",
    "Planned results for 2027",
  ]) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  const budgetReference = page.getByRole("link", {
    name: /^A\/81\/6 \(Sect\. 29C\)/,
  });
  await expect(budgetReference).toHaveAttribute("href", /documents\.un\.org/);
  await expect(budgetReference).toHaveAttribute("target", "_blank");
  await page
    .getByRole("navigation", { name: "Subprogrammes" })
    .getByRole("link", { name: "SP 2", exact: true })
    .click();
  const result = page.getByRole("button", {
    name: /More reliable and stable connectivity for delegates and staff/,
  });
  await result.click();
  const sidecar = page.getByRole("dialog", {
    name: /More reliable and stable connectivity for delegates and staff/,
  });
  await expect(
    sidecar.getByRole("img", { name: /number of Wi-Fi incidents/i }),
  ).toBeVisible();
  await expect(
    sidecar.getByRole("link", { name: /^View budget document/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    sidecar
      .getByRole("link", { name: /^View figure.*in the budget document/ })
      .first(),
  ).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(sidecar).toHaveCount(0);
  await expect(result).toBeFocused();
  const systemLink = header.getByRole("link", {
    name: "UN System",
    exact: true,
  });
  await systemLink.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "UN System" }),
  ).toBeVisible();
  await expect(systemLink).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "United Nations links" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.getByRole("menuitem", { name: "UN Secretariat", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1600, height: 1000 });
  const emblem = await page.locator("header img:visible").first().boundingBox();
  const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
  expect(emblem).not.toBeNull();
  expect(heading).not.toBeNull();
  expect(emblem!.x + emblem!.width).toBeLessThanOrEqual(heading!.x);
});
