import { notFound } from "next/navigation";

// A URL only the website UI has (e.g. /website) is a 404 here.
export default function Default() {
  notFound();
}
