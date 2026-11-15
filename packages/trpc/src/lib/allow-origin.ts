// Local dev origins are only trusted outside production: in prod any page on a
// visitor's localhost could otherwise make credentialed requests to the api.
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3004",
  "http://localhost:3007",
  "http://localhost:3008",
  "http://localhost:3009",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3004",
  "http://127.0.0.1:3007",
  "http://127.0.0.1:3008",
  "http://127.0.0.1:3009",
  "http://127.0.0.1:5173",
];

export const ALLOWED_ORIGINS = [
  ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
  "https://api.alisamadii.com",
  "https://alisamadii.com",
  "https://www.alisamadii.com",
  "https://admin.alisamadii.com",
  "https://saaskit.alisamadii.com",
  "https://motion.alisamadii.com",
  "https://app.alisamadii.com",
  "https://leads.alisamadii.com",
  "https://partners.alisamadii.com",
];
