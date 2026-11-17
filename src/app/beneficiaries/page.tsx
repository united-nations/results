import type { Metadata } from "next";
import { BeneficiaryDirectory } from "@/components/BeneficiaryDirectory";
import { SecretariatPage } from "@/components/SecretariatPage";
import { budgetEdition } from "@/lib/programme-budget";
import { taggedEntities } from "@/lib/tagged-budget-results";

export const metadata: Metadata = {
  title: "Secretariat Results by Beneficiary",
};

export default function Beneficiaries() {
  return (
    <SecretariatPage activeHref="/beneficiaries/">
      <BeneficiaryDirectory entities={taggedEntities} edition={budgetEdition} />
    </SecretariatPage>
  );
}
