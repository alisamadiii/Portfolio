import { ActiveSessionsBanner } from "@/components/active-sessions-banner";
import { DocumentTitle } from "@/components/document-title";
import { HomePage } from "@/components/project/home-page";

export default function ProjectHomePage() {
  return (
    <>
      <DocumentTitle title="Home" />
      <ActiveSessionsBanner />
      <HomePage />
    </>
  );
}
