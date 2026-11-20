import type { Metadata } from "next";
import { typography } from "@un-eosg/ui/typography";
import { CountryResultsFrameworks } from "@/components/CountryResultsFrameworks";
import { SiteShell } from "@/components/SiteShell";
import { SystemEntityDocuments } from "@/components/SystemEntityDocuments";
import { SystemOverviewTabs } from "@/components/SystemOverviewTabs";
import { RelatedResources } from "@/components/RelatedResources";
import { SystemEvaluations } from "@/components/SystemEvaluations";
import {
  organizationResources,
  countryTeamResources,
} from "@/lib/related-resources";
import manifest from "../../../public/data/uninfo/plans/manifest.json";

export const metadata: Metadata = { title: "UN System" };

export default function UNSystem() {
  return (
    <SiteShell>
      <h1 className={typography.pageTitle}>UN System</h1>
      <SystemOverviewTabs
        organizations={
          <>
            <SystemEntityDocuments />
            <RelatedResources
              id="organization-resources"
              resources={organizationResources}
            />
          </>
        }
        countryTeams={
          <>
            <CountryResultsFrameworks manifest={manifest} />
            <RelatedResources
              id="country-team-resources"
              resources={countryTeamResources}
            />
          </>
        }
        evaluations={<SystemEvaluations />}
      />
    </SiteShell>
  );
}
