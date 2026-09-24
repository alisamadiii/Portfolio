import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { analyticsRouter } from "./integrations/analytics";
import { authRouter } from "./auth";
import { clickupRouter } from "./clickup";
import { cmsRouter } from "./cms/index";
import { contactRouter } from "./contact";
import { deployRouter } from "./deploy";
import { emailsRouter } from "./emails";
import { integrationsRouter } from "./integrations/index";
import { leadsRouter } from "./leads";
import { paymentsRouter } from "./payments";
import { productsRouter } from "./products";
import { projectRouter } from "./project";
import { sourcesRouter } from "./sources";
import { statsRouter } from "./stats";
import { uploadsRouter } from "./uploads";
import { usersRouter } from "./users";
import { websitesRouter } from "./stripe/websites";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  products: productsRouter,
  payments: paymentsRouter,
  sources: sourcesRouter,
  stats: statsRouter,
  clickup: clickupRouter,
  uploads: uploadsRouter,
  contact: contactRouter,
  emails: emailsRouter,
  analytics: analyticsRouter,
  integrations: integrationsRouter,
  deploy: deployRouter,
  cms: cmsRouter,
  project: projectRouter,
  websites: websitesRouter,
  leads: leadsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
