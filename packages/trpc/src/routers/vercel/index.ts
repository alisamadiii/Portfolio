import { createTRPCRouter } from "@workspace/trpc/init";

import { domainsRouter } from "./domains";

export const vercelRouter = createTRPCRouter({
  domains: domainsRouter,
});
