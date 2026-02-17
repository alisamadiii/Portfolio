import { createTRPCRouter } from "@workspace/trpc/init";

import { adminSourcesRouter } from "./source/_index";
import { adminUsersRouter } from "./users";

export const adminRouter = createTRPCRouter({
  users: adminUsersRouter,
  sources: adminSourcesRouter,
});
