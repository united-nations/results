import type { Metadata } from "next";
import { ResultLocations } from "@/components/ResultLocations";
import { SecretariatPage } from "@/components/SecretariatPage";
import { budgetEdition } from "@/lib/programme-budget";
import { taggedEntities } from "@/lib/tagged-budget-results";

export const metadata: Metadata = { title: "Secretariat Results by Location" };

export default function Locations() {
  return (
    <SecretariatPage>
      <ResultLocations entities={taggedEntities} edition={budgetEdition} />
    </SecretariatPage>
  );
}
