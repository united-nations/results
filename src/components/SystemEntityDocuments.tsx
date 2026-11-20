"use client";

/* eslint-disable @next/next/no-img-element -- Local snapshot logos and official goal artwork. */
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Globe2,
  Handshake,
  Users,
  Leaf,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { typography } from "@un-eosg/ui/typography";
import { formatBudget as money } from "@un-eosg/ui/format-budget";
import { withBasePath } from "@/lib/paths";
import { normalizeSearchText, searchTerms } from "@/lib/search-text";
import snapshot from "../../data/system-entities.json";
import functionSnapshot from "../../data/system-entity-functions-2025.json";

type Entity = (typeof snapshot.entities)[number];
const pillars = [
  { name: "Partnership", goals: [17], icon: Handshake },
  { name: "People", goals: [1, 2, 3, 4, 5], icon: Users },
  { name: "Planet", goals: [6, 12, 13, 14, 15], icon: Leaf },
  { name: "Prosperity", goals: [7, 8, 9, 10, 11], icon: TrendingUp },
  { name: "Peace", goals: [16], icon: HeartHandshake },
  { name: "Other", goals: [0], icon: Globe2 },
];
type Pillar = (typeof pillars)[number];
const goalColors: Record<number, string> = {
  1: "#e5243b",
  2: "#dda63a",
  3: "#4c9f38",
  4: "#c5192d",
  5: "#ff3a21",
  6: "#26bde2",
  7: "#fcc30b",
  8: "#a21942",
  9: "#fd6925",
  10: "#dd1367",
  11: "#fd9d24",
  12: "#bf8b2e",
  13: "#3f7e44",
  14: "#0a97d9",
  15: "#56c02b",
  16: "#00689d",
  17: "#19486a",
  0: "var(--color-neutral-control)",
};

function PillarBadge({ pillar }: { pillar: Pillar }) {
  const circumference = 2 * Math.PI * 27;
  const segment = circumference / pillar.goals.length;
  const Icon = pillar.icon;
  return (
    <span aria-hidden="true" className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full">
        <circle cx="32" cy="32" r="22" fill="var(--color-muted)" />
        {pillar.goals.map((goal, index) => (
          <circle
            key={goal}
            cx="32"
            cy="32"
            r="27"
            fill="none"
            stroke={goalColors[goal]}
            strokeWidth="4"
            strokeDasharray={`${segment - (pillar.goals.length > 1 ? 2 : 0)} ${circumference}`}
            strokeDashoffset={-index * segment}
            transform="rotate(-90 32 32)"
          />
        ))}
      </svg>
      <Icon className="absolute inset-0 m-auto size-7 text-muted-foreground" />
    </span>
  );
}
const percent = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
const allocationFor = (entity: Entity, goal: number) =>
  entity.sdgSpending[String(goal) as keyof Entity["sdgSpending"]] ?? 0;
const functionsByEntity = functionSnapshot.entities as Record<
  string,
  {
    primaryFunction: string | null;
    spending: Record<string, number>;
  }
>;
const functionAllocationFor = (entity: Entity, key: string) =>
  functionsByEntity[entity.code]?.spending[key] ?? 0;
type EntityGroup = {
  id: string;
  name: string;
  share: number;
  spending: number;
  goal: (typeof snapshot.goals)[number] | null;
  functionKey?: string;
  description?: string;
  entities: Entity[];
};
const sampleImpacts = [
  "Expanded access to essential services for people and communities.",
  "Strengthened national institutions and local delivery capacity.",
  "Supported people affected by crises and displacement.",
  "Advanced inclusive policies through evidence and partnerships.",
  "Helped communities build resilience for the future.",
];

