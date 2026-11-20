"use client";

import { useId, useState, type CSSProperties } from "react";
import { Button } from "@un-eosg/ui/components/button";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { FilterPopover } from "@un-eosg/ui/components/filter-popover";
import {
  FinancialPanelBar,
  FinancialPanelPeriodSelector,
} from "@un-eosg/ui/components/financial-panel-parts";
import { typography } from "@un-eosg/ui/typography";
import { usePublicJson } from "@/hooks/usePublicJson";
import { priorityAreaColors } from "@/lib/priority-area-colors";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import {
  AnimatedResultsContent,
  HierarchyPreview,
  OverviewEntityHeading,
  OverviewGroupHeading,
} from "@/components/SecretariatHierarchy";
import styles from "./ResultsOverview.module.css";

type Observation = {
  year: number;
  measure: string;
  value: number | null;
  raw: string;
  note: string;
};
type Deliverable = {
  id: string;
  kind: "numeric" | "narrative";
  title: string;
  description: string;
  unit: string;
  entity: { id: string; name: string; code: string | null };
  priority: string;
  programme: string;
  category: string;
  categoryCode: string;
  hierarchy: string;
  table: string;
  symbol: string;
  observations: Observation[];
  source: string;
  attribution: string;
};
type Snapshot = { edition: number; records: Deliverable[] };
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

