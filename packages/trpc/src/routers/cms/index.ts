import { createTRPCRouter } from "../../init";
import { aiEditsRouter } from "./ai-edits";
import { blogRouter } from "./blog";
import { branchesRouter } from "./branches";
import { cacheRouter } from "./cache";
import { collaboratorsRouter } from "./collaborators";
import { collectionsRouter } from "./collections";
import { entriesRouter } from "./entries";
import { filesRouter } from "./files";
import { manifestRouter } from "./manifest";
import { mediaRouter } from "./media";
import { pagesRouter } from "./pages";
import { previewSessionRouter } from "./preview-session";
import { publishRouter } from "./publish";
import { referencesRouter } from "./references";
import { reposRouter } from "./repos";
import { settingsRouter } from "./settings";
import { subscriptionRouter } from "./subscription";
import { versionRouter } from "./version";

export const cmsRouter = createTRPCRouter({
  aiEdits: aiEditsRouter,
  repos: reposRouter,
  blog: blogRouter,
  branches: branchesRouter,
  collections: collectionsRouter,
  entries: entriesRouter,
  files: filesRouter,
  manifest: manifestRouter,
  media: mediaRouter,
  pages: pagesRouter,
  previewSession: previewSessionRouter,
  publish: publishRouter,
  references: referencesRouter,
  cache: cacheRouter,
  settings: settingsRouter,
  collaborators: collaboratorsRouter,
  subscription: subscriptionRouter,
  version: versionRouter,
});
