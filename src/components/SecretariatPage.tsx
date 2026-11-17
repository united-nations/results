import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { SecondaryHeader } from "@un-eosg/ui/components/secondary-header";
import { typography } from "@un-eosg/ui/typography";
import { SiteShell } from "@/components/SiteShell";
import { budgetEdition } from "@/lib/programme-budget";

const tabs = [
  { href: "/", label: "Entities and priority areas" },
  { href: "/beneficiaries/", label: "Beneficiaries" },
  { href: "/locations/", label: "Locations" },
];

export function SecretariatPage({
  activeHref,
  children,
}: {
  activeHref: string;
  children: ReactNode;
}) {
  return (
    <SiteShell activeHref="/">
      <h1 className={typography.pageTitle}>UN Secretariat Results</h1>
      <p className={`${typography.prose} mt-4 max-w-2xl`}>
        Explore what each entity plans to achieve and what it reported
        achieving. The results come from the{" "}
        <ExternalLink
          href="https://www.un.org/en/ga/fifth/81/ppb2027.shtml"
          className="text-un-blue-text underline underline-offset-4"
        >
          {budgetEdition} proposed programme budget
        </ExternalLink>
        .
      </p>
      <SecondaryHeader
        label="Browse Secretariat results"
        items={tabs}
        activeHref={activeHref}
        containerClassName="px-0"
        className="top-[var(--site-header-height,49px)] mt-6 min-[1408px]:top-[var(--site-header-height,49px)]"
        renderLink={(props) => <Link {...props} />}
      />
      {children}
    </SiteShell>
  );
}
