export type ResultCardMetadata = {
  entity?: { name: string; code: string | null };
  beneficiaries?: string[];
  locations?: string[] | "global" | null;
};
