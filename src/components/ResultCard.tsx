import type { ComponentProps, CSSProperties } from "react";
import { typography } from "@un-eosg/ui/typography";
import { ResultThumbnail } from "@/components/ResultThumbnail";
import type { ResultThumbnailData } from "@/lib/result-thumbnail";
import { formatBudgetHeading } from "@/lib/budget-text";
import styles from "./ResultCard.module.css";

export function ResultCardContent({
  title,
  thumbnail,
  contentRef,
}: {
  title: string;
  thumbnail?: ResultThumbnailData;
  contentRef?: (element: HTMLSpanElement | null) => void;
}) {
  return (
    <span className={styles.content} ref={contentRef}>
      <span
        className={`${typography.body} font-normal break-words text-foreground`}
      >
        {formatBudgetHeading(title)}
      </span>
      {thumbnail && (
        <span className={styles.footer}>
          <span className={styles.thumbnail} aria-hidden="true">
            <ResultThumbnail data={thumbnail} />
          </span>
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
  className = "",
  style,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  resultTitle: string;
  thumbnail?: ResultThumbnailData;
  color?: string;
  contentRef?: (element: HTMLSpanElement | null) => void;
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
      />
    </button>
  );
}
