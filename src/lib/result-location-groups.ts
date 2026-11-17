// Reviewed OICT coverage sets. Match the entire tag list, including map-only
// codes, so that a different country set does not inherit a region name.
export const namedLocationGroups = [
  {
    title: "ECLAC members and associate members",
    codes:
      "AG AI AR AW BB BM BO BR BS BZ CA CL CO CR CU CW DE DM DO EC EI ES FR GB GD GF GP GT GY HN HT IT JM JP KN KR KY LC MQ MS MX NI NL NO PA PE PI PR PT PY SR SV SX TC TR TT US UY VC VE VG VI",
  },
  {
    title: "African UN Member States",
    codes:
      "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW II KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG QG QQ RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW",
  },
  {
    title: "UNECE member countries",
    codes:
      "AD AL AM AT AZ BA BE BG BY CA CH CY CZ DE DK EE EI ES FI FR GB GE GR HR HU IE IL IS IT KG KU KZ LI LT LU LV MC MD ME MK MT NL NO PI PL PT RO RS RU SE SI SK SM TJ TM TR UA US UZ",
  },
  {
    title: "UNRWA areas of operation",
    codes: "JO LB PS SY",
  },
  {
    title: "ESCWA member countries",
    codes: "AE BH DZ EG IQ JO KW LB LY MA MR OM PS QA QG QQ SA SD SO SY TN YE",
  },
  {
    title: "ECLAC Caribbean subregion",
    codes: "AG BB BS BZ CU DM DO GD GY HT JM KN LC SR TT VC",
  },
  {
    title: "South-eastern Asia",
    codes: "BN ID KH LA MM MY PH SG TH TL VN",
  },
  {
    title: "ESCAP coverage",
    codes:
      "AF AM AP AU AZ BN BT CN FJ FM FR GB GE HK ID IN IR JP KG KH KI KP KR KU KX KZ LA LK MH MM MN MO MV MY NL NP NR NZ PG PH PK PW QQ RU SB SD SG TH TJ TL TM TO TR TV TW US UZ VN VU WS",
  },
];

const locationGroupsByCodes = new Map(
  namedLocationGroups.map((group) => [group.codes, group]),
);

// These extra map shapes are documented in the OICT CountryNames export.
const mapOnlyCodes = new Set(["AP", "EI", "II", "KU", "KX", "PI", "QG", "QQ"]);

export function namedLocationGroup(codes: string[]) {
  return locationGroupsByCodes.get([...codes].sort().join(" "));
}

export function displayLocationCodes(codes: string[]) {
  return codes.filter((code) => !mapOnlyCodes.has(code));
}
