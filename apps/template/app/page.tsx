// app/(marketing)/page.tsx
import { AppsOverview } from "@/components/sections/apps-overview";
import { ArchitectureSection } from "@/components/sections/architecture";
import { ChecklistSection } from "@/components/sections/checklist";
import { CTASection } from "@/components/sections/cta";
import { DeveloperExperience } from "@/components/sections/developer-experience";
import { DocsSection } from "@/components/sections/docs";
import { FAQSection } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { MobileSection } from "@/components/sections/mobile";
import { PackagesSection } from "@/components/sections/packages";
import { PaymentsSection } from "@/components/sections/payments";
import { SecuritySection } from "@/components/sections/security";
import { TechStackSection } from "@/components/sections/tech-stack";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <Hero />
      <AppsOverview />
      <PackagesSection />
      <ArchitectureSection />
      <TechStackSection />
      <DeveloperExperience />
      <SecuritySection />
      <PaymentsSection />
      <MobileSection />
      <DocsSection />
      <ChecklistSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}
