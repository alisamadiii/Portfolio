// Branch names a client may run a preview session on. Mirrors
// content-pilot's src/preview/branch-name.ts: `preview/<id>` is reserved for
// the ephemeral main-preview branches, everything else must be a plain git
// ref component. Pure, shared by the router (validation) and the hub dialog
// (live slug preview).

export const PREVIEW_BRANCH_PREFIX = "preview/";

export const isPreviewBranch = (branch: string) =>
  branch.startsWith(PREVIEW_BRANCH_PREFIX);

export const MAX_BRANCH_NAME_LENGTH = 100;

export const isValidBranchName = (name: string) => {
  if (!name || name.length > MAX_BRANCH_NAME_LENGTH) return false;
  if (isPreviewBranch(name)) return false;
  if (name.startsWith("-") || name.startsWith("/") || name.startsWith("."))
    return false;
  if (name.endsWith("/") || name.endsWith(".") || name.endsWith(".lock"))
    return false;
  if (name.includes("..") || name.includes("//") || name.includes("@{"))
    return false;
  if (name === "@") return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x20\x7f~^:?*[\\]/.test(name)) return false;
  return true;
};

/** "New hero test" → "new-hero-test". Empty when nothing usable remains. */
export const slugifyBranchName = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
