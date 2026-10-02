// Ported from jnsahaj/tweakcn components/home/cta.tsx (Apache-2.0).
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/LandingMotion';
import { Button } from './ui/button';

export function CTA() {
  return (
    <section
      className="landing-cta ch:w-full ch:py-20 ch:md:py-32 ch:bg-primary ch:text-primary-foreground ch:relative ch:overflow-hidden ch:isolate"
      aria-labelledby="cta-title"
    >
      <div className="landing-container ch:container ch:mx-auto ch:px-4 ch:md:px-6 ch:relative">
        <Reveal className="ch:flex ch:flex-col ch:items-center ch:justify-center ch:space-y-6 ch:text-center">
          <h2 id="cta-title" className="ch:text-3xl ch:md:text-4xl ch:lg:text-5xl ch:font-bold">
            下一篇内容，从这里开始
          </h2>
          <p className="ch:mx-auto ch:max-w-[700px] ch:text-primary-foreground/80 ch:md:text-xl">
            打开工具仓库，找到适合这次创作的工具。
          </p>
          <div className="ch:flex ch:flex-col ch:sm:flex-row ch:gap-4 ch:mt-4">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="ch:rounded-full ch:h-12 ch:px-8 ch:text-base ch:shadow-md ch:hover:shadow-lg ch:transition-all ch:duration-300 ch:hover:translate-y-[-2px]"
            >
              <Link to="/tools">
                开始创作
                <ArrowRight size={16} className="ch:ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="ch:rounded-full ch:bg-transparent ch:h-12 ch:px-8 ch:text-base ch:transition-all ch:duration-300 ch:hover:translate-y-[-2px]"
            >
              <Link to="/help">使用说明</Link>
            </Button>
          </div>
          <p className="ch:text-sm ch:text-primary-foreground/80 ch:mt-4">
            无需注册，无需绑定平台账号。
          </p>
        </Reveal>
      </div>
    </section>
  );
}
