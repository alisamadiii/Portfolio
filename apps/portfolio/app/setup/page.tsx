import { notFound } from "next/navigation";

import { SetupEnv } from "./env";

export const metadata = {
  title: "Setup",
  description: "Setup your environment variables",
};

export default async function SetupPage() {
  if (process.env.NODE_ENV === "production") return notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 [&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight">
      <SetupEnv />
    </div>
  );
}
