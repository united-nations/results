"use client";

import {
  type CSSProperties,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { typography } from "@un-eosg/ui/typography";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Button } from "@un-eosg/ui/components/button";
import { ResultViewToggle } from "@/components/ResultViewToggle";
import { Maximize2, Minimize2 } from "lucide-react";
import { ResultCard, ResultCardContent } from "@/components/ResultCard";
import {
  priorityAreaColors,
  priorityAreaAnchor,
} from "@/lib/priority-area-colors";
import { beneficiaryColors } from "@/lib/beneficiary-colors";
import styles from "./ResultsOverview.module.css";
import { BudgetResultPreview } from "@/components/BudgetResultPreview";
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

const gap = 3;
const groupGap = 8;
// Shared UI tiers keep the hierarchy consistent at every zoom level.
const resultTypography = {
  priority: typography.subTitle,
  priorityExpanded: typography.cardTitle,
  entity: typography.subTitle,
  entityExpanded: typography.sectionTitle,
  subprogramme: typography.subTitle,
  result: `${typography.body} font-normal`,
  description: typography.body,
  metadata: `${typography.body} text-foreground`,
};

const labelHeight = 40;
const groupInset = 18;
const groupPaddingHeight = 14;

function groupLayout(
  count: number,
  tile: number,
  availableWidth: number,
  headingHeight = labelHeight,
) {
  const columns = Math.max(
    1,
    Math.floor((availableWidth - groupInset + gap) / (tile + gap)),
  );
  return {
    columns,
    height:
      groupPaddingHeight +
      headingHeight +
      Math.ceil(count / columns) * (tile + gap) -
      gap,
  };
}

function resultCardWidth(contentWidth: number) {
  const columns = Math.max(1, Math.floor((contentWidth - 16 + 10) / 230));
  return (contentWidth - 16 - (columns - 1) * 10) / columns;
}

