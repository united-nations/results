import { openOictResult } from "./open-result";
import { test, expect, type Page } from "@playwright/test";

async function chooseLocation(page: Page, name: string) {
  await page.getByRole("button", { name: "Choose a country or area" }).click();
  await page
    .getByRole("searchbox", { name: "Search countries or areas" })
    .fill(name);
  await page.getByRole("button", { name, exact: true }).press("Enter");
}

test("locations distinguish local, multi-location, and global results", async ({
  page,
}) => {
  await page.goto("/locations/");
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
  await expect
    .poll(() =>
      group.locator(":scope > ul > li").evaluateAll((items) =>
        items.every((item) => {
          const bottom = item.getBoundingClientRect().bottom;
          const content = [
            ...item.children,
            item.querySelector("button"),
          ].filter(Boolean) as Element[];
          return content.every(
            (child) => child.getBoundingClientRect().bottom <= bottom + 1,
          );
        }),
      ),
    )
    .toBe(true);
  await group.getByRole("button").first().click();
  await expect(
    page.getByRole("button", { name: "Close result" }),
  ).toBeVisible();
});

test("Secretariat related resources retain their order and announce external tabs", async ({
  page,
}) => {
  await page.goto("/");
  const resources = page.getByRole("region", {
    name: "Related resources",
    exact: true,
  });
  const links = resources.getByRole("link");
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute(
    "href",
    "https://mandates.un.org/",
  );
  await expect(links.nth(1)).toHaveAttribute("href", "https://open.un.org/");
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAccessibleName(/\(opens in new tab\)$/);
  }
});

test("public pages share navigation, branded footer and keyboard skip link", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "UN Secretariat Results" }),
  ).toBeVisible();
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "UN Secretariat", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await header.getByRole("link", { name: "UN System", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "UN System" }),
  ).toBeVisible();
  await page.reload();
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
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.getByRole("menuitem", { name: "UN Secretariat", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("result sidebars retain official figures and citations", async ({
  page,
}) => {
  const result = await openOictResult(page);
  const sidebar = page.getByRole("dialog", {
    name: /More reliable and stable connectivity/,
  });
  await expect(
    sidebar.getByRole("img", { name: /number of Wi-Fi incidents/i }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: /^View budget document/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    sidebar
      .getByRole("link", { name: /^View figure.*in the budget document/ })
      .first(),
  ).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(sidebar).toHaveCount(0);
  await expect(result).toBeFocused();
});

test.describe("touch navigation and search", () => {
  test.use({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
  });

  test("browse, search and open the current mobile views by tapping", async ({
    page,
  }) => {
    await page.goto("/");
    const firstGroup = page.locator("section[data-priority-area]").first();
    await firstGroup.getByRole("button", { name: /^Expand/ }).tap();
    await expect(firstGroup).toHaveAttribute("data-expanded", "true");
    await page.getByRole("button", { name: "Open navigation menu" }).tap();
    await page.getByRole("menuitem", { name: "UN System", exact: true }).tap();
    await expect(page).toHaveURL(/\/un-system\/?$/);

    await page.getByRole("tab", { name: "Country teams", exact: true }).tap();
    await page.getByRole("button", { name: "Choose a country or area" }).tap();
    await page.getByRole("searchbox").fill("Papua New Guinea");
    await page
      .getByRole("button", { name: "Papua New Guinea", exact: true })
      .tap();
    const country = page.getByRole("dialog", { name: "Papua New Guinea" });
    const period = country.getByRole("button", { name: "Select plan period" });
    const title = country.getByRole("heading", { name: "Papua New Guinea" });
    await expect(period).toHaveText("2024–2028");
    const titleBounds = (await title.boundingBox())!;
    expect((await period.boundingBox())!.y).toBeGreaterThanOrEqual(
      titleBounds.y + titleBounds.height,
    );
    await period.tap();
    await page.getByRole("button", { name: "2018–2023", exact: true }).tap();
    await expect(period).toHaveText("2018–2023");
    await country.getByRole("button", { name: "Close country results" }).tap();
    await expect(country).toHaveCount(0);

    await page.getByRole("button", { name: "Open navigation menu" }).tap();
    await page
      .getByRole("menuitem", { name: "UN Secretariat", exact: true })
      .tap();
    const search = page.getByRole("combobox", { name: "Search all results" });
    await search.tap();
    await search.fill(
      "More reliable and stable connectivity for delegates and staff",
    );
    await page.getByRole("option", { name: /^Search results for/ }).tap();
    await expect(search).not.toBeFocused();
    const tile = page.locator("li[data-readable]");
    await expect(tile).toHaveCount(1);
    await expect(tile).toHaveCSS("height", "36px");
    await tile.getByRole("button").tap();
    const result = page.getByRole("dialog", {
      name: /More reliable and stable connectivity/,
    });
    await expect(
      result.getByRole("img", { name: /number of Wi-Fi incidents/i }),
    ).toBeVisible();
    await result.getByRole("button", { name: "Close result" }).tap();
    await expect(result).toHaveCount(0);
  });
});
