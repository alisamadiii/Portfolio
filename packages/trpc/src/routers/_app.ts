import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { agencyRouter } from "./agency";
import { analyticsRouter } from "./integrations/analytics";
import { authRouter } from "./auth";
import { cmsRouter } from "./cms/index";
import { contactRouter } from "./contact";
import { deployRouter } from "./deploy";
import { emailsRouter } from "./emails";
import { gcalRouter } from "./gcal";
import { integrationsRouter } from "./integrations/index";
import { leadsRouter } from "./leads";
import { netlifyRouter } from "./netlify";
import { paymentsRouter } from "./payments";
import { plansRouter } from "./plans";
import { productsRouter } from "./products";
import { projectRouter } from "./project";
import { resendRouter } from "./resend";
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
  plans: plansRouter,
  sources: sourcesRouter,
  stats: statsRouter,
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
  agency: agencyRouter,
  netlify: netlifyRouter,
  resend: resendRouter,
  gcal: gcalRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
