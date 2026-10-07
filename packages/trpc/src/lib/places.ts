// Google Places API (New) Text Search client. Enterprise field mask —
// websiteUri/phone/rating are Enterprise SKU, free tier 1,000 calls/month.

export interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.types",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "places.location",
  "nextPageToken",
].join(",");

const MAX_PAGES = 3; // 3 × 20 = 60 results, the API's hard cap per query

// Never throws after the first request fires — `apiCalls` must reach the
// caller even on failure so every billed call is counted against the cap.
export async function searchPlaces(
  textQuery: string,
  near?: { lat: number; lng: number; radiusMeters: number }
): Promise<{ places: PlaceResult[]; apiCalls: number; error?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }

  const places: PlaceResult[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    let res: Response;
    try {
      res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 20,
          ...(near
            ? {
                rankPreference: "DISTANCE",
                locationBias: {
                  circle: {
                    center: { latitude: near.lat, longitude: near.lng },
                    radius: near.radiusMeters,
                  },
                },
              }
            : {}),
          ...(pageToken ? { pageToken } : {}),
        }),
      });
    } catch (error) {
      apiCalls++;
      return {
        places,
        apiCalls,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
    apiCalls++;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        places,
        apiCalls,
        error: `Places API ${res.status}: ${body.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as {
      places?: PlaceResult[];
      nextPageToken?: string;
    };
    places.push(...(data.places ?? []));

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // Tokens need a moment to become valid.
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { places, apiCalls };
}

// ─── Manual-add helpers ──────────────────────────────────────────
// Lite search/nearby use a Pro-tier field mask (no phone/website — those are
// Enterprise SKU) since suggestion lists only need name + address. Details is
// the single Enterprise call made once a business is actually picked.

const LITE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.types",
  "places.location",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "types",
  "primaryTypeDisplayName",
  "businessStatus",
  "location",
].join(",");

function placesKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return apiKey;
}

type LiteResult = { places: PlaceResult[]; apiCalls: number; error?: string };

async function litePost(url: string, body: object): Promise<LiteResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": placesKey(),
        "X-Goog-FieldMask": LITE_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return {
      places: [],
      apiCalls: 1,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      places: [],
      apiCalls: 1,
      error: `Places API ${res.status}: ${text.slice(0, 300)}`,
    };
  }
  const data = (await res.json()) as { places?: PlaceResult[] };
  return { places: data.places ?? [], apiCalls: 1 };
}

/** One cheap Text Search page for the manual-add suggestion list. */
export function searchPlacesLite(
  textQuery: string,
  regionCode = "US"
): Promise<LiteResult> {
  return litePost("https://places.googleapis.com/v1/places:searchText", {
    textQuery,
    pageSize: 8,
    // Without a region, partial brand names ("fla2z") return nothing at all;
    // with it the same query ranks the actual business first.
    regionCode,
  });
}

/** Businesses at/around a specific address (~50m circle). */
export function searchNearbyLite(center: {
  lat: number;
  lng: number;
}): Promise<LiteResult> {
  return litePost("https://places.googleapis.com/v1/places:searchNearby", {
    maxResultCount: 12,
    locationRestriction: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: 50,
      },
    },
  });
}

/** Full Enterprise-tier record for one picked place. Throws on failure. */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": placesKey(),
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places API ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as PlaceResult;
}

// Pure-location result types: picking one of these means "list the
// businesses at this address", not "add this as a lead".
const ADDRESS_TYPES = new Set([
  "street_address",
  "premise",
  "subpremise",
  "route",
  "plus_code",
  "postal_code",
  "locality",
  "sublocality",
  "neighborhood",
  "geocode",
]);

export function isAddressResult(types: string[] | undefined): boolean {
  if (!types?.length) return false;
  if (types.includes("establishment") || types.includes("point_of_interest"))
    return false;
  return types.some((t) => ADDRESS_TYPES.has(t));
}

// Hosts that count as "no real website" — social pages and free site builders.
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linktr.ee",
  "business.site",
  "godaddysites.com",
  "wixsite.com",
  "square.site",
  "yelp.com",
];

export function isSocialOnly(website: string): boolean {
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    return SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

// Great-circle distance in miles.
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // earth radius, miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// HEAD (fallback GET) with timeout; true = site unreachable/dead.
export async function isWebsiteDead(website: string): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(website, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadScan/1.0)" },
    });
    return res.ok || (res.status >= 300 && res.status < 400);
  };

  try {
    if (await attempt("HEAD")) return false;
    // Some servers reject HEAD — retry with GET before calling it dead.
    return !(await attempt("GET"));
  } catch {
    try {
      return !(await attempt("GET"));
    } catch {
      return true;
    }
  }
}
