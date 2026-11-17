"use client";

import { useEffect, useState } from "react";
import { typography } from "@un-eosg/ui/typography";
import { Button } from "@un-eosg/ui/components/button";
import { DetailSection } from "@un-eosg/ui/components/detail-panel";
import type { FrameworkNode, UninfoCountry, UninfoMetrics } from "@/lib/uninfo";
import { withBasePath } from "@/lib/paths";

const dollars = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function Resources({ metrics }: { metrics: UninfoMetrics }) {
  return (
    <dl className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-3">
      {(
        [
          ["Required", metrics.required],
          ["Available", metrics.available],
          ["Expenditure", metrics.spent],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt className={typography.caption}>{label}</dt>
          <dd className={typography.numeric}>{dollars.format(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

const levels = ["Strategic priority", "Outcome", "Output"];

function FrameworkBranch({
  node,
  level = 0,
}: {
  node: FrameworkNode;
  level?: number;
}) {
  return (
    <details className="my-2 rounded border border-border p-3">
      <summary className={`${typography.body} cursor-pointer font-medium`}>
        <span className={`${typography.caption} mr-2`}>
          {levels[level]} {node.code}
        </span>
        {node.name}
      </summary>
      {node.description && (
        <p className={`${typography.body} mt-3 whitespace-pre-line`}>
          {node.description}
        </p>
      )}
      <Resources metrics={node} />
      {node.children?.map((child) => (
        <FrameworkBranch key={child.id} node={child} level={level + 1} />
      ))}
    </details>
  );
}

export function UninfoCountryDetails({ code }: { code: string }) {
  const [country, setCountry] = useState<UninfoCountry>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    fetch(withBasePath(`/data/uninfo-countries/${code}.json`), {
      signal: request.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load country data");
        return response.json() as Promise<UninfoCountry>;
      })
      .then(setCountry)
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, [code, attempt]);

  if (failed)
    return (
      <div role="alert">
        <p className={typography.body}>Country data could not be loaded.</p>
        <Button
          onClick={() => {
            setFailed(false);
            setAttempt(attempt + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  if (!country)
    return (
      <p role="status" className={typography.meta}>
        Loading country data…
      </p>
    );

  return (
    <>
      {country.geographic_scope === "workspace" && (
        <p className={typography.body}>
          Shared workspace covering {country.workspace_countries.join(", ")}.
          Resources and framework entries cover this entire workspace.
        </p>
      )}
      <DetailSection heading="Results framework">
        <p className={`${typography.caption} mb-3`}>
          {country.framework_year
            ? `Financial observations filtered to ${country.framework_year}.`
            : "The financial reporting period for this framework is unverified in the retained snapshot."}{" "}
          Resources at parent and child levels overlap.
        </p>
        {country.framework?.length ? (
          country.framework.map((node) => (
            <FrameworkBranch key={node.id} node={node} />
          ))
        ) : (
          <p>No results framework was reported in this snapshot.</p>
        )}
      </DetailSection>
      <DetailSection heading="Resources by Sustainable Development Goal">
        <p className={typography.caption}>
          {country.year
            ? `Financial year ${country.year}.`
            : "Financial reporting period unverified."}{" "}
          Amounts in US dollars.
        </p>
        <Resources metrics={country.totals} />
        <details>
          <summary className="cursor-pointer py-2">View SDG breakdown</summary>
          {Object.entries(country.sdgs).map(([sdg, metrics]) => (
            <div key={sdg} className="border-t border-border py-2">
              <h4 className={typography.body}>
                {sdg === "unclassified"
                  ? "Not classified by SDG"
                  : `SDG ${sdg}`}
              </h4>
              <Resources metrics={metrics} />
            </div>
          ))}
        </details>
      </DetailSection>
      {country.projects.length > 0 && (
        <DetailSection heading="Sub-outputs and activities">
          <p className={typography.caption}>
            {country.projects_year
              ? `Financial year ${country.projects_year}.`
              : "Financial reporting period unverified."}{" "}
            Activities may be reported under several agencies.
          </p>
          <details>
            <summary className="cursor-pointer py-2">View activities</summary>
            <ul className="divide-y divide-border">
              {country.projects.map((project) => (
                <li key={project.row_key} className="py-3">
                  <details>
                    <summary className="cursor-pointer">
                      {project.agency} · {project.name}
                    </summary>
                    {project.description && (
                      <p className="my-2 whitespace-pre-line">
                        {project.description}
                      </p>
                    )}
                    {project.start && (
                      <p className={typography.caption}>
                        {project.start} – {project.end ?? "End date unreported"}
                      </p>
                    )}
                    <Resources metrics={project} />
                  </details>
                </li>
              ))}
            </ul>
          </details>
        </DetailSection>
      )}
    </>
  );
}
