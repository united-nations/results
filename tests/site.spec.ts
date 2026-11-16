import { test, expect } from "@playwright/test";

test("Peace and Security clusters are collapsed and searchable", async ({
  page,
}) => {
  await page.goto("/");
  const priority = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Maintenance of international peace and security",
      exact: true,
    }),
  });
  await expect(priority.locator("details")).toHaveCount(3);
  await expect(priority.locator("details[open]")).toHaveCount(0);
  await expect(priority.getByRole("link", { name: /^DPO,/ })).toBeVisible();

  const envoys = priority.getByText("Envoys, advisers and representatives");
  const cyprus = priority.getByRole("link", { name: /^GOM-Cyprus,/ });
  await expect(cyprus).toBeHidden();
  await envoys.click();
  await expect(cyprus).toBeVisible();
  await envoys.click();
  await expect(cyprus).toBeHidden();

  const search = page.getByRole("searchbox", {
    name: "Search priority areas or entities",
  });
  await search.fill("GOM-Cyprus");
  await expect(cyprus).toBeVisible();
  await expect(priority.locator("details")).toHaveCount(1);
  await search.clear();
  await expect(priority.locator("details[open]")).toHaveCount(0);
});

test("public pages share navigation, branded footer and keyboard skip link", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "UN Secretariat" }),
  ).toBeVisible();
  const directorySearch = page.getByRole("searchbox", {
    name: "Search priority areas or entities",
  });
  await directorySearch.fill("economic commission for africa");
  await expect(
    page.getByRole("link", {
      name: "ECA, Economic Commission for Africa",
      exact: true,
    }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Disarmament", exact: true }),
  ).toHaveCount(0);
  await directorySearch.fill("disarmament");
  await expect(
    page.getByRole("heading", { name: "Disarmament", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /ODA, Office for Disarmament Affairs/ }),
  ).toBeVisible();
  await directorySearch.fill("");
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "UN Secretariat", exact: true }),
  ).toHaveAttribute("aria-current", "page");
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
  await expect(
    page.getByRole("link", { name: "A/81/6 (Sect. 29C)", exact: true }),
  ).toHaveAttribute("href", /documents\.un\.org/);
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
