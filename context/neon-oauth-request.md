# Neon OAuth request

Neon only issues OAuth clients to partners. Request sent through
https://neon.com/contact-sales on 2026-11-14. When the client ID + secret arrive,
set `NEON_CLIENT_ID` and `NEON_CLIENT_SECRET` on the Coolify api service.

---

**Subject:** OAuth integration request: Ali Samadii LLC client dashboard

Hi Neon team,

I run Ali Samadii LLC, a web agency that builds and manages websites for small businesses. Our clients use a dashboard we built, Client Hub (app.alisamadii.com), to manage their site and the tools behind it. It already connects to Google, Netlify and Resend over OAuth.

We'd like to add Neon in the same way. A client would link their own Neon account and then, inside Client Hub:

- pick one of their existing Neon projects, or create a new one for their website
- see that project's branches, databases and compute status
- copy a connection string for their developer or hosting

Clients keep full ownership of their Neon accounts and projects. We never delete anything, and we don't store connection strings. This brings Neon to small businesses that would otherwise use a bundled database, and every client creates and pays for their own Neon account.

Could you register an OAuth application for us? Details:

- **Application name:** Client Hub (Ali Samadii LLC)
- **Client type:** confidential (client secret), PKCE S256
- **Redirect URIs:**
  - `https://www.alisamadii.com/api/auth/oauth2/callback/neon`
  - `http://localhost:3000/api/auth/oauth2/callback/neon`
- **Scopes:** `openid offline offline_access urn:neoncloud:projects:create urn:neoncloud:projects:read urn:neoncloud:orgs:read`

I'm happy to get on a call or demo the integration. The code is built and ready to go live once we have credentials.

Thanks,
Ali Samadi
Ali Samadii LLC
a@alisamadii.com
