import type { Metadata } from "next";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "Secretariat Results by Beneficiary",
};

export default function Beneficiaries() {
  return <SecretariatOverview initialGrouping="beneficiary" />;
}
