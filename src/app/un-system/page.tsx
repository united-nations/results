import type { Metadata } from "next";
import { typography } from "@un-eosg/ui/typography";
import { CountryResultsFrameworks } from "@/components/CountryResultsFrameworks";
import { SiteShell } from "@/components/SiteShell";
import { SystemEntityDocuments } from "@/components/SystemEntityDocuments";
import manifest from "../../../public/data/uninfo/plans/manifest.json";

export const metadata: Metadata = { title: "UN System" };

export default function UNSystem() {
  return (
    <SiteShell>
      <h1 className={typography.pageTitle}>UN System</h1>
      <a
        href="#entity-documents"
        className={`${typography.body} mt-3 inline-block text-un-blue-text underline underline-offset-2`}
      >
        Browse entity reports and plans
      </a>
      <CountryResultsFrameworks manifest={manifest} />
      <SystemEntityDocuments />
    </SiteShell>
  );
}
