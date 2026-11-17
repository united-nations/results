import { readFileSync, writeFileSync } from "node:fs";
import { DataENG } from "../data/oict/DataENG.js";
import { CountryNamesENG } from "../data/oict/CountryNames.js";

const data = (name) => new URL(`../data/${name}.json`, import.meta.url);
const snapshot = JSON.parse(readFileSync(data("ppb-2027")));
const normalizeTitle = (value) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const key = (symbol, kind) =>
  `${symbol.replace(/\s+/g, "").toLowerCase()}|${kind}`;

// OICT shortened these titles. Limit prefix matching to the reviewed rows and
// still require the same entity, document, result type and unique budget title.
const shortened = new Set([4, 162, 205, 775, 779, 787]);
// Headings were edited in the issued fascicles. These pairs were checked
// against the same office, source document, and result type.
const issuedTitles = new Map([
  [
    8,
    "Strengthened commitment of the private sector to protecting children from violence in the context of travel and tourism",
  ],
  [
    11,
    "Peer learning among Member States accelerates action to end violence against children",
  ],
  [
    13,
    "One United Nations coordinated approach to more effectively address sexual exploitation and abuse",
  ],
  [
    20,
    "Improved capabilities in tracking cases filed with the United Nations Dispute Tribunal",
  ],
  [
    31,
    "Safeguarding lives and livelihoods amid the long-term socioeconomic impacts of crises",
  ],
  [
    607,
    "Enhanced support for victims through the leveraging of the diverse experiences and knowledge of Victims’ Rights Officers in peacekeeping, humanitarian and development contexts",
  ],
]);
const candidates = Map.groupBy(
  snapshot.entities.flatMap((entity) =>
    [
      ...entity.overview,
      ...entity.subprogrammes.flatMap((programme) => programme.sections),
    ].flatMap((section) =>
      ["performance", "planned"].flatMap((kind) =>
        section[kind].map(({ title }) => ({
          entity: entity.id,
          code: entity.code,
          symbol: section.symbol,
          kind,
          title,
        })),
      ),
    ),
  ),
  ({ symbol, kind }) => key(symbol, kind),
);
const areas = ({ ISO2 }) =>
  [
    ...new Set(
      String(ISO2 ?? "")
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ].sort();
const globalRow = DataENG.find((row) => areas(row).length === 217);
if (!globalRow) throw new Error("The OICT global map tag set has changed.");
const globalAreas = areas(globalRow).join(",");
const unmatched = [];
const matched = [];
const used = new Set();
for (const row of DataENG) {
  const kind = row.Type === 2025 ? "performance" : "planned";
  const symbol = new URL(row.URL).searchParams.get("s");
  const title = normalizeTitle(row.Title);
  const scope = candidates.get(key(symbol, kind)) ?? [];
  let hits = scope.filter((item) => normalizeTitle(item.title) === title);
  const issuedTitle = issuedTitles.get(row.ID);
  if (hits.length === 0 && (issuedTitle || shortened.has(row.ID))) {
    hits = scope.filter((item) => {
      if (normalizeTitle(item.code ?? "") !== normalizeTitle(row.Entity))
        return false;
      const budgetTitle = normalizeTitle(item.title);
      return issuedTitle
        ? budgetTitle === normalizeTitle(issuedTitle)
        : budgetTitle.startsWith(`${title} `);
    });
  }
  const [hit] = hits;
  if (hits.length !== 1 || used.has(hit)) {
    unmatched.push(row.ID);
    continue;
  }
  used.add(hit);
  const codes = areas(row);
  matched.push({
    id: row.ID,
    entity: hit.entity,
    symbol: hit.symbol,
    kind,
    title: hit.title,
    beneficiaries: [
      ...new Set(
        [row.Beneficiary, row.BeneficiaryTwo]
          .map((value) => value?.trim())
          .filter(Boolean),
      ),
    ],
    locations: codes.join(",") === globalAreas ? "global" : codes,
  });
}
writeFileSync(data("oict-result-tags-2027"), JSON.stringify(matched) + "\n");
console.log(
  `Matched ${matched.length} of ${DataENG.length}. Unmatched OICT IDs: ${unmatched.join(", ")}`,
);

const [openLocations, isoCodes] = process.argv.slice(2);
if (openLocations || isoCodes) {
  if (!openLocations || !isoCodes)
    throw new Error(
      "Provide both the Open UN geographic export and ISO 3166-1 file.",
    );
  const iso = JSON.parse(readFileSync(isoCodes))["3166-1"];
  const alpha2 = new Map(iso.map((row) => [row.alpha_3, row.alpha_2]));
  const reference = new Map(
    JSON.parse(readFileSync(openLocations))
      .filter((row) => row.level === "country" && alpha2.has(row.iso3))
      .map(({ iso3, name, lat, long }) => [
        alpha2.get(iso3),
        { name, lat, long },
      ]),
  );
  const display = new Intl.DisplayNames(["en"], {
    type: "region",
    fallback: "none",
  });
  for (const [code, name] of Object.entries(CountryNamesENG)) {
    if (!reference.has(code) && name.trim())
      reference.set(code, { name: display.of(code) ?? name });
  }
  const baseMap = JSON.parse(
    readFileSync(new URL("../public/data/world-map.geojson", import.meta.url)),
  );
  const isoAlpha2 = new Set(iso.map((row) => row.alpha_2));
  for (const {
    properties: { ISO2: code, NAME: name },
  } of baseMap.features) {
    if (!/^[A-Z]{2}$/.test(code) || code === "AQ" || reference.has(code))
      continue;
    reference.set(code, {
      name: (isoAlpha2.has(code) && display.of(code)) || name,
    });
  }
  writeFileSync(
    data("result-locations"),
    JSON.stringify(Object.fromEntries([...reference].sort()), null, 2) + "\n",
  );
}
