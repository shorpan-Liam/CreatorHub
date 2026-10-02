import { Link, NavLink, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, ArrowRight, CircleHelp, Menu, Settings2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const landingSections = [
  { href: '#features', label: '平台功能' },
  { href: '#how-it-works', label: '创作流程' },
  { href: '#faq', label: '常见问题' },
];

export function Arrow({ back = false }: { back?: boolean }) {
  const Icon = back ? ArrowLeft : ArrowRight;
  return <Icon size={18} aria-hidden="true" />;
}

export function Header() {
  const isLanding = useLocation().pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  useEffect(() => {
    if (!isLanding) return;
    let pending = 0;
    const update = () => {
      pending = 0;
      setScrolled(window.scrollY > 10);
      const offset = Math.min(window.innerHeight * 0.3, 180);
      const active = landingSections
        .filter(({ href }) => {
          const section = document.getElementById(href.slice(1));
          return section && section.getBoundingClientRect().top <= offset;
        })
        .at(-1);
      setActiveSection(active?.href ?? '');
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [isLanding]);
  return (
    <header
      className={`site-header${isLanding ? ` landing-header${scrolled ? ' is-scrolled' : ''}` : ''}`}
    >
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="CreatorHub 首页">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span>CreatorHub</span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          {isLanding ? (
            landingSections.map(({ href, label }) => (
              <a
                href={href}
                key={href}
                aria-current={activeSection === href ? 'location' : undefined}
              >
                {label}
              </a>
            ))
          ) : (
            <NavLink to="/" end>
              首页
            </NavLink>
          )}
          <NavLink to="/tools">工具仓库</NavLink>
        </nav>
        <div className="header-utilities">
          <Link to="/help" aria-label="使用说明" title="使用说明">
            <CircleHelp size={18} />
          </Link>
          <Link to="/settings" aria-label="本机设置" title="本机设置">
            <Settings2 size={18} />
          </Link>
          <Link to={isLanding ? '/tools' : '/tools/article-to-images'} className="header-start">
            {isLanding ? '开始使用' : '开始创作'} <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-button mobile-navigation" aria-label="打开导航">
                <Menu size={20} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-menu" align="end" sideOffset={12}>
                <DropdownMenu.Item asChild>
                  <Link to="/">首页</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link to="/tools">工具仓库</Link>
                </DropdownMenu.Item>
                {isLanding
                  ? landingSections.map(({ href, label }) => (
                      <DropdownMenu.Item asChild key={href}>
                        <a href={href}>{label}</a>
                      </DropdownMenu.Item>
                    ))
                  : null}
                <DropdownMenu.Separator />
                <DropdownMenu.Item asChild>
                  <Link to={isLanding ? '/tools' : '/tools/article-to-images'}>
                    {isLanding ? '开始使用' : '开始创作'}
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

export function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div role={danger ? 'alert' : 'status'} className={`notice ${danger ? 'danger' : ''}`}>
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link to="/">CreatorHub</Link>
        <nav aria-label="页脚导航">
          <Link to="/tools">工具仓库</Link>
          <Link to="/help">使用说明</Link>
        </nav>
      </div>
    </footer>
  );
}
