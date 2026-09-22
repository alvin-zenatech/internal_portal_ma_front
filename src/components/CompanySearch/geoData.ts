import fuzzysort from "fuzzysort";

export interface CountryItem {
  code: string;
  name: string;
  flag: string;
}

export interface StateItem {
  code: string;
  name: string;
  countryCode: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

export const STATES_BY_COUNTRY: Record<string, StateItem[]> = {
  CA: [
    { code: "ON", name: "Ontario", countryCode: "CA" },
    { code: "BC", name: "British Columbia", countryCode: "CA" },
    { code: "AB", name: "Alberta", countryCode: "CA" },
    { code: "QC", name: "Quebec", countryCode: "CA" },
    { code: "MB", name: "Manitoba", countryCode: "CA" },
    { code: "SK", name: "Saskatchewan", countryCode: "CA" },
    { code: "NS", name: "Nova Scotia", countryCode: "CA" },
    { code: "NB", name: "New Brunswick", countryCode: "CA" },
    { code: "NL", name: "Newfoundland and Labrador", countryCode: "CA" },
    { code: "PE", name: "Prince Edward Island", countryCode: "CA" },
    { code: "NT", name: "Northwest Territories", countryCode: "CA" },
    { code: "YT", name: "Yukon", countryCode: "CA" },
    { code: "NU", name: "Nunavut", countryCode: "CA" },
  ],
  US: [
    { code: "AL", name: "Alabama", countryCode: "US" },
    { code: "AK", name: "Alaska", countryCode: "US" },
    { code: "AZ", name: "Arizona", countryCode: "US" },
    { code: "AR", name: "Arkansas", countryCode: "US" },
    { code: "CA", name: "California", countryCode: "US" },
    { code: "CO", name: "Colorado", countryCode: "US" },
    { code: "CT", name: "Connecticut", countryCode: "US" },
    { code: "DE", name: "Delaware", countryCode: "US" },
    { code: "FL", name: "Florida", countryCode: "US" },
    { code: "GA", name: "Georgia", countryCode: "US" },
    { code: "HI", name: "Hawaii", countryCode: "US" },
    { code: "ID", name: "Idaho", countryCode: "US" },
    { code: "IL", name: "Illinois", countryCode: "US" },
    { code: "IN", name: "Indiana", countryCode: "US" },
    { code: "IA", name: "Iowa", countryCode: "US" },
    { code: "KS", name: "Kansas", countryCode: "US" },
    { code: "KY", name: "Kentucky", countryCode: "US" },
    { code: "LA", name: "Louisiana", countryCode: "US" },
    { code: "ME", name: "Maine", countryCode: "US" },
    { code: "MD", name: "Maryland", countryCode: "US" },
    { code: "MA", name: "Massachusetts", countryCode: "US" },
    { code: "MI", name: "Michigan", countryCode: "US" },
    { code: "MN", name: "Minnesota", countryCode: "US" },
    { code: "MS", name: "Mississippi", countryCode: "US" },
    { code: "MO", name: "Missouri", countryCode: "US" },
    { code: "MT", name: "Montana", countryCode: "US" },
    { code: "NE", name: "Nebraska", countryCode: "US" },
    { code: "NV", name: "Nevada", countryCode: "US" },
    { code: "NH", name: "New Hampshire", countryCode: "US" },
    { code: "NJ", name: "New Jersey", countryCode: "US" },
    { code: "NM", name: "New Mexico", countryCode: "US" },
    { code: "NY", name: "New York", countryCode: "US" },
    { code: "NC", name: "North Carolina", countryCode: "US" },
    { code: "ND", name: "North Dakota", countryCode: "US" },
    { code: "OH", name: "Ohio", countryCode: "US" },
    { code: "OK", name: "Oklahoma", countryCode: "US" },
    { code: "OR", name: "Oregon", countryCode: "US" },
    { code: "PA", name: "Pennsylvania", countryCode: "US" },
    { code: "RI", name: "Rhode Island", countryCode: "US" },
    { code: "SC", name: "South Carolina", countryCode: "US" },
    { code: "SD", name: "South Dakota", countryCode: "US" },
    { code: "TN", name: "Tennessee", countryCode: "US" },
    { code: "TX", name: "Texas", countryCode: "US" },
    { code: "UT", name: "Utah", countryCode: "US" },
    { code: "VT", name: "Vermont", countryCode: "US" },
    { code: "VA", name: "Virginia", countryCode: "US" },
    { code: "WA", name: "Washington", countryCode: "US" },
    { code: "WV", name: "West Virginia", countryCode: "US" },
    { code: "WI", name: "Wisconsin", countryCode: "US" },
    { code: "WY", name: "Wyoming", countryCode: "US" },
  ],
  GB: [
    { code: "ENG", name: "England", countryCode: "GB" },
    { code: "SCT", name: "Scotland", countryCode: "GB" },
    { code: "WLS", name: "Wales", countryCode: "GB" },
    { code: "NIR", name: "Northern Ireland", countryCode: "GB" },
  ],
  AU: [
    { code: "NSW", name: "New South Wales", countryCode: "AU" },
    { code: "VIC", name: "Victoria", countryCode: "AU" },
    { code: "QLD", name: "Queensland", countryCode: "AU" },
    { code: "WA", name: "Western Australia", countryCode: "AU" },
    { code: "SA", name: "South Australia", countryCode: "AU" },
    { code: "TAS", name: "Tasmania", countryCode: "AU" },
    { code: "ACT", name: "Australian Capital Territory", countryCode: "AU" },
    { code: "NT", name: "Northern Territory", countryCode: "AU" },
  ]
};

export const CITIES_BY_STATE: Record<string, string[]> = {
  // Canada - Ontario
  "CA_ON": [
    "Toronto", "Hamilton", "Ottawa", "Mississauga", "Brampton", "Markham",
    "Vaughan", "London", "Kitchener", "Windsor", "Burlington", "Oakville",
    "Guelph", "Cambridge", "Barrie", "Oshawa", "Kingston", "Sudbury",
    "Waterloo", "Thunder Bay", "Brantford", "Niagara Falls", "Peterborough",
    "Sarnia", "Belleville", "North Bay", "Welland", "Cornwall", "Timmins",
    "St. Thomas", "Woodstock", "Stratford", "Orillia", "Orangeville", "Milton",
    "Richmond Hill", "Pickering", "Ajax", "Whitby", "Newmarket", "Caledon",
    "Halton Hills", "Aurora", "Innisfil", "Clarington", "Chatham-Kent", "Kawartha Lakes",
    "Norfolk County", "St. Catharines"
  ],
  // Canada - British Columbia
  "CA_BC": [
    "Vancouver", "Surrey", "Burnaby", "Richmond", "Abbotsford", "Coquitlam",
    "Kelowna", "Langley", "Saanich", "Delta", "Nanaimo", "Kamloops",
    "Victoria", "Chilliwack", "Maple Ridge", "Prince George", "New Westminster",
    "Port Coquitlam", "North Vancouver", "West Vancouver", "Vernon", "Penticton",
    "Campbell River", "Courtenay", "Fort St. John", "Port Alberni", "Cranbrook"
  ],
  // Canada - Alberta
  "CA_AB": [
    "Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert",
    "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Leduc",
    "Fort McMurray", "Banff", "Canmore", "Cochrane", "Lloydminster", "Camrose"
  ],
  // Canada - Quebec
  "CA_QC": [
    "Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke",
    "Saguenay", "Levis", "Trois-Rivieres", "Terrebonne", "Saint-Jean-sur-Richelieu",
    "Brossard", "Repentigny", "Drummondville", "Saint-Jerome", "Granby"
  ],
  // Canada - Manitoba
  "CA_MB": [
    "Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie", "Winkler", "Selkirk"
  ],
  // Canada - Saskatchewan
  "CA_SK": [
    "Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current", "Yorkton", "North Battleford"
  ],
  // Canada - Nova Scotia
  "CA_NS": [
    "Halifax", "Dartmouth", "Sydney", "Truro", "New Glasgow", "Glace Bay", "Kentville"
  ],
  // Canada - New Brunswick
  "CA_NB": [
    "Moncton", "Saint John", "Fredericton", "Dieppe", "Miramichi", "Edmundston", "Bathurst"
  ],
  // Canada - Newfoundland
  "CA_NL": [
    "St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South", "Grand Falls-Windsor", "Gander"
  ],
  
  // US - New York
  "US_NY": [
    "New York", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany",
    "New Rochelle", "Mount Vernon", "Schenectady", "Utica", "White Plains",
    "Hempstead", "Troy", "Niagara Falls", "Binghamton", "Freeport", "Valley Stream"
  ],
  // US - California
  "US_CA": [
    "Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento",
    "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside",
    "Irvine", "Stockton", "Fremont", "San Bernardino", "Modesto", "Fontana",
    "Santa Clarita", "Glendale", "Huntington Beach", "Pasadena", "Sunnyvale"
  ],
  // US - Texas
  "US_TX": [
    "Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso",
    "Arlington", "Corpus Christi", "Plano", "Lubbock", "Laredo", "Irving",
    "Garland", "Frisco", "McKinney", "Amarillo", "Grand Prairie", "Brownsville"
  ],
  // US - Florida
  "US_FL": [
    "Miami", "Orlando", "Tampa", "Jacksonville", "St. Petersburg", "Hialeah",
    "Port St. Lucie", "Cape Coral", "Tallahassee", "Fort Lauderdale", "Pembroke Pines",
    "Hollywood", "Gainesville", "Miramar", "Coral Springs", "Clearwater", "Palm Bay"
  ],
  // US - Illinois
  "US_IL": [
    "Chicago", "Aurora", "Joliet", "Naperville", "Rockford", "Elgin", "Springfield",
    "Peoria", "Champaign", "Waukegan", "Cicero", "Bloomington", "Arlington Heights"
  ],
  // US - Washington
  "US_WA": [
    "Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett",
    "Renton", "Spokane Valley", "Kirkland", "Bellingham", "Kennewick", "Auburn"
  ],
  // US - Massachusetts
  "US_MA": [
    "Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton",
    "Quincy", "Lynn", "New Bedford", "Newton", "Somerville", "Framingham"
  ],
  // US - Ohio
  "US_OH": [
    "Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"
  ],
  // US - Pennsylvania
  "US_PA": [
    "Philadelphia", "Pittsburgh", "Allentown", "Reading", "Erie", "Upper Darby", "Scranton", "Bethlehem", "Lancaster", "Harrisburg"
  ],
  // US - Michigan
  "US_MI": [
    "Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing", "Dearborn", "Livonia", "Troy", "Westland"
  ],
  // US - Georgia
  "US_GA": [
    "Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Johns Creek", "Warner Robins"
  ],
  // US - North Carolina
  "US_NC": [
    "Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"
  ]
};

/** Normalize Country Code */
export function resolveCountryCode(countryNameOrCode: string): string {
  const c = countryNameOrCode?.trim().toUpperCase() || "";
  if (!c) return "CA";
  if (c === "CANADA" || c === "CA" || c === "CAN") return "CA";
  if (c === "UNITED STATES" || c === "USA" || c === "US" || c === "UNITED STATES OF AMERICA") return "US";
  if (c === "UNITED KINGDOM" || c === "UK" || c === "GB" || c === "GREAT BRITAIN") return "GB";
  if (c === "AUSTRALIA" || c === "AU" || c === "AUS") return "AU";
  if (c === "GERMANY" || c === "DE") return "DE";
  if (c === "FRANCE" || c === "FR") return "FR";
  if (c === "NEW ZEALAND" || c === "NZ") return "NZ";
  if (c === "IRELAND" || c === "IE") return "IE";
  const found = COUNTRIES.find(x => x.code.toUpperCase() === c || x.name.toUpperCase() === c);
  return found ? found.code : "CA";
}

/** Get Countries list */
export function getCountriesList(): CountryItem[] {
  return COUNTRIES;
}

/** Get States for a Country */
export function getStatesForCountry(countryNameOrCode: string): StateItem[] {
  const code = resolveCountryCode(countryNameOrCode);
  return STATES_BY_COUNTRY[code] || [];
}

/** Normalize State Code */
export function resolveStateCode(countryNameOrCode: string, stateNameOrCode: string): string {
  const s = stateNameOrCode?.trim() || "";
  if (!s) return "";
  const states = getStatesForCountry(countryNameOrCode);
  const found = states.find(
    st => st.code.toUpperCase() === s.toUpperCase() || st.name.toUpperCase() === s.toUpperCase()
  );
  return found ? found.code : s;
}

/** Get State Display Name */
export function getStateDisplayName(countryNameOrCode: string, stateNameOrCode: string): string {
  const s = stateNameOrCode?.trim() || "";
  if (!s) return "";
  const states = getStatesForCountry(countryNameOrCode);
  const found = states.find(
    st => st.code.toUpperCase() === s.toUpperCase() || st.name.toUpperCase() === s.toUpperCase()
  );
  return found ? found.name : s;
}

/** Get known cities for state */
export function getKnownCities(countryNameOrCode: string, stateNameOrCode: string): string[] {
  const cCode = resolveCountryCode(countryNameOrCode);
  const sCode = resolveStateCode(countryNameOrCode, stateNameOrCode);
  const key = `${cCode}_${sCode}`;
  if (CITIES_BY_STATE[key]) {
    return CITIES_BY_STATE[key];
  }

  // Fallback: If no state selected, aggregate all cities in country
  const allInCountry: string[] = [];
  Object.keys(CITIES_BY_STATE).forEach(k => {
    if (k.startsWith(`${cCode}_`)) {
      allInCountry.push(...CITIES_BY_STATE[k]);
    }
  });
  return Array.from(new Set(allInCountry));
}

/** Fuzzy search cities */
export function searchCitySuggestions(
  query: string,
  countryNameOrCode: string,
  stateNameOrCode: string,
  limit: number = 10
): string[] {
  const cities = getKnownCities(countryNameOrCode, stateNameOrCode);
  if (!query.trim()) {
    return cities.slice(0, limit);
  }

  const results = fuzzysort.go(query.trim(), cities, {
    threshold: -10000,
    limit: limit,
  });

  return results.map(r => r.target);
}
