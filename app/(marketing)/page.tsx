import { CallToAction } from "@/features/landing/components/CallToAction";
import { Compare } from "@/features/landing/components/Compare";
import { FAQ } from "@/features/landing/components/FAQ";
import { Features } from "@/features/landing/components/Features";
import { FieldNotes } from "@/features/landing/components/FieldNotes";
import { Hero } from "@/features/landing/components/Hero";
import { LiveDemo } from "@/features/landing/components/LiveDemo";
import { MarketingFooter } from "@/features/landing/components/MarketingFooter";
import { MarketingNav } from "@/features/landing/components/MarketingNav";
import { Pricing } from "@/features/landing/components/Pricing";
import { StatsStrip } from "@/features/landing/components/StatsStrip";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <Features />
        <LiveDemo />
        <FieldNotes />
        <StatsStrip />
        <Compare />
        <Pricing />
        <FAQ />
        <CallToAction />
      </main>
      <MarketingFooter />
    </>
  );
}
