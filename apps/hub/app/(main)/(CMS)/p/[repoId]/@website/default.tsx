import { notFound } from "next/navigation";

// An agency-only URL (e.g. /p/1/marketing) on a website project is a 404.
export default function Default() {
  notFound();
}
