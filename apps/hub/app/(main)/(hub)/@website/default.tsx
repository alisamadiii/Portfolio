import { notFound } from "next/navigation";

// A URL only the agency UI has (e.g. /agency) is a 404 here.
export default function Default() {
  notFound();
}
