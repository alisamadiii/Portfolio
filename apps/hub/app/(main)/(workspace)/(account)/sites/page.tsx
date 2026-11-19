import { DocumentTitle } from "@/components/document-title";
import { SitesPage } from "@/components/sites/sites-page";

export default function SitesRoute() {
  return (
    <>
      <DocumentTitle title="Sites" />
      <SitesPage />
    </>
  );
}
