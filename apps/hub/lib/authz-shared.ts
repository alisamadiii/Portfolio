// Client-safe admin checks — the implementation lives with the CMS engine
// (pure module, no server deps) so both hub and tRPC routers share it.
export {
  assertAdminUser,
  isAdminUser,
  roleAtLeast,
} from "@workspace/trpc/lib/authz-shared";
export type { CollaboratorRole } from "@workspace/trpc/lib/authz-shared";
