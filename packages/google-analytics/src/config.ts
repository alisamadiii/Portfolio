// GA4 web stream for agency.alisamadii.com — measurement IDs are public by
// design, safe to hardcode. The Measurement Protocol api_secret is NOT
// (server-side only, via process.env.GA_API_SECRET in server.ts).
export const GA_MEASUREMENT_ID = "G-XTB2CTLVEH";

// Google Ads conversion tracking ("Request quote" action). Public, same as the
// GA4 ID. Find both in Google Ads → Goals → Request quote → Tag setup →
// Manage → event snippet: send_to: "AW-<id>/<label>". Empty = disabled.
export const GOOGLE_ADS_ID = "AW-18374666059";
export const GOOGLE_ADS_QUOTE_LABEL = "2wNICLTPiaUdEMvO3LlE";
