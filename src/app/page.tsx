import type { Metadata } from "next";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = { title: "UN Secretariat Results" };

export default function UNSecretariat() {
  return <SecretariatOverview />;
}
