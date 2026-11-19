import { typography } from "@un-eosg/ui/typography";
import snapshot from "../../data/systemchart-entity-documents.json";

const documentTypes = [
  ["reports", "Reports"],
  ["strategicPlan", "Strategic plan"],
  ["resultsFramework", "Results framework"],
] as const;

export function SystemEntityDocuments() {
  return (
    <section aria-labelledby="entity-documents" className="mt-12">
      <h2 id="entity-documents" className={typography.sectionTitle}>
        Entity reports and plans
      </h2>
      <p className={`${typography.caption} mt-2`}>
        Source{" "}
        <a
          href={snapshot.source}
          className="text-un-blue-text underline underline-offset-2"
        >
          UN System Chart
        </a>
      </p>
      <div className="mt-5 space-y-6">
        {snapshot.categories.map((category) => (
          <section key={category.name} className="rounded-lg border">
            <h3
              className={`${typography.subTitle} rounded-t-lg border-b bg-muted px-4 py-2.5`}
            >
              {category.name}
            </h3>
            <ul aria-label={category.name} className="divide-y divide-border">
              {category.entities.map((entity) => (
                <li
                  key={entity.code}
                  className={`${typography.body} px-4 py-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-4`}
                >
                  <span className="font-medium">{entity.name}</span>
                  <div className="mt-1 flex flex-wrap gap-x-4 md:mt-0">
                    {documentTypes.map(([field, label]) => {
                      const href = entity[field];
                      return href ? (
                        <a
                          key={field}
                          href={href}
                          aria-label={`${label} for ${entity.name}`}
                          className="text-un-blue-text underline underline-offset-2 any-pointer-coarse:py-2"
                        >
                          {label}
                        </a>
                      ) : null;
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
