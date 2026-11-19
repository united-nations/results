import { openOictResult } from "./open-result";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const report = JSON.parse(
  readFileSync(
    new URL("../data/priority-area-introductions-2025.json", import.meta.url),
    "utf8",
  ),
) as {
  inspectedCopy: string;
  areas: {
    priority: string;
    pdfPage: number;
    sections: { heading: string; paragraphs: string[] }[];
  }[];
};

test("all nine priority sidebars retain official text, edition, sources and area focus", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  for (const area of report.areas) {
    const group = page
      .locator("section[data-priority-area]")
      .filter({ has: page.locator("h2").filter({ hasText: area.priority }) });
    await group
      .getByRole("button", { name: `Expand ${area.priority}`, exact: true })
      .click();
    const learnMore = group.getByRole("button", {
      name: `Learn more. ${area.priority}`,
      exact: true,
    });
    await learnMore.click();
    const sidebar = page.getByRole("dialog", {
      name: area.priority,
      exact: true,
    });
    await expect(
      sidebar.getByText("Priority area · Annual report 2025", { exact: true }),
    ).toBeVisible();
    for (const section of area.sections) {
      await expect(
        sidebar.getByRole("heading", { name: section.heading, exact: true }),
      ).toBeVisible();
      await expect(
        sidebar.getByText(section.paragraphs[0], { exact: true }),
      ).toBeVisible();
    }
    await expect(
      sidebar.getByRole("link", { name: /^View annual report 2025/ }),
    ).toHaveAttribute("href", `${report.inspectedCopy}#page=${area.pdfPage}`);
    await expect(group).toHaveAttribute("data-focused", "true");
    await expect(group.locator('li[data-muted="true"]')).toHaveCount(0);
    await expect(
      page.locator('section[data-priority-area][data-muted="true"]'),
    ).toHaveCount(
      (await page.locator("section[data-priority-area]").count()) - 1,
    );
    await sidebar
      .getByRole("button", { name: "Close priority area", exact: true })
      .click();
    await expect(learnMore).toBeFocused();
    await expect(group).toHaveAttribute("data-expanded", "true");
    await group
      .getByRole("button", { name: `Collapse ${area.priority}`, exact: true })
      .click();
  }
});

test("priority context box opens from a result sidebar", async ({ page }) => {
  await openOictResult(page);
  const result = page.getByRole("dialog");
  const box = result.getByRole("button", { name: /^Priority area:/ });
  await expect(box).toHaveClass(/rounded-md/);
  await expect(box).toHaveClass(/border/);
  await box.click();
  const priority = page.getByRole("dialog", {
    name: "Effective functioning of the organization",
    exact: true,
  });
  await expect(
    priority.getByRole("heading", {
      name: "Our work and our people",
      exact: true,
    }),
  ).toBeVisible();
  await priority
    .getByRole("button", { name: "Close priority area", exact: true })
    .click();
  await expect(box).toBeFocused();
});
