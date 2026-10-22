# Google Ads: minting a new refresh token

The server talks to the Google Ads API and the Data Manager API with one
long-lived OAuth refresh token. It trades it for a short 1-hour access token
automatically on every call, so the access token never needs attention.

A correctly minted refresh token lives until it is manually revoked. You only
need this guide when the token breaks (error: `invalid_grant`, "Token has been
expired or revoked").

## Why a token dies

- It was minted while the OAuth consent screen was in **Testing**: those
  tokens expire after 7 days, even if the app is published later. The app is
  now In production, so new tokens don't have this problem.
- It was minted in the OAuth Playground **without** your own credentials in
  the gear panel: tokens issued to Google's shared Playground client are
  revoked within about a day.
- Someone revoked access under myaccount.google.com > Security > Third-party
  access, or re-ran the consent flow in a way that replaced it.

## Minting a new one (about 3 minutes)

1. Open `apps/api/.env` and copy `GOOGLE_ADS_CLIENT_ID` (ends in
   `.apps.googleusercontent.com`) and `GOOGLE_ADS_CLIENT_SECRET` (starts with
   `GOCSPX-`).
2. Go to https://developers.google.com/oauthplayground
3. Click the **gear icon** (top right), check **Use your own OAuth
   credentials**, paste the client ID and secret. This step is what makes the
   token permanent. Close the panel.
4. In Step 1, paste both scopes into the "Input your own scopes" box:

   ```
   https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/datamanager
   ```

5. Click **Authorize APIs**. Sign in with the MCC owner account
   (Ali Samadii LLC manager account, 445-838-6262). Continue through any
   warning screen and approve both permissions.
6. In Step 2, click **Exchange authorization code for tokens**.
7. Copy the **refresh_token** value (starts with `1//`). Ignore the access
   token and its 1-hour expiry; that one is normal and managed by the server.
8. Paste it as `GOOGLE_ADS_REFRESH_TOKEN` in:
   - `apps/api/.env` (local)
   - the api app's environment variables in Coolify (production), then
     redeploy or restart the app.

## Checking it works

Ask Claude to run the token probe, or check the hub: Marketing > Budget loads
real numbers instead of an auth error, and a lead's "Reported to Google Ads"
rows stop showing scope errors.

Prerequisites that already happened (one-time, listed for completeness):
- OAuth consent screen published to In production (Google Auth Platform >
  Audience).
- Data Manager API enabled in the Cloud project (APIs & Services > Library >
  "Data Manager API" > Enable).
