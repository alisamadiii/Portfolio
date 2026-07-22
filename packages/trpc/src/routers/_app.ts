import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { clickupRouter } from "./clickup";
import { cmsRouter } from "./cms";
import { contactRouter } from "./contact";
import { paymentsRouter } from "./payments";
import { productsRouter } from "./products";
import { sourcesRouter } from "./sources";
import { uploadsRouter } from "./uploads";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  products: productsRouter,
  payments: paymentsRouter,
  sources: sourcesRouter,
  clickup: clickupRouter,
  uploads: uploadsRouter,
  contact: contactRouter,
  cms: cmsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
