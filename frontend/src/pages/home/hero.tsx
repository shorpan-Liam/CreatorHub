// Ported from jnsahaj/tweakcn components/home/hero.tsx (Apache-2.0).
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { m } from 'motion/react';
import { Button } from './ui/button';
import { CapabilityMarquee } from '../components/CapabilityMarquee';
import { useReducedAnimation } from '../components/LandingMotion';

export function Hero() {
  const reduced = useReducedAnimation();
  const initial = reduced ? false : { opacity: 0, y: 20 };
  return (
    <section
      className="landing-hero ch:relative ch:isolate ch:w-full ch:overflow-hidden ch:bg-background ch:pt-20 ch:pb-32 ch:md:pt-32 ch:md:pb-40"
      aria-labelledby="landing-title"
    >
      <div className="landing-container ch:container ch:relative ch:z-20 ch:mx-auto ch:px-4 ch:md:px-6">
        <div className="landing-hero-content ch:flex ch:flex-col ch:items-center ch:text-center">
          <m.h1
            id="landing-title"
            aria-label="CreatorHub"
            initial={initial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="ch:max-w-4xl ch:text-5xl ch:font-bold ch:sm:text-6xl ch:md:text-7xl ch:lg:text-8xl ch:text-foreground ch:text-balance"
          >
            Creator<span className="ch:font-serif ch:italic ch:font-light">Hub</span>
            <span className="landing-headline-category ch:block ch:text-balance">
              自媒体创作工具集
            </span>
          </m.h1>
          <m.p
            initial={initial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="landing-offer ch:mt-6 ch:max-w-2xl ch:text-lg ch:text-muted-foreground ch:md:text-xl ch:leading-relaxed"
          >
            为小红书、抖音、知乎创作者，把内容排版、个人风格与成果导出集中在一个地方。无需登录，打开即用。
          </m.p>
          <m.div
            initial={initial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="landing-actions ch:mt-10 ch:flex ch:flex-col ch:items-center ch:justify-center ch:gap-4 ch:sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="ch:h-12 ch:min-w-[180px] ch:rounded-full ch:px-8 ch:text-base ch:shadow-lg ch:shadow-primary/20 ch:transition-all ch:hover:scale-105"
            >
              <Link to="/tools">
                进入工具仓库
                <ArrowRight size={16} className="ch:ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="ch:h-12 ch:min-w-[180px] ch:rounded-full ch:border-primary/20 ch:bg-background/50 ch:px-8 ch:text-base ch:backdrop-blur-sm ch:hover:bg-accent/50 ch:hover:border-primary/50"
            >
              <a href="#features">了解平台</a>
            </Button>
          </m.div>
          <m.ul
            initial={initial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="landing-benefits ch:mt-12 ch:flex ch:flex-wrap ch:justify-center ch:gap-x-8 ch:gap-y-4 ch:text-sm ch:text-muted-foreground"
            aria-label="平台特点"
          >
            {['无需登录', '本机草稿', '高清导出'].map((label) => (
              <li className="ch:flex ch:items-center ch:gap-2" key={label}>
                <span className="ch:rounded-full ch:bg-primary/10 ch:p-1">
                  <Check size={12} className="ch:text-primary" />
                </span>
                {label}
              </li>
            ))}
          </m.ul>
          <m.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="landing-hero-marquee ch:mt-20 ch:w-full ch:max-w-[100vw] ch:overflow-hidden"
          >
            <CapabilityMarquee />
          </m.div>
        </div>
      </div>
    </section>
  );
}
