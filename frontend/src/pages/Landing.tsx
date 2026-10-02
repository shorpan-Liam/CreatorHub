// Ported from jnsahaj/tweakcn app/page.tsx (Apache-2.0). See licenses/开源来源说明.md.
import { Hero } from './home/hero';
import { Features } from './home/features';
import { HowItWorks } from './home/how-it-works';
import { FAQ } from './home/faq';
import { CTA } from './home/cta';
import { Footer } from './home/footer';
import Showcase from './components/LandingShowcase';

export default function Landing() {
  return (
    <div className="tweak-home ch:bg-background ch:text-foreground ch:flex ch:min-h-[calc(100dvh-4rem)] ch:flex-col ch:items-center ch:justify-items-center">
      <main className="landing-page ch:w-full ch:flex-1">
        <Hero />
        <Showcase />
        <Features />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
