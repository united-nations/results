import { expect, type Page } from "@playwright/test";

export async function openOictResult(page: Page) {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search all results" });
  await search.fill(
    "More reliable and stable connectivity for delegates and staff",
  );
  await search.press("Escape");
  await expect(page.locator("li[data-readable]")).toHaveCount(1);
  const trigger = page.locator("li[data-readable]").getByRole("button");
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return trigger;
}
