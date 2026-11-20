import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Keep discovery separate from reviewed framework matches: refreshing the
// listing must never attach a document to a plan based on country alone.
const output = resolve(process.argv[2] ?? "/tmp/unct-evaluation-listing.json");
const sourceURL = (page) => {
  const url = new URL("https://unsdg.un.org/resources/unct-key-documents");
  url.searchParams.set("f[0]", "country_document_type_api:Eval");
  url.searchParams.set("page", String(page));
  return url.href;
};
const result = {
  overviewURL: sourceURL(0),
  retrievedAt: new Date().toISOString(),
  filter: "country_document_type_api:Eval",
  pagination: { expectedCount: null, pagesVisited: [], complete: false },
  records: [],
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (let index = 0; ; index++) {
    const url = sourceURL(index);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    if (response?.status() !== 200)
      throw new Error(`Listing page ${index} returned ${response?.status()}`);
    const parsed = await page.evaluate(() => ({
      title: document.title,
      pager: document.querySelector("nav.pager")?.textContent,
      next: document
        .querySelector('nav.pager a[rel="next"]')
        ?.getAttribute("href"),
      records: [...document.querySelectorAll(".views-row")].map((row) => {
        const links = [...row.querySelectorAll("a[href]")];
        return {
          listingTitle:
            links.find((link) => link.textContent.trim())?.textContent.trim() ??
            null,
          reportURL: links[0]?.href ?? null,
          country:
            row
              .querySelector("div.text-gray-500.text-lg")
              ?.textContent.trim() ?? null,
          publicationDate:
            row.querySelector("div.text-xs")?.textContent.trim() ?? null,
        };
      }),
    }));
    const count = parsed.pager?.match(
      /Showing\s+(\d+)\s+to\s+(\d+)\s+from\s+(\d+)/,
    );
    if (!parsed.title.includes("UNCT Key Documents") || !count)
      throw new Error(`Unexpected listing structure on page ${index}`);
    const [, first, last, total] = count.map(Number);
    result.pagination.expectedCount ??= total;
    if (
      total !== result.pagination.expectedCount ||
      first !== result.records.length + 1 ||
      last - first + 1 !== parsed.records.length ||
      parsed.records.some(
        (record) =>
          !record.reportURL ||
          !record.country ||
          record.country === record.listingTitle,
      )
    )
      throw new Error(`Incomplete or changing listing on page ${index}`);
    result.pagination.pagesVisited.push({
      page: index,
      url,
      status: response.status(),
      firstItem: first,
      lastItem: last,
      total,
      next: parsed.next ?? null,
      htmlSha256: createHash("sha256")
        .update(await page.content())
        .digest("hex"),
    });
    for (const record of parsed.records)
      result.records.push({
        ...record,
        recordIndex: result.records.length,
        listingPage: index,
        sourceListingURL: url,
      });
    if (!parsed.next) {
      if (last !== total) throw new Error("Pagination ended before final item");
      break;
    }
    const expectedNext = new URL(sourceURL(index + 1));
    const actualNext = new URL(parsed.next, url);
    if (actualNext.href !== expectedNext.href)
      throw new Error(`Unexpected next-page link: ${actualNext.href}`);
  }
  result.pagination.complete = true;
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await rename(temporary, output);
  console.log(`Saved ${result.records.length} listings to ${output}`);
} finally {
  await browser.close();
}
