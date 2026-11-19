import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SecondaryHeader } from "@un-eosg/ui/components/secondary-header";
import { typography } from "@un-eosg/ui/typography";
import { BudgetOverviewContent } from "@/components/BudgetOverviewContent";
import { SiteShell } from "@/components/SiteShell";
import {
  type BudgetEntity,
  type BudgetSubprogramme,
  budgetEdition,
  entityHref,
} from "@/lib/programme-budget";
import { cn } from "@/lib/utils";

export function BudgetEntityPage({
  entity,
  selected,
}: {
  entity: BudgetEntity;
  selected?: BudgetSubprogramme;
}) {
  const path = entityHref(entity.id);
  const tabs = entity.subprogrammes.map((subprogramme) => ({
    href: entityHref(entity.id, subprogramme.id),
    label: `SP ${subprogramme.number}`,
    title: subprogramme.name,
  }));

  return (
    <SiteShell>
      <Link
        href="/"
        className={cn(
          typography.meta,
          "inline-flex items-center gap-1.5 text-un-blue-text underline-offset-4 hover:underline",
        )}
      >
        <ArrowLeft aria-hidden className="size-4 shrink-0" />
        All priority areas
      </Link>
      <h1 className={`${typography.pageTitle} mt-5 max-w-4xl text-balance`}>
        {entity.name}
      </h1>
      {tabs.length > 0 && (
        <SecondaryHeader
          label="Subprogrammes"
          className="top-[var(--site-header-height,49px)] mt-6 min-[1408px]:top-[var(--site-header-height,49px)]"
          containerClassName="px-0"
          items={[{ href: path, label: "Overview" }, ...tabs]}
          activeHref={selected ? entityHref(entity.id, selected.id) : path}
          renderLink={(props) => (
            <Link
              {...props}
              title={tabs.find((tab) => tab.href === props.href)?.title}
            />
          )}
        />
      )}

      <div className="mt-7 max-w-4xl space-y-8">
        {selected && (
          <div>
            <p className={typography.eyebrow}>Subprogramme {selected.number}</p>
            <h2 className={`${typography.sectionTitle} mt-2`}>
              {selected.name}
            </h2>
          </div>
        )}
        <BudgetOverviewContent
          entity={entity}
          selected={selected}
          edition={budgetEdition}
        />
      </div>
    </SiteShell>
  );
}
