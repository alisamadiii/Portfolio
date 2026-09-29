import { createTRPCRouter } from "../../init";
import { aiEditsRouter } from "./ai-edits";
import { collaboratorsRouter } from "./collaborators";
import { pagesRouter } from "./pages";
import { previewSessionRouter } from "./preview-session";
import { reposRouter } from "./repos";
import { seoRouter } from "./seo";
import { subscriptionRouter } from "./subscription";
import { versionRouter } from "./version";

export const cmsRouter = createTRPCRouter({
  aiEdits: aiEditsRouter,
  repos: reposRouter,
  pages: pagesRouter,
  previewSession: previewSessionRouter,
  collaborators: collaboratorsRouter,
  seo: seoRouter,
  subscription: subscriptionRouter,
  version: versionRouter,
});
