"use client";

import { useEffect, useMemo, useState } from "react";
import { ChoroplethMap } from "@undp/data-viz/ChoroplethMap";
import { typography } from "@un-eosg/ui/typography";
import { MapInteraction } from "@/components/MapInteraction";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";
import { withBasePath } from "@/lib/paths";
import type { UninfoCountrySummary } from "@/lib/uninfo";

type WorldMap = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { ISO3: string; ISO2: string };
    geometry: { type: string; coordinates: unknown };
  }[];
};

type CountryDatum = {
  id: string;
  x: string;
  data: { code: string; name: string };
};

export function UninfoChoropleth({
  countries,
  onSelect,
}: {
  countries: Record<string, UninfoCountrySummary>;
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
      .then(setWorldMap)
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, []);

  const map = useMemo(
    () =>
      worldMap && {
        ...worldMap,
        features: worldMap.features
          .filter(({ properties }) => properties.ISO2 !== "AQ")
          .map((feature, index) => ({
            ...feature,
            // Preserve every shape for countries with multiple map features.
            properties: { ...feature.properties, featureId: String(index) },
          })),
      },
    [worldMap],
  );
  const data = useMemo<CountryDatum[]>(
    () =>
      map?.features.flatMap(({ properties }) => {
        const country = countries[properties.ISO3];
        return country
          ? [
              {
                id: properties.featureId,
                x: "Available",
                data: { code: properties.ISO3, name: country.name },
              },
            ]
          : [];
      }) ?? [],
    [map, countries],
  );

  if (!map)
    return (
      <p className={`${typography.meta} py-16 text-center`} role="status">
        {failed
          ? "The map could not be loaded. Use the country selector."
          : "Loading map…"}
      </p>
    );

  return (
    <div data-testid="uninfo-map" className="result-location-map">
      <MapInteraction>
        <ChoroplethMap
          data={data}
          mapData={map}
          mapProperty="featureId"
          ariaLabel="Countries with available results frameworks"
          height={height}
          mapProjection="equalEarth"
          scale={1.15}
          centerPoint={[0, 6]}
          zoomInteraction="button"
          mapBorderWidth={0.5}
          mapBorderColor="var(--color-background)"
          mapNoDataColor="var(--color-muted)"
          scaleType="categorical"
          colorDomain={["Available"]}
          colors={["var(--color-un-blue)"]}
          padding="0px"
          isWorldMap
          showColorScale={false}
          footNote=""
          resetSelectionOnDoubleClick={false}
          tooltip={(point: CountryDatum) => (
            <span className={typography.body}>{point.data.name}</span>
          )}
          onSeriesMouseClick={(point: CountryDatum | undefined) => {
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
