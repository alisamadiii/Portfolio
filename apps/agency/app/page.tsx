import { Navbar } from "@/components/landing-page/navbar";
import { Hero } from "@/components/landing-page/hero";
import { Stats } from "@/components/landing-page/stats";
import { Services } from "@/components/landing-page/services";
import { Process } from "@/components/landing-page/process";
import { Booking } from "@/components/landing-page/booking";
import { SiteFooter } from "@/components/landing-page/site-footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Stats />
      <Services />
      <Process />
      <Booking />
      <SiteFooter />
    </main>
  );
}
