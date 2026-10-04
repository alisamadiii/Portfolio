import { drizzle } from "drizzle-orm/node-postgres";

import { pool } from "./index";
import * as schema from "./schema";

// The CMS needs interactive transactions (advisory locks in the folder
// cache). node-postgres handles those natively, so this reuses the shared
// pool from ./index and just adds the relational schema for typed queries.
export const db = drizzle(pool, { schema });
