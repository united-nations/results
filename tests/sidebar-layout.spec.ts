import { openOictResult } from "./open-result";
import { test, expect } from "@playwright/test";

test("result context reflows and the full sidebar scrolls beneath its sticky header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await openOictResult(page);
  const dialog = page.getByRole("dialog");
  const context = dialog.getByRole("navigation", { name: "Result context" });
  await expect(
    context.getByRole("button", { name: /^Priority area:/ }),
  ).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const boxes = await context.locator(":scope > *").evaluateAll((elements) =>
      elements.map((element) => {
        const r = element.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, bottom: r.bottom };
      }),
    );
    expect(boxes).toHaveLength(3);
    expect(await context.locator(":scope > *").allTextContents()).toEqual([
      expect.stringContaining("Priority area"),
      expect.stringContaining("Entity"),
      expect.stringContaining("Subprogramme"),
    ]);
    for (const [index, box] of boxes.entries()) {
      expect(box.width).toBeCloseTo(boxes[0].width, 0);
      if (width === 390) {
        expect(box.left).toBeCloseTo(boxes[0].left, 0);
        if (index > 0) expect(box.top).toBeGreaterThan(boxes[index - 1].bottom);
      } else {
        expect(box.top).toBeCloseTo(boxes[0].top, 0);
        expect(box.bottom).toBeCloseTo(boxes[0].bottom, 0);
      }
    }
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  const order = await context.evaluate((el) => ({
    followsRelated: Boolean(
      el.previousElementSibling?.matches('[aria-label="Related results"]'),
    ),
    precedesSources: Boolean(
      el.nextElementSibling?.matches('[aria-label="Sources"]'),
    ),
  }));
  expect(order).toEqual({ followsRelated: true, precedesSources: true });
  await expect(dialog.getByRole("link", { name: /^View all/ })).toHaveCount(0);
  const header = dialog.locator("header");
  const top = (await header.boundingBox())!.y;
  await dialog.evaluate((el) => {
    el.scrollTop = 250;
  });
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect((await header.boundingBox())!.y).toBeCloseTo(top, 0);
  expect(await dialog.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
    "auto",
  );
  expect(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).scrollbarGutter),
  ).toBe("auto");
  expect(
    await dialog.evaluate((el) =>
      Math.abs(el.getBoundingClientRect().right - innerWidth),
    ),
  ).toBeLessThan(1);
  await dialog
    .getByRole("button", { name: "Close result", exact: true })
    .click();
  await expect(page.locator("html")).toHaveCSS("scrollbar-gutter", "stable");
});

test("compact tiles stay the same clickable size across viewport sizes and grouping modes", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [1920, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const tile = page.locator("section[data-priority-area] li").first();
    await expect
      .poll(async () => Math.round((await tile.boundingBox())!.width))
      .toBe(28);
    expect(Math.round((await tile.boundingBox())!.height)).toBe(28);
  }
  await page.getByRole("button", { name: /^Grouping:/ }).click();
  await page
    .getByRole("menuitemradio", { name: "No grouping", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  const tile = page.locator('li[data-readable="false"]').first();
  await expect
    .poll(async () => Math.round((await tile.boundingBox())!.width))
    .toBe(28);
  expect(Math.round((await tile.boundingBox())!.height)).toBe(28);
});

test("context cards open nested entity and subprogramme sidebars without navigating", async ({
  page,
}) => {
  await openOictResult(page);
  const originalUrl = page.url();
  let dialog = page.getByRole("dialog");
  const entity = dialog
    .getByRole("navigation", { name: "Result context" })
    .getByRole("button", { name: /^Entity / });
  await entity.click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Entity overview", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Open full overview page" }),
  ).toHaveCount(0);
  expect(page.url()).toBe(originalUrl);
  await dialog
    .getByRole("button", { name: "Close overview", exact: true })
    .click();
  await expect(entity).toBeFocused();
  await page
    .getByRole("dialog")
    .getByRole("navigation", { name: "Result context" })
    .getByRole("button", { name: /^Subprogramme / })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /OICT overview/ }),
  ).toBeVisible();
  const parents = page
    .getByRole("dialog")
    .getByRole("navigation", { name: "Overview context" });
  await expect(parents.getByRole("button")).toHaveCount(2);
  await parents.getByRole("button", { name: /^Priority area:/ }).click();
  const priority = page.getByRole("dialog");
  const entities = priority.getByRole("region", {
    name: "Entities in this priority area",
  });
  await expect(
    entities.getByRole("button", { name: /^Entity Office of Information/ }),
  ).toBeVisible();
  const response = await page.request.get("/data/priority-entities.json");
  const catalog = (await response.json()) as { priority: string | null }[];
  await expect(entities.getByRole("button")).toHaveCount(
    catalog.filter(
      (e) => e.priority === "Effective functioning of the organization",
    ).length,
  );
  await entities
    .getByRole("button", { name: /^Entity Office of Information/ })
    .click();
  const entityParents = page
    .getByRole("dialog")
    .getByRole("navigation", { name: "Overview context" });
  await expect(entityParents.getByRole("button")).toHaveCount(1);
  expect(
    await entityParents
      .getByRole("button")
      .evaluate(
        (el) =>
          el.getBoundingClientRect().width <=
          el.parentElement!.getBoundingClientRect().width / 2 + 1,
      ),
  ).toBe(true);
  expect(page.url()).toBe(originalUrl);
});
