import { Suspense } from "react";
import { Metadata } from "next";

import { generateMetadata } from "@workspace/ui/lib/seo";

import { Faqs } from "@/components/landing-page/faqs";
import { Features } from "@/components/landing-page/features";
import { Hero } from "@/components/landing-page/hero";
import { Pricing } from "@/components/landing-page/pricing";
import { Testimonials } from "@/components/landing-page/testimonials";

export const metadata: Metadata = generateMetadata({
  title: "Modern SaaS Platform",
  description:
    "Build amazing products with our all-in-one SaaS platform. Features include authentication, payments, admin dashboard, and more.",
  url: "/",
});

export default function Page() {
  return (
    <div>
      <Hero />
      <Features />
      <Faqs />
      <Testimonials />
      <Suspense>
        <Pricing />
      </Suspense>
    </div>
  );
}
