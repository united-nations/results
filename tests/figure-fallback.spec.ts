import { test, expect } from "@playwright/test";

async function openResult(
  page: import("@playwright/test").Page,
  title: string,
) {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search all results" });
  await search.fill(title);
  await search.press("Escape");
  await expect(page.locator("li[data-readable]")).toHaveCount(1);
  await page.locator("li[data-readable]").getByRole("button").click();
  return page.getByRole("dialog");
}

test("single-year source figures keep their values visible without inventing a time series", async ({
  page,
}) => {
  const sidebar = await openResult(
    page,
    "United Nations staff and personnel, Member States, job candidates and hiring managers have access to a centralized hub for language and communications skills",
  );
  const data = sidebar.getByRole("table", {
    name: /Number of views and number of active users/,
  });
  await expect(data).toBeVisible();
  await expect(
    data.getByRole("row").filter({ hasText: "Number of views" }),
  ).toContainText("223,521");
  await expect(
    data.getByRole("row").filter({ hasText: "Number of active users" }),
  ).toContainText("85,171");
  await expect(data).toContainText("2025");
  await expect(data).not.toContainText("2024");
});

test("unknown figure categories remain explicit and numeric values are not omitted", async ({
  page,
}) => {
  await page.route("**/data/entities/dppa/overview.json", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const sections = [
      ...data.entity.overview,
      ...data.entity.subprogrammes.flatMap(
        (programme: { sections: unknown[] }) => programme.sections,
      ),
    ];
    for (const section of sections) {
      for (const result of [...section.performance, ...section.planned]) {
        if (
          result.title.includes(
            "enhanced engagement with Member States on the Security Council",
          )
        ) {
          result.figures = [
            {
              label: "Figure 3.I.VII",
              title: "Category preservation control",
              subtitle: "",
              series: [
                {
                  name: "Observed (actual)",
                  percent: true,
                  points: [
                    { category: "", value: 72 },
                    { category: "Unspecified group", value: 26 },
                    { category: "2025", value: 0 },
                    { category: "2026", value: 0 },
                  ],
                },
                {
                  name: "Targets (planned)",
                  percent: true,
                  points: [{ category: "2027", value: 80 }],
                },
              ],
            },
          ];
        }
      }
    }
    await route.fulfill({ response, json: data });
  });
  const sidebar = await openResult(
    page,
    "enhanced engagement with Member States on the Security Council’s work",
  );
  const data = sidebar.getByRole("table", {
    name: "Category preservation control data",
  });
  await expect(
    data.getByRole("row").filter({ hasText: "Unlabelled" }),
  ).toContainText("72%");
  await expect(
    data.getByRole("row").filter({ hasText: "Unspecified group" }),
  ).toContainText("26%");
  await expect(data.getByRole("row").filter({ hasText: "2025" })).toContainText(
    "0%",
  );
  await expect(data.getByRole("row").filter({ hasText: "2026" })).toHaveCount(
    0,
  );
  await expect(data.getByRole("row").filter({ hasText: "2027" })).toContainText(
    "80%",
  );
  await expect(
    sidebar.getByRole("img", { name: /Category preservation control/ }),
  ).toHaveCount(0);
});
