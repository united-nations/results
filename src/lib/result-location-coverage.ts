export type LocationCoverage =
  "global-only" | "multi-location" | "country-specific";

// These extra map shapes are documented in the OICT CountryNames export.
const mapOnlyCodes = new Set(["AP", "EI", "II", "KU", "KX", "PI", "QG", "QQ"]);

export function displayLocationCodes(codes: string[]) {
  return codes.filter((code) => !mapOnlyCodes.has(code));
}

export function coverageByLocation(
  results: { locations: string[] | "global" }[],
) {
  const coverage = new Map<string, Exclude<LocationCoverage, "global-only">>();
  for (const { locations } of results) {
    if (locations === "global") continue;
    const kind = locations.length === 1 ? "country-specific" : "multi-location";
    for (const code of locations) {
      if (coverage.get(code) !== "country-specific") coverage.set(code, kind);
    }
  }
  return coverage;
}
