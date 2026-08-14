/**
 * Get the list of GitHub accounts the user (incl. collaborators) has access to.
 */

import { User } from "@/types/user";

import { db } from "@/db";
import { collaboratorTable } from "@/db/schema";

import { isAdminUser } from "@/lib/authz-shared";
import { collaboratorMatchesUser } from "@/lib/collaborator-access";

type Account = {
  login: string;
  type: string;
  repositorySelection: string;
};

const getAccounts = async (user: User): Promise<Account[]> => {
  if (isAdminUser(user)) {
    const org = process.env.GITHUB_ORG;
    if (!org) throw new Error("Missing GITHUB_ORG.");

    return [{ login: org, type: "org", repositorySelection: "all" }];
  }

  // The CMS Neon WebSocket pool can drop a query on cold start; one retry
  // keeps a transient blip from crashing the whole app on entry.
  const runQuery = () =>
    db
      .selectDistinct({
        owner: collaboratorTable.owner,
        type: collaboratorTable.type,
      })
      .from(collaboratorTable)
      .where(collaboratorMatchesUser(user));

  let groupedRepos;
  try {
    groupedRepos = await runQuery();
  } catch {
    groupedRepos = await runQuery();
  }

  return groupedRepos.map((collaborator) => ({
    login: collaborator.owner,
    type: collaborator.type,
    repositorySelection: "selected",
  }));
};

export { getAccounts };
