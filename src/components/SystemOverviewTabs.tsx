"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { SecondaryHeader } from "@un-eosg/ui/components/secondary-header";

const views = [
  { value: "organizations", label: "Organizations" },
  { value: "country-teams", label: "Country teams" },
  { value: "evaluations", label: "Evaluations" },
] as const;
type View = (typeof views)[number]["value"];

export function SystemOverviewTabs({
  organizations,
  countryTeams,
  evaluations,
}: {
  organizations: ReactNode;
  countryTeams: ReactNode;
  evaluations: ReactNode;
}) {
  const id = useId();
  const [active, setActive] = useState<View>("organizations");
  const [visited, setVisited] = useState<View[]>(["organizations"]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const panels: Record<View, ReactNode> = {
    organizations,
    "country-teams": countryTeams,
    evaluations,
  };
  function select(value: View) {
    setActive(value);
    setVisited((current) =>
      current.includes(value) ? current : [...current, value],
    );
  }
  return (
    <div className="mt-6">
      <div role="tablist" aria-label="UN system views" className="border-b">
        <SecondaryHeader
          items={views.map((view) => ({ href: view.value, label: view.label }))}
          label="UN system views"
          activeHref={active}
          className="static border-0 bg-transparent backdrop-blur-none"
          containerClassName="p-0"
          renderLink={({ href, children, className }) => {
            const index = views.findIndex((view) => view.value === href);
            const view = views[index];
            return (
              <button
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${id}-${view.value}-tab`}
                aria-controls={`${id}-${view.value}-panel`}
                aria-selected={active === view.value}
                tabIndex={active === view.value ? 0 : -1}
                onClick={() => select(view.value)}
                onKeyDown={(event) => {
                  let target: number;
                  if (event.key === "ArrowRight")
                    target = (index + 1) % views.length;
                  else if (event.key === "ArrowLeft")
                    target = (index + views.length - 1) % views.length;
                  else if (event.key === "Home") target = 0;
                  else if (event.key === "End") target = views.length - 1;
                  else return;
                  event.preventDefault();
                  select(views[target].value);
                  buttons.current[target]?.focus();
                }}
                className={`${className} cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-un-blue`}
              >
                {children}
              </button>
            );
          }}
        />
      </div>
      {views.map((view) => (
        <div
          key={view.value}
          role="tabpanel"
          id={`${id}-${view.value}-panel`}
          aria-labelledby={`${id}-${view.value}-tab`}
          hidden={active !== view.value}
          tabIndex={0}
          className="pt-6 focus-visible:outline-2 focus-visible:outline-un-blue"
        >
          {visited.includes(view.value) && panels[view.value]}
        </div>
      ))}
    </div>
  );
}
