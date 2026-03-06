import { createTRPCRouter } from "@workspace/trpc/init";

import { adminAgencyProductsRouter } from "./products";

export const adminAgencyRouter = createTRPCRouter({
  products: adminAgencyProductsRouter,
});
