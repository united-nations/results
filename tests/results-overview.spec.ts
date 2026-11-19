import { readFileSync } from "node:fs";
import { test, expect, type Locator, type Page } from "@playwright/test";
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

const snapshot = JSON.parse(
  readFileSync(new URL("../data/ppb-2027.json", import.meta.url), "utf8"),
);
const tags = JSON.parse(
  readFileSync(
    new URL("../data/oict-result-tags-2027.json", import.meta.url),
    "utf8",
  ),
) as { entity: string; beneficiaries: string[] }[];
const totalResults = snapshot.entities
  .flatMap(
    (entity: {
      overview: { performance: unknown[]; planned: unknown[] }[];
      subprogrammes: {
        sections: { performance: unknown[]; planned: unknown[] }[];
      }[];
    }) => [
      ...entity.overview,
      ...entity.subprogrammes.flatMap((programme) => programme.sections),
    ],
  )
  .reduce(
    (total: number, section: { performance: unknown[]; planned: unknown[] }) =>
      total + section.performance.length + section.planned.length,
    0,
  );
const economicPriority =
  "Promotion of sustained economic growth and sustainable development";
const operationsPriority = "Effective functioning of the organization";

function group(page: Page, name: string) {
  return page
    .locator("section[data-priority-area]")
    .filter({ has: page.locator("h2").filter({ hasText: name }) });
}
function entityGroup(parent: Locator, id: string) {
  return parent.locator(`[data-entity-expanded][data-entity-id="${id}"]`);
}
async function expandGroup(page: Page, name: string) {
  const section = group(page, name);
  await section
    .getByRole("button", { name: `Expand ${name}`, exact: true })
    .click();
  await expect(section).toHaveAttribute("data-expanded", "true");
  return section;
}
async function expandEntity(section: Locator, id: string) {
  const entity = entityGroup(section, id);
  await entity.getByRole("button", { name: /^Expand / }).click();
  await expect(entity).toHaveAttribute("data-entity-expanded", "true");
  return entity;
}

async function settleTiles(page: Page) {
  // Exercise a client action before measuring the server-rendered tiny tiles.
  const section = page.locator("section[data-priority-area]").first();
  const toggle = section
    .locator("h2")
    .getByRole("button", { name: /^(Expand|Collapse) / });
  await toggle.click();
  await expect(section).toHaveAttribute("data-expanded", "true");
  await toggle.click();
  await expect(section).toHaveAttribute("data-expanded", "false");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const tile = document.querySelector<HTMLElement>("li[data-readable]")!;
    await new Promise<void>((resolve) => {
      let previous = "";
      let stableSince = performance.now();
      const sample = () => {
        const rect = tile.getBoundingClientRect();
        const current = `${rect.x},${rect.y},${rect.width},${rect.height}`;
        if (current !== previous) {
          previous = current;
          stableSince = performance.now();
        }
        if (performance.now() - stableSince >= 500) resolve();
        else requestAnimationFrame(sample);
      };
      sample();
    });
  });
}

test.use({ viewport: { width: 1600, height: 1200 } });
let pageErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("grouping includes every result and keeps tile size stable across lenses", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("li[data-readable]")).toHaveCount(totalResults);
  await expect(
    page.getByRole("button", { name: /^Grouping:/ }),
  ).toHaveAttribute("data-grouping", "priority");
  await settleTiles(page);
  const priorityTile = page.locator("li[data-readable]").first();
  await expect
    .poll(() =>
      priorityTile.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(2);
  const prioritySize = await priorityTile.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    color: getComputedStyle(element).borderColor,
  }));
  await selectGrouping(page, "beneficiary");
  const additionalMemberships = tags.reduce(
    (total, row) => total + Math.max(0, new Set(row.beneficiaries).size - 1),
    0,
  );
  await expect(page.locator("li[data-readable]")).toHaveCount(
    totalResults + additionalMemberships,
  );
  const beneficiaryTile = page.locator("li[data-readable]").first();
  await expect
    .poll(() =>
      beneficiaryTile.evaluate(
        (element) => element.getBoundingClientRect().width,
      ),
    )
    .toBeCloseTo(prioritySize.width, 1);
  expect(
    await beneficiaryTile.evaluate(
      (element) => getComputedStyle(element).borderColor,
    ),
  ).not.toBe(prioritySize.color);
  await expect(group(page, "Unclassified")).toBeVisible();
  await expect(
    group(page, "Women and girls").locator("li[data-readable]"),
  ).toHaveCount(
    tags.filter((row) => row.beneficiaries.includes("Women and girls")).length,
  );
});

