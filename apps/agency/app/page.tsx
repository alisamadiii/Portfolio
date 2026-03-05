"use client";

import { Navbar } from "@/components/navbar";
import {
  AboutSection,
  ContactInfoSection,
  CTASection,
  FooterSection,
  HeroSection,
  MarqueeSection,
  ProcessSection,
  ServicesSection,
  StatsSection,
  TestimonialsSection,
  WorkSection,
} from "@/components/sections";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-[1400px] border-x">
        <HeroSection />
        <MarqueeSection />
        <StatsSection />
        <AboutSection />
        <ServicesSection />
        <WorkSection />
        <ProcessSection />
        <TestimonialsSection />
        <CTASection />
        <ContactInfoSection />
        <FooterSection />
      </div>
    </main>
  );
}