function DeliverableCard({ item, year }: { item: Deliverable; year: number }) {
  const actual = item.observations.find(
    (entry) => entry.year === year && entry.measure === "actual",
  );
  const planned = item.observations.find(
    (entry) => entry.year === year && entry.measure === "planned",
  );
  const headline =
    actual?.value != null
      ? actual
      : planned?.value != null
        ? planned
        : (actual ?? planned);
  const maximum = Math.max(1, actual?.value ?? 0, planned?.value ?? 0);
  return (
    <article
      tabIndex={-1}
      className="flex h-full min-h-52 min-w-0 flex-col rounded-[5px] border bg-background p-3"
      style={{
        borderColor:
          "color-mix(in srgb, var(--tile-color) 55%, var(--background))",
      }}
    >
      {item.kind === "numeric" ? (
        <>
          <p className={`${typography.chartTotal} break-words tabular-nums`}>
            {headline?.value != null
              ? number.format(headline.value)
              : headline?.raw || "Not reported"}
          </p>
          {item.unit && (
            <p className={`${typography.meta} mt-1`}>
              {item.unit.replace(/^number of /i, "")}
            </p>
          )}
          <p className={`${typography.caption} mt-1 text-muted-foreground`}>
            {headline?.measure === "actual" && headline.value != null
              ? "Delivered"
              : headline?.measure === "planned" && headline.value != null
                ? "Planned"
                : "Reported"}{" "}
            · {year}
          </p>
          <h4 className={`${typography.body} mt-3 font-normal`}>
            {item.title}
          </h4>
          <div className="mt-4 space-y-2">
            {[
              { label: "Delivered", entry: actual, color: "var(--tile-color)" },
              {
                label: "Planned",
                entry: planned,
                color: "var(--color-neutral-control)",
              },
            ].map(({ label, entry, color }) => (
              <div
                key={label}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2"
              >
                <span className={typography.caption}>{label}</span>
                {entry?.value != null ? (
                  <span
                    role="img"
                    aria-label={`${label}: ${number.format(entry.value)}`}
                    title={`${label}: ${number.format(entry.value)}`}
                    className="block overflow-hidden rounded-sm bg-muted"
                  >
                    <FinancialPanelBar
                      percent={Math.max(0, (entry.value / maximum) * 100)}
                      color={color}
                    />
                  </span>
                ) : (
                  <span
                    className={`${typography.caption} text-muted-foreground`}
                  >
                    {entry?.raw || "Not reported"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={`${typography.caption} text-muted-foreground`}>
            Non-quantified deliverable
          </p>
          <h4 className={`${typography.body} mt-2 font-normal`}>
            {item.title}
          </h4>
        </>
      )}
      <div
        className={`${typography.caption} mt-auto pt-4 text-muted-foreground`}
      >
        <p title={item.entity.name}>
          {item.entity.code || item.entity.name} · {item.category}
        </p>
        <ExternalLink
          href={item.source}
          className="mt-1 inline-block underline underline-offset-2"
        >
          {item.symbol}
          {item.table ? ` · Table ${item.table}` : ""}
        </ExternalLink>
        {(item.observations.some((entry) => entry.note) ||
          item.attribution === "source-unit") && (
          <details className="mt-2">
            <summary className="cursor-pointer">Source notes</summary>
            {item.attribution === "source-unit" && (
              <p className="mt-1">
                Shown under the budget unit as printed in the source.
              </p>
            )}
            {[
              ...new Set(
                item.observations.map((entry) => entry.note).filter(Boolean),
              ),
            ].map((note) => (
              <p key={note} className="mt-1">
                {note}
              </p>
            ))}
          </details>
        )}
      </div>
    </article>
  );
}

function DeliverableRow({
  items,
  year,
  onExplore,
  label = "Deliverables",
  exploreTargetId,
}: {
  items: Deliverable[];
  year: number;
  onExplore?: () => void;
  label?: string;
  exploreTargetId?: string;
}) {
  return (
    <HierarchyPreview
      items={items}
      label={label}
      itemLabel="deliverables"
      onExplore={onExplore}
      exploreTargetId={exploreTargetId}
      focusItemSelector="li > article"
      renderItem={(item) => (
        <li key={item.id} className="min-w-0">
          <DeliverableCard item={item} year={year} />
        </li>
      )}
    />
  );
}

export function SecretariatDeliverables() {
  const { data, failed, retry } = usePublicJson<Snapshot>(
    "/data/secretariat-deliverables-2027.json",
  );
  const hierarchyId = useId();
  const [year, setYear] = useState("2025");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [grouping, setGrouping] = useState("priority");
  const [priority, setPriority] = useState<string | null>(null);
  const [entity, setEntity] = useState<string | null>(null);
  if (!data)
    return (
      <div className="py-8">
        <p className={typography.body} role={failed ? "alert" : "status"}>
          {failed
            ? "Deliverables could not be loaded."
            : "Loading deliverables…"}
        </p>
        {failed && <Button onClick={retry}>Try again</Button>}
      </div>
    );
  const terms = searchTerms(query);
  const matching = data.records.filter(
    (item) =>
      (type === "all" || item.kind === type) &&
      terms.every((term) =>
        normalizeSearchText(
          `${item.title} ${item.entity.name} ${item.entity.code} ${item.programme} ${item.priority} ${item.category} ${item.unit}`,
        ).includes(term),
      ),
  );
  const items = matching.filter(
    (item) => !categories.length || categories.includes(item.categoryCode),
  );
  const categoryOptions = [
    ...new Map(
      data.records.map((item) => [item.categoryCode, item.category]),
    ).entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, label]) => ({
      value,
      label: `${value}. ${label}`,
      count: matching.filter((item) => item.categoryCode === value).length,
    }));
  const years = [
    ...new Set(
      data.records.flatMap((item) =>
        item.observations.map((entry) => entry.year),
      ),
    ),
  ].sort();
  const entityGroups = (records: Deliverable[]) => [
    ...Map.groupBy(records, (item) => item.entity.id),
  ];
  const renderEntities = (records: Deliverable[]) =>
    entityGroups(records).map(([id, entries]) => {
      const open = entity === id;
      const contentId = `${hierarchyId}-entity-${id}`;
      return (
        <section
          key={id}
          className={styles.readableEntity}
          data-focused={open}
          data-muted={Boolean(entity && !open)}
        >
          <OverviewEntityHeading
            title={entries[0].entity.name}
            code={entries[0].entity.code}
            expanded={open}
            contentId={contentId}
            onToggle={() => setEntity(open ? null : id)}
          />
          <div id={contentId} className="px-2 pb-2">
            <AnimatedResultsContent
              transitionKey={open ? "subprogrammes" : "preview"}
            >
              {!open ? (
                <DeliverableRow
                  items={entries}
                  year={Number(year)}
                  label={entries[0].entity.name}
                  exploreTargetId={contentId}
                  onExplore={() => setEntity(id)}
                />
              ) : (
                <div className="mt-4 space-y-5">
                  {[...Map.groupBy(entries, (item) => item.programme)].map(
                    ([programme, deliverables]) => (
                      <section key={programme}>
                        <h3 className={typography.subTitle}>{programme}</h3>
                        <DeliverableRow
                          items={deliverables}
                          year={Number(year)}
                          label={programme}
                        />
                      </section>
                    ),
                  )}
                </div>
              )}
            </AnimatedResultsContent>
          </div>
        </section>
      );
    });
  const priorities = Object.keys(priorityAreaColors);
  const groups = [...Map.groupBy(items, (item) => item.priority)].sort(
    ([a], [b]) =>
      (priorities.indexOf(a) < 0 ? 999 : priorities.indexOf(a)) -
      (priorities.indexOf(b) < 0 ? 999 : priorities.indexOf(b)),
  );
  return (
    <section aria-label="Secretariat deliverables">
      <p className={`${typography.body} mt-2`}>
        What the Secretariat delivers: documents, meetings, publications,
        projects and other outputs.
      </p>
      <div className="my-5 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            variant="border-bottom"
            aria-label="Search deliverables"
            placeholder="Search deliverables or entities…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPriority(null);
              setEntity(null);
            }}
            showClear
            onClear={() => {
              setQuery("");
              setPriority(null);
              setEntity(null);
            }}
          />
        </div>
        <FilterPopover
          label="Deliverable category"
          options={categoryOptions}
          selected={categories}
          onChange={(values) => {
            setCategories(values);
            setPriority(null);
            setEntity(null);
          }}
          className={`border-border bg-secondary text-foreground hover:bg-secondary/80 any-pointer-coarse:min-h-11 ${categories.length ? "bg-muted" : ""}`}
        />
        <FinancialPanelPeriodSelector
          label="Deliverables reporting year"
          selected={year}
          onChange={setYear}
          options={years.map((value) => ({
            value: String(value),
            label: `${value}${value === 2025 ? " · delivered and planned" : " · planned"}`,
          }))}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Deliverable type"
          value={type}
          onValueChange={(value) => {
            setType(value);
            setPriority(null);
            setEntity(null);
          }}
          options={[
            { value: "all", label: "All deliverables" },
            { value: "numeric", label: "Numerical" },
            { value: "narrative", label: "Narrative" },
          ]}
        />
        <SegmentedControl
          label="Group deliverables"
          value={grouping}
          onValueChange={(value) => {
            setGrouping(value);
            setPriority(null);
            setEntity(null);
          }}
          options={[
            { value: "priority", label: "By priority area" },
            { value: "entity", label: "By entity" },
            { value: "none", label: "No grouping" },
          ]}
        />
      </div>
      <p
        className={`${typography.caption} mb-4 text-muted-foreground`}
        role="status"
      >
        {items.length} deliverables · {data.edition} programme budget ·
        Numerical cards show the selected year; narrative text covers the budget
        edition.
      </p>
      <div className={styles.groups} data-animate-layout="">
        {grouping === "priority" ? (
          groups.map(([name, entries], index) => {
            const open = priority === name;
            const contentId = `${hierarchyId}-priority-${index}`;
            return (
              <section
                key={name}
                className={styles.group}
                data-expanded={open}
                data-focused={open}
                data-muted={Boolean(priority && !open)}
                data-context={Boolean(open && entity)}
                style={
                  {
                    "--tile-color":
                      priorityAreaColors[name] ?? "var(--color-dusty-gray)",
                  } as CSSProperties
                }
              >
                <OverviewGroupHeading
                  title={name}
                  expanded={open}
                  contentId={contentId}
                  headingId={`${contentId}-heading`}
                  onToggle={() => {
                    setPriority(open ? null : name);
                    setEntity(null);
                  }}
                />
                <div id={contentId}>
                  <AnimatedResultsContent
                    transitionKey={open ? "entities" : "preview"}
                  >
                    {!open ? (
                      <DeliverableRow
                        items={entries}
                        year={Number(year)}
                        label={name}
                        exploreTargetId={contentId}
                        onExplore={() => {
                          setPriority(name);
                          setEntity(null);
                        }}
                      />
                    ) : (
                      <div className="mt-4 space-y-3">
                        {renderEntities(entries)}
                      </div>
                    )}
                  </AnimatedResultsContent>
                </div>
              </section>
            );
          })
        ) : grouping === "entity" ? (
          entityGroups(items).map(([id, records]) => (
            <div
              key={id}
              style={
                {
                  "--tile-color":
                    priorityAreaColors[records[0].priority] ??
                    "var(--color-dusty-gray)",
                } as CSSProperties
              }
            >
              {renderEntities(records)}
            </div>
          ))
        ) : (
          <div
            style={
              { "--tile-color": "var(--muted-foreground)" } as CSSProperties
            }
          >
            <DeliverableRow items={items} year={Number(year)} />
          </div>
        )}
      </div>
      {!items.length && (
        <p className={`${typography.body} py-8`}>
          No deliverables match these filters.
        </p>
      )}
    </section>
  );
}
