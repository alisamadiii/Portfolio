import { app } from "./app.js";
import { scheduled } from "./scheduled.js";

export default {
  fetch: app.fetch,
  scheduled,
};
