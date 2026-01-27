import { generateMetadata } from "@workspace/ui/lib/seo";

import { HeaderPage } from "@/components/header-page";
import { ProtectRoute } from "@/components/protect-route";
import { SettingsLinks } from "@/components/settings/links";

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
      <HeaderPage />
      <div className="container gap-8">
        <SettingsLinks />
        <div className="grow">{children}</div>
      </div>
    </ProtectRoute>
  );
}
