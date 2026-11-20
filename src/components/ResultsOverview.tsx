"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { groupEntities } from "@/lib/entity-presentation";
import { typography } from "@un-eosg/ui/typography";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Button } from "@un-eosg/ui/components/button";
import { ResultViewToggle } from "@/components/ResultViewToggle";
import {
  AnimatedResultsContent,
  HierarchyPreview,
  OverviewEntityHeading,
  OverviewGroupHeading,
  resultTypography,
} from "@/components/SecretariatHierarchy";
import { ResultCard, ResultCardContent } from "@/components/ResultCard";
import {
  priorityAreaColors,
  priorityAreaAnchor,
} from "@/lib/priority-area-colors";
import { beneficiaryColors } from "@/lib/beneficiary-colors";
import styles from "./ResultsOverview.module.css";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
import { PriorityAreaSidebar } from "@/components/PriorityAreaSidebar";
import { BudgetOverviewSidebar } from "@/components/BudgetOverviewSidebar";
import {
  OverviewFocusProvider,
  useCurrentOverviewFocus,
} from "@/components/OverviewFocus";
import { ResultsExplorerControls } from "@/components/ResultsExplorerControls";
import {
  emptyExplorerFilters,
  filterExplorerResults,
  type ExplorerResult,
  type ExplorerOptions,
} from "@/lib/result-explorer";

type OverviewResult = ExplorerResult;

function resultColor(result: OverviewResult) {
  return (
    result.groupColor ??
    priorityAreaColors[result.priority] ??
    "var(--color-dusty-gray)"
  );
}

type SubprogrammeBlock = {
  id: string;
  title: string;
  top: number;
  objective: string;
  count: number;
  total: number;
};
type EntityBlock = {
  entity: string;
  clusterKey?: string;
  label: string;
  code: string | null;
  top: number;
  height: number;
  expanded: boolean;
  headingSpace: number;
  headingKey: string;
  description: string;
  subgroups: SubprogrammeBlock[];
  count: number;
  total: number;
};

const gap = 3;
const labelHeight = 40;
const groupInset = 18;
const groupPaddingHeight = 14;
const zoomTile = 56;

function resultCardWidth(contentWidth: number) {
  const columns = Math.max(1, Math.floor((contentWidth - 16 + 10) / 230));
  return (contentWidth - 16 - (columns - 1) * 10) / columns;
}

function ResultTile({
  result,
  edition,
  position,
  readable = false,
  previewWidth,
  contentRef,
  muted,
  highlighted,
}: {
  result: OverviewResult;
  edition: number;
  position?: { x: number; y: number; width?: number; height?: number };
  readable?: boolean;
  previewWidth: number;
  contentRef: (id: string, element: HTMLSpanElement | null) => void;
  muted: boolean;
  highlighted: boolean;
}) {
  return (
    <li
      className={`${styles.tile} ${position ? "" : styles.flatTile}`}
      data-readable={readable}
      data-entity-id={result.reference.entity}
      data-muted={muted}
      data-highlighted={highlighted}
      inert={muted}
      style={
        {
          "--tile-color": resultColor(result),
          ...(position
            ? {
                transform: `translate(${position.x}px, ${position.y}px)`,
                width: position.width,
                height: position.height,
              }
            : {}),
        } as CSSProperties
      }
    >
      <BudgetResultPreview
        summary={result.reference}
        focusGroup={result.priority}
        edition={edition}
        trigger={
          readable ? (
            <ResultCard
              resultTitle={result.title}
              thumbnail={result.thumbnail}
              color={resultColor(result)}
              metadata={{
                entity: result.reference.context.entity,
                beneficiaries: result.beneficiaries,
                locations: result.locations,
              }}
              contentRef={(element) => contentRef(result.id, element)}
              disabled={muted}
              aria-label={`${result.organization}: ${result.title}`}
            />
          ) : (
            <button
              type="button"
              className={styles.trigger}
              disabled={muted}
              aria-label={`${result.organization}: ${result.title}`}
            />
          )
        }
        renderTrigger={(trigger) =>
          readable || muted ? (
            trigger
          ) : (
            <Tooltip.Provider delayDuration={200} skipDelayDuration={100}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={4}
                    collisionPadding={16}
                    className={`${styles.preview} shadow-lg`}
                    style={
                      {
                        width: previewWidth,
                        "--tile-color": resultColor(result),
                      } as CSSProperties
                    }
                  >
                    <ResultCardContent
                      title={result.title}
                      thumbnail={result.thumbnail}
                      metadata={{
                        entity: result.reference.context.entity,
                        beneficiaries: result.beneficiaries,
                        locations: result.locations,
                      }}
                    />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )
        }
      />
    </li>
  );
}

type ResultsOverviewProps = {
  results: OverviewResult[];
  edition: number;
  entityObjectives: Record<string, string>;
  subprogrammeObjectives: Record<string, string>;
  initialGrouping?: "priority" | "beneficiary";
  filterOptions: ExplorerOptions;
};

