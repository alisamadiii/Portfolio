import { db } from "./db/index";
import { collaboratorTable } from "./db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";

const rows = await db
  .selectDistinct({ owner: collaboratorTable.owner, type: collaboratorTable.type, installationId: collaboratorTable.installationId })
  .from(collaboratorTable)
  .where(or(eq(collaboratorTable.userId, "x"), and(isNull(collaboratorTable.userId), sql`lower(${collaboratorTable.email}) = lower('a@b.c')`)));
console.log("OK", rows.length);
process.exit(0);
