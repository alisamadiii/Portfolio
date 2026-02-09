import { generateMetadata } from "@workspace/ui/lib/seo";

import { ProtectRoute } from "@/components/protect-route";

export const metadata = generateMetadata({
  title: "Settings",
  description: "Manage your account settings and preferences.",
  url: "/settings",
});

interface Props {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  return (
    <ProtectRoute>
      <div className="mx-auto max-w-3xl gap-8 px-8 pt-20">
        <h1 className="mb-8 text-4xl font-bold capitalize">Settings</h1>
        {/* <SettingsLinks /> */}
        <div className="grow">{children}</div>
      </div>
    </ProtectRoute>
  );
}