export function ResultsOverview(props: ResultsOverviewProps) {
  const [grouping, setGrouping] = useState<string>(
    props.initialGrouping ?? "priority",
  );
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyExplorerFilters);
  const [readable, setReadable] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterExplorerResults(props.results, filters, deferredQuery),
    [props.results, filters, deferredQuery],
  );
  const results = useMemo(
    () =>
      grouping !== "beneficiary"
        ? filtered
        : filtered
            .flatMap((result) =>
              [
                ...new Set(
                  result.beneficiaries.length
                    ? result.beneficiaries
                    : ["Unclassified"],
                ),
              ].map((beneficiary) => ({
                ...result,
                priority: beneficiary,
                groupColor:
                  beneficiaryColors[beneficiary] ?? "var(--color-dusty-gray)",
              })),
            )
            .sort(
              (a, b) =>
                Object.keys(beneficiaryColors).indexOf(a.priority) -
                Object.keys(beneficiaryColors).indexOf(b.priority),
            ),
    [filtered, grouping],
  );
  const clear = () => {
    setQuery("");
    setFilters(emptyExplorerFilters);
  };
  const viewKey = JSON.stringify([grouping, filters, deferredQuery]);
  return (
    <OverviewFocusProvider>
      <ResultsExplorerControls
        results={props.results}
        options={props.filterOptions}
        filters={filters}
        query={query}
        onQueryChange={setQuery}
        onFiltersChange={setFilters}
        onClear={clear}
        count={filtered.length}
        grouping={grouping}
        onGroupingChange={setGrouping}
      >
        <ResultViewToggle readable={readable} onChange={setReadable} />
      </ResultsExplorerControls>
      {filtered.length === 0 ? (
        <div className="py-12">
          <p className={typography.prose} role="status">
            No results match your search and filters.
          </p>
          <Button
            className="mt-3 text-foreground"
            variant="link"
            onClick={clear}
          >
            Clear search and filters
          </Button>
        </div>
      ) : grouping === "none" ? (
        <UngroupedResults
          key={viewKey}
          results={filtered}
          edition={props.edition}
          readable={readable}
        />
      ) : readable ? (
        <ReadableResultsOverview
          key={viewKey}
          {...props}
          results={results}
          beneficiaryMode={grouping === "beneficiary"}
        />
      ) : (
        <ResultsOverviewContent
          key={viewKey}
          {...props}
          results={results}
          sizingResults={props.results}
          beneficiaryMode={grouping === "beneficiary"}
        />
      )}
    </OverviewFocusProvider>
  );
}

const ignoreContentRef = () => {};

function UngroupedResults({
  results,
  edition,
  readable,
}: {
  results: ExplorerResult[];
  edition: number;
  readable: boolean;
}) {
  const focus = useCurrentOverviewFocus();
  const visibleTarget =
    !focus ||
    focus.kind !== "result" ||
    results.some((result) => result.id === focus.resultId);
  const matches = (result: ExplorerResult) => {
    if (!focus) return true;
    if (focus.kind === "priority") return result.priority === focus.priority;
    if (result.reference.entity !== focus.entityId) return false;
    if (focus.kind === "result" && visibleTarget)
      return result.id === focus.resultId;
    return (
      !focus.subprogrammeId ||
      result.reference.context.subprogramme?.id === focus.subprogrammeId
    );
  };
  if (readable)
    return (
      <ResultPreviewRow
        results={results.map((result) => ({
          ...result,
          groupColor: "var(--muted-foreground)",
        }))}
        edition={edition}
        label="All matching results"
        matches={matches}
        highlightedId={
          focus?.kind === "result" && visibleTarget ? focus.resultId : undefined
        }
      />
    );
  return (
    <ul
      aria-label="All matching results"
      className={`${styles.flatGrid} ${readable ? styles.readableGrid : styles.compactGrid}`}
    >
      {results.map((result) => (
        <ResultTile
          key={result.id}
          result={{ ...result, groupColor: "var(--muted-foreground)" }}
          edition={edition}
          readable={readable}
          previewWidth={280}
          contentRef={ignoreContentRef}
          muted={!matches(result)}
          highlighted={Boolean(
            focus?.kind === "result" && visibleTarget && matches(result),
          )}
        />
      ))}
    </ul>
  );
}

function ResultPreviewRow({
  results,
  edition,
  label,
  onExplore,
  exploreTargetId,
  matches = () => true,
  highlightedId,
}: {
  results: OverviewResult[];
  edition: number;
  label: string;
  onExplore?: () => void;
  exploreTargetId?: string;
  matches?: (result: OverviewResult) => boolean;
  highlightedId?: string;
}) {
  return (
    <HierarchyPreview
      items={results}
      label={label}
      onExplore={onExplore}
      exploreTargetId={exploreTargetId}
      renderItem={(result) => (
        <ResultTile
          key={result.id}
          result={result}
          edition={edition}
          readable
          previewWidth={280}
          contentRef={ignoreContentRef}
          muted={!matches(result)}
          highlighted={result.id === highlightedId}
        />
      )}
    />
  );
}

