import { Faq } from "@/app/_components/home/faq";
import { FeatureGrid } from "@/app/_components/home/feature-grid";
import { FinalCta } from "@/app/_components/home/final-cta";
import { Hero } from "@/app/_components/home/hero";
import { HowItWorks } from "@/app/_components/home/how-it-works";
import { PrivacySection } from "@/app/_components/home/privacy-section";
import { StatsStrip } from "@/app/_components/home/stats-strip";
import { ToolsShowcase } from "@/app/_components/home/tools-showcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <FeatureGrid />
      <ToolsShowcase />
      <HowItWorks />
      <PrivacySection />
      <Faq />
      <FinalCta />
    </>
  );
}
