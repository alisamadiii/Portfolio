import { redirect } from "next/navigation";

// Domain merged into project Settings.
export default function DomainPage() {
  redirect("/settings");
}
