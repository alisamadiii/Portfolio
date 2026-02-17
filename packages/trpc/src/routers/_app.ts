import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { adminRouter } from "./admin/_index";
import { discountsRouter } from "./discounts";
import { motionRouter } from "./motion/_index";
import { paymentsRouter } from "./payments";
import { sessionsRouter } from "./sessions";
import { uploadRouter } from "./upload/_index";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  discounts: discountsRouter,
  admin: adminRouter,
  payments: paymentsRouter,
  sessions: sessionsRouter,
  user: userRouter,
  motion: motionRouter,
  upload: uploadRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
