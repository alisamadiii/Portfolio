import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { clickupRouter } from "./clickup";
import { paymentsRouter } from "./payments";
import { coldEmailsRouter } from "./cold-emails";
import { filesRouter } from "./files";
import { supportRouter } from "./support";
import { productsRouter } from "./products";
import { sourcesRouter } from "./sources";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  products: productsRouter,
  payments: paymentsRouter,
  support: supportRouter,
  files: filesRouter,
  sources: sourcesRouter,
  coldEmails: coldEmailsRouter,
  clickup: clickupRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
