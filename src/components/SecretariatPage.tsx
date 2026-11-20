import type { ReactNode } from "react";
import { typography } from "@un-eosg/ui/typography";
import { SiteShell } from "@/components/SiteShell";
import { RelatedResources } from "@/components/RelatedResources";
import { secretariatResources } from "@/lib/related-resources";

export function SecretariatPage({ children }: { children: ReactNode }) {
  return (
    <SiteShell activeHref="/">
      <h1 className={typography.pageTitle}>UN Secretariat Results</h1>
      {children}
      <RelatedResources
        id="secretariat-resources"
        resources={secretariatResources}
      />
    </SiteShell>
  );
}
