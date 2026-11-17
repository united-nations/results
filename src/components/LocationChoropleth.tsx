"use client";

import { useEffect, useMemo, useState } from "react";
import { ChoroplethMap } from "@undp/data-viz/ChoroplethMap";
import { MapInteraction } from "@/components/MapInteraction";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";
import { withBasePath } from "@/lib/paths";

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
  x: "covered";
  data: { code: string; name: string };
};

export function LocationChoropleth({
  coveredCodes,
  hasGlobal,
  getAreaName,
  onSelect,
}: {
  coveredCodes: ReadonlySet<string>;
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

  const coverage = useMemo<CoverageDatum[]>(
    () =>
      map?.features.flatMap(({ properties: { ISO2: code, featureId } }) =>
        /^[A-Z]{2}$/.test(code) && (hasGlobal || coveredCodes.has(code))
          ? [
              {
                id: featureId,
                x: "covered",
                data: { code, name: getAreaName(code) },
              },
            ]
          : [],
      ) ?? [],
    [map, coveredCodes, hasGlobal, getAreaName],
  );

  if (!map)
    return (
      <p className="py-16 text-center" role="status">
        {failed ? "The map could not be loaded." : "Loading map…"}
      </p>
    );

  return (
    <div
      data-testid="results-location-map"
      className="result-location-map relative w-full bg-background"
    >
      <MapInteraction>
        <ChoroplethMap
          data={coverage}
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
          colorDomain={["covered"]}
          colors={["var(--color-un-blue)"]}
          padding="0px"
          isWorldMap
          showColorScale={false}
          footNote=""
          resetSelectionOnDoubleClick={false}
          tooltip={(point: CoverageDatum) => point.data.name}
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
