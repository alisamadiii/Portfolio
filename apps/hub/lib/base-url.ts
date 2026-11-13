const DEV_BASE_URL = "http://localhost:3007";
const PROD_BASE_URL = "https://app.alisamadii.com";

export const getBaseUrl = () =>
  process.env.NODE_ENV === "production" ? PROD_BASE_URL : DEV_BASE_URL;
