import { test, expect } from "@playwright/test";

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

  const more = priority.getByRole("button", { name: "Show 4 more" });
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
    name: "Search priority areas or entities",
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
    name: "Search priority areas or entities",
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
  await expect(
    page.getByRole("heading", {
      name: "Propelling African growth",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Development in Africa", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Forging pathways for sustainable development",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Championing disarmament", exact: true }),
  ).toHaveCount(0);
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
    .getByRole("button", { name: "Show 13 more" })
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