function ReadableResultsOverview({
  results,
  edition,
  entityObjectives,
  subprogrammeObjectives,
  beneficiaryMode,
}: ResultsOverviewProps & { beneficiaryMode: boolean }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const detailFocus = useCurrentOverviewFocus();
  const overviewId = useId();
  const focusedGroup = detailFocus
    ? (detailFocus.groupId ??
      selectedGroup ??
      (detailFocus.kind === "priority"
        ? detailFocus.priority
        : results.find(
            (result) => result.reference.entity === detailFocus.entityId,
          )?.priority) ??
      null)
    : selectedGroup;
  const matches = (result: OverviewResult) => {
    if (!detailFocus || detailFocus.kind === "priority") return true;
    if (detailFocus.entityId !== result.reference.entity) return false;
    if (
      detailFocus.kind === "result" &&
      detailFocus.resultId &&
      results.some((item) => item.id === detailFocus.resultId)
    )
      return result.id === detailFocus.resultId;
    return (
      !detailFocus.subprogrammeId ||
      result.reference.context.subprogramme?.id === detailFocus.subprogrammeId
    );
  };
  return (
    <div
      className={`${styles.groups} mt-5`}
      aria-label="All Secretariat results"
      data-animate-layout=""
    >
      {[...Map.groupBy(results, (result) => result.priority)].map(
        ([group, entries], index) => {
          const expanded = selectedGroup === group;
          const muted = Boolean(focusedGroup && focusedGroup !== group);
          const focusedEntity =
            detailFocus?.kind === "priority"
              ? null
              : (detailFocus?.entityId ?? (expanded ? selectedEntity : null));
          const contentId = `${overviewId}-readable-${index}`;
          const entityGroups = groupEntities(
            beneficiaryMode ? "" : group,
            [...Map.groupBy(entries, (result) => result.reference.entity)].map(
              ([id, items]) => ({
                id,
                name: items[0].reference.context.entity.name,
                results: items,
              }),
            ),
          );
          const ordered = entityGroups.flatMap((cluster) =>
            cluster.entities.flatMap((entity) => entity.results),
          );
          const explore = () => {
            setSelectedEntity(null);
            setSelectedGroup(group);
          };
          return (
            <section
              key={group}
              id={beneficiaryMode ? undefined : priorityAreaAnchor(group)}
              className={styles.group}
              data-priority-area={group}
              data-expanded={expanded}
              data-muted={muted}
              data-focused={focusedGroup === group}
              data-context={Boolean(expanded && focusedEntity && !muted)}
              inert={muted}
              aria-labelledby={`${contentId}-heading`}
              style={
                {
                  "--tile-color": resultColor(entries[0]),
                } as CSSProperties
              }
            >
              <OverviewGroupHeading
                title={group}
                expanded={expanded}
                contentId={contentId}
                headingId={`${contentId}-heading`}
                onToggle={() => {
                  setSelectedEntity(null);
                  setSelectedGroup(expanded ? null : group);
                }}
              >
                {expanded && !beneficiaryMode && (
                  <PriorityAreaSidebar priority={group} />
                )}
              </OverviewGroupHeading>
              <div id={contentId}>
                <AnimatedResultsContent
                  transitionKey={expanded ? "entities" : "preview"}
                >
                  {!expanded ? (
                    <ResultPreviewRow
                      results={ordered}
                      edition={edition}
                      label={group}
                      onExplore={explore}
                      exploreTargetId={contentId}
                      matches={matches}
                    />
                  ) : (
                    <div className="space-y-5">
                      {entityGroups.map((cluster) => (
                        <section
                          key={cluster.key}
                          data-entity-cluster={
                            cluster.label ? cluster.key : undefined
                          }
                          className="space-y-3"
                        >
                          {cluster.label && (
                            <h3 className={typography.sectionTitle}>
                              {cluster.label}
                            </h3>
                          )}
                          {cluster.entities.map((entity) => {
                            const entityExpanded = selectedEntity === entity.id;
                            const identity =
                              entity.results[0].reference.context.entity;
                            const entityContentId = `${contentId}-${entity.id}`;
                            const entityMuted = Boolean(
                              focusedEntity && focusedEntity !== entity.id,
                            );
                            return (
                              <section
                                key={entity.id}
                                data-entity-id={entity.id}
                                data-entity-expanded={entityExpanded}
                                inert={entityMuted}
                                className={styles.readableEntity}
                                data-muted={entityMuted}
                                data-focused={focusedEntity === entity.id}
                              >
                                <OverviewEntityHeading
                                  title={identity.name}
                                  code={identity.code}
                                  expanded={entityExpanded}
                                  level={cluster.label ? 4 : 3}
                                  contentId={entityContentId}
                                  onToggle={() =>
                                    setSelectedEntity(
                                      entityExpanded ? null : entity.id,
                                    )
                                  }
                                />
                                <div id={entityContentId} className="px-2 pb-2">
                                  <AnimatedResultsContent
                                    transitionKey={
                                      entityExpanded
                                        ? "subprogrammes"
                                        : "preview"
                                    }
                                  >
                                    {!entityExpanded ? (
                                      <ResultPreviewRow
                                        results={entity.results}
                                        edition={edition}
                                        label={identity.name}
                                        onExplore={() =>
                                          setSelectedEntity(entity.id)
                                        }
                                        exploreTargetId={entityContentId}
                                        matches={matches}
                                      />
                                    ) : (
                                      <div className="space-y-5">
                                        <p className={typography.body}>
                                          {entityObjectives[entity.id]}{" "}
                                          <BudgetOverviewSidebar
                                            entityId={entity.id}
                                            title={identity.name}
                                            label={
                                              beneficiaryMode
                                                ? "View all results for this entity."
                                                : undefined
                                            }
                                          />
                                        </p>
                                        {[
                                          ...Map.groupBy(
                                            entity.results,
                                            (result) =>
                                              result.reference.context
                                                .subprogramme?.id ?? "entity",
                                          ),
                                        ].map(([programmeId, items]) => {
                                          const programme =
                                            items[0].reference.context
                                              .subprogramme;
                                          const title = programme
                                            ? `Subprogramme ${programme.number} · ${programme.name}`
                                            : "Entity results";
                                          return (
                                            <section key={programmeId}>
                                              <h4
                                                aria-level={
                                                  cluster.label ? 5 : 4
                                                }
                                                className={
                                                  resultTypography.subprogramme
                                                }
                                              >
                                                {title}
                                              </h4>
                                              {programme && (
                                                <p
                                                  className={`${typography.body} mt-1.5`}
                                                >
                                                  {
                                                    subprogrammeObjectives[
                                                      `${entity.id}:${programmeId}`
                                                    ]
                                                  }{" "}
                                                  <BudgetOverviewSidebar
                                                    entityId={entity.id}
                                                    title={title}
                                                    subprogrammeId={programmeId}
                                                    label={
                                                      beneficiaryMode
                                                        ? "View all results for this subprogramme."
                                                        : undefined
                                                    }
                                                  />
                                                </p>
                                              )}
                                              <ResultPreviewRow
                                                results={items}
                                                edition={edition}
                                                label={title}
                                                matches={matches}
                                                highlightedId={
                                                  detailFocus?.kind === "result"
                                                    ? detailFocus.resultId
                                                    : undefined
                                                }
                                              />
                                            </section>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </AnimatedResultsContent>
                                </div>
                              </section>
                            );
                          })}
                        </section>
                      ))}
                    </div>
                  )}
                </AnimatedResultsContent>
              </div>
            </section>
          );
        },
      )}
    </div>
  );
}

function ResultsOverviewContent({
  results,
  edition,
  entityObjectives,
  subprogrammeObjectives,
  sizingResults,
  beneficiaryMode,
}: ResultsOverviewProps & {
  sizingResults: OverviewResult[];
  beneficiaryMode: boolean;
}) {
  const totals = useMemo(
    () => ({
      entities: new Map(
        [
          ...Map.groupBy(sizingResults, (result) => result.reference.entity),
        ].map(([entity, items]) => [
          entity,
          new Set(items.map((item) => item.id)).size,
        ]),
      ),
      subprogrammes: new Map(
        [
          ...Map.groupBy(
            sizingResults,
            (result) =>
              `${result.reference.entity}:${result.reference.context.subprogramme?.id ?? "entity"}`,
          ),
        ].map(([programme, items]) => [
          programme,
          new Set(items.map((item) => item.id)).size,
        ]),
      ),
    }),
    [sizingResults],
  );
  const detailFocus = useCurrentOverviewFocus();
  const container = useRef<HTMLDivElement>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedPriority || detailFocus) return;
    const collapseOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest("[data-explorer-controls]") ||
        (!container.current?.contains(event.target) &&
          event.target.closest("a[href], button, [role='menuitem']"))
      ) {
        setSelectedEntity(null);
        setSelectedPriority(null);
        return;
      }
      const priority = event.target.closest<HTMLElement>(
        "[data-priority-area]",
      );
      const entity = event.target.closest<HTMLElement>("[data-entity-id]");
      const outsidePriority =
        priority?.dataset.priorityArea !== selectedPriority;
      const outsideEntity =
        selectedEntity && entity?.dataset.entityId !== selectedEntity;
      if (!outsidePriority && !outsideEntity) return;
      // Consume actual dismissal clicks (including keyboard activation), not scroll starts.
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelectedEntity(null);
      if (outsidePriority) setSelectedPriority(null);
    };
    document.addEventListener("click", collapseOutside, true);
    return () => document.removeEventListener("click", collapseOutside, true);
  }, [selectedPriority, selectedEntity, detailFocus]);
  const focusedPriority = detailFocus
    ? (detailFocus.groupId ??
      selectedPriority ??
      (detailFocus.kind === "priority"
        ? detailFocus.priority
        : results.find(
            (result) => result.reference.entity === detailFocus.entityId,
          )?.priority) ??
      selectedPriority)
    : selectedPriority;
  const description = useRef<HTMLParagraphElement>(null);
  const registerDescription = useCallback(
    (element: HTMLParagraphElement | null) => {
      description.current = element;
    },
    [],
  );
  const headings = useRef(new Map<string, HTMLElement>());
  const registerHeading = useCallback(
    (key: string, element: HTMLElement | null) => {
      if (element) headings.current.set(key, element);
      else headings.current.delete(key);
    },
    [],
  );
  const cardContents = useRef(new Map<string, HTMLSpanElement>());
  const registerCardContent = useCallback(
    (id: string, element: HTMLSpanElement | null) => {
      if (element) cardContents.current.set(id, element);
      else cardContents.current.delete(id);
    },
    [],
  );
  const [cardSizes, setCardSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [headingHeights, setHeadingHeights] = useState<Record<string, number>>(
    {},
  );
  const [descriptionHeights, setDescriptionHeights] = useState<
    Record<string, number>
  >({});
  const overviewId = useId();
  const groups = useMemo(
    () => [...Map.groupBy(results, (result) => result.priority)],
    [results],
  );
  const [layout, setLayout] = useState<{ tile: number; width: number }>();

  useLayoutEffect(() => {
    const measure = () => {
      const clusterHeadings = [
        ...(container.current?.querySelectorAll<HTMLElement>(
          "[data-cluster-heading-key]",
        ) ?? []),
      ];
      const measured = [
        ...headings.current,
        ...clusterHeadings.map(
          (element) => [element.dataset.clusterHeadingKey!, element] as const,
        ),
      ].map(
        ([key, element]) =>
          [key, Math.ceil(element.getBoundingClientRect().height)] as const,
      );
      setHeadingHeights((current) => {
        if (measured.every(([key, height]) => current[key] === height))
          return current;
        return { ...current, ...Object.fromEntries(measured) };
      });
      const cards = [...cardContents.current].map(([id, element]) => {
        const card = element.closest("button") ?? element;
        const { width } = card.getBoundingClientRect();
        const contentStyle = getComputedStyle(element);
        const cardStyle = getComputedStyle(card);
        const children = [...element.children];
        const height =
          children.reduce(
            (total, child) => total + child.getBoundingClientRect().height,
            0,
          ) +
          Math.max(0, children.length - 1) *
            (parseFloat(contentStyle.rowGap) || 0) +
          (parseFloat(contentStyle.paddingTop) || 0) +
          (parseFloat(contentStyle.paddingBottom) || 0) +
          (parseFloat(cardStyle.borderTopWidth) || 0) +
          (parseFloat(cardStyle.borderBottomWidth) || 0);
        return [id, { width, height: Math.ceil(height) }] as const;
      });
      setCardSizes((current) => {
        if (
          cards.every(
            ([id, size]) =>
              current[id]?.width === size.width &&
              current[id]?.height === size.height,
          )
        )
          return current;
        return { ...current, ...Object.fromEntries(cards) };
      });
    };
    const observer = new ResizeObserver(measure);
    for (const element of headings.current.values()) observer.observe(element);
    for (const element of cardContents.current.values()) {
      observer.observe(element);
      for (const child of element.children) observer.observe(child);
    }
    for (const element of container.current?.querySelectorAll<HTMLElement>(
      "[data-cluster-heading-key]",
    ) ?? [])
      observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [selectedPriority, selectedEntity, layout?.width]);

  useLayoutEffect(() => {
    const element = description.current;
    if (!element || !selectedEntity) return;
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      setDescriptionHeights((current) =>
        current[selectedEntity] === height
          ? current
          : { ...current, [selectedEntity]: height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [selectedEntity, layout?.width]);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;

    const resize = () => {
      const { width } = element.getBoundingClientRect();
      if (!width) return;
      const tile = parseFloat(
        getComputedStyle(element).getPropertyValue("--compact-tile-size"),
      );
      setLayout((current) =>
        current?.tile === tile && current.width === width
          ? current
          : { tile, width },
      );
    };

    // Expanding a group changes height, but must not shrink the other tiles.
    let observedWidth = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const width = element.getBoundingClientRect().width;
      if (width !== observedWidth) {
        observedWidth = width;
        resize();
      }
    });
    observer.observe(element);
    window.addEventListener("resize", resize);
    resize();

    // Let the measured layout paint before enabling transitions from the grid.
    let animationFrame = requestAnimationFrame(() => {
      animationFrame = requestAnimationFrame(() => {
        element.dataset.animateLayout = "";
      });
    });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
      delete element.dataset.animateLayout;
    };
  }, []);

  const groupElements: ReactNode[] = [];
  for (const [index, [priority, entries]] of groups.entries()) {
    const scopeLabel =
      priority === "Unclassified"
        ? "Results without a beneficiary tag"
        : `Results tagged for ${priority}`;
    const expanded = selectedPriority === priority;
    const mutedPriority =
      focusedPriority !== null && focusedPriority !== priority;
    const focusedEntity =
      detailFocus?.kind === "priority"
        ? null
        : (detailFocus?.entityId ?? (expanded ? selectedEntity : null));
    const detailHasVisibleTarget =
      !detailFocus ||
      detailFocus.kind === "entity" ||
      detailFocus.kind === "priority" ||
      entries.some((result) => {
        if (result.reference.entity !== detailFocus.entityId) return false;
        if (detailFocus.kind === "subprogramme")
          return (
            result.reference.context.subprogramme?.id ===
            detailFocus.subprogrammeId
          );
        return detailFocus.resultId
          ? result.id === detailFocus.resultId
          : result.reference.title === detailFocus.title &&
              result.reference.source === detailFocus.source;
      });
    const matchesFocus = (result: OverviewResult) => {
      if (focusedEntity && result.reference.entity !== focusedEntity)
        return false;
      if (!detailFocus || detailFocus.kind === "priority") return true;
      // A full overview can open a result outside this beneficiary slice.
      // Keep its entity in focus rather than dimming every visible result.
      if (!detailHasVisibleTarget) return true;
      if (detailFocus.kind === "result")
        return detailFocus.resultId
          ? result.id === detailFocus.resultId
          : result.reference.title === detailFocus.title &&
              result.reference.source === detailFocus.source;
      return (
        !detailFocus.subprogrammeId ||
        result.reference.context.subprogramme?.id === detailFocus.subprogrammeId
      );
    };
    const tile = expanded ? zoomTile : (layout?.tile ?? 28);
    const contentWidth = Math.max(
      1,
      (layout?.width ?? groupInset) - groupInset,
    );
    const columns = Math.max(
      1,
      Math.floor((contentWidth + gap) / (tile + gap)),
    );
    const zoomColumns = Math.max(
      1,
      Math.floor((contentWidth - 16 + gap) / (zoomTile + gap)),
    );
    const entityGroups = groupEntities(
      beneficiaryMode ? "" : priority,
      [...Map.groupBy(entries, (result) => result.reference.entity)].map(
        ([id, results]) => ({
          id,
          name: results[0].reference.context.entity.name,
          results,
        }),
      ),
    );
    const entities = entityGroups.flatMap((group) =>
      group.entities.map((entity, index) => ({
        ...entity,
        clusterKey: group.label ? group.key : undefined,
        clusterLabel: index === 0 ? group.label : undefined,
      })),
    );
    const orderedEntries = entities.flatMap((entity) => entity.results);
    const clusterBlocks: {
      key: string;
      label: string;
      top: number;
      headingKey: string;
    }[] = [];
    const positions = new Map<
      string,
      { x: number; y: number; width?: number; height?: number }
    >();
    let cursor = 0;
    const entityBlocks: EntityBlock[] = [];
    for (const {
      id: entity,
      results: entityResults,
      clusterKey,
      clusterLabel,
    } of entities) {
      if (clusterLabel) {
        const headingKey = `cluster:${priority}:${clusterKey}`;
        clusterBlocks.push({
          key: clusterKey!,
          label: clusterLabel,
          top: cursor,
          headingKey,
        });
        cursor +=
          (headingHeights[headingKey] ??
            Math.ceil(clusterLabel.length / Math.max(1, contentWidth / 9)) *
              24) + 16;
      }
      const entityExpanded = expanded && selectedEntity === entity;
      const headingKey = `entity:${priority}:${entity}:${entityExpanded}`;
      const entityName = entityResults[0].reference.context.entity.name;
      const headingSpace =
        (headingHeights[headingKey] ??
          Math.max(
            28,
            Math.ceil(
              (entityName.length + 12) /
                Math.max(1, (contentWidth - 116) / (entityExpanded ? 10 : 8)),
            ) * (entityExpanded ? 28 : 24),
          ) + 14) + 8;
      const entityDescription = entityObjectives[entity] ?? "";
      const descriptionHeight =
        descriptionHeights[entity] ??
        Math.max(
          24,
          Math.ceil(
            (entityDescription.length + 12) /
              Math.max(1, (contentWidth - 32) / 8),
          ) * 24,
        );
      const subgroups: SubprogrammeBlock[] = [];
      let blockHeight: number;
      if (entityExpanded) {
        const cardGap = 10;
        const cardColumns = Math.max(
          1,
          Math.floor((contentWidth - 16 + cardGap) / 230),
        );
        const cardWidth = resultCardWidth(contentWidth);
        let innerY = headingSpace + descriptionHeight + 16;
        for (const [subprogramme, programmeResults] of Map.groupBy(
          entityResults,
          (result) => result.reference.context.subprogramme?.id ?? "entity",
        )) {
          const programme = programmeResults[0].reference.context.subprogramme;
          const programmeHeadingKey = `programme:${priority}:${entity}:${subprogramme}`;
          const programmeTitle = programme
            ? `Subprogramme ${programme.number} · ${programme.name}`
            : entityResults.some(
                  (result) => result.reference.context.subprogramme,
                )
              ? "Entity-level results"
              : "Results";
          const objective =
            subprogrammeObjectives[`${entity}:${subprogramme}`] ?? "";
          subgroups.push({
            id: subprogramme,
            title: programmeTitle,
            top: innerY,
            objective,
            count: programmeResults.length,
            total:
              totals.subprogrammes.get(`${entity}:${subprogramme}`) ??
              programmeResults.length,
          });
          innerY +=
            (headingHeights[programmeHeadingKey] ??
              Math.ceil(
                programmeTitle.length / Math.max(1, (contentWidth - 16) / 8),
              ) *
                24 +
                (programme
                  ? Math.max(
                      24,
                      Math.ceil(
                        (objective.length + 12) /
                          Math.max(1, (contentWidth - 16) / 7),
                      ) * 24,
                    ) + 6
                  : 0)) + 12;
          for (
            let offset = 0;
            offset < programmeResults.length;
            offset += cardColumns
          ) {
            const row = programmeResults.slice(offset, offset + cardColumns);
            const heights = row.map((result) => {
              const measured = cardSizes[result.id];
              if (measured && Math.abs(measured.width - cardWidth) < 0.5)
                return measured.height;
              return (
                Math.ceil(
                  result.title.length / Math.max(1, (cardWidth - 24) / 7),
                ) *
                  23 +
                (result.thumbnail ? 32 + 8 : 0) +
                18 +
                (result.beneficiaries.length ? 40 : 0) +
                12 +
                26
              );
            });
            row.forEach((result, column) =>
              positions.set(result.id, {
                x: 8 + column * (cardWidth + cardGap),
                y: cursor + innerY,
                width: cardWidth,
                height: Math.max(...heights),
              }),
            );
            innerY += Math.max(...heights) + cardGap;
          }
          innerY += 12;
        }
        blockHeight = innerY + 8;
      } else {
        const tileHeight =
          Math.ceil(entityResults.length / zoomColumns) * (zoomTile + gap) -
          gap;
        blockHeight = headingSpace + tileHeight + 8;
        entityResults.forEach((result, index) =>
          positions.set(result.id, {
            x: 8 + (index % zoomColumns) * (zoomTile + gap),
            y:
              cursor +
              headingSpace +
              Math.floor(index / zoomColumns) * (zoomTile + gap),
          }),
        );
      }
      const block = {
        entity,
        clusterKey,
        label: entityResults[0].reference.context.entity.name,
        code: entityResults[0].reference.context.entity.code,
        top: cursor,
        height: blockHeight,
        expanded: entityExpanded,
        headingSpace,
        headingKey,
        description: entityDescription,
        subgroups,
        count: entityResults.length,
        total: totals.entities.get(entity) ?? entityResults.length,
      };
      cursor += block.height + 12;
      entityBlocks.push(block);
    }
    const bodyHeight = expanded
      ? cursor - 12
      : Math.ceil(entries.length / columns) * (tile + gap) - gap;
    const priorityHeadingKey = `priority:${priority}:${expanded}`;
    const height =
      groupPaddingHeight +
      (headingHeights[priorityHeadingKey] ?? (expanded ? 64 : labelHeight)) +
      bodyHeight;
    const contentId = `${overviewId}-group-${index}`;
    const headingId = `${contentId}-heading`;
    groupElements.push(
      <section
        key={priority}
        id={!beneficiaryMode ? priorityAreaAnchor(priority) : undefined}
        aria-labelledby={headingId}
        className={styles.group}
        data-expanded={expanded}
        data-expandable={!expanded && !mutedPriority}
        onClick={(event) => {
          if (expanded || mutedPriority || !(event.target instanceof Element))
            return;
          if (
            event.target.closest(
              "button, a, input, select, textarea, [role=button], [data-entity-id]",
            )
          )
            return;
          setSelectedEntity(null);
          setSelectedPriority(priority);
        }}
        data-priority-area={priority}
        data-muted={mutedPriority}
        data-focused={focusedPriority === priority}
        data-context={Boolean(expanded && focusedEntity && !mutedPriority)}
        inert={mutedPriority}
        style={
          {
            height: layout ? height : undefined,
            "--tile-size": expanded ? `${zoomTile}px` : undefined,
            "--tile-color": resultColor(entries[0]),
          } as CSSProperties
        }
      >
        <OverviewGroupHeading
          title={priority}
          expanded={expanded}
          contentId={contentId}
          headingId={headingId}
          headingRef={(element) => registerHeading(priorityHeadingKey, element)}
          disabled={Boolean(focusedEntity)}
          onToggle={() => {
            setSelectedEntity(null);
            setSelectedPriority(expanded ? null : priority);
          }}
        >
          {expanded && !beneficiaryMode && (
            <PriorityAreaSidebar
              priority={priority}
              disabled={Boolean(focusedEntity)}
            />
          )}
        </OverviewGroupHeading>
        <div
          id={contentId}
          className={styles.canvas}
          style={{ height: layout ? bodyHeight : undefined }}
        >
          {expanded &&
            clusterBlocks.map((cluster) => (
              <h3
                key={cluster.key}
                data-entity-cluster={cluster.key}
                data-muted={Boolean(
                  focusedEntity &&
                  !entityBlocks.some(
                    (block) =>
                      block.clusterKey === cluster.key &&
                      block.entity === focusedEntity,
                  ),
                )}
                className={`${styles.clusterTitle} ${typography.sectionTitle}`}
                style={{ top: cluster.top }}
                data-cluster-heading-key={cluster.headingKey}
              >
                {cluster.label}
              </h3>
            ))}
          {entityBlocks.map((block) => (
            <div
              key={block.entity}
              className={styles.entityBand}
              data-entity-expanded={block.expanded}
              data-expandable={
                expanded &&
                !block.expanded &&
                (!focusedEntity || focusedEntity === block.entity)
              }
              onClick={(event) => {
                if (
                  !expanded ||
                  block.expanded ||
                  (focusedEntity && focusedEntity !== block.entity) ||
                  !(event.target instanceof Element)
                )
                  return;
                if (
                  event.target.closest(
                    "button, a, input, select, textarea, [role=button]",
                  )
                )
                  return;
                event.stopPropagation();
                setSelectedEntity(block.entity);
              }}
              data-entity-id={block.entity}
              data-muted={Boolean(
                focusedEntity && focusedEntity !== block.entity,
              )}
              data-focused={focusedEntity === block.entity}
              inert={Boolean(
                !expanded || (focusedEntity && focusedEntity !== block.entity),
              )}
              style={{ top: block.top, height: block.height }}
              aria-hidden={!expanded}
            >
              <OverviewEntityHeading
                title={block.label}
                code={block.code}
                expanded={block.expanded}
                level={block.clusterKey ? 4 : 3}
                disabled={!expanded}
                headingRef={(element) =>
                  registerHeading(block.headingKey, element)
                }
                onToggle={() =>
                  setSelectedEntity(block.expanded ? null : block.entity)
                }
              >
                {beneficiaryMode && (
                  <span
                    className={`${resultTypography.metadata} mt-1 block font-normal`}
                  >
                    {scopeLabel} · {block.count} of {block.total} results
                  </span>
                )}
              </OverviewEntityHeading>
              {block.expanded && (
                <p
                  ref={registerDescription}
                  style={{ top: block.headingSpace }}
                  className={`${resultTypography.description} ${styles.entityDescription}`}
                >
                  {block.description}{" "}
                  <BudgetOverviewSidebar
                    entityId={block.entity}
                    title={block.label}
                    label={
                      beneficiaryMode
                        ? "View all results for this entity."
                        : undefined
                    }
                  />
                </p>
              )}
              {block.subgroups.map((subgroup) => (
                <div
                  key={subgroup.id}
                  ref={(element) => {
                    const key = `programme:${priority}:${block.entity}:${subgroup.id}`;
                    registerHeading(key, element);
                  }}
                  className={styles.subprogrammeBlock}
                  data-focused={
                    detailFocus?.entityId === block.entity &&
                    detailFocus?.subprogrammeId === subgroup.id
                  }
                  data-muted={Boolean(
                    detailFocus?.entityId === block.entity &&
                    detailFocus.subprogrammeId &&
                    detailFocus.subprogrammeId !== subgroup.id,
                  )}
                  style={{ top: subgroup.top }}
                >
                  <h4
                    aria-level={block.clusterKey ? 5 : 4}
                    className={`${resultTypography.subprogramme} ${styles.subprogrammeTitle}`}
                  >
                    {subgroup.title}
                  </h4>
                  {subgroup.id !== "entity" && (
                    <p
                      className={`${resultTypography.description} mt-1.5 leading-6`}
                    >
                      {subgroup.objective && <>{subgroup.objective} </>}
                      <BudgetOverviewSidebar
                        entityId={block.entity}
                        title={subgroup.title}
                        label={
                          beneficiaryMode
                            ? "View all results for this subprogramme."
                            : undefined
                        }
                        subprogrammeId={
                          subgroup.id === "entity" ? undefined : subgroup.id
                        }
                      />
                    </p>
                  )}
                  {beneficiaryMode && subgroup.id !== "entity" && (
                    <p
                      className={`${resultTypography.metadata} mt-1 font-normal`}
                    >
                      {scopeLabel} · {subgroup.count} of {subgroup.total}{" "}
                      results
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
          <ul className={styles.tiles}>
            {orderedEntries.map((result, index) => (
              <ResultTile
                key={result.id}
                result={result}
                edition={edition}
                contentRef={registerCardContent}
                previewWidth={layout ? resultCardWidth(contentWidth) : 280}
                muted={!mutedPriority && !matchesFocus(result)}
                highlighted={
                  !mutedPriority &&
                  detailHasVisibleTarget &&
                  detailFocus?.kind === "result" &&
                  matchesFocus(result)
                }
                readable={
                  expanded && selectedEntity === result.reference.entity
                }
                position={
                  !layout
                    ? undefined
                    : expanded
                      ? positions.get(result.id)!
                      : {
                          x: (index % columns) * (tile + gap),
                          y: Math.floor(index / columns) * (tile + gap),
                        }
                }
              />
            ))}
          </ul>
        </div>
      </section>,
    );
  }
  return (
    <div
      ref={container}
      className={`${styles.groups} mt-5`}
      data-layout-ready={Boolean(layout)}
      aria-label="All Secretariat results"
    >
      {groupElements}
    </div>
  );
}
