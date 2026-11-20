import { readFile } from "node:fs/promises";
import path from "node:path";
import { test as base } from "@playwright/test";

const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".geojson": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

// Optional production-file interception lets these regressions run without a server.
export const test = base.extend({
  page: async ({ page }, runWithPage) => {
    const directory = process.env.PLAYWRIGHT_STATIC_ROOT;
    if (directory) {
      const root = path.resolve(directory);
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== "results.test") return route.abort();
        const pathname = decodeURIComponent(url.pathname);
        const file = path.resolve(
          root,
          `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`,
        );
        if (!file.startsWith(`${root}${path.sep}`)) return route.abort();
        try {
          await route.fulfill({
            status: 200,
            body: await readFile(file),
            contentType: mime[path.extname(file)] ?? "application/octet-stream",
          });
        } catch {
          await route.fulfill({ status: 404, body: "Not found" });
        }
      });
    }
    await runWithPage(page);
  },
});
export { expect, type Page, type Locator } from "@playwright/test";