test("hover cards show full result titles and clicking opens the full result sidebar", async ({
  page,
}) => {
  await page.goto("/");
  const tile = group(page, operationsPriority)
    .locator("li[data-readable]")
    .filter({
      has: page.locator(
        'button[aria-label*="More reliable and stable connectivity for delegates and staff"]',
      ),
    })
    .first();
  await settleTiles(page);
  await tile.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await tile.getByRole("button").hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText(
    "More reliable and stable connectivity for delegates and staff",
  );
  await expect(tooltip).not.toContainText("Subprogramme");
  await tile.getByRole("button").click();
  const panel = page.getByRole("dialog", {
    name: /More reliable and stable connectivity/,
  });
  await expect(
    panel.getByRole("img", { name: /number of Wi-Fi incidents/i }),
  ).toBeVisible();
  await expect(tile).toHaveAttribute("data-highlighted", "true");
  await panel
    .getByRole("button", { name: "Close result", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
  await expect(tile.getByRole("button")).toBeFocused();
});

test("entity zoom keeps headings clear, cards top aligned, and row heights equal", async ({
  page,
}) => {
  await page.goto("/");
  const priority = await expandGroup(page, economicPriority);
  await expandEntity(priority, "desa");
  const cards = priority.locator('li[data-readable="true"]');
  await expect(cards.first()).toBeVisible();
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(200);
  await expect
    .poll(async () => {
      const boxes = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const card = element.getBoundingClientRect();
          const title = element
            .querySelector("button > span > span")!
            .getBoundingClientRect();
          return {
            x: card.x,
            y: card.y,
            width: card.width,
            height: card.height,
            titleTop: title.top - card.top,
          };
        }),
      );
      return (
        boxes.every((box) => box.titleTop >= 10 && box.titleTop <= 14) &&
        boxes.every((box) =>
          boxes
            .filter((other) => Math.abs(other.y - box.y) < 1)
            .every((other) => Math.abs(other.height - box.height) < 1),
        )
      );
    })
    .toBe(true);
  const firstHeading = priority.getByRole("heading", { level: 4 }).first();
  const firstCard = cards.first();
  await expect
    .poll(async () => {
      const title = await firstHeading.boundingBox();
      const card = await firstCard.boundingBox();
      return card!.y > title!.y + title!.height;
    })
    .toBe(true);
});

test("beneficiary slices identify partial entity and subprogramme coverage", async ({
  page,
}) => {
  await page.goto("/beneficiaries/");
  await expect(
    page.getByRole("button", { name: /^Grouping:/ }),
  ).toHaveAttribute("data-grouping", "beneficiary");
  const priority = await expandGroup(page, "Climate and environment");
  const desa = entityGroup(priority, "desa");
  const shown = tags.filter(
    (row) =>
      row.entity === "desa" &&
      row.beneficiaries.includes("Climate and environment"),
  ).length;
  await expect(desa).toContainText(
    new RegExp(
      `Results tagged for Climate and environment.*${shown} of \\d+ results`,
    ),
  );
  await expandEntity(priority, "desa");
  await expect(
    desa.getByRole("button", { name: /View all results for this entity/ }),
  ).toBeVisible();
  await expect(
    desa
      .getByRole("button", { name: /View all results for this subprogramme/ })
      .first(),
  ).toBeVisible();
  await expect(
    desa.getByText(/Results tagged for Climate and environment/).first(),
  ).toBeVisible();
});

