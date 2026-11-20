"use client";

import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { FinancialPanelHeading } from "@un-eosg/ui/components/financial-panel-parts";
import { typography } from "@un-eosg/ui/typography";
import { FileText } from "lucide-react";
import { usePublicJson } from "@/hooks/usePublicJson";

const overviewURL =
  "https://unsdg.un.org/resources/unct-key-documents?f%5B0%5D=country_document_type_api:Eval&page=0";

type EvaluationIndex = {
  countries: Record<
    string,
    { current: EvaluationReport[]; previous: EvaluationReport[] }
  >;
};

type EvaluationReport = { title: string; url: string; period: string };

function ReportList({ reports }: { reports: EvaluationReport[] }) {
  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li key={report.url}>
          <ExternalLink
            href={report.url}
            className="group flex items-start gap-4 rounded-lg border bg-background p-3 transition-colors hover:border-un-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
          >
            <span
              aria-hidden="true"
              className="flex aspect-[210/297] w-16 shrink-0 flex-col items-center justify-center gap-2 rounded-sm border bg-muted text-muted-foreground sm:w-20"
            >
              <FileText className="size-6 opacity-50" />
              <span className={`${typography.caption} px-1 text-center`}>
                Cover preview
              </span>
            </span>
            <span className="min-w-0 py-1">
              <span
                className={`${typography.body} block text-un-blue-text underline-offset-2 group-hover:underline`}
              >
                {report.title}
              </span>
              <span className={`${typography.caption} mt-2 block`}>
                {report.period} · Cover preview pending
              </span>
            </span>
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}

export function UninfoEvaluationLinks({
  countryCode,
  currentPeriod,
}: {
  countryCode: string;
  currentPeriod: string;
}) {
  const { data, failed } = usePublicJson<EvaluationIndex>(
    "/data/uninfo/evaluations.json",
  );
  const current = data?.countries[countryCode]?.current ?? [];
  const previous = data?.countries[countryCode]?.previous ?? [];
  return (
    <section aria-label="Framework evaluations">
      <FinancialPanelHeading className="mb-3">
        Evaluations
      </FinancialPanelHeading>
      {data ? (
        <div className="mb-4 space-y-5">
          <section aria-label="Current period evaluations">
            <FinancialPanelHeading subheading className="mb-3">
              Current period ({currentPeriod})
            </FinancialPanelHeading>
            {current.length ? (
              <ReportList reports={current} />
            ) : (
              <p className={typography.caption}>
                No verified report for the current period.
              </p>
            )}
          </section>
          <section aria-label="Previous period evaluations">
            <FinancialPanelHeading subheading className="mb-3">
              Previous periods
            </FinancialPanelHeading>
            {previous.length ? (
              <ReportList reports={previous} />
            ) : (
              <p className={typography.caption}>
                No verified reports for previous periods.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className={`${typography.caption} mb-3`}>
          {failed
            ? "Evaluation links could not be loaded. Browse the UNSDG library below."
            : "Loading evaluation links…"}
        </p>
      )}
      <ExternalLink
        href={overviewURL}
        className={`${typography.body} text-un-blue-text underline underline-offset-2`}
      >
        Browse all country-team evaluation documents
      </ExternalLink>
      <ExternalLink
        href="https://unsdg.un.org/evaluating-impact"
        className={`${typography.body} mt-2 block text-un-blue-text underline underline-offset-2`}
      >
        Evaluating impact — UNSDG
      </ExternalLink>
    </section>
  );
}
