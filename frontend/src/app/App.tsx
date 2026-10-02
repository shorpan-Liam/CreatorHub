import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { queryClient } from './query-client';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Header } from '../pages/home/header';
import { useReducedAnimation } from '../pages/components/LandingMotion';
import '../pages/landing.css';
import Repository from '../features/catalog/Repository';
import { toolModules } from '../tools';

const Help = lazy(() => import('../pages/Info').then((module) => ({ default: module.Help })));
const Landing = lazy(() => import('../pages/Landing'));
const Settings = lazy(() =>
  import('../pages/Info').then((module) => ({ default: module.Settings })),
);

function RouteScrollReset() {
  const { pathname, hash, key } = useLocation();
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const scrollToSection = () => {
      const section = document.getElementById(id);
      if (!section) return false;
      section.scrollIntoView({ block: 'start' });
      return true;
    };
    if (scrollToSection()) return;
    // The landing route may still be loading when its section link is opened.
    const observer = new MutationObserver(() => {
      if (scrollToSection()) observer.disconnect();
    });
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, hash, key]);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  return null;
}

function RouteSurface() {
  return (
    <div className="route-surface">
      <Suspense fallback={<main className="loading-page">正在打开页面…</main>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tools" element={<Repository />} />
          {toolModules.map(({ slug, route, component: Tool }) => (
            <Route key={slug} path={route} element={<Tool />} />
          ))}
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <main className="info-page">
                <h1>页面不存在</h1>
                <Link className="button secondary" to="/tools">
                  返回工具仓库
                </Link>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

function RenderPage() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    import('../tools/article-to-images/rendering').then((module) => {
      if (host.current) module.initializeRenderer(host.current);
    });
  }, []);
  return <div ref={host} className="render-host" />;
}

export default function App() {
  const reduced = useReducedAnimation();
  if (location.pathname === '/_render') return <RenderPage />;
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider delayDuration={400}>
          <BrowserRouter>
            <RouteScrollReset />
            <LazyMotion features={domAnimation} strict>
              <MotionConfig
                reducedMotion={reduced ? 'always' : 'never'}
                transition={{ duration: reduced ? 0 : 0.5 }}
              >
                <div className="app-shell">
                  <Header />
                  <RouteSurface />
                </div>
              </MotionConfig>
            </LazyMotion>
          </BrowserRouter>
        </Tooltip.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
