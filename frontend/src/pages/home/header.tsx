// Ported from jnsahaj/tweakcn components/home/header.tsx (Apache-2.0).
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowRight, CircleHelp, Menu, Settings2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const sections = [
  { href: '#features', label: '平台功能' },
  { href: '#how-it-works', label: '创作流程' },
  { href: '#faq', label: '常见问题' },
];

export function Header() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(scrollY > 10);
      setActive(
        (pathname === '/' ? sections : [])
          .filter(({ href }) => {
            const element = document.getElementById(href.slice(1));
            return (
              element && element.getBoundingClientRect().top <= Math.min(innerHeight * 0.3, 180)
            );
          })
          .at(-1)?.href ?? '',
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);
  return (
    <header
      className={cn(
        'tweak-home landing-header ch:sticky ch:top-0 ch:z-50 ch:w-full ch:bg-background ch:text-foreground',
        scrolled && 'is-scrolled',
      )}
    >
      <div className="header-inner ch:container ch:mx-auto ch:relative ch:flex ch:h-16 ch:items-center ch:justify-between ch:px-4 ch:md:px-6">
        <Link
          to="/"
          aria-label="CreatorHub 首页"
          className="ch:flex ch:items-center ch:gap-2 ch:font-bold"
        >
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span className="ch:hidden ch:lg:block">CreatorHub</span>
        </Link>
        <nav
          className="ch:absolute ch:left-1/2 ch:hidden ch:-translate-x-1/2 ch:items-center ch:gap-4 ch:md:flex ch:lg:gap-8"
          aria-label="主导航"
        >
          {sections.map(({ href, label }) => (
            <Link
              key={href}
              to={`/${href}`}
              aria-current={pathname === '/' && active === href ? 'location' : undefined}
              className="ch:text-muted-foreground ch:hover:text-foreground ch:group ch:relative ch:text-xs ch:font-medium ch:transition-colors ch:lg:text-sm"
            >
              {label}
              <span className="ch:bg-primary ch:absolute ch:-bottom-1 ch:left-0 ch:h-0.5 ch:w-0 ch:transition-all ch:duration-300 ch:group-hover:w-full" />
            </Link>
          ))}
          <NavLink
            to="/tools"
            className={({ isActive }) =>
              cn(
                'ch:text-muted-foreground ch:hover:text-foreground ch:text-xs ch:font-medium ch:lg:text-sm',
                isActive && 'ch:text-foreground',
              )
            }
          >
            工具仓库
          </NavLink>
        </nav>
        <div className="ch:hidden ch:items-center ch:gap-4 ch:md:flex">
          <Button asChild variant="ghost" size="icon">
            <Link to="/help" aria-label="使用说明" title="使用说明">
              <CircleHelp size={20} />
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="ch:rounded-full ch:transition-colors"
          >
            <Link to="/settings" aria-label="本机设置" title="本机设置">
              <Settings2 size={20} />
            </Link>
          </Button>
          <Button asChild className="ch:rounded-full ch:font-medium ch:transition-colors">
            <Link to="/tools">
              开始使用
              <ArrowRight size={16} className="ch:ml-1" />
            </Link>
          </Button>
        </div>
        <div className="ch:flex ch:items-center ch:gap-2 ch:md:hidden">
          <Button asChild variant="ghost" size="icon">
            <Link to="/settings" aria-label="本机设置" title="本机设置">
              <Settings2 size={20} />
            </Link>
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon" aria-label="打开导航">
                <Menu size={20} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-menu" align="end" sideOffset={12}>
                <DropdownMenu.Item asChild>
                  <Link to="/">首页</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link to="/tools">工具仓库</Link>
                </DropdownMenu.Item>
                {sections.map(({ href, label }) => (
                  <DropdownMenu.Item asChild key={href}>
                    <Link to={`/${href}`}>{label}</Link>
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator />
                <DropdownMenu.Item asChild>
                  <Link to="/tools">开始使用</Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
