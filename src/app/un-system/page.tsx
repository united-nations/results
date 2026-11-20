import type { Metadata } from "next";
import { typography } from "@un-eosg/ui/typography";
import { CountryResultsFrameworks } from "@/components/CountryResultsFrameworks";
import { SiteShell } from "@/components/SiteShell";
import { SystemEntityDocuments } from "@/components/SystemEntityDocuments";
import { SystemOverviewTabs } from "@/components/SystemOverviewTabs";
import manifest from "../../../public/data/uninfo/plans/manifest.json";

export const metadata: Metadata = { title: "UN System" };

export default function UNSystem() {
  return (
    <SiteShell>
      <h1 className={typography.pageTitle}>UN System</h1>
      <SystemOverviewTabs
        organizations={<SystemEntityDocuments />}
        countryTeams={<CountryResultsFrameworks manifest={manifest} />}
      />
    </SiteShell>
  );
}
