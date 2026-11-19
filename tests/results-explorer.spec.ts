import { openOictResult } from "./open-result";
import { test, expect, type Page } from "@playwright/test";
async function selectGrouping(page: Page, value: string) {
  const labels: Record<string, string> = {
    priority: "Group by priority area",
    beneficiary: "Group by beneficiary",
    none: "No grouping",
  };
  await page.getByRole("button", { name: /^Grouping:/ }).click();
  await page
    .getByRole("menuitemradio", { name: labels[value], exact: true })
    .click();
}

test("search survives grouping changes, ungrouped cards are unique, and empty search resets", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search all results" });
  await search.fill("connectivity");
  const tiles = page.locator("li[data-readable]");
  await expect.poll(() => tiles.count()).toBeGreaterThan(0);
  await expect.poll(() => tiles.count()).toBeLessThan(922);
  const count = await tiles.count();
  await selectGrouping(page, "none");
  await expect(tiles).toHaveCount(count);
  await expect(search).toHaveValue("connectivity");
  await expect(
    page.getByRole("radio", { name: "Readable cards" }),
  ).toBeChecked();
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  await expect(page.locator('li[data-readable="false"]')).toHaveCount(count);
  await search.fill("zzzz_no_such_result");
  await expect(
    page.getByText("No results match your search and filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(tiles).toHaveCount(922);
});

test("location filter works while expanded and persists across grouping", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Expand / })
    .first()
    .click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Location", exact: true }).click();
  await page.getByRole("option", { name: /^Global coverage/ }).click();
  await page.keyboard.press("Escape");
  const tiles = page.locator("li[data-readable]");
  await expect.poll(() => tiles.count()).toBeGreaterThan(0);
  await expect.poll(() => tiles.count()).toBeLessThan(922);
  const count = await tiles.count();
  const filtersToggle = page.getByRole("button", {
    name: "Filters (1)",
    exact: true,
  });
  await filtersToggle.click();
  await expect(filtersToggle).toHaveAttribute("aria-expanded", "false");
  await expect(tiles).toHaveCount(count);
  await filtersToggle.click();
  await selectGrouping(page, "none");
  await expect(tiles).toHaveCount(count);
  await expect(
    page.getByRole("button", {
      name: "Remove location filter: Global coverage",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(tiles).toHaveCount(922);
});

test("result sidebar shows related cards, context navigation and sources", async ({
  page,
}) => {
  await openOictResult(page);
  const panel = page.getByRole("dialog");
  await expect(
    panel.getByRole("navigation", { name: "Result context" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: /Entity Office of Information/ }),
  ).toBeVisible();
  const related = panel.getByRole("region", { name: "Related results" });
  await expect(related.getByRole("button").first()).toBeVisible();
  await expect(
    related.getByRole("button", {
      name: /More reliable and stable connectivity/,
    }),
  ).toHaveCount(0);
  await expect(panel.locator('footer[aria-label="Sources"]')).toBeVisible();
  expect(
    await panel
      .locator('footer[aria-label="Sources"]')
      .evaluate((node) => node === node.parentElement?.lastElementChild),
  ).toBe(true);
});

test("priority context boxes open a nested sidebar and preserve beneficiary grouping", async ({
  page,
}) => {
  await page.goto("/beneficiaries/");
  const search = page.getByRole("combobox", { name: "Search all results" });
  await search.fill("connectivity");
  await expect
    .poll(() => page.locator("li[data-readable]").count())
    .toBeLessThan(100);
  await search.press("Escape");
  await page.locator("li[data-readable]").first().getByRole("button").click();
  const resultPanel = page.getByRole("dialog");
  const priorityBox = resultPanel.getByRole("button", {
    name: /^Priority area:/,
  });
  await expect(priorityBox).toBeVisible();
  const priority = (await priorityBox.getAttribute("aria-label"))!.replace(
    "Priority area: ",
    "",
  );
  const sourceGroup = await page
    .locator('section[data-priority-area][data-focused="true"]')
    .getAttribute("data-priority-area");
  await priorityBox.click();
  const priorityPanel = page.getByRole("dialog", {
    name: priority,
    exact: true,
  });
  await expect(
    priorityPanel.getByRole("heading", { name: "Context", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-grouping]")).toHaveAttribute(
    "data-grouping",
    "beneficiary",
  );
  await expect(
    page.locator('section[data-priority-area][data-focused="true"]'),
  ).toHaveAttribute("data-priority-area", sourceGroup!);
  await priorityPanel
    .getByRole("button", { name: "Close priority area", exact: true })
    .click();
  await expect(priorityBox).toBeFocused();
  await resultPanel
    .getByRole("button", { name: "Close result", exact: true })
    .click();
  await expect(search).toHaveValue("connectivity");
  await expect(
    page.getByRole("button", { name: /^Grouping:/ }),
  ).toHaveAttribute("data-grouping", "beneficiary");
});

test("ungrouped compact tiles are visible and neutral, and the budget filter retains its hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await selectGrouping(page, "none");
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  const tiles = page.locator('li[data-readable="false"]');
  await expect(tiles).toHaveCount(922);
  const colors = await tiles.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        border: style.borderColor,
        background: style.backgroundColor,
        width: node.getBoundingClientRect().width,
      };
    }),
  );
  expect(new Set(colors.map((color) => color.border)).size).toBe(1);
  expect(
    colors.every(
      (color) => color.width >= 28 && color.background !== "rgba(0, 0, 0, 0)",
    ),
  ).toBe(true);
  const searchBox = await page
    .getByRole("combobox", { name: "Search all results" })
    .boundingBox();
  const budgetButton = page.getByRole("button", {
    name: "Budget structure",
    exact: true,
  });
  const filtersToggle = page.getByRole("button", {
    name: "Filters",
    exact: true,
  });
  await expect(budgetButton).toBeHidden();
  const filterBox = await filtersToggle.boundingBox();
  const groupingBox = await page
    .getByRole("button", { name: /^Grouping:/ })
    .boundingBox();
  const viewBox = await page
    .getByRole("group", { name: "Card size" })
    .boundingBox();
  expect([
    searchBox!.height,
    filterBox!.height,
    groupingBox!.height,
    viewBox!.height,
  ]).toEqual([36, 36, 36, 36]);
  expect(
    Math.abs(
      searchBox!.y +
        searchBox!.height / 2 -
        filterBox!.y -
        filterBox!.height / 2,
    ),
  ).toBeLessThan(3);
  await filtersToggle.click();
  const pointer = page.locator("[data-filter-pointer]");
  await expect(pointer).toBeVisible();
  const pointerBox = await pointer.boundingBox();
  const toggleBox = await filtersToggle.boundingBox();
  expect(
    Math.abs(
      pointerBox!.x +
        pointerBox!.width / 2 -
        toggleBox!.x -
        toggleBox!.width / 2,
    ),
  ).toBeLessThan(2);
  await budgetButton.click();
  const hierarchy = page.getByRole("list", {
    name: "Budget structure hierarchy",
  });
  await expect(
    hierarchy.getByRole("checkbox", { name: /^Section / }),
  ).toHaveCount(0);
  await hierarchy
    .getByRole("button", { name: /^Expand Part / })
    .first()
    .click();
  await expect(
    hierarchy.getByRole("checkbox", { name: /^Section / }).first(),
  ).toBeVisible();
  await hierarchy
    .getByRole("button", { name: /^Expand Section / })
    .first()
    .click();
  await expect(hierarchy.locator("ul ul").first()).toBeVisible();
  await hierarchy
    .getByRole("checkbox", { name: /^Part / })
    .first()
    .check();
  await page.keyboard.press("Escape");
  await expect.poll(() => tiles.count()).toBeGreaterThan(0);
  await expect.poll(() => tiles.count()).toBeLessThan(922);
});

