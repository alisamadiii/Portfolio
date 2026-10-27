import { DocumentTitle } from "@/components/document-title";

export default function BusinessInfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocumentTitle title="Business info" />
      {children}
    </>
  );
}
