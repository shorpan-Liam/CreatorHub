// Ported from jnsahaj/tweakcn components/home/features.tsx (Apache-2.0).
import { m } from 'motion/react';
import { capabilities } from './content';
import { Reveal, useReducedAnimation } from '../components/LandingMotion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
export function Features() {
  const reduced = useReducedAnimation();
  return (
    <section
      id="features"
      className="landing-section landing-features ch:relative ch:isolate ch:w-full ch:py-20 ch:md:py-32"
      aria-labelledby="features-title"
    >
      <div className="landing-container ch:container ch:mx-auto ch:px-4 ch:md:px-6">
        <div className="landing-feature-layout ch:grid ch:gap-12 ch:lg:grid-cols-[1fr_2fr]">
          <Reveal className="landing-section-intro ch:flex ch:flex-col ch:justify-center ch:space-y-4">
            <h2
              id="features-title"
              className="ch:text-3xl ch:font-bold ch:md:text-4xl ch:lg:text-5xl ch:text-left"
            >
              创作所需工具
              <br className="ch:hidden ch:lg:block" />
              <span className="ch:text-muted-foreground">在同一个地方</span>
            </h2>
            <p className="ch:text-muted-foreground ch:max-w-[400px] ch:text-lg">
              面向内容创作者的日常工作，从文章转图片开始，让每次创作都有顺手的工具。
            </p>
          </Reveal>
          <m.div
            variants={container}
            initial={reduced ? false : 'hidden'}
            whileInView="show"
            viewport={{ once: true }}
            className="landing-feature-grid ch:grid ch:gap-6 ch:sm:grid-cols-2"
          >
            {capabilities.map(({ icon: Icon, title, description }) => (
              <m.div
                key={title}
                data-landing-reveal
                variants={item}
                whileHover={reduced ? undefined : { y: -5, transition: { duration: 0.2 } }}
              >
                <article className="landing-feature ch:group ch:h-full ch:rounded-2xl ch:border ch:border-border/40 ch:bg-card/50 ch:p-6 ch:transition-all ch:hover:bg-card ch:hover:shadow-lg">
                  <div className="landing-feature-icon ch:mb-4 ch:flex ch:size-12 ch:items-center ch:justify-center ch:rounded-xl ch:bg-primary/10 ch:text-primary ch:transition-colors ch:group-hover:bg-primary ch:group-hover:text-primary-foreground">
                    <Icon size={24} />
                  </div>
                  <h3 className="ch:mb-2 ch:flex ch:items-center ch:gap-2 ch:text-xl ch:font-bold">
                    {title}
                  </h3>
                  <p className="ch:text-muted-foreground">{description}</p>
                </article>
              </m.div>
            ))}
          </m.div>
        </div>
      </div>
    </section>
  );
}
