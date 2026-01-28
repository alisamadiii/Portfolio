import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { adminRouter } from "./admin/_index";
import { discountsRouter } from "./discounts";
import { paymentsRouter } from "./payments";
import { sessionsRouter } from "./sessions";
import { sourceRouter } from "./source/_index";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  discounts: discountsRouter,
  admin: adminRouter,
  payments: paymentsRouter,
  sessions: sessionsRouter,
  user: userRouter,
  source: sourceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
