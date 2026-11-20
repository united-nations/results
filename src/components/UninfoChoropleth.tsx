"use client";

import { useEffect, useMemo, useState } from "react";
import { HybridMap } from "@undp/data-viz/HybridMap";
import { typography } from "@un-eosg/ui/typography";
import { formatBudget } from "@un-eosg/ui/format-budget";
import { MapInteraction } from "@/components/MapInteraction";
import { useViewportMapLayout } from "@/hooks/useViewportMapLayout";
import { useMapBubbleZoom } from "@/hooks/useMapBubbleZoom";
import { bubbleRadiusInput } from "@/lib/map-bubbles";
import { withBasePath } from "@/lib/paths";
import type {
  UninfoCountrySummary,
  UninfoAnnualExpenditure,
} from "@/lib/uninfo";

const referenceAmount = 1_000_000_000;
const referenceRadius = 12;

type WorldMap = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { ISO3: string; ISO2: string; LAT: number; LON: number };
    geometry: { type: string; coordinates: unknown };
  }[];
};

type CountryDatum = {
  id?: string;
  x?: string;
  lat?: number;
  long?: number;
  radius?: number;
  label?: string;
  data: {
    code: string;
    name: string;
    expenditure: number | null;
    workspaceCountries?: string[];
    shared?: boolean;
  };
};

export function UninfoChoropleth({
  countries,
  annual,
  onSelect,
}: {
  countries: Record<string, UninfoCountrySummary>;
  annual: UninfoAnnualExpenditure;
  onSelect: (code: string) => void;
}) {
  const { height, scale } = useViewportMapLayout();
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
        const workspace =
          annual.workspaces[
            String(annual.countries[properties.ISO3]?.workspace_id)
          ];
        const shared = (workspace?.countries.length ?? 0) > 1;
        return country
          ? [
              {
                id: properties.featureId,
                x: "Available",
                data: {
                  code: properties.ISO3,
                  name: country.name,
                  shared,
                  expenditure:
                    annual.countries[properties.ISO3]?.expenditure ?? null,
                  workspaceCountries:
                    annual.workspaces[
                      String(annual.countries[properties.ISO3]?.workspace_id)
                    ]?.countries,
                },
              },
            ]
          : [];
      }) ?? [],
    [map, countries, annual],
  );
  const bubbles = useMemo<CountryDatum[]>(() => {
    if (!map) return [];
    const workspaces = new Map<
      number,
      { codes: string[]; coordinates: [number, number][] }
    >();
    for (const code of Object.keys(countries)) {
      const record = annual.countries[code];
      if (!record || record.expenditure == null || record.expenditure <= 0)
        continue;
      const feature = map.features.find(
        ({ properties }) => properties.ISO3 === code,
      );
      if (
        !feature ||
        !Number.isFinite(feature.properties.LAT) ||
        !Number.isFinite(feature.properties.LON)
      )
        continue;
      const group = workspaces.get(record.workspace_id) ?? {
        codes: [],
        coordinates: [],
      };
      group.codes.push(code);
      group.coordinates.push([feature.properties.LON, feature.properties.LAT]);
      workspaces.set(record.workspace_id, group);
    }
    return [...workspaces.entries()]
      .map(([id, group]) => {
        const workspace = annual.workspaces[String(id)];
        // Spherical mean keeps shared Pacific frameworks near the date line.
        const vectors = group.coordinates.map(([longitude, latitude]) => {
          const lon = (longitude * Math.PI) / 180;
          const lat = (latitude * Math.PI) / 180;
          return [
            Math.cos(lat) * Math.cos(lon),
            Math.cos(lat) * Math.sin(lon),
            Math.sin(lat),
          ];
        });
        const x = vectors.reduce((sum, point) => sum + point[0], 0);
        const y = vectors.reduce((sum, point) => sum + point[1], 0);
        const z = vectors.reduce((sum, point) => sum + point[2], 0);
        const shared = workspace.countries.length > 1;
        return {
          lat: (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
          long: (Math.atan2(y, x) * 180) / Math.PI,
          radius: bubbleRadiusInput(
            workspace.expenditure!,
            referenceAmount,
            referenceRadius,
          ),
          label: `workspace-${id}`,
          data: {
            code: group.codes[0],
            name: shared
              ? workspace.countries.join(", ")
              : countries[group.codes[0]].name,
            expenditure: workspace.expenditure,
            workspaceCountries: workspace.countries,
            shared,
          },
        };
      })
      .sort((a, b) => (b.data.expenditure ?? 0) - (a.data.expenditure ?? 0));
  }, [map, countries, annual]);
  const container = useMapBubbleZoom();

  if (!map)
    return (
      <p className={`${typography.meta} py-16 text-center`} role="status">
        {failed
          ? "The map could not be loaded. Use the country selector."
          : "Loading map…"}
      </p>
    );

  return (
    <div
      ref={container}
      data-testid="uninfo-map"
      className="result-location-map uninfo-expenditure-map relative"
    >
      <MapInteraction>
        <HybridMap
          data={[...data, ...bubbles]}
          mapData={map}
          mapProperty="featureId"
          ariaLabel={`UN INFO reported expenditure in ${annual.year} by country or shared country-team workspace; circle area represents annual expenditure`}
          height={height}
          mapProjection="equalEarth"
          scale={Math.min(scale, 0.9)}
          centerPoint={[0, 6]}
          zoomInteraction="button"
          mapBorderWidth={0.5}
          mapBorderColor="var(--color-background)"
          mapNoDataColor="var(--color-muted)"
          choroplethScaleType="categorical"
          colorDomain={["Available"]}
          colors={["var(--color-un-blue-tint-50)"]}
          dotColor="var(--color-un-blue)"
          dotBorderColor="var(--color-un-blue)"
          radius={referenceRadius}
          maxRadiusValue={1}
          showLabels={false}
          padding="0px"
          isWorldMap
          showColorScale={false}
          footNote=""
          resetSelectionOnDoubleClick={false}
          tooltip={(point: CountryDatum) => (
            <div className="max-w-xs space-y-1">
              <p className={`${typography.body} font-semibold`}>
                {point.data.name}
              </p>
              <p className={typography.caption}>
                {annual.year} annual expenditure
              </p>
              <p className={typography.body}>
                {point.data.expenditure == null
                  ? `No expenditure reported for ${annual.year}`
                  : `${formatBudget(point.data.expenditure)} reported expenditure`}
              </p>
              {(point.data.workspaceCountries?.length ?? 0) > 1 && (
                <p className={typography.caption}>
                  Shared workspace total; no country allocation available.
                </p>
              )}
            </div>
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
      <div
        className={`${typography.caption} pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded border bg-background/95 px-3 py-2 shadow-sm`}
      >
        <svg aria-hidden="true" width="28" height="28">
          <circle
            cx="14"
            cy="14"
            r={referenceRadius}
            fill="var(--color-un-blue)"
            fillOpacity="0.28"
            stroke="var(--color-un-blue)"
            strokeWidth="1.5"
          />
        </svg>
        <span>{formatBudget(referenceAmount)} expenditure</span>
      </div>
    </div>
  );
}
