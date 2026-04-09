import { createTRPCRouter } from "@workspace/trpc/init";

import { adminAgencyClientsRouter } from "./clients";
import { adminAgencyProductsRouter } from "./products";

export const adminAgencyRouter = createTRPCRouter({
  products: adminAgencyProductsRouter,
  clients: adminAgencyClientsRouter,
});
