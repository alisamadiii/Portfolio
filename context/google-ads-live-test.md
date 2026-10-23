# Google Ads live test (Tier 1: your own campaign, your own click)

The only way to prove conversion attribution really works is a real ad click
with a real `gclid`. Fake/test leads never show as conversions in a campaign,
because Google has no click to match them to. This runs that proof for a few
dollars, safely, on your own account, before any real client.

Account: Ali Samadii LLC advertiser `246-717-7958`, under MCC `445-838-6262`.
Test campaign: "Hub test campaign" (`24380419404`).

## Why this and not a client first

A real client is only needed to test _scale and variety_, not _correctness_.
If an upload has a bug, writing bad conversions into a paying client's live
account corrupts their Smart Bidding and misspends their money. Prove it here
first.

## Prerequisites (must be true before the ad runs)

This is a **production** exercise. A real ad cannot point at localhost; the
click, the lead and the upload all happen on the live site hitting the
**prod** API and **prod** database.

- [ ] Prod `apps/api` deployed with the `eventSource` fix (commit b16926a0).
      Without it every upload fails 400.
- [ ] Prod env has the Google Ads refresh token with **both** scopes
      (`adwords` + `datamanager`). Data Manager API is already enabled on the
      Cloud project `102334616068`.
- [ ] A **public** landing page with `f.js` installed (and `b.js` if testing
      booking), pointing at `api.alisamadii.com` with the test client's form
      key. This page is the ad's final URL.
- [ ] Conversion actions exist in the account (Website lead, Booked
      appointment, Qualified lead, Closed deal). Created via the preset or the
      Google Ads dashboard.

## Google Ads setup

1. Hub test campaign `24380419404`: confirm it has an **ad group + a
   responsive search ad + one keyword**. It was created as a shell and may
   need these built.
2. Make the keyword a **unique phrase nobody else searches** (your exact
   business name plus an odd word). Only you click it, so random searchers
   don't burn the $2/day budget.
3. Set the ad's **final URL** to the public landing page above.
4. Unpause the campaign.

## Run it

5. On your **phone, signed out of the Google account that owns the ads** (use
   a guest or incognito profile). Search your exact unique phrase.
6. Click your ad. Costs a few cents up to ~$2. The landing page's `f.js`
   stores the real `gclid` in its cookie.
7. Submit the quote form (and/or book an appointment) on that same visit.

## Verify, in order

8. **Right away:** the lead appears in the prod hub, channel Google Ads, with
   the `gclid` stored (open the lead's detail page).
9. **Within a few hours:** `click_view` enrichment fills in campaign, ad
   group and keyword on the lead (the ad-click columns).
10. **~30 min to a few hours:** the conversion upload goes out with the real
    `gclid`, status PROCESSING then SUCCESS; the lead detail shows
    "Accepted by Google: Yes".
11. **Next day:** Google Ads -> Goals -> Conversions -> "Website lead" shows
    **1 conversion attributed to Hub test campaign**. The hub dashboard shows
    the spend and cost per lead.
12. Mark the lead **qualified**, then **won** with a value. Next day the
    Qualified lead and Closed deal actions each show 1, and the won value
    matches what you entered.
13. **Pause the campaign.**

If step 11 shows the conversion in the campaign, the whole system is proven
for real money.

## What each status sends (reference)

| Lead status             | Sent to Google Ads            | Value included          |
| ----------------------- | ----------------------------- | ----------------------- |
| Captured (form/booking) | Yes, automatically            | No (count only)         |
| Contacted               | No                            | -                       |
| Qualified               | Yes (Qualified lead)          | No                      |
| Won                     | Yes (Closed deal)             | **Yes, the deal value** |
| Lost                    | No (does not retract capture) | -                       |
| Spam                    | Never                         | -                       |

A conversion only fires if the lead has a click id (`gclid`) or an
email/phone to match on.
