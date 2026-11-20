import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const snapshot = JSON.parse(readFileSync("data/system-entities.json", "utf8"));
const functions = JSON.parse(
  readFileSync("data/system-entity-functions-2025.json", "utf8"),
);
const percent = (amount: number) =>
  new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(amount / snapshot.totalSpending);

test("pillars partition all goals, show their actual spending shares, and open one at a time", async ({
  page,
}) => {
  await page.goto("/system/");
  const directory = page.getByRole("region", {
    name: "UN system entities",
    exact: true,
  });
  await directory.getByText("By pillar", { exact: true }).click();
  const reference = [
    { name: "People", goals: [1, 2, 3, 4, 5] },
    { name: "Planet", goals: [6, 12, 13, 14, 15] },
    { name: "Prosperity", goals: [7, 8, 9, 10, 11] },
    { name: "Peace", goals: [16] },
    { name: "Partnership", goals: [17] },
    { name: "Other", goals: [0] },
  ]
    .map((pillar) => ({
      ...pillar,
      spending: snapshot.goals
        .filter((goal: { number: number }) =>
          pillar.goals.includes(goal.number),
        )
        .reduce(
          (sum: number, goal: { spending: number }) => sum + goal.spending,
          0,
        ),
    }))
    .sort((a, b) => b.spending - a.spending);
  const headers = directory.locator('button[id^="pillar-"][id$="-heading"]');
  await expect(headers).toHaveCount(6);
  expect(
    await headers.evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(
    reference.map((pillar) => `pillar-${pillar.name.toLowerCase()}-heading`),
  );
  for (const pillar of reference) {
    const id = `pillar-${pillar.name.toLowerCase()}`;
    const header = directory.locator(`#${id}-heading`);
    await expect(header).toContainText(percent(pillar.spending));
    await header.click();
    await expect(
      directory.locator('button[id^="pillar-"][aria-expanded="true"]'),
    ).toHaveCount(1);
    const content = directory.locator(`#${id}-content`);
    expect(
      await content
        .locator('button[id^="sdg-"][id$="-heading"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => Number(node.id.split("-")[1])),
        ),
    ).toEqual(pillar.goals);
  }
  await directory.getByText("Expenditure", { exact: true }).click();
  expect(
    await headers.evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(
    reference.map((pillar) => `pillar-${pillar.name.toLowerCase()}-heading`),
  );
});

test("function view assigns every displayed entity once and retains secondary contributions", async ({
  page,
}) => {
  await page.goto("/system/");
  const directory = page.getByRole("region", {
    name: "UN system entities",
    exact: true,
  });
  await directory.getByText("By function", { exact: true }).click();
  const expectedEntities = new Set(
    snapshot.entities.map((entity: { code: string }) => entity.code),
  );
  const seen: string[] = [];
  for (const item of functions.functions) {
    const header = directory.locator(`#function-${item.key}-heading`);
    await expect(header).toContainText(percent(item.spending));
    await header.click();
    const content = directory.locator(`#function-${item.key}-content`);
    const primary = snapshot.entities.filter(
      (entity: { code: string }) =>
        functions.entities[entity.code].primaryFunction === item.key,
    );
    await expect(content.getByRole("article")).toHaveCount(primary.length);
    for (const entity of primary) {
      await expect(
        content.getByRole("article", { name: entity.name, exact: true }),
      ).toBeVisible();
      seen.push(entity.code);
    }
    const secondary = snapshot.entities.filter(
      (entity: { code: string }) =>
        functions.entities[entity.code].primaryFunction !== item.key &&
        (functions.entities[entity.code].spending[item.key] ?? 0) > 0,
    );
    if (secondary.length) {
      const disclosure = content
        .locator("details")
        .filter({
          has: page.locator(":scope > summary", {
            hasText: /^Other contributing entities/,
          }),
        })
        .first();
      await disclosure.locator("summary").first().click();
      await expect(disclosure).toContainText("largest function allocation");
      await disclosure.locator("summary").first().click();
    }
  }
  expect(new Set(seen)).toEqual(expectedEntities);
  expect(seen.length).toBe(expectedEntities.size);
});

test("underlined search opens matching entities across all three grouping views and handles empty results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/system/");
  const directory = page.getByRole("region", {
    name: "UN system entities",
    exact: true,
  });
  const search = directory.getByRole("searchbox", {
    name: "Search entities and groups",
  });
  expect(
    await search.evaluate((node) => getComputedStyle(node).borderTopWidth),
  ).toBe("0px");
  expect(
    await search.evaluate((node) => getComputedStyle(node).borderBottomWidth),
  ).toBe("1px");
  await search.fill("wfp");
  await expect(
    directory.getByRole("article", {
      name: "World Food Programme",
      exact: true,
    }),
  ).toBeVisible();
  await directory.getByText("By pillar", { exact: true }).click();
  await expect(
    directory.locator('button[id^="pillar-"][aria-expanded="true"]'),
  ).toHaveCount(1);
  await expect(
    directory.getByRole("article", {
      name: "World Food Programme",
      exact: true,
    }),
  ).toBeVisible();
  for (const label of ["By function", "By System Chart"]) {
    await directory.getByText(label, { exact: true }).click();
    await expect(search).toHaveValue("wfp");
    await expect(
      directory.getByRole("article", {
        name: "World Food Programme",
        exact: true,
      }),
    ).toBeVisible();
  }
  await search.fill("no-such-entity-xyz");
  await expect(
    directory.getByText("No matching groups or entities.", { exact: true }),
  ).toBeVisible();
  await directory
    .getByRole("button", { name: "Clear search", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(
    directory.locator('button[id^="category-"][id$="-heading"]'),
  ).toHaveCount(snapshot.categories.length);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