function ExpandCue({ expanded }: { expanded: boolean }) {
  return (
    <span className={`${styles.expand} ${resultTypography.metadata}`}>
      <span>{expanded ? "Collapse" : "Expand"}</span>
      <span className={styles.expandIcon}>
        {expanded ? (
          <Minimize2 className="size-3.5" aria-hidden="true" />
        ) : (
          <Maximize2 className="size-3.5" aria-hidden="true" />
        )}
      </span>
    </span>
  );
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
        position
          ? {
              transform: `translate(${position.x}px, ${position.y}px)`,
              width: position.width,
              height: position.height,
            }
          : undefined
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
              color={result.groupColor ?? priorityAreaColors[result.priority]}
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
                        "--tile-color":
                          result.groupColor ??
                          priorityAreaColors[result.priority] ??
                          "var(--color-dusty-gray)",
                      } as CSSProperties
                    }
                  >
                    <ResultCardContent
                      title={result.title}
                      thumbnail={result.thumbnail}
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
  const [navigationVersion, setNavigationVersion] = useState(0);
  const navigateToPriority = useCallback((priority: string) => {
    setGrouping("priority");
    setNavigationVersion((version) => version + 1);
    const anchor = priorityAreaAnchor(priority);
    window.history.replaceState(window.history.state, "", `#${anchor}`);
    // Wait for the priority groups to mount before following their anchor.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({ block: "start" });
      }),
    );
  }, []);
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
    <OverviewFocusProvider
      key={navigationVersion}
      navigateToPriority={navigateToPriority}
    >
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
        {grouping === "none" && (
          <ResultViewToggle readable={readable} onChange={setReadable} />
        )}
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
    if (result.reference.entity !== focus.entityId) return false;
    if (focus.kind === "result" && visibleTarget)
      return result.id === focus.resultId;
    return (
      !focus.subprogrammeId ||
      result.reference.context.subprogramme?.id === focus.subprogrammeId
    );
  };
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
      if (event.target.closest("[data-explorer-controls]")) {
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
      results.find((result) => result.reference.entity === detailFocus.entityId)
        ?.priority ??
      selectedPriority)
    : selectedPriority;
  const description = useRef<HTMLParagraphElement>(null);
  const headings = useRef(new Map<string, HTMLElement>());
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
  const sizingGroups = useMemo(
    () => [...Map.groupBy(sizingResults, (result) => result.priority)],
    [sizingResults],
  );
  const [layout, setLayout] = useState({ tile: 12, width: 900 });

  useLayoutEffect(() => {
    const measure = () => {
      const measured = [...headings.current].map(
        ([key, element]) =>
          [key, Math.ceil(element.getBoundingClientRect().height)] as const,
      );
      setHeadingHeights((current) => {
        if (measured.every(([key, height]) => current[key] === height))
          return current;
        return { ...current, ...Object.fromEntries(measured) };
      });
      const cards = [...cardContents.current].map(([id, element]) => {
        const { width } = element.getBoundingClientRect();
        const children = [...element.children];
        const height =
          children.reduce(
            (total, child) => total + child.getBoundingClientRect().height,
            0,
          ) +
          Math.max(0, children.length - 1) * 12 +
          24;
        return [
          id,
          { width: width + 2, height: Math.ceil(height) + 2 },
        ] as const;
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
    measure();
    return () => observer.disconnect();
  }, [selectedPriority, selectedEntity, layout.width]);

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
  }, [selectedEntity, layout.width]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const resize = () => {
      const { top, width } = element.getBoundingClientRect();
      if (!width) return;
      const availableHeight = Math.max(80, window.innerHeight - top - 24);
      let tile = 28;
      for (; tile > 6; tile -= 0.5) {
        const totalHeight = sizingGroups.reduce(
          (height, [priority, entries]) =>
            height +
            groupLayout(
              entries.length,
              tile,
              width,
              Math.max(
                labelHeight,
                Math.ceil(
                  priority.length / Math.max(1, (width - groupInset - 110) / 8),
                ) *
                  24 +
                  8,
              ),
            ).height,
          Math.max(0, sizingGroups.length - 1) * groupGap,
        );
        if (totalHeight <= availableHeight) break;
      }
      setLayout((current) =>
        current.tile === tile && current.width === width
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
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [sizingGroups]);

  return (
    <div
      ref={container}
      className={`${styles.groups} mt-5`}
      aria-label="All Secretariat results"
    >
      {groups.map(([priority, entries], index) => {
        const scopeLabel =
          priority === "Unclassified"
            ? "Results without a beneficiary tag"
            : `Results tagged for ${priority}`;
        const expanded = selectedPriority === priority;
        const mutedPriority =
          focusedPriority !== null && focusedPriority !== priority;
        const focusedEntity =
          detailFocus?.entityId ?? (expanded ? selectedEntity : null);
        const detailHasVisibleTarget =
          !detailFocus ||
          detailFocus.kind === "entity" ||
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
          if (!detailFocus) return true;
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
            result.reference.context.subprogramme?.id ===
              detailFocus.subprogrammeId
          );
        };
        const tile = expanded ? Math.max(36, layout.tile * 2) : layout.tile;
        const contentWidth = Math.max(1, layout.width - groupInset);
        const columns = Math.max(
          1,
          Math.floor((contentWidth + gap) / (tile + gap)),
        );
        const zoomTile = Math.max(36, layout.tile * 2);
        const zoomColumns = Math.max(
          1,
          Math.floor((contentWidth - 16 + gap) / (zoomTile + gap)),
        );
        const entities = [
          ...Map.groupBy(entries, (result) => result.reference.entity),
        ];
        const positions = new Map<
          string,
          { x: number; y: number; width?: number; height?: number }
        >();
        let cursor = 0;
        const entityBlocks = entities.map(([entity, entityResults]) => {
          const entityExpanded = expanded && selectedEntity === entity;
          const headingKey = `entity:${priority}:${entity}:${entityExpanded}`;
          const entityName = entityResults[0].reference.context.entity.name;
          const headingSpace =
            (headingHeights[headingKey] ??
              Math.max(
                28,
                Math.ceil(
                  (entityName.length + 12) /
                    Math.max(
                      1,
                      (contentWidth - 116) / (entityExpanded ? 10 : 8),
                    ),
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
          const subgroups: {
            id: string;
            title: string;
            top: number;
            objective: string;
            count: number;
            total: number;
          }[] = [];
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
              const programme =
                programmeResults[0].reference.context.subprogramme;
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
                    programmeTitle.length /
                      Math.max(1, (contentWidth - 16) / 8),
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
                const row = programmeResults.slice(
                  offset,
                  offset + cardColumns,
                );
                const heights = row.map((result) => {
                  const measured = cardSizes[result.id];
                  if (measured && Math.abs(measured.width - cardWidth) < 0.5)
                    return measured.height;
                  return (
                    Math.ceil(
                      result.title.length / Math.max(1, (cardWidth - 24) / 7),
                    ) *
                      23 +
                    (result.thumbnail ? 32 + 12 : 0) +
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
          return block;
        });
        const bodyHeight = expanded
          ? cursor - 12
          : Math.ceil(entries.length / columns) * (tile + gap) - gap;
        const priorityHeadingKey = `priority:${priority}:${expanded}`;
        const height =
          groupPaddingHeight +
          (headingHeights[priorityHeadingKey] ??
            (expanded ? 64 : labelHeight)) +
          bodyHeight;
        const contentId = `${overviewId}-group-${index}`;
        const headingId = `${contentId}-heading`;
        return (
          <section
            key={priority}
            id={!beneficiaryMode ? priorityAreaAnchor(priority) : undefined}
            aria-labelledby={headingId}
            className={styles.group}
            data-expanded={expanded}
            data-expandable={!expanded && !mutedPriority}
            onClick={(event) => {
              if (
                expanded ||
                mutedPriority ||
                !(event.target instanceof Element)
              )
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
            inert={mutedPriority}
            style={
              {
                height,
                "--tile-size": `${tile}px`,
                "--tile-color":
                  entries[0].groupColor ??
                  priorityAreaColors[priority] ??
                  "var(--color-dusty-gray)",
              } as CSSProperties
            }
          >
            <h2
              id={headingId}
              className={styles.groupHeading}
              ref={(element) => {
                if (element) headings.current.set(priorityHeadingKey, element);
                else headings.current.delete(priorityHeadingKey);
              }}
            >
              <span
                className={`${styles.priorityTitle} ${expanded ? resultTypography.priorityExpanded : resultTypography.priority}`}
              >
                {priority}
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="h-auto shrink-0 p-0 hover:bg-transparent"
                disabled={Boolean(focusedEntity)}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${priority}`}
                aria-expanded={expanded}
                aria-controls={contentId}
                onClick={() => {
                  setSelectedEntity(null);
                  setSelectedPriority(expanded ? null : priority);
                }}
              >
                <ExpandCue expanded={expanded} />
              </Button>
            </h2>
            <div
              id={contentId}
              className={styles.canvas}
              style={{ height: bodyHeight }}
            >
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
                    !expanded ||
                    (focusedEntity && focusedEntity !== block.entity),
                  )}
                  style={{ top: block.top, height: block.height }}
                  aria-hidden={!expanded}
                >
                  <h3
                    className={styles.entityTitle}
                    ref={(element) => {
                      if (element)
                        headings.current.set(block.headingKey, element);
                      else headings.current.delete(block.headingKey);
                    }}
                  >
                    <span className={styles.entityHeadingRow}>
                      <span className={styles.entityIdentity}>
                        <span
                          className={`${styles.entityHeading} ${block.expanded ? resultTypography.entityExpanded : resultTypography.entity}`}
                        >
                          <span className="min-w-0 text-left whitespace-normal">
                            {block.label}
                            {block.code && block.code !== block.label && (
                              <span className="ms-2 font-normal">
                                {block.code}
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={!expanded}
                        className="pointer-events-auto h-auto shrink-0 p-0 hover:bg-transparent"
                        aria-expanded={block.expanded}
                        aria-label={`${block.expanded ? "Collapse" : "Expand"} ${block.label}`}
                        onClick={() =>
                          setSelectedEntity(
                            block.expanded ? null : block.entity,
                          )
                        }
                      >
                        <ExpandCue expanded={block.expanded} />
                      </Button>
                    </span>
                    {beneficiaryMode && (
                      <span
                        className={`${resultTypography.metadata} mt-1 block font-normal`}
                      >
                        {scopeLabel} · {block.count} of {block.total} results
                      </span>
                    )}
                  </h3>
                  {block.expanded && (
                    <p
                      ref={description}
                      style={{ top: block.headingSpace }}
                      className={`${resultTypography.description} ${styles.entityDescription}`}
                    >
                      {block.description || "[TODO: Add entity objective text]"}{" "}
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
                        if (element) headings.current.set(key, element);
                        else headings.current.delete(key);
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
                {entries.map((result, index) => (
                  <ResultTile
                    key={result.id}
                    result={result}
                    edition={edition}
                    contentRef={registerCardContent}
                    previewWidth={resultCardWidth(contentWidth)}
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
                      expanded
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
          </section>
        );
      })}
    </div>
  );
}