test("grouping dropdown preserves page scrolling and filters animate without losing selections", async ({
  page,
}) => {
  await page.goto("/");
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  await page.getByRole("button", { name: /^Grouping:/ }).click();
  await expect(
    page.getByRole("menuitemradio", {
      name: "Group by priority area",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(
    width,
  );
  await page.keyboard.press("Escape");
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  const panelId = await filters.getAttribute("aria-controls");
  const panel = page.locator(`[id="${panelId}"]`);
  await filters.click();
  await expect(panel).toHaveAttribute("data-open", "true");
  await expect(
    page.getByRole("button", { name: "Location", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => panel.evaluate((node) => node.getBoundingClientRect().height))
    .toBeGreaterThan(40);
  await filters.click();
  await expect(panel).toHaveAttribute("inert", "");
  await expect
    .poll(() => panel.evaluate((node) => node.getBoundingClientRect().height))
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await filters.click();
  expect(
    await panel.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
});

test("search offers categorical filters while Enter preserves free text and chips remain visible", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search all results" });
  await expect(search).toHaveAttribute(
    "placeholder",
    "Search results or add filters",
  );
  await search.fill("Kenya");
  await expect(
    page.getByRole("option", { name: /^Location · Kenya$/ }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(search).toHaveValue("Kenya");
  await expect(
    page.getByRole("listbox", { name: "Search suggestions" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Remove .* filter:/ }),
  ).toHaveCount(0);
  const searchBounds = await search.boundingBox();
  const countBounds = await page.getByRole("status").boundingBox();
  const filterBounds = await page
    .getByRole("button", { name: "Filters", exact: true })
    .boundingBox();
  expect(countBounds!.x).toBeGreaterThanOrEqual(
    searchBounds!.x + searchBounds!.width,
  );
  expect(countBounds!.x + countBounds!.width).toBeLessThanOrEqual(
    filterBounds!.x,
  );
  await search.fill("Keny");
  await search.press("ArrowDown");
  await expect(page.getByRole("option", { selected: true })).toHaveText(
    /Location · Kenya/,
  );
  await search.press("Enter");
  await expect(search).toHaveValue("");
  const locationChip = page.getByRole("button", {
    name: "Remove location filter: Kenya",
  });
  await expect(locationChip).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters (1)", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: /^Grouping:/ }),
  ).toHaveAttribute("data-grouping", "priority");
  await search.fill("DESA");
  await page.getByRole("option", { name: /^Entity · DESA/ }).click();
  await expect(search).toHaveValue("");
  await expect(locationChip).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Remove budget structure filter: DESA/ }),
  ).toBeVisible();
  await locationChip.click();
  await expect(locationChip).toHaveCount(0);
});
