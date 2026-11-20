import type { ComponentProps, CSSProperties } from "react";
import { typography } from "@un-eosg/ui/typography";
import { ResultThumbnail } from "@/components/ResultThumbnail";
import type { ResultThumbnailData } from "@/lib/result-thumbnail";
import { formatBudgetHeading } from "@/lib/budget-text";
import type { ResultCardMetadata } from "@/lib/result-card-metadata";
import { displayLocationCodes } from "@/lib/result-location-coverage";
import styles from "./ResultCard.module.css";

export function ResultCardContent({
  title,
  thumbnail,
  contentRef,
  metadata,
}: {
  title: string;
  thumbnail?: ResultThumbnailData;
  contentRef?: (element: HTMLSpanElement | null) => void;
  metadata?: ResultCardMetadata;
}) {
  const beneficiaries = [...new Set(metadata?.beneficiaries ?? [])].map(
    formatBudgetHeading,
  );
  const locationCount = Array.isArray(metadata?.locations)
    ? new Set(displayLocationCodes(metadata.locations)).size
    : 0;
  const locationLabel =
    metadata?.locations === "global"
      ? "Global reach"
      : locationCount
        ? `${locationCount} ${locationCount === 1 ? "location" : "locations"}`
        : "";
  const hasMetadata = Boolean(
    metadata?.entity || beneficiaries.length || locationLabel,
  );
  return (
    <span className={styles.content} ref={contentRef}>
      <span
        className={`${typography.body} font-normal break-words text-foreground`}
      >
        {formatBudgetHeading(title)}
      </span>
      {(thumbnail || hasMetadata) && (
        <span className={styles.footer}>
          {thumbnail && (
            <span className={styles.thumbnail} aria-hidden="true">
              <ResultThumbnail data={thumbnail} />
            </span>
          )}
          {hasMetadata && (
            <span className={`${typography.caption} ${styles.metadata}`}>
              <span className="block">
                {metadata?.entity && (
                  <abbr title={metadata.entity.name} className="no-underline">
                    {metadata.entity.code || metadata.entity.name}
                  </abbr>
                )}
                {metadata?.entity && locationLabel ? " · " : ""}
                {locationLabel}
              </span>
              {beneficiaries.length > 0 && (
                <span
                  className="mt-1 line-clamp-2"
                  title={beneficiaries.join(" · ")}
                >
                  {beneficiaries.join(" · ")}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function ResultCard({
  resultTitle,
  thumbnail,
  color,
  contentRef,
  metadata,
  className = "",
  style,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  resultTitle: string;
  thumbnail?: ResultThumbnailData;
  color?: string;
  contentRef?: (element: HTMLSpanElement | null) => void;
  metadata?: ResultCardMetadata;
}) {
  return (
    <button
      type="button"
      aria-label={formatBudgetHeading(resultTitle)}
      {...props}
      className={`${styles.card} ${className}`}
      style={
        { "--tile-color": color ?? "var(--primary)", ...style } as CSSProperties
      }
    >
      <ResultCardContent
        title={resultTitle}
        thumbnail={thumbnail}
        contentRef={contentRef}
        metadata={metadata}
      />
    </button>
  );
}
