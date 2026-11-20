"use client";

/* eslint-disable @next/next/no-img-element -- Local snapshot logos and official goal artwork. */
import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowUpRight, Globe2 } from "lucide-react";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { typography } from "@un-eosg/ui/typography";
import { formatBudget as money } from "@un-eosg/ui/format-budget";
import { withBasePath } from "@/lib/paths";
import snapshot from "../../data/system-entities.json";

type Entity = (typeof snapshot.entities)[number];
const percent = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
const allocationFor = (entity: Entity, goal: number) =>
  entity.sdgSpending[String(goal) as keyof Entity["sdgSpending"]] ?? 0;
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

function EntityDetails({ entity, goal }: { entity: Entity; goal?: number }) {
  const allocation = goal === undefined ? null : allocationFor(entity, goal);
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
            {goal === 0 ? "as Non-SDG expenditure" : `toward SDG ${goal}`} in{" "}
            {snapshot.year}
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
}: {
  entities: Entity[];
  goal: number;
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
          These entities report expenditure here, but their largest SDG
          allocation is elsewhere. Ordered by expenditure; open an entity for
          details.
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
                {money(allocationFor(entity, goal))}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 group-open/entity:rotate-90"
              />
            </summary>
            <EntityDetails entity={entity} goal={goal} />
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const sortedGoals = [...snapshot.goals].sort((a, b) =>
    groupSort === "expenditure"
      ? b.spending - a.spending || (a.number || 18) - (b.number || 18)
      : (a.number || 18) - (b.number || 18),
  );
  const groups =
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
        <BinaryToggle
          label="Group entities by"
          variant="segmented"
          value={grouping}
          onValueChange={(value) => {
            setGrouping(value);
            setExpanded(null);
          }}
          options={[
            { value: "sdg", label: "By SDG" },
            { value: "system", label: "By System Chart" },
          ]}
        />
      </div>
      <p className={`${typography.caption} mt-5 mb-5`}>
        {snapshot.year} expenditure · {snapshot.entities.length} reporting
        entities · {money(snapshot.totalSpending)} total
        {grouping === "sdg" &&
          " · Entities grouped by their largest reported allocation across the 17 SDGs."}
      </p>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={typography.caption}>Sort by</span>
          <BinaryToggle
            label="Sort groups by"
            variant="segmented"
            value={groupSort}
            onValueChange={setGroupSort}
            options={[
              {
                value: "number",
                label: grouping === "sdg" ? "SDG number" : "System Chart order",
              },
              { value: "expenditure", label: "Expenditure" },
            ]}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {groups.map((group) => {
          const open = expanded === group.id;
          const goalNumber = group.goal?.number;
          const others =
            goalNumber === undefined
              ? []
              : snapshot.entities
                  .filter(
                    (entity) =>
                      entity.primarySdg !== goalNumber &&
                      allocationFor(entity, goalNumber) > 0,
                  )
                  .sort(
                    (a, b) =>
                      allocationFor(b, goalNumber) -
                      allocationFor(a, goalNumber),
                  );
          return (
            <section key={group.id} className="border-b last:border-b-0">
              <h3>
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
                        : ""}
                    </span>
                    <span
                      className={`${typography.caption} mt-2 block sm:hidden`}
                    >
                      {percent(group.share)} of system expenditure
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-end sm:block">
                    <span
                      className={`${typography.sectionTitle} block tabular-nums`}
                    >
                      {percent(group.share)}
                    </span>
                    <span className={`${typography.caption} block`}>
                      of system expenditure
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
              </h3>
              <div
                id={`${group.id}-content`}
                role="region"
                aria-labelledby={`${group.id}-heading`}
                hidden={!open}
              >
                {open && (
                  <div className="border-t px-5 sm:px-8">
                    {group.goal && (
                      <p className={`${typography.meta} pt-5`}>
                        {group.goal.description}
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
                          />
                        ))}
                      </div>
                    ) : (
                      <p className={`${typography.body} py-8`}>
                        No entity has its largest SDG allocation here. Explore
                        the other contributors below.
                      </p>
                    )}
                    {others.length > 0 && goalNumber !== undefined && (
                      <OtherContributors
                        key={group.id}
                        entities={others}
                        goal={goalNumber}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className={`${typography.caption} mt-5 leading-relaxed`}>
        Source:{" "}
        <a
          href={snapshot.source}
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
