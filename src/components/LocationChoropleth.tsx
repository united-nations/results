"use client";

import { useEffect, useMemo, useState } from "react";
import { typography } from "@un-eosg/ui/typography";
import { ChoroplethMap } from "@undp/data-viz/ChoroplethMap";
import { MapInteraction } from "@/components/MapInteraction";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";
import { withBasePath } from "@/lib/paths";
import type { LocationCoverage } from "@/lib/result-location-coverage";

const coverageStyles = {
  "global-only": { label: "Global only", color: "var(--color-un-blue-tint)" },
  "multi-location": {
    label: "Across multiple locations",
    color: "var(--color-un-blue)",
  },
  "country-specific": {
    label: "Country-specific",
    color: "var(--color-un-blue-shade)",
  },
};

type MapFeature = {
  type: "Feature";
  properties: { ISO2: string };
  geometry: { type: string; coordinates: unknown };
};

type WorldMap = {
  type: "FeatureCollection";
  features: MapFeature[];
};

type CoverageDatum = {
  id: string;
  x: LocationCoverage;
  data: { code: string; name: string };
};

export function LocationChoropleth({
  coverage,
  hasGlobal,
  getAreaName,
  onSelect,
}: {
  coverage: ReadonlyMap<string, LocationCoverage>;
  hasGlobal: boolean;
  getAreaName: (code: string) => string;
  onSelect: (code: string) => void;
}) {
  const height = useViewportMapHeight(540);
  const [worldMap, setWorldMap] = useState<WorldMap>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const request = new AbortController();
    fetch(withBasePath("/data/world-map.geojson"), { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the basemap");
        return response.json() as Promise<WorldMap>;
      })
      .then((data) => {
        if (!request.signal.aborted) setWorldMap(data);
      })
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, []);

  const map = useMemo(() => {
    if (!worldMap) return undefined;
    return {
      ...worldMap,
      features: worldMap.features
        .filter(({ properties }) => properties.ISO2 !== "AQ")
        .map((feature, index) => ({
          ...feature,
          // The library joins on one feature per ID. Keep every shape when
          // a country has several features in the bundled basemap.
          properties: { ...feature.properties, featureId: String(index) },
        })),
    };
  }, [worldMap]);

  const chartData = useMemo<CoverageDatum[]>(
    () =>
      map?.features.flatMap(({ properties: { ISO2: code, featureId } }) => {
        if (!/^[A-Z]{2}$/.test(code)) return [];
        const kind =
          coverage.get(code) ?? (hasGlobal ? "global-only" : undefined);
        return kind
          ? [
              {
                id: featureId,
                x: kind,
                data: { code, name: getAreaName(code) },
              },
            ]
          : [];
      }) ?? [],
    [map, coverage, hasGlobal, getAreaName],
  );

  if (!map)
    return (
      <p className={`${typography.meta} py-16 text-center`} role="status">
        {failed ? "The map could not be loaded." : "Loading map…"}
      </p>
    );

  return (
    <div
      data-testid="results-location-map"
      className="result-location-map relative w-full bg-background"
    >
      <ul
        aria-label="Most specific results by location"
        className={`${typography.caption} flex flex-wrap gap-x-4 gap-y-2`}
      >
        {Object.values(coverageStyles).map(({ label, color }) => (
          <li className="flex items-center gap-2" key={label}>
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm border border-border"
              style={{ backgroundColor: color }}
            />
            {label}
          </li>
        ))}
      </ul>
      <MapInteraction>
        <ChoroplethMap
          data={chartData}
          mapData={map}
          mapProperty="featureId"
          ariaLabel="Map of countries and areas with Secretariat results"
          height={height}
          mapProjection="equalEarth"
          scale={1.15}
          centerPoint={[0, 6]}
          zoomInteraction="button"
          mapBorderWidth={0.5}
          mapBorderColor="var(--color-background)"
          mapNoDataColor="var(--color-muted)"
          scaleType="categorical"
          colorDomain={Object.keys(coverageStyles)}
          colors={Object.values(coverageStyles).map(({ color }) => color)}
          padding="0px"
          isWorldMap
          showColorScale={false}
          footNote=""
          resetSelectionOnDoubleClick={false}
          tooltip={(point: CoverageDatum) => (
            <span className={typography.body}>
              {point.data.name} · {coverageStyles[point.x].label}
            </span>
          )}
          onSeriesMouseClick={(point: CoverageDatum | undefined) => {
            if (point) onSelect(point.data.code);
          }}
          styles={{
            tooltip: {
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              padding: "8px 12px",
            },
          }}
        />
      </MapInteraction>
    </div>
  );
}
