import { typography } from "@un-eosg/ui/typography";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { RelatedResources } from "@/components/RelatedResources";
import {
  evaluationResources,
  evaluationEvidenceMaps,
} from "@/lib/related-resources";

export function SystemEvaluations() {
  return (
    <section aria-labelledby="system-evaluations-title">
      <h2 id="system-evaluations-title" className={typography.sectionTitle}>
        Evaluations
      </h2>
      <p className={`${typography.body} mt-2 max-w-2xl`}>
        Find independent evaluations, evaluation guidance and syntheses of
        evidence on progress towards the Sustainable Development Goals.
      </p>
      <RelatedResources
        id="evaluation-evidence-maps"
        title="Evaluation evidence maps"
        resources={evaluationEvidenceMaps}
        headingLevel={3}
        columns={2}
      >
        <ExternalLink
          href="https://www.un.org/system-wide-evaluation-office/en/evidence-maps"
          className={`${typography.body} text-un-blue-text underline underline-offset-2`}
        >
          Read more about evaluation evidence maps
        </ExternalLink>
      </RelatedResources>
      <RelatedResources
        id="evaluation-resources"
        resources={evaluationResources}
        headingLevel={3}
      />
    </section>
  );
}
