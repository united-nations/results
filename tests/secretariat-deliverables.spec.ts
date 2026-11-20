import { readFileSync } from "node:fs";
import { test, expect, type Page } from "./static-preview";

const snapshot = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/secretariat-deliverables-2027.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const peace = "Maintenance of international peace and security";

async function showDeliverables(page: Page) {
  await page.goto("/");
  await page
    .getByRole("radio", { name: "Deliverables", exact: true })
    .locator("..")
    .click();
  const section = page.getByRole("region", {
    name: "Secretariat deliverables",
    exact: true,
  });
  await expect(section.getByRole("status")).toContainText(
    `${snapshot.records.length} deliverables`,
  );
  return section;
}

test.use({ viewport: { width: 1600, height: 1000 } });

test("deliverables share hierarchy focus, leaf counts and responsive card layout with results", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const section = await showDeliverables(page);
  const area = section
    .getByRole("button", { name: new RegExp(`^(Expand|Collapse) ${peace}$`) })
    .locator("xpath=ancestor::section[1]");
  const count = snapshot.records.filter(
    (item: { priority: string }) => item.priority === peace,
  ).length;
  const explore = area.getByRole("button", {
    name: `Explore all ${count} deliverables in ${peace}`,
    exact: true,
  });
  await explore.focus();
  await page.keyboard.press("Enter");
  await expect(
    area.locator("[data-entity-expanded] h3 button").first(),
  ).toBeFocused();
  const dpo = area.locator('[data-entity-id="dpo"]');
  const entityExplore = dpo.getByRole("button", { name: /^Explore all / });
  await entityExplore.focus();
  await page.keyboard.press("Enter");
  await expect(dpo.locator("article").first()).toBeFocused();
  await expect(dpo).toContainText("Subprogramme 1 · Operations");
  const show = dpo.getByRole("button", { name: /^Show all / }).first();
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(
    dpo
      .getByRole("button", { name: "Show fewer deliverables", exact: true })
      .first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      dpo.locator("article").evaluateAll((cards) =>
        cards.every((card) => {
          const bounds = card.getBoundingClientRect();
          return (
            bounds.width > 150 &&
            [...card.children].every(
              (child) =>
                child.getBoundingClientRect().bottom <= bounds.bottom + 1,
            )
          );
        }),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("deliverable category filter and year selector preserve narrative and actual/planned distinctions", async ({
  page,
}) => {
  const section = await showDeliverables(page);
  await section
    .getByRole("button", { name: "Deliverable category", exact: true })
    .click();
  await expect(page.getByRole("option")).toHaveCount(5);
  await page
    .getByRole("option", { name: /^C\. Substantive deliverables/ })
    .click();
  await page.keyboard.press("Escape");
  const count = snapshot.records.filter(
    (item: { categoryCode: string }) => item.categoryCode === "C",
  ).length;
  await expect(section.getByRole("status")).toContainText(
    `${count} deliverables`,
  );
  await expect(section.locator("article").first()).toContainText(
    "Non-quantified deliverable",
  );
  await section.getByRole("button", { name: /^Deliverable category/ }).click();
  await page
    .getByRole("option", { name: /^C\. Substantive deliverables/ })
    .click();
  await page.keyboard.press("Escape");
  await section
    .getByRole("radio", { name: "No grouping", exact: true })
    .locator("..")
    .click();
  const title =
    "Reports to the Security Council Working Group on Children and Armed Conflict in specific situations";
  await section.getByRole("searchbox").fill(title);
  const card = section.locator("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
  await expect(card).toHaveCount(1);
  await expect(card.locator("p").first()).toHaveText("6");
  await expect(
    card.getByRole("img", { name: "Delivered: 6", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("img", { name: "Planned: 8", exact: true }),
  ).toBeVisible();
  await section
    .getByRole("button", { name: "Deliverables reporting year", exact: true })
    .click();
  await page.getByRole("button", { name: /^2027 · planned$/ }).click();
  await expect(card).toContainText("Planned · 2027");
  await expect(card.getByText("Not reported", { exact: true })).toBeVisible();
});
