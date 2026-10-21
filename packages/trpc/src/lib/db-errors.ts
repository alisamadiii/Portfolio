/**
 * Postgres unique violation (23505). Drizzle wraps driver errors as "Failed
 * query: …" with the real error on `cause`, so walk the chain.
 */
export const isUniqueViolation = (error: unknown): boolean => {
  for (let e = error, depth = 0; e && depth < 5; depth++) {
    const err = e as { code?: string; message?: string; cause?: unknown };
    if (err.code === "23505") return true;
    if (/duplicate key|unique constraint/i.test(err.message ?? "")) return true;
    e = err.cause;
  }
  return false;
};
