// Ported from jnsahaj/tweakcn components/footer.tsx (Apache-2.0).
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="landing-footer ch:bg-background/95 ch:w-full ch:border-t ch:backdrop-blur-sm">
      <div className="landing-container ch:container ch:mx-auto ch:flex ch:flex-col ch:gap-8 ch:px-4 ch:py-10 ch:md:px-6 ch:lg:py-16">
        <div className="ch:grid ch:gap-8 ch:sm:grid-cols-2 ch:md:grid-cols-4">
          <div className="ch:col-span-2 ch:max-w-md ch:space-y-4">
            <Link to="/" className="ch:flex ch:items-center ch:gap-2 ch:font-bold">
              <span className="brand-mark" aria-hidden="true">
                C
              </span>
              CreatorHub
            </Link>
            <p className="ch:text-muted-foreground ch:text-sm">
              自媒体创作者的工具集合入口。
              <br />
              内容由你表达，形式交给工具。
            </p>
          </div>
          <nav aria-label="平台导航" className="ch:space-y-4">
            <h2 className="ch:text-sm ch:font-bold">平台</h2>
            <ul className="ch:space-y-2 ch:text-sm ch:text-muted-foreground">
              <li>
                <a href="#features">平台功能</a>
              </li>
              <li>
                <a href="#how-it-works">创作流程</a>
              </li>
              <li>
                <Link to="/tools">工具仓库</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="帮助导航" className="ch:space-y-4">
            <h2 className="ch:text-sm ch:font-bold">帮助</h2>
            <ul className="ch:space-y-2 ch:text-sm ch:text-muted-foreground">
              <li>
                <a href="#faq">常见问题</a>
              </li>
              <li>
                <Link to="/help">使用说明</Link>
              </li>
              <li>
                <Link to="/settings">本机设置</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="ch:border-border/40 ch:flex ch:flex-col ch:items-center ch:justify-between ch:gap-4 ch:border-t ch:pt-8 ch:sm:flex-row">
          <p className="ch:text-muted-foreground ch:text-xs">
            © {new Date().getFullYear()} CreatorHub
          </p>
          <p className="ch:text-muted-foreground ch:text-xs">小红书 / 抖音 / 知乎</p>
        </div>
      </div>
    </footer>
  );
}
