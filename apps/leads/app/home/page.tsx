import { MarketingPage } from "@/components/marketing-page";

export const metadata = { title: "Home" };

// Always the marketing page, even when signed in (Vercel-style /home).
export default function HomePage() {
  return <MarketingPage />;
}
