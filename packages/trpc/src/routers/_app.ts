import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { clickupRouter } from "./clickup";
import { clientsRouter } from "./clients";
import { paymentsRouter } from "./payments";
import { coldEmailsRouter } from "./cold-emails";
import { filesRouter } from "./files";
import { logsRouter } from "./logs";
import { notificationRouter } from "./notification";
import { productsRouter } from "./products";
import { sourcesRouter } from "./sources";
import { scopesRouter } from "./scopes";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  clients: clientsRouter,
  products: productsRouter,
  payments: paymentsRouter,
  notification: notificationRouter,
  files: filesRouter,
  logs: logsRouter,
  sources: sourcesRouter,
  coldEmails: coldEmailsRouter,
  scopes: scopesRouter,
  clickup: clickupRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
