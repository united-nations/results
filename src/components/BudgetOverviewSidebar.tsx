"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@un-eosg/ui/components/button";
import { typography } from "@un-eosg/ui/typography";
import { BudgetOverviewContent } from "@/components/BudgetOverviewContent";
import { SidecarContent } from "@/components/SidecarContent";
import { useOverviewFocus } from "@/components/OverviewFocus";
import { withBasePath } from "@/lib/paths";
import { formatBudgetHeading } from "@/lib/budget-text";
import type { BudgetEntity } from "@/lib/programme-budget";

type OverviewData = {
  entity: BudgetEntity;
  edition: number;
};

export function BudgetOverviewSidebar({
  entityId,
  title,
  subprogrammeId,
  disabled = false,
  label = "Learn more.",
}: {
  entityId: string;
  title: string;
  subprogrammeId?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<OverviewData>();
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState(subprogrammeId);
  useOverviewFocus(
    {
      kind: selectedId ? "subprogramme" : "entity",
      entityId,
      subprogrammeId: selectedId,
    },
    open,
  );

  useEffect(() => {
    if (!open || data) return;
    const controller = new AbortController();
    fetch(withBasePath(`/data/entities/${entityId}/overview.json`), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load overview");
        return response.json() as Promise<OverviewData>;
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [open, data, entityId]);

  const selected = data?.entity.subprogrammes.find(
    (programme) => programme.id === selectedId,
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setSelectedId(subprogrammeId);
          setFailed(false);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          variant="link"
          size="sm"
          disabled={disabled}
          className="pointer-events-auto inline h-auto shrink-0 rounded-none p-0 align-baseline text-sm leading-[inherit] text-foreground underline underline-offset-4"
          aria-label={`${label} ${title}`}
        >
          {label}
        </Button>
      </Dialog.Trigger>
      <SidecarContent
        title={formatBudgetHeading(
          selected?.name ?? (selectedId ? title : (data?.entity.name ?? title)),
        )}
        eyebrow={
          selected
            ? `${data?.entity.code ?? data?.entity.name} · Subprogramme ${selected.number}`
            : "Entity overview"
        }
        closeLabel="Close overview"
        onClose={() => setOpen(false)}
        headerMetadata={
          data && (
            <Link
              className={`${typography.meta} text-un-blue-text underline underline-offset-4`}
              href={`/entities/${entityId}/${selectedId ? `${selectedId}/` : ""}`}
            >
              Open full overview page
            </Link>
          )
        }
      >
        {!data ? (
          <p className={typography.meta} role="status">
            {failed ? "The overview could not be loaded." : "Loading overview…"}
          </p>
        ) : (
          <div className="space-y-8">
            {selected && (
              <Button
                variant="link"
                size="sm"
                className="px-0 has-[>svg]:px-0"
                onClick={() => setSelectedId(undefined)}
              >
                <ArrowLeft aria-hidden="true" />
                {data.entity.code ?? data.entity.name} overview
              </Button>
            )}
            <BudgetOverviewContent
              entity={data.entity}
              selected={selected}
              edition={data.edition}
              onSelectSubprogramme={setSelectedId}
            />
          </div>
        )}
      </SidecarContent>
    </Dialog.Root>
  );
}
