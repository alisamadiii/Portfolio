import { ActiveSessionsBanner } from "@/components/active-sessions-banner";
import { DocumentTitle } from "@/components/document-title";
import { SitesPage } from "@/components/sites/sites-page";

export default function HomePage() {
  return (
    <>
      <DocumentTitle title="Sites" />
      <ActiveSessionsBanner />
      <SitesPage />
    </>
  );
}
