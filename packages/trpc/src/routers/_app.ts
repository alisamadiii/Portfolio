import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { billingRouter } from "./billing";
import { clientsRouter } from "./clients";
import { coldEmailsRouter } from "./cold-emails";
import { filesRouter } from "./files";
import { motionRouter } from "./motion";
import { notificationRouter } from "./notification";
import { productsRouter } from "./products";
import { sourcesRouter } from "./sources";
import { tokensRouter } from "./tokens";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  products: productsRouter,
  billing: billingRouter,
  notification: notificationRouter,
  files: filesRouter,
  motion: motionRouter,
  clients: clientsRouter,
  sources: sourcesRouter,
  coldEmails: coldEmailsRouter,
  tokens: tokensRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
