import { Navbar } from "./components/navbar";
import { Hero } from "./components/hero";
import { Marquee } from "./components/marquee";
import { Stats } from "./components/stats";
import { About } from "./components/about";
import { Services } from "./components/services";
import { Process } from "./components/process";
import { Pricing } from "./components/pricing";
import { CTA } from "./components/cta";
import { Contact } from "./components/contact";
import { Footer } from "./components/footer";

export function App() {
  return (
    <div className="bg-bg text-text antialiased">
      <div className="grain" />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <About />
        <Services />
        <Process />
        <Pricing />
        <CTA />
        <Contact />
        <Footer />
      </main>
    </div>
  );
}
