import { app } from "./app.js";
import { scheduled } from "./scheduled.js";

export { SendCampaignWorkflow } from "./workflows/send-campaign.js";

export default {
  fetch: app.fetch,
  scheduled,
};
