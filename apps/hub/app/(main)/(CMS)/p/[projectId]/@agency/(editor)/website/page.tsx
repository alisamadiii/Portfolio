import { EditorPage } from "@/components/shell/editor-page";

// An agency project's website editor: same canvas, but site settings live in
// the agency sidebar instead of the editor's Settings tab.
export default function Page() {
  return <EditorPage inAgency />;
}
