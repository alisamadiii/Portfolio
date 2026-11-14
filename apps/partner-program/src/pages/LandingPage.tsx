import { useEffect } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { useScrollReveal } from '../lib/motion';
import { ApplyCta } from '../sections/ApplyCta';
import { Earnings } from '../sections/Earnings';
import { Faq } from '../sections/Faq';
import { Hero } from '../sections/Hero';
import { HowItWorks } from '../sections/HowItWorks';
import { Marquee } from '../sections/Marquee';
import { WhatWeBuild } from '../sections/WhatWeBuild';
import { WhoItsFor } from '../sections/WhoItsFor';

export default function LandingPage() {
  useScrollReveal();
  useEffect(() => {
    document.title = 'Partner Program | Ali Samadii LLC';
  }, []);

  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Marquee />
        <HowItWorks />
        <Earnings />
        <WhoItsFor />
        <WhatWeBuild />
        <Faq />
        <ApplyCta />
      </main>
      <Footer />
    </>
  );
}
