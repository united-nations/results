import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [openRoot = "../open", yearArgument = "2025"] = process.argv.slice(2);
const year = Number(yearArgument);
const revision = execFileSync("git", ["-C", openRoot, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const sourceFile = "public/data/function-expenses.json";
const source = JSON.parse(
  execFileSync("git", ["-C", openRoot, "show", `${revision}:${sourceFile}`], {
    encoding: "utf8",
  }),
);
const annual = source.data.find((item) => item.year === year);
if (!annual) throw new Error(`No function expenditure snapshot for ${year}`);
const definitions = [
  {
    key: "development",
    label: "Development Assistance",
    description: "Activities supporting development in UN programme countries.",
  },
  {
    key: "humanitarian",
    label: "Humanitarian Assistance",
    description:
      "Activities to save lives, alleviate suffering and protect human dignity during emergencies and their aftermath.",
  },
  {
    key: "peace",
    label: "Peace Operations",
    description:
      "United Nations peacekeeping operations and special political missions.",
  },
  {
    key: "global",
    label: "Global Agenda and Specialised Assistance",
    description:
      "Global and regional activities outside the other functions, and support for sustainable development in non-programme countries.",
  },
];
const data = {
  year,
  totalSpending: annual.total,
  source: `https://github.com/united-nations/transparency/blob/${revision}/${sourceFile}`,
  cebSource: source.meta.sourceUrl,
  downloadUrl: source.meta.downloadUrl,
  functions: definitions.map((definition) => ({
    ...definition,
    spending: annual.functions[definition.key] ?? 0,
    share: (annual.functions[definition.key] ?? 0) / annual.total,
  })),
  entities: Object.fromEntries(
    Object.entries(annual.entities).map(([code, spending]) => {
      const ranked = definitions
        .filter(({ key }) => (spending[key] ?? 0) > 0)
        .sort((a, b) => spending[b.key] - spending[a.key]);
      return [code, { primaryFunction: ranked[0]?.key ?? null, spending }];
    }),
  ),
};
writeFileSync(
  `data/system-entity-functions-${year}.json`,
  `${JSON.stringify(data, null, 2)}\n`,
);
console.log(`Prepared CEB function expenditure for ${year}.`);