function EntityLogo({
  entity,
  compact = false,
}: {
  entity: Entity;
  compact?: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md border bg-background p-2 ${compact ? "size-11" : "size-24"}`}
    >
      {entity.logo ? (
        <img
          src={withBasePath(entity.logo)}
          alt=""
          width={compact ? 32 : 80}
          height={compact ? 32 : 80}
          loading="lazy"
          className="max-h-full w-full object-contain"
        />
      ) : (
        <Globe2
          aria-hidden="true"
          className={`${compact ? "size-6" : "size-10"} text-muted-foreground`}
        />
      )}
    </span>
  );
}

function EntityDetails({
  entity,
  goal,
  functionKey,
}: {
  entity: Entity;
  goal?: number;
  functionKey?: string;
}) {
  const allocation = functionKey
    ? functionAllocationFor(entity, functionKey)
    : goal === undefined
      ? null
      : allocationFor(entity, goal);
  return (
    <article
      aria-label={entity.name}
      className="grid gap-5 py-7 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8"
    >
      <div className="flex items-center gap-4 sm:block">
        <EntityLogo entity={entity} />
        <div className="sm:mt-3">
          <h4 className={`${typography.subTitle} break-words`}>
            {entity.code}
          </h4>
          <p className={`${typography.caption} mt-1`}>{entity.name}</p>
        </div>
      </div>
      <div className="min-w-0">
        {entity.description && (
          <p className={typography.body}>{entity.description}</p>
        )}
        {allocation !== null && allocation > 0 && (
          <p className={`${typography.caption} mt-3`}>
            <span className="font-medium text-foreground">
              {money(allocation)}
            </span>{" "}
            reported{" "}
            {functionKey
              ? `toward ${functionSnapshot.functions.find((item) => item.key === functionKey)?.label}`
              : goal === 0
                ? "as Non-SDG expenditure"
                : `toward SDG ${goal}`}{" "}
            in {snapshot.year}
          </p>
        )}
        <div className="mt-5 rounded-md border border-dashed bg-muted/40 px-4 py-3">
          <p className={typography.eyebrow}>Illustrative impact statements</p>
          <p className={`${typography.caption} mt-1`}>
            Sample copy for this prototype. Entity-specific results will replace
            these examples.
          </p>
          <ol className="mt-3 divide-y divide-border">
            {sampleImpacts.map((statement, index) => (
              <li
                key={statement}
                className={`${typography.body} flex gap-3 py-2`}
              >
                <span
                  aria-hidden="true"
                  className={`${typography.caption} pt-0.5 tabular-nums`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {statement}
              </li>
            ))}
          </ol>
        </div>
        <div
          className={`${typography.body} mt-4 flex flex-wrap items-center gap-x-6 gap-y-3`}
        >
          {(
            [
              ["strategicPlan", "Strategic plan"],
              ["resultsFramework", "Results framework"],
            ] as const
          ).map(([field, label]) =>
            entity[field] ? (
              <a
                key={field}
                href={entity[field]}
                target="_blank"
                rel="noreferrer"
                aria-label={`${label} for ${entity.code} (opens in a new tab)`}
                className="inline-flex items-center gap-1 text-un-blue-text underline underline-offset-4"
              >
                {label}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            ) : (
              <span key={field} className="text-muted-foreground">
                {label} · Unavailable
              </span>
            ),
          )}
          <span aria-disabled="true" className="text-muted-foreground">
            Annual report · Coming soon
          </span>
        </div>
      </div>
    </article>
  );
}

function OtherContributors({
  entities,
  goal,
  functionKey,
}: {
  entities: Entity[];
  goal?: number;
  functionKey?: string;
}) {
  const [limit, setLimit] = useState(6);
  return (
    <details className="mb-6 rounded-md border bg-muted/30">
      <summary
        className={`${typography.body} cursor-pointer px-4 py-4 font-medium focus-visible:outline-2 focus-visible:outline-un-blue`}
      >
        Other contributing entities ({entities.length})
      </summary>
      <div className="border-t px-4">
        <p className={`${typography.caption} py-3`}>
          These entities report expenditure here, but their largest{" "}
          {functionKey ? "function" : "SDG"} allocation is elsewhere. Ordered by
          expenditure; open an entity for details.
        </p>
        {entities.slice(0, limit).map((entity) => (
          <details key={entity.code} className="group/entity border-t">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-un-blue [&::-webkit-details-marker]:hidden">
              <EntityLogo entity={entity} compact />
              <span className="min-w-0 flex-1">
                <span className={`${typography.body} font-semibold`}>
                  {entity.code}
                </span>
                <span className={`${typography.caption} block`}>
                  {entity.name}
                </span>
              </span>
              <span className={`${typography.numeric} shrink-0`}>
                {money(
                  functionKey
                    ? functionAllocationFor(entity, functionKey)
                    : allocationFor(entity, goal!),
                )}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 group-open/entity:rotate-90"
              />
            </summary>
            <EntityDetails
              entity={entity}
              goal={goal}
              functionKey={functionKey}
            />
          </details>
        ))}
        {limit < entities.length && (
          <button
            type="button"
            onClick={() => setLimit(limit + 10)}
            className={`${typography.body} my-4 text-un-blue-text underline underline-offset-4`}
          >
            Show more entities ({entities.length - limit} remaining)
          </button>
        )}
      </div>
    </details>
  );
}

export function SystemEntityDocuments() {
  const [grouping, setGrouping] = useState("sdg");
  const [groupSort, setGroupSort] = useState("number");
  const [sdgGrouping, setSdgGrouping] = useState("goals");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const terms = searchTerms(query);
  const matchesSearch = (text: string) => {
    const normalized = normalizeSearchText(text);
    return terms.every((term) => normalized.includes(term));
  };
  const byPillar = grouping === "sdg" && sdgGrouping === "pillars";
  const sortedGoals = [...snapshot.goals].sort((a, b) =>
    groupSort === "expenditure"
      ? b.spending - a.spending || (a.number || 18) - (b.number || 18)
      : (a.number || 18) - (b.number || 18),
  );
  const allGroups: EntityGroup[] =
    grouping === "sdg"
      ? sortedGoals.map((goal) => ({
          id: `sdg-${goal.number}`,
          name: goal.name,
          share: goal.share,
          spending: goal.spending,
          goal,
          entities: snapshot.entities
            .filter((entity) => entity.primarySdg === goal.number)
            .sort(
              (a, b) =>
                allocationFor(b, goal.number) - allocationFor(a, goal.number),
            ),
        }))
      : grouping === "function"
        ? functionSnapshot.functions
            .map((item) => ({
              id: `function-${item.key}`,
              name: item.label,
              share: item.share,
              spending: item.spending,
              goal: null,
              functionKey: item.key,
              description: item.description,
              entities: snapshot.entities
                .filter(
                  (entity) =>
                    functionsByEntity[entity.code]?.primaryFunction ===
                    item.key,
                )
                .sort(
                  (a, b) =>
                    functionAllocationFor(b, item.key) -
                    functionAllocationFor(a, item.key),
                ),
            }))
            .sort((a, b) =>
              groupSort === "expenditure" ? b.spending - a.spending : 0,
            )
        : snapshot.categories
            .map((category, index) => ({
              id: `category-${index}`,
              name: category.label,
              share: category.spending / snapshot.totalSpending,
              spending: category.spending,
              goal: null,
              entities: snapshot.entities.filter(
                (entity) => entity.category === category.key,
              ),
            }))
            .sort((a, b) =>
              groupSort === "expenditure" ? b.spending - a.spending : 0,
            );
  const groupContext = (group: EntityGroup) => {
    const goal = group.goal;
    const pillar =
      goal && pillars.find((item) => item.goals.includes(goal.number));
    return `${group.name} ${group.description ?? goal?.description ?? ""} ${goal ? `SDG ${goal.number} Goal ${goal.number}` : ""} ${pillar ? `${pillar.name} pillar` : ""}`;
  };
  const matchesEntity = (entity: Entity, context: string) =>
    matchesSearch(
      `${context} ${entity.code} ${entity.name} ${entity.description ?? ""}`,
    );
  const groups = allGroups
    .map((group) => ({
      ...group,
      entities: group.entities.filter((entity) =>
        matchesEntity(entity, groupContext(group)),
      ),
    }))
    .filter(
      (group) =>
        !terms.length ||
        group.entities.length ||
        matchesSearch(groupContext(group)),
    );
  const pillarGroups = pillars
    .map((pillar) => {
      const children = groups.filter(
        (group) => group.goal && pillar.goals.includes(group.goal.number),
      );
      const spending = snapshot.goals
        .filter((goal) => pillar.goals.includes(goal.number))
        .reduce((sum, goal) => sum + goal.spending, 0);
      return {
        pillar,
        children,
        spending,
        share: spending / snapshot.totalSpending,
        entityCount: new Set(
          children.flatMap((group) =>
            group.entities.map((entity) => entity.code),
          ),
        ).size,
      };
    })
    .filter((item) => item.children.length > 0)
    .sort((a, b) => b.spending - a.spending);
  const activeGroup =
    expanded === "first-search-result" ? groups[0]?.id : expanded;
  const activePillar =
    expandedPillar === "first-search-result"
      ? (pillarGroups.find((item) =>
          item.children.some((group) => group.id === activeGroup),
        )?.pillar.name ?? pillarGroups[0]?.pillar.name)
      : expandedPillar;
  const GoalHeading = byPillar ? "h4" : "h3";
  const renderGroup = (group: EntityGroup) => {
    const open = activeGroup === group.id;
    const goalNumber = group.goal?.number;
    const allocation = (entity: Entity) =>
      group.functionKey
        ? functionAllocationFor(entity, group.functionKey)
        : goalNumber === undefined
          ? 0
          : allocationFor(entity, goalNumber);
    const others =
      !group.functionKey && goalNumber === undefined
        ? []
        : snapshot.entities
            .filter(
              (entity) =>
                (group.functionKey
                  ? functionsByEntity[entity.code]?.primaryFunction !==
                    group.functionKey
                  : entity.primarySdg !== goalNumber) &&
                allocation(entity) > 0 &&
                matchesEntity(entity, groupContext(group)),
            )
            .sort((a, b) => allocation(b) - allocation(a));
    return (
      <section key={group.id} className="border-b last:border-b-0">
        <GoalHeading>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${group.id}-content`}
            id={`${group.id}-heading`}
            onClick={() => setExpanded(open ? null : group.id)}
            className={`flex w-full items-center gap-4 p-4 text-start transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-un-blue sm:gap-5 sm:p-5 ${open ? "bg-muted/50" : ""}`}
          >
            {group.goal &&
              (group.goal.icon ? (
                <img
                  src={withBasePath(group.goal.icon)}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  className="size-14 shrink-0 sm:size-16"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center bg-muted sm:size-16">
                  <Globe2
                    aria-hidden="true"
                    className="size-8 text-muted-foreground"
                  />
                </span>
              ))}
            <span className="min-w-0 flex-1">
              <span className={`${typography.caption} block`}>
                {group.goal
                  ? goalNumber === 0
                    ? "Reported classification"
                    : `Goal ${goalNumber}`
                  : group.functionKey
                    ? "CEB function"
                    : "UN System Chart"}
              </span>
              <span className={`${typography.subTitle} mt-0.5 block`}>
                {group.name}
              </span>
              <span className={`${typography.caption} mt-1 block`}>
                {group.entities.length}{" "}
                {group.entities.length === 1 ? "entity" : "entities"}
                {group.goal && goalNumber !== 0
                  ? " with their largest SDG allocation here"
                  : group.functionKey
                    ? " with their largest function allocation here"
                    : ""}
              </span>
              <span className={`${typography.caption} mt-2 block sm:hidden`}>
                {percent(group.share)} of system expenditure ·{" "}
                {money(group.spending)}
              </span>
            </span>
            <span className="hidden shrink-0 text-end sm:block">
              <span className={`${typography.sectionTitle} block tabular-nums`}>
                {percent(group.share)}
              </span>
              <span className={`${typography.caption} block`}>
                of system expenditure
              </span>
              <span className={typography.caption}>
                {money(group.spending)}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </GoalHeading>
        <div
          id={`${group.id}-content`}
          role="region"
          aria-labelledby={`${group.id}-heading`}
          hidden={!open}
        >
          {open && (
            <div className="border-t px-5 sm:px-8">
              {(group.goal || group.description) && (
                <p className={`${typography.meta} pt-5`}>
                  {group.goal?.description ?? group.description}
                  {goalNumber === 0 &&
                    " These entities have no allocation to SDGs 1–17 in this snapshot. This classification does not describe their mandate or overall contribution."}
                </p>
              )}
              {group.entities.length ? (
                <div className="divide-y">
                  {group.entities.map((entity) => (
                    <EntityDetails
                      key={entity.code}
                      entity={entity}
                      goal={goalNumber}
                      functionKey={group.functionKey}
                    />
                  ))}
                </div>
              ) : (
                <p className={`${typography.body} py-8`}>
                  {group.functionKey
                    ? "No entity has its largest function allocation here."
                    : "No entity has its largest SDG allocation here."}{" "}
                  Explore the other contributors below.
                </p>
              )}
              {others.length > 0 &&
                (goalNumber !== undefined || group.functionKey) && (
                  <OtherContributors
                    key={group.id}
                    entities={others}
                    goal={goalNumber}
                    functionKey={group.functionKey}
                  />
                )}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <section aria-labelledby="entity-documents" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 id="entity-documents" className={typography.sectionTitle}>
            UN system entities
          </h2>
          <p className={`${typography.body} mt-2 max-w-2xl`}>
            Explore how UN entities contribute to the Sustainable Development
            Goals, and discover their plans and results.
          </p>
        </div>
        <SegmentedControl
          label="Group entities by"
          value={grouping}
          onValueChange={(value) => {
            setGrouping(value);
            setExpanded(query.trim() ? "first-search-result" : null);
            setExpandedPillar(query.trim() ? "first-search-result" : null);
          }}
          options={[
            { value: "sdg", label: "By SDG" },
            { value: "function", label: "By function" },
            { value: "system", label: "By System Chart" },
          ]}
        />
      </div>
      <p className={`${typography.caption} mt-5 mb-5`}>
        {snapshot.year} expenditure · {snapshot.entities.length} reporting
        entities · {money(snapshot.totalSpending)} total
        {grouping === "sdg" &&
          " · Entities grouped by their largest reported allocation across the 17 SDGs."}
        {grouping === "function" &&
          " · Entities grouped by their largest reported CEB function allocation."}
      </p>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            variant="border-bottom"
            aria-label="Search entities and groups"
            placeholder="Search entities or groups…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setExpanded(
                event.target.value.trim() ? "first-search-result" : null,
              );
              setExpandedPillar(
                event.target.value.trim() ? "first-search-result" : null,
              );
            }}
            showClear
            onClear={() => {
              setQuery("");
              setExpanded(null);
              setExpandedPillar(null);
            }}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
          {grouping === "sdg" && (
            <BinaryToggle
              label="Group SDGs"
              variant="segmented"
              value={sdgGrouping}
              onValueChange={(value) => {
                setSdgGrouping(value);
                setExpanded(query.trim() ? "first-search-result" : null);
                setExpandedPillar(query.trim() ? "first-search-result" : null);
              }}
              options={[
                { value: "goals", label: "All SDGs" },
                { value: "pillars", label: "By pillar" },
              ]}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className={typography.caption}>
              {byPillar ? "Sort SDGs by" : "Sort by"}
            </span>
            <BinaryToggle
              label={
                byPillar ? "Sort SDGs within pillars by" : "Sort groups by"
              }
              variant="segmented"
              value={groupSort}
              onValueChange={setGroupSort}
              options={[
                {
                  value: "number",
                  label:
                    grouping === "sdg"
                      ? "SDG number"
                      : grouping === "function"
                        ? "Function order"
                        : "System Chart order",
                },
                { value: "expenditure", label: "Expenditure" },
              ]}
            />
          </div>
        </div>
      </div>
      {terms.length > 0 && (
        <p role="status" className={`${typography.caption} mb-4`}>
          {
            new Set(
              groups.flatMap((group) =>
                group.entities.map((entity) => entity.code),
              ),
            ).size
          }{" "}
          matching entities · {byPillar ? pillarGroups.length : groups.length}{" "}
          groups. Expenditure shares show full system totals.
        </p>
      )}
      <div className="overflow-hidden rounded-lg border">
        {groups.length === 0 && (
          <p className={`${typography.body} p-8`}>
            No matching groups or entities.
          </p>
        )}
        {byPillar
          ? pillarGroups.map(
              ({ pillar, children, spending, share, entityCount }) => {
                const open = activePillar === pillar.name;
                const id = `pillar-${pillar.name.toLowerCase()}`;
                return (
                  <section key={id} className="border-b last:border-b-0">
                    <h3>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`${id}-content`}
                        id={`${id}-heading`}
                        onClick={() => {
                          setExpandedPillar(open ? null : pillar.name);
                          setExpanded(null);
                        }}
                        className={`flex w-full items-center gap-4 p-4 text-start transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-un-blue sm:gap-5 sm:p-5 ${open ? "bg-muted/50" : ""}`}
                      >
                        <PillarBadge pillar={pillar} />
                        <span className="min-w-0 flex-1">
                          <span className={`${typography.caption} block`}>
                            {pillar.name === "Other"
                              ? "Other expenditure"
                              : "SDG pillar"}
                          </span>
                          <span
                            className={`${typography.subTitle} mt-0.5 block`}
                          >
                            {pillar.name}
                          </span>
                          <span className={`${typography.caption} mt-1 block`}>
                            {pillar.name === "Other"
                              ? "Non-SDG expenditure"
                              : `${children.length} SDG${children.length === 1 ? "" : "s"}`}{" "}
                            · {entityCount}{" "}
                            {entityCount === 1 ? "entity" : "entities"}
                          </span>
                          <span
                            className={`${typography.caption} mt-2 block sm:hidden`}
                          >
                            {percent(share)} of system expenditure ·{" "}
                            {money(spending)}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-end sm:block">
                          <span
                            className={`${typography.sectionTitle} block tabular-nums`}
                          >
                            {percent(share)}
                          </span>
                          <span className={`${typography.caption} block`}>
                            of system expenditure
                          </span>
                          <span className={`${typography.caption} block`}>
                            {money(spending)}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    </h3>
                    <div
                      id={`${id}-content`}
                      role="region"
                      aria-labelledby={`${id}-heading`}
                      hidden={!open}
                    >
                      {open && (
                        <div className="border-t bg-background sm:pl-5">
                          {children.map(renderGroup)}
                        </div>
                      )}
                    </div>
                  </section>
                );
              },
            )
          : groups.map(renderGroup)}
      </div>
      <p className={`${typography.caption} mt-5 leading-relaxed`}>
        Source:{" "}
        <a
          href={
            grouping === "function" ? functionSnapshot.source : snapshot.source
          }
          target="_blank"
          rel="noreferrer"
          className="text-un-blue-text underline underline-offset-2"
        >
          Open UN / CEB expenditure, {snapshot.year}
        </a>
        . Organization grouping follows{" "}
        <a
          href={snapshot.metadataSource}
          target="_blank"
          rel="noreferrer"
          className="text-un-blue-text underline underline-offset-2"
        >
          Open UN’s System Chart mapping
        </a>
        ; descriptions and available logos come from the{" "}
        <a
          href={snapshot.chartSource}
          target="_blank"
          rel="noreferrer"
          className="text-un-blue-text underline underline-offset-2"
        >
          UN System Chart
        </a>
        .
      </p>
      <details className={`${typography.caption} mt-3`}>
        <summary className="w-fit cursor-pointer underline underline-offset-2">
          About the spending shares and grouping
        </summary>
        {grouping === "function" && (
          <p className="mt-2 max-w-3xl leading-relaxed">
            CEB Standard II classifies expenditure as development assistance,
            humanitarian assistance, peace operations, or global agenda and
            specialised assistance. Entities appear under their largest reported
            function allocation; other contributions remain available within
            each function. Function data comes from{" "}
            <a
              href={functionSnapshot.source}
              target="_blank"
              rel="noreferrer"
              className="text-un-blue-text underline"
            >
              Open UN’s 2025 CEB function expenditure export
            </a>
            .
          </p>
        )}
        <p className="mt-2 max-w-3xl leading-relaxed">
          Shares divide each reported category’s expenditure by total CEB system
          expenditure ({money(snapshot.totalSpending)}). Data combines accrual
          and budgetary expenditure as published by Open UN. Non-SDG is
          explicitly reported as X00; it is separate from calculated “Not
          specified” reconciliation differences. The latter net to{" "}
          {money(snapshot.unspecifiedSpending)} (
          {percent(snapshot.unspecifiedSpending / snapshot.totalSpending)}), so
          displayed shares may not add to exactly 100%. The Non-SDG entity group
          contains entities with no allocation to SDGs 1–17. Other entities are
          assigned to their largest allocation among those 17 goals, even if
          they also report Non-SDG expenditure. This grouping describes
          spending, not an entity’s mandate. Equal allocations use the lower
          goal number. Official goal artwork:{" "}
          <a
            href={snapshot.iconsSource}
            className="text-un-blue-text underline"
          >
            United Nations
          </a>
          .
        </p>
      </details>
    </section>
  );
}
