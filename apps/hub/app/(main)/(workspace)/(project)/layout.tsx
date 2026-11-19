import { DocumentTitle } from "@/components/document-title";
import { WelcomeCard } from "@/components/workspace/welcome-card";
import { getWorkspaceProject } from "@/lib/session-server";

// Project pages need a focused project. With nothing imported yet the
// workspace shows how to get the first site in; account pages don't go
// through here and keep working.
export default async function ProjectLayout({ children }: { children: React.ReactNode }) {
  const project = await getWorkspaceProject();
  if (!project) {
    return (
      <>
        <DocumentTitle title="Welcome" />
        <WelcomeCard />
      </>
    );
  }
  return children;
}
