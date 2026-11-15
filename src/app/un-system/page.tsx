import type { Metadata } from "next";
import { typography } from "@un-eosg/ui/typography";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = { title: "UN System" };

export default function UNSystem() {
  return (
    <SiteShell>
      <h1 className={typography.pageTitle}>UN System</h1>
    </SiteShell>
  );
}
