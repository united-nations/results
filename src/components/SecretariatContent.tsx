"use client";

import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { SecretariatDeliverables } from "@/components/SecretariatDeliverables";

export function SecretariatContent({ children }: { children: ReactNode }) {
  const [view, setView] = useState("results");
  return (
    <>
      <div className="mt-5 mb-4">
        <SegmentedControl
          label="Explore Secretariat"
          value={view}
          onValueChange={setView}
          options={[
            { value: "results", label: "Results" },
            { value: "deliverables", label: "Deliverables" },
          ]}
        />
      </div>
      {view === "results" ? children : <SecretariatDeliverables />}
    </>
  );
}
