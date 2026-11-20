import {
  BarChart3,
  BookOpen,
  FileText,
  Globe2,
  Landmark,
  Layers,
  Network,
  Users,
  Target,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type RelatedResource = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const openUN: RelatedResource = {
  title: "UN Transparency Portal",
  description: "Financial data on the UN Secretariat and the wider UN system.",
  href: "https://open.un.org/",
  icon: BarChart3,
};

export const secretariatResources: readonly RelatedResource[] = [
  {
    title: "UN Mandate Registry",
    description:
      "Explore UN mandates and their links to programmes and results.",
    href: "https://mandates.un.org/",
    icon: Landmark,
  },
  openUN,
];

export const organizationResources: readonly RelatedResource[] = [
  {
    title: "UN System Chart",
    description: "Organizational structure of the United Nations system.",
    href: "https://systemchart.un.org/",
    icon: Network,
  },
  openUN,
];

export const countryTeamResources: readonly RelatedResource[] = [
  {
    title: "UN INFO",
    description:
      "Country-level Cooperation Frameworks, results and financial reporting.",
    href: "https://uninfo.org/",
    icon: FileText,
  },
  openUN,
  {
    title: "UN Sustainable Development Group",
    description:
      "How the UN works together to advance sustainable development.",
    href: "https://unsdg.un.org/",
    icon: Users,
  },
];

export const evaluationResources: readonly RelatedResource[] = [
  {
    title: "Country-team evaluations",
    description:
      "Evaluation documents from UN country teams in the UNSDG resource library.",
    href: "https://unsdg.un.org/resources/unct-key-documents?f%5B0%5D=country_document_type_api:Eval&page=0",
    icon: FileText,
  },
  {
    title: "System-Wide Evaluation Office",
    description:
      "Independent evaluation evidence on collective UN development results.",
    href: "https://www.un.org/system-wide-evaluation-office/en",
    icon: Globe2,
  },
  {
    title: "United Nations Evaluation Group",
    description:
      "Evaluation standards, guidance and learning across the UN system.",
    href: "https://www.unevaluation.org/",
    icon: BookOpen,
  },
  {
    title: "Global SDG Synthesis Coalition",
    description: "Syntheses of evaluation evidence on what advances the SDGs.",
    href: "https://www.sdgsynthesiscoalition.org/",
    icon: Layers,
  },
];

export const evaluationEvidenceMaps: readonly RelatedResource[] = [
  {
    title: "By country",
    description: "Explore evaluation evidence by country and territory.",
    href: "https://system-wide-evaluation-office.github.io/UN_evaluation_evidence_map/#",
    icon: Globe2,
  },
  {
    title: "By SDG",
    description:
      "Explore evaluation coverage across the Sustainable Development Goals.",
    href: "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_SDGs_v1.0.html",
    icon: Target,
  },
  {
    title: "By QCPR priority",
    description:
      "See evaluation coverage by Quadrennial Comprehensive Policy Review priority.",
    href: "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_QCPR_coverage_v1.0.html",
    icon: LayoutGrid,
  },
  {
    title: "By QCPR priority (detailed evidence)",
    description: "Explore detailed evaluation evidence for each QCPR priority.",
    href: "https://www.sdgsynthesiscoalition.org/sites/default/files/2024-10/UNSWE_Interactive%20Evaluation%20Evidence%20Map_QCPR_detailed%20evidence_V1.0.html",
    icon: ListChecks,
  },
];
