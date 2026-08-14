// Client-safe admin checks — the implementation lives with the CMS engine
// (pure module, no server deps) so both hub and tRPC routers share it.
export { assertAdminUser, isAdminUser } from "@workspace/trpc/lib/cms/authz-shared";
