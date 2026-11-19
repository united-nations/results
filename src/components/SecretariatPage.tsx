import type { ReactNode } from "react";
import { typography } from "@un-eosg/ui/typography";
import { SiteShell } from "@/components/SiteShell";

export function SecretariatPage({ children }: { children: ReactNode }) {
  return (
    <SiteShell activeHref="/">
      <h1 className={typography.pageTitle}>UN Secretariat Results</h1>
      {children}
    </SiteShell>
  );
}
