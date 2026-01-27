import { HeaderPage } from "apps/portfolio/components/header-page";
import { ProtectRoute } from "apps/portfolio/components/protect-route";
import { SettingsLinks } from "apps/portfolio/components/settings/links";

import { generateMetadata } from "@workspace/ui/lib/seo";

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
