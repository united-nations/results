import { ArrowUpRight } from "lucide-react";
import { typography } from "@un-eosg/ui/typography";

export const contextCardClassName =
  "group block w-full rounded-md border bg-muted/40 p-4 text-left text-foreground hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ContextCardContent({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <>
      <span className={`${typography.meta} mb-1 block text-foreground`}>
        {label}
      </span>
      <span
        className={`${typography.subTitle} flex items-start justify-between gap-3`}
      >
        <span>{title}</span>
        <ArrowUpRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      </span>
    </>
  );
}