test("entity and subprogramme overviews open nested result sidebars and restore focus", async ({
  page,
}) => {
  await page.goto("/");
  const priority = await expandGroup(page, economicPriority);
  const desa = await expandEntity(priority, "desa");
  const learnMore = desa.getByRole("button", {
    name: /Learn more.*Department of Economic and Social Affairs/,
  });
  await learnMore.click();
  const overview = page.getByRole("dialog", {
    name: "Department of Economic and Social Affairs",
    exact: true,
  });
  await expect(
    overview.getByRole("heading", { name: "Subprogrammes", exact: true }),
  ).toBeVisible();
  await overview
    .getByRole("button", { name: /^SP 3 Sustainable development/ })
    .click();
  const programme = page.getByRole("dialog", {
    name: "Sustainable development",
    exact: true,
  });
  await expect(
    programme.getByRole("heading", { name: "Objective", exact: true }),
  ).toBeVisible();
  await programme
    .getByRole("button", { name: /Accelerated progress.*Ocean Conference/ })
    .click();
  const result = page.getByRole("dialog", {
    name: /Accelerated progress.*Ocean Conference/,
  });
  await expect(
    result.getByRole("link", { name: /^View budget document/ }),
  ).toBeVisible();
  await result
    .getByRole("button", { name: "Close result", exact: true })
    .click();
  await expect(programme).toBeVisible();
  await expect(desa).toHaveAttribute("data-focused", "true");
  await programme
    .getByRole("button", { name: "Close overview", exact: true })
    .click();
  await expect(learnMore).toBeFocused();
  await expect(desa).toHaveAttribute("data-entity-expanded", "true");
});

test("muted areas do not preview or activate during the dismissal click", async ({
  page,
}) => {
  await page.goto("/");
  const active = await expandGroup(page, economicPriority);
  const muted = group(page, operationsPriority);
  await expect(muted).toHaveAttribute("inert", "");
  const bounds = await muted.boundingBox();
  await page.mouse.move(bounds!.x + 12, bounds!.y + 12);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.mouse.click(bounds!.x + 12, bounds!.y + 12);
  await expect(active).toHaveAttribute("data-expanded", "false");
  await expect(muted).toHaveAttribute("data-expanded", "false");
});

test("mobile entity headings wrap without card collisions or horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const priority = await expandGroup(page, economicPriority);
  const desa = await expandEntity(priority, "desa");
  await expect(desa).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await expect
    .poll(async () => {
      const heading = await desa.locator("h3").boundingBox();
      const description = await desa.locator(":scope > p").boundingBox();
      return description!.y >= heading!.y + heading!.height;
    })
    .toBe(true);
});

test.describe("results before hydration on a phone", () => {
  test.use({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
    javaScriptEnabled: false,
  });

  test("compact tiles fit inside their groups", async ({ page }) => {
    await page.goto("/beneficiaries/");
    const firstGroup = page.locator("section[data-priority-area]").first();
    const tiles = firstGroup.locator("li[data-readable]");
    await expect(tiles.first()).toHaveCSS("width", "36px");
    expect(
      await firstGroup.evaluate((section) => {
        const group = section.getBoundingClientRect();
        return [...section.querySelectorAll("li[data-readable]")].every(
          (tile) => {
            const { left, right, bottom } = tile.getBoundingClientRect();
            return (
              left >= group.left &&
              right <= group.right &&
              bottom <= group.bottom
            );
          },
        );
      }),
    ).toBe(true);
  });
});

test("global grouping controls work on the first keyboard activation while zoomed", async ({
  page,
}) => {
  await page.goto("/");
  const priority = await expandGroup(page, economicPriority);
  await expandEntity(priority, "desa");
  const beneficiary = page.getByRole("button", { name: /^Grouping:/ });
  await beneficiary.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(beneficiary).toHaveAttribute("data-grouping", "beneficiary");
});

test("a nested result sidebar highlights one exact result when titles are duplicated", async ({
  page,
}) => {
  await page.goto("/");
  const priority = await expandGroup(
    page,
    "Maintenance of international peace and security",
  );
  const entity = await expandEntity(priority, "poe-iran");
  await entity
    .getByRole("button", {
      name: /Learn more.*Panel of Experts on the Islamic Republic of Iran/,
    })
    .click();
  const overview = page.getByRole("dialog", {
    name: "Panel of Experts on the Islamic Republic of Iran",
    exact: true,
  });
  await overview
    .getByRole("button", { name: /Enhanced capacity of the Security Council/ })
    .first()
    .click();
  await expect(page.locator('li[data-highlighted="true"]')).toHaveCount(1);
});
