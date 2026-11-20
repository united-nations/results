"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";
import styles from "./ResultsOverview.module.css";

export const resultTypography = {
  priority: typography.subTitle,
  priorityExpanded: typography.cardTitle,
  entity: typography.subTitle,
  entityExpanded: `${typography.lead} font-semibold`,
  subprogramme: typography.subTitle,
  result: `${typography.body} font-normal`,
  description: typography.body,
  metadata: `${typography.body} text-foreground`,
};

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

export function OverviewGroupHeading({
  title,
  expanded,
  onToggle,
  contentId,
  headingId,
  headingRef,
  disabled = false,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  contentId: string;
  headingId: string;
  headingRef?: (element: HTMLHeadingElement | null) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <h2 id={headingId} className={styles.groupHeading} ref={headingRef}>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span
          className={`${styles.priorityTitle} ${expanded ? resultTypography.priorityExpanded : resultTypography.priority}`}
        >
          {title}
        </span>
        {children}
      </span>
      <Button
        variant="ghost"
        size="xs"
        className="h-auto shrink-0 p-0 hover:bg-transparent"
        disabled={disabled}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <ExpandCue expanded={expanded} />
      </Button>
    </h2>
  );
}

export function AnimatedResultsContent({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () =>
      setHeight(Math.ceil(element.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = content.current?.animate(
      [
        { opacity: 0.45, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [transitionKey]);
  return (
    <div className={styles.animatedContent} style={{ height }}>
      <div ref={content} className={styles.animatedContentBody}>
        {children}
      </div>
    </div>
  );
}

export function OverviewEntityHeading({
  title,
  code,
  expanded,
  onToggle,
  contentId,
  headingRef,
  level = 3,
  disabled = false,
  children,
}: {
  title: string;
  code: string | null;
  expanded: boolean;
  onToggle: () => void;
  contentId?: string;
  headingRef?: (element: HTMLHeadingElement | null) => void;
  level?: number;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <h3 aria-level={level} className={styles.entityTitle} ref={headingRef}>
      <span className={styles.entityHeadingRow}>
        <span className={styles.entityIdentity}>
          <span
            className={`${styles.entityHeading} ${expanded ? resultTypography.entityExpanded : resultTypography.entity}`}
          >
            <span className="min-w-0 text-left whitespace-normal">
              {title}
              {code && code !== title && (
                <span className="ms-2 font-normal">{code}</span>
              )}
            </span>
          </span>
        </span>
        <Button
          variant="ghost"
          size="xs"
          disabled={disabled}
          className="pointer-events-auto h-auto shrink-0 p-0 hover:bg-transparent"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
          onClick={onToggle}
        >
          <ExpandCue expanded={expanded} />
        </Button>
      </span>
      {children}
    </h3>
  );
}

export function HierarchyPreview<T extends { id: string }>({
  items,
  label,
  onExplore,
  exploreTargetId,
  renderItem,
  itemLabel = "results",
  focusItemSelector = "li[data-readable] button",
}: {
  items: T[];
  label: string;
  onExplore?: () => void;
  exploreTargetId?: string;
  renderItem: (item: T) => ReactNode;
  itemLabel?: string;
  focusItemSelector?: string;
}) {
  const grid = useRef<HTMLUListElement>(null);
  const [columns, setColumns] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const contentId = useId();
  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () =>
      setColumns(
        Math.max(
          1,
          Math.min(
            4,
            Math.floor((element.getBoundingClientRect().width + 12) / 242),
          ),
        ),
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const total = new Set(items.map((result) => result.id)).size;
  const expandable = Boolean(onExplore) || items.length > columns;
  const previewCount = expandable ? Math.max(1, columns - 1) : columns;
  const visible = showAll ? items : items.slice(0, previewCount);
  const explore = () => {
    if (onExplore) {
      onExplore();
      requestAnimationFrame(() => {
        const target = exploreTargetId
          ? document.getElementById(exploreTargetId)
          : null;
        target
          ?.querySelector<HTMLElement>(
            "[data-entity-expanded] h3 button, li[data-readable] button",
          )
          ?.focus({ preventScroll: true });
      });
    } else {
      setShowAll(true);
      requestAnimationFrame(() => {
        grid.current
          ?.querySelectorAll<HTMLElement>(focusItemSelector)
          [visible.length]?.focus({ preventScroll: true });
      });
    }
  };
  return (
    <div>
      <AnimatedResultsContent transitionKey={showAll ? "all" : "preview"}>
        <ul
          ref={grid}
          id={contentId}
          aria-label={label}
          className={styles.previewGrid}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visible.map(renderItem)}
          {!showAll && expandable && (
            <li
              className={
                columns === 1 ? styles.exploreCompact : styles.exploreTile
              }
            >
              <Button
                variant="ghost"
                aria-label={`${onExplore ? "Explore" : "Show"} all ${total} ${itemLabel} in ${label}`}
                aria-expanded={false}
                aria-controls={onExplore ? exploreTargetId : contentId}
                className={styles.exploreButton}
                onClick={explore}
              >
                <span className={styles.exploreCircle}>
                  <ArrowDown className="size-4" aria-hidden="true" />
                </span>
                <span className={typography.caption}>
                  {onExplore ? "Explore" : "Show"} all {total} {itemLabel}
                </span>
              </Button>
            </li>
          )}
        </ul>
      </AnimatedResultsContent>
      {showAll && (
        <Button
          variant="link"
          className="mt-2 text-foreground"
          aria-expanded={true}
          aria-controls={contentId}
          onClick={() => {
            setShowAll(false);
            requestAnimationFrame(() =>
              grid.current
                ?.querySelector<HTMLElement>("li:last-child button")
                ?.focus({ preventScroll: true }),
            );
          }}
        >
          Show fewer {itemLabel}
        </Button>
      )}
    </div>
  );
}
