import { getFileName, normalizePath } from "@workspace/cms-core/utils/file";

type CommitAction = "create" | "update" | "delete" | "rename" | "reorder";
type CommitTemplates = Partial<Record<CommitAction, string>>;
type CommitIdentity = "app" | "user";

const defaultCommitTemplates: Record<CommitAction, string> = {
  create: "Create {path} (via Pages CMS)",
  update: "Update {path} (via Pages CMS)",
  delete: "Delete {path} (via Pages CMS)",
  rename: "Rename {oldPath} to {newPath} (via Pages CMS)",
  reorder: "Reorder {name} entries (via Pages CMS)",
};

const getCommitTemplates = (
  configObject?: Record<string, any>
): CommitTemplates => {
  const templates = configObject?.settings?.commit?.templates;
  return templates && typeof templates === "object" ? templates : {};
};

const resolveCommitIdentity = ({
  configObject,
  identityOverride,
}: {
  configObject?: Record<string, any>;
  identityOverride?: CommitIdentity;
}): CommitIdentity => {
  if (identityOverride === "app" || identityOverride === "user")
    return identityOverride;

  const identity = configObject?.settings?.commit?.identity;
  return identity === "user" ? "user" : "app";
};

const renderCommitTemplate = (
  template: string,
  tokens: Record<string, string | undefined>
): string => {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token) => {
    const value = tokens[token];
    return typeof value === "string" ? value : "";
  });
};

const buildCommitTokens = ({
  action,
  owner,
  repo,
  branch,
  path,
  oldPath,
  newPath,
  contentName,
  user,
  userName,
  userEmail,
}: {
  action: CommitAction;
  owner: string;
  repo: string;
  branch: string;
  path?: string;
  oldPath?: string;
  newPath?: string;
  contentName?: string;
  user?: string;
  userName?: string;
  userEmail?: string;
}): Record<string, string> => {
  const normalizedPath = path ? normalizePath(path) : "";
  const normalizedOldPath = oldPath ? normalizePath(oldPath) : "";
  const normalizedNewPath = newPath ? normalizePath(newPath) : "";

  return {
    action,
    owner,
    repo,
    branch,
    name: contentName || "",
    user: user || userName || userEmail || "",
    userName: userName || "",
    userEmail: userEmail || "",
    path: normalizedPath,
    filename: normalizedPath ? getFileName(normalizedPath) : "",
    oldPath: normalizedOldPath,
    oldFilename: normalizedOldPath ? getFileName(normalizedOldPath) : "",
    newPath: normalizedNewPath,
    newFilename: normalizedNewPath ? getFileName(normalizedNewPath) : "",
  };
};

const resolveCommitMessage = ({
  configObject,
  templatesOverride,
  action,
  tokens,
}: {
  configObject?: Record<string, any>;
  templatesOverride?: CommitTemplates;
  action: CommitAction;
  tokens: Record<string, string | undefined>;
}): string => {
  const globalTemplates = getCommitTemplates(configObject);
  const overrideTemplate = templatesOverride?.[action];
  const template =
    typeof overrideTemplate === "string" && overrideTemplate.trim()
      ? overrideTemplate
      : typeof globalTemplates[action] === "string" &&
          globalTemplates[action]?.trim()
        ? (globalTemplates[action] as string)
        : defaultCommitTemplates[action];
  return renderCommitTemplate(template, tokens)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
};

const resolveBatchCommitMessage = ({
  configObject,
  files,
  owner,
  repo,
  branch,
  user,
  userName,
  userEmail,
}: {
  configObject?: Record<string, any>;
  files: Array<{ path: string; isNew?: boolean; contentName?: string }>;
  owner: string;
  repo: string;
  branch: string;
  user?: string;
  userName?: string;
  userEmail?: string;
}): string => {
  if (files.length === 1) {
    const file = files[0];
    return resolveCommitMessage({
      configObject,
      action: file.isNew ? "create" : "update",
      tokens: buildCommitTokens({
        action: file.isNew ? "create" : "update",
        owner,
        repo,
        branch,
        path: file.path,
        contentName: file.contentName,
        user,
        userName,
        userEmail,
      }),
    });
  }

  const title = `Publish ${files.length} files (via Pages CMS)`;
  const body = files.map((file) => `- ${normalizePath(file.path)}`).join("\n");
  return `${title}\n\n${body}`;
};

export {
  buildCommitTokens,
  resolveCommitIdentity,
  resolveCommitMessage,
  resolveBatchCommitMessage,
};
