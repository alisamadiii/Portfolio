import { MarketingNav } from "@/components/agency/marketing-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <MarketingNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
