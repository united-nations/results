import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { ExternalLink } from "@un-eosg/ui/components/external-link";
import { typography } from "@un-eosg/ui/typography";
import type { RelatedResource } from "@/lib/related-resources";
import type { ReactNode } from "react";

/** Match Open UN's resource-card composition using shared typography and tokens. */
export function RelatedResources({
  id,
  resources,
  headingLevel = 2,
  title = "Related resources",
  columns = 3,
  children,
}: {
  id: string;
  resources: readonly RelatedResource[];
  headingLevel?: 2 | 3;
  title?: string;
  columns?: 2 | 3;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const CardHeading = headingLevel === 3 ? "h4" : "h3";
  return (
    <section aria-labelledby={id} className="mt-12 border-t pt-8">
      <Heading id={id} className={typography.sectionTitle}>
        {title}
      </Heading>
      <div
        className={`mt-5 grid gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}
      >
        {resources.map(({ title, description, href, icon: Icon }) => (
          <ExternalLink
            key={href}
            href={href}
            className="group block rounded-lg border bg-background p-6 transition-all hover:border-un-blue hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-un-blue"
                />
                <CardHeading
                  className={`${typography.subTitle} group-hover:text-un-blue-text`}
                >
                  {title}
                </CardHeading>
              </div>
              <ExternalLinkIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-un-blue-text"
              />
            </div>
            <p className={`${typography.body} mt-2 text-muted-foreground`}>
              {description}
            </p>
          </ExternalLink>
        ))}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
