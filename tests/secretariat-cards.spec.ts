import { test, expect } from "./static-preview";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type ResultSection = { performance: unknown[]; planned: unknown[] };
const snapshot = JSON.parse(
  readFileSync(new URL("../data/ppb-2027.json", import.meta.url), "utf8"),
) as {
  entities: {
    mainPriority: string | null;
    overview: ResultSection[];
    subprogrammes: { sections: ResultSection[] }[];
  }[];
};

const peace = "Maintenance of international peace and security";
const economic =
  "Promotion of sustained economic growth and sustainable development";
const group = (page: Page, name: string) =>
  page.locator(`section[data-priority-area="${name}"]`);

test.use({ viewport: { width: 1600, height: 1100 } });

test("large previews count every matching result and retain keyboard focus through exploration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("radio", { name: "Readable cards", exact: true }),
  ).toBeChecked();
  const area = group(page, peace);
  await expect(area.locator('li[data-readable="true"]')).toHaveCount(3);
  const explore = area.getByRole("button", {
    name: /^Explore all \d+ results in Maintenance/,
  });
  const total = Number(
    (await explore.getAttribute("aria-label"))!.match(/all (\d+)/)![1],
  );
  const expected = snapshot.entities
    .filter((entity) => entity.mainPriority === peace)
    .flatMap((entity) => [
      ...entity.overview,
      ...entity.subprogrammes.flatMap((programme) => programme.sections),
    ])
    .reduce(
      (sum, section) =>
        sum + section.performance.length + section.planned.length,
      0,
    );
  expect(total).toBe(expected);
  await explore.focus();
  await page.keyboard.press("Enter");
  await expect(area).toHaveAttribute("data-expanded", "true");
  await expect(
    area.locator("[data-entity-expanded] h3 button").first(),
  ).toBeFocused();
  const dpo = area.locator('[data-entity-expanded][data-entity-id="dpo"]');
  const entityExplore = dpo.getByRole("button", { name: /^Explore all / });
  await entityExplore.focus();
  await page.keyboard.press("Enter");
  await expect(dpo).toHaveAttribute("data-focused", "true");
  await expect(area).toHaveAttribute("data-context", "true");
  await expect(
    dpo.locator('li[data-readable="true"] button').first(),
  ).toBeFocused();
  await expect(dpo).toContainText("DPO · 1 location");
  await expect(group(page, economic)).toHaveAttribute("data-muted", "true");
  expect(
    await dpo.evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  expect(
    await area.evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  await dpo
    .getByRole("button", { name: /^Collapse Department of Peace Operations$/ })
    .click();
  await expect(area).toHaveAttribute("data-context", "false");
  await page.getByRole("button", { name: /^Grouping:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "No grouping", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Readable cards", exact: true }),
  ).toBeChecked();
  const show = page.getByRole("button", {
    name: /^Show all \d+ results in All matching results$/,
  });
  const all = Number(
    (await show.getAttribute("aria-label"))!.match(/all (\d+)/)![1],
  );
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('li[data-readable="true"]')).toHaveCount(all);
  await expect(
    page.locator('li[data-readable="true"] button').nth(3),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Show fewer results", exact: true })
    .click();
  await expect(page.locator('li[data-readable="true"]')).toHaveCount(3);
  await expect(show).toBeFocused();
  expect(errors).toEqual([]);
});

test("compact zoom keeps full large cards and their metadata inside each subprogramme at every width", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  const area = group(page, peace);
  await area
    .getByRole("button", { name: `Expand ${peace}`, exact: true })
    .click();
  const dpo = area.locator('[data-entity-expanded][data-entity-id="dpo"]');
  await dpo
    .getByRole("button", {
      name: "Expand Department of Peace Operations",
      exact: true,
    })
    .click();
  await expect(area).toHaveAttribute("data-context", "true");
  for (const width of [1600, 1000, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () =>
        area.evaluate((element) => {
          const cards = [
            ...element.querySelectorAll<HTMLElement>(
              'li[data-readable="true"]',
            ),
          ];
          const headings = [...element.querySelectorAll<HTMLElement>("h4")].map(
            (heading) => heading.getBoundingClientRect(),
          );
          return (
            cards.length > 0 &&
            cards.every((card) => {
              const box = card.getBoundingClientRect();
              const footer =
                card.querySelector("abbr")?.parentElement?.parentElement;
              const content = card.querySelector("button > span");
              const nextHeading = headings.find(
                (heading) => heading.top > box.top + 1,
              );
              return (
                box.width > 150 &&
                (!footer ||
                  footer.getBoundingClientRect().bottom <= box.bottom + 1) &&
                (!content ||
                  content.getBoundingClientRect().bottom <= box.bottom + 1) &&
                (!nextHeading || box.bottom < nextHeading.top)
              );
            }) &&
            document.documentElement.scrollWidth <= window.innerWidth
          );
        }),
      )
      .toBe(true);
  }
  const card = area.locator('li[data-readable="true"] button').first();
  await card.click();
  const dialog = page.getByRole("dialog").last();
  await expect(
    dialog.getByRole("region", { name: "Related results" }),
  ).toContainText("DPO");
  await expect(
    dialog.getByRole("region", { name: "Related results" }),
  ).toContainText(/location|Global reach/);
  await dialog
    .getByRole("button", { name: "Close result", exact: true })
    .click();
  await expect(card).toBeFocused();
  expect(errors).toEqual([]);
});

test("beneficiary context stays on the selected group and mobile previews remain one row", async ({
  page,
}) => {
  await page.goto("/beneficiaries/");
  const area = group(page, "Women and girls");
  await area
    .getByRole("button", { name: "Expand Women and girls", exact: true })
    .click();
  const entity = area.locator("[data-entity-expanded]").first();
  await entity.locator("h3 button").first().click();
  await entity
    .getByRole("button", { name: /^View all results for this entity\./ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(area).toHaveAttribute("data-focused", "true");
  await expect(area).toHaveAttribute("data-muted", "false");
  await page
    .getByRole("button", { name: "Close overview", exact: true })
    .click();
  await page.setViewportSize({ width: 360, height: 800 });
  await area
    .getByRole("button", { name: "Collapse Women and girls", exact: true })
    .click();
  await expect(area.locator('li[data-readable="true"]')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
