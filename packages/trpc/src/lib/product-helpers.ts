import { sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { products } from "@workspace/drizzle/schema";
import type { ProjectType } from "@workspace/drizzle/schema";

export async function getProductIdByProject(project: ProjectType) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      sql`${products.metadata}->>'project' = ${project} AND ${products.isArchived} = false`
    )
    .limit(1);
  return product?.id ?? null;
}
