import { createTRPCRouter } from "@workspace/trpc/init";

import { adminAgencyRouter } from "./agency/_index";
import { adminColdEmailsRouter } from "./cold-emails";
import { adminSourcesRouter } from "./source/_index";
import { adminUsersRouter } from "./users";

export const adminRouter = createTRPCRouter({
  users: adminUsersRouter,
  sources: adminSourcesRouter,
  agency: adminAgencyRouter,
  coldEmails: adminColdEmailsRouter,
});
