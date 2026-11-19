import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@un-eosg/ui/components/data-table";
import { typography } from "@un-eosg/ui/typography";
import { BudgetTimeChart } from "@/components/BudgetTimeChart";
import { measureTimeSeries } from "@/lib/budget-time-series";
import { formatBudgetHeading, formatBudgetText } from "@/lib/budget-text";
import type { BudgetResult } from "@/lib/programme-budget";

export function BudgetProse({
  paragraphs,
  headingLevel = 3,
  compact = false,
}: {
  paragraphs: string[];
  headingLevel?: 3 | 4 | 5;
  compact?: boolean;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={`${compact ? typography.body : typography.prose} max-w-[72ch] space-y-4`}
    >
      {formatBudgetText(paragraphs).map((block, index) => {
        if (block.kind === "heading") {
          return (
            <Heading key={index} className={typography.subTitle}>
              {formatBudgetHeading(block.text)}
            </Heading>
          );
        }
        if (block.kind === "list") {
          return (
            <ul
              key={index}
              className="list-disc space-y-2 ps-5 marker:text-un-blue-text"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {item.text}
                  {item.children.length > 0 && (
                    <ul className="mt-2 list-[circle] space-y-2 ps-5">
                      {item.children.map((child, childIndex) => (
                        <li key={childIndex}>{child}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}

type Measure = BudgetResult["measures"][number];

const isMissing = (value: string) => /^[–—-]$/.test(value);
const isNumeric = (value: string) =>
  /^[+-]?(?:\d+|\d{1,3}(?:[,\s]\d{3})+)(?:\.\d+)?\s*%?$/.test(value);

function QualitativeTimeline({ measures }: { measures: Measure[] }) {
  const stages = new Map<
    string,
    { year: number; type: string; values: string[] }
  >();
  for (const measure of measures) {
    const id = `${measure.year}-${measure.type}`;
    const stage = stages.get(id) ?? {
      year: measure.year,
      type: measure.type,
      values: [],
    };
    if (!stage.values.includes(measure.value)) stage.values.push(measure.value);
    stages.set(id, stage);
  }

  return (
    <ol className="max-w-[72ch]">
      {[...stages.values()].map((stage) => (
        <li
          key={`${stage.year}-${stage.type}`}
          className="relative ps-7 pb-5 before:absolute before:start-[5px] before:top-2 before:-bottom-2 before:w-px before:bg-border last:pb-0 last:before:hidden"
        >
          <span
            aria-hidden="true"
            className={`absolute start-0 top-1.5 z-10 size-3 rounded-full border-2 border-un-blue-text ${stage.type === "actual" ? "bg-un-blue-text" : "bg-background"}`}
          />
          <p className={`${typography.numeric} mb-1 font-medium`}>
            {stage.year}
            <span className={`${typography.caption} ms-2 font-normal`}>
              {stage.type === "actual" ? "Actual" : "Planned"}
            </span>
          </p>
          <BudgetProse
            paragraphs={stage.values.map((value) =>
              isMissing(value) ? "No value reported." : value,
            )}
            headingLevel={4}
          />
        </li>
      ))}
    </ol>
  );
}

export function BudgetMeasures({ measures }: { measures: Measure[] }) {
  const groups = new Map<string, Measure[]>();
  for (const measure of measures) {
    const group = groups.get(measure.label) ?? [];
    group.push(measure);
    groups.set(measure.label, group);
  }

  return (
    <div className="space-y-5">
      {[...groups].map(([label, entries]) => {
        const heading = formatBudgetHeading(label);
        const ordered = entries.toSorted(
          (a, b) => a.year - b.year || a.type.localeCompare(b.type),
        );
        const chart = measureTimeSeries(entries);
        const numeric = entries.every(
          ({ value }) => isNumeric(value) || isMissing(value),
        );
        return (
          <section key={label} className="space-y-3 border-t pt-4">
            {label && (groups.size > 1 || !/^Table\s/i.test(label)) && (
              <h3 className={typography.subTitle}>{heading}</h3>
            )}
            {chart ? (
              <BudgetTimeChart
                label={heading || "Performance over time"}
                {...chart}
              />
            ) : numeric ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordered.map(({ year, type, value }, index) => (
                    <TableRow key={index}>
                      <TableCell>{year}</TableCell>
                      <TableCell>
                        {type === "actual" ? "Actual" : "Planned"}
                      </TableCell>
                      <TableCell numeric>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <QualitativeTimeline measures={ordered} />
            )}
          </section>
        );
      })}
    </div>
  );
}
