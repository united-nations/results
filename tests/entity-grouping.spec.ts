import { test, expect } from "./static-preview";

test("priority sidebars and expanded overview share entity groups and ordering", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  const priority = "Maintenance of international peace and security";
  const group = page.locator(`section[data-priority-area="${priority}"]`);
  await group
    .getByRole("button", { name: `Expand ${priority}`, exact: true })
    .click();
  const entities = group.locator("[data-entity-expanded]");
  await expect(entities.first()).toHaveAttribute("data-entity-id", "dppa");
  await expect(entities.nth(1)).toHaveAttribute("data-entity-id", "dpo");
  const ids = await entities.evaluateAll((elements) =>
    elements.map((el) => el.getAttribute("data-entity-id")),
  );
  const labels = await group.locator("[data-entity-cluster]").allTextContents();
  expect(labels).toContain(
    "Special political missions · Sanctions monitoring and other mechanisms",
  );
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () =>
        group.evaluate((el) =>
          [...el.querySelectorAll<HTMLElement>("[data-entity-cluster]")].every(
            (title) => {
              const next = [
                ...el.querySelectorAll<HTMLElement>("[data-entity-expanded]"),
              ].find(
                (entity) =>
                  entity.getBoundingClientRect().top >
                  title.getBoundingClientRect().top,
              );
              return (
                next &&
                next.getBoundingClientRect().top >=
                  title.getBoundingClientRect().bottom + 8
              );
            },
          ),
        ),
      )
      .toBe(true);
  }
  await group
    .getByRole("button", { name: `Learn more. ${priority}`, exact: true })
    .click();
  const sidebar = page.getByRole("dialog");
  const region = sidebar.getByRole("region", {
    name: "Entities in this priority area",
  });
  await expect(region.locator("li[data-entity-id]").first()).toHaveAttribute(
    "data-entity-id",
    "dppa",
  );
  const sidebarIds = await region
    .locator("li[data-entity-id]")
    .evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("data-entity-id")),
    );
  expect(sidebarIds.filter((id) => ids.includes(id))).toEqual(ids);
  expect(await region.locator("h3").allTextContents()).toEqual(labels);
  await region.locator('[data-entity-id="dppa"]').getByRole("button").click();
  await expect(
    page.getByRole("dialog").getByRole("heading", {
      name: "Department of Political and Peacebuilding Affairs",
      exact: true,
    }),
  ).toBeVisible();
});

test("Ethics Office is standalone before the offices group in both views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page
    .getByRole("radio", { name: "Compact tiles", exact: true })
    .locator("..")
    .click();
  const priority = "Effective functioning of the organization";
  const group = page.locator(`section[data-priority-area="${priority}"]`);
  await group
    .getByRole("button", { name: `Expand ${priority}`, exact: true })
    .click();
  const ethics = group.locator('[data-entity-expanded][data-entity-id="eo"]');
  const offices = group.locator('[data-entity-cluster="offices-away"]');
  await expect
    .poll(
      async () =>
        (await ethics.boundingBox())!.y + (await ethics.boundingBox())!.height <
        (await offices.boundingBox())!.y,
    )
    .toBe(true);
  const ids = await group
    .locator("[data-entity-expanded]")
    .evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("data-entity-id")),
    );
  expect(ids.indexOf("eo")).toBeLessThan(ids.indexOf("unog"));
  expect(
    await offices.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThan(
    await ethics
      .getByText("Ethics Office", { exact: false })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  await group
    .getByRole("button", { name: `Learn more. ${priority}`, exact: true })
    .click();
  const region = page
    .getByRole("dialog")
    .getByRole("region", { name: "Entities in this priority area" });
  await expect(
    region.locator('[data-entity-cluster="individuals"] [data-entity-id="eo"]'),
  ).toBeVisible();
  await expect(
    region.locator(
      '[data-entity-cluster="offices-away"] [data-entity-id="eo"]',
    ),
  ).toHaveCount(0);
  const sidebarIds = await region
    .locator("li[data-entity-id]")
    .evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("data-entity-id")),
    );
  expect(sidebarIds.filter((id) => ids.includes(id))).toEqual(ids);
});
