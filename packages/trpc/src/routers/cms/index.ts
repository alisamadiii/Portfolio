import { createTRPCRouter } from "../../init";
import { branchesRouter } from "./branches";
import { cacheRouter } from "./cache";
import { collaboratorsRouter } from "./collaborators";
import { collectionsRouter } from "./collections";
import { entriesRouter } from "./entries";
import { filesRouter } from "./files";
import { manifestRouter } from "./manifest";
import { mediaRouter } from "./media";
import { pagesRouter } from "./pages";
import { publishRouter } from "./publish";
import { referencesRouter } from "./references";
import { reposRouter } from "./repos";
import { settingsRouter } from "./settings";
import { subscriptionRouter } from "./subscription";
import { versionRouter } from "./version";

export const cmsRouter = createTRPCRouter({
  repos: reposRouter,
  branches: branchesRouter,
  collections: collectionsRouter,
  entries: entriesRouter,
  files: filesRouter,
  manifest: manifestRouter,
  media: mediaRouter,
  pages: pagesRouter,
  publish: publishRouter,
  references: referencesRouter,
  cache: cacheRouter,
  settings: settingsRouter,
  collaborators: collaboratorsRouter,
  subscription: subscriptionRouter,
  version: versionRouter,
});
