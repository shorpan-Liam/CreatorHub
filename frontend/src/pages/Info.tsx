import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, connect } from '../client/request';
import { clearLocal, getBrand } from '../lib/storage';
import { saveBrand, listDrafts } from '../lib/storage';
import { newDraft, type Draft } from '../tools/article-to-images/model';
import { Footer, Notice } from '../components/layout';

export function Help() {
  return (
    <>
      <main className="info-page">
        <h1>使用说明</h1>
        <p className="info-lead">CreatorHub 不需要登录。打开工具，完成创作，下载带走。</p>
        <section>
          <h2>文章转图片</h2>
          <ol className="help-steps">
            <li>
              <span>01</span>
              <div>
                <h3>放入文字</h3>
                <p>
                  填写标题，粘贴正文。段落间空一行，标题回车可以指定分行。也可以选择
                  Markdown，保留小标题、加粗、列表和引用。
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>调整到合适</h3>
                <p>
                  默认使用经典阅读版式和“小潘同学”署名。按需修改品牌、图片比例、字号和留白。把光标放在正文中，点击“插入分页”指定新的页面。
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>生成，下载</h3>
                <p>
                  点击“生成高清图片”，查看真实图片后下载 ZIP
                  或单页。手机可逐张下载。修改内容后，需要重新生成，才能下载最新版本。
                </p>
              </div>
            </li>
          </ol>
          <Link className="button primary" to="/tools/article-to-images">
            开始排版 →
          </Link>
        </section>
        <section className="faq">
          <h2>几个常见问题</h2>
          <details open>
            <summary>文章和图片保存在哪里？</summary>
            <p>
              草稿和署名保存在当前浏览器。出图时内容交给本机 Python 服务处理，生成结果默认保留 24
              小时。清理浏览器数据会移除本机草稿；换设备前请通过“更多 → 备份项目文件”保存。
            </p>
          </details>
          <details>
            <summary>会修改我的文字吗？</summary>
            <p>
              默认不会。工具负责分行和分页，保留原文措辞。Markdown
              转换会去掉格式标记；复杂表格、代码、图片语法按原样文本显示。内容整理操作可撤销。
            </p>
          </details>
          <details>
            <summary>哪种尺寸适合小红书？</summary>
            <p>
              先尝试 1080 × 1440 的常规竖版。高版为 1080 ×
              1920。实际裁切和压缩取决于平台与上传方式，发布前请在手机上检查；本工具不保证触发特定全屏展示模式。
            </p>
          </details>
          <details>
            <summary>为什么不能生成图片？</summary>
            <p>
              确认本地 API、渲染服务和 PostgreSQL 正在运行。文章最多 20,000 字，一组最多 50 页。Logo
              支持 5 MiB 以内的 PNG、JPG 和 WebP。遇到失败，正文仍会保留。
            </p>
          </details>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function Settings() {
  const [brand, setBrand] = useState<Draft['brand']>(newDraft().brand);
  const [logo, setLogo] = useState('');
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  const [danger, setDanger] = useState(false);
  useEffect(() => {
    getBrand()
      .then((x) => {
        if (x) {
          setBrand(x.brand);
          setLogo(x.logoDataUrl);
        }
      })
      .catch(() => {});
    listDrafts()
      .then((x) => setCount(x.length))
      .catch(() => {});
  }, []);
  const act = async (fn: () => Promise<void>, done: string) => {
    try {
      await fn();
      setDanger(false);
      setMessage(done);
    } catch (e) {
      setDanger(true);
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <main className="info-page settings-page">
        <h1>本机设置</h1>
        <p className="info-lead">这里的设置，仅保存在当前浏览器。</p>
        {message ? <Notice danger={danger}>{message}</Notice> : null}
        <section>
          <h2>默认署名</h2>
          <p>新草稿会使用这份署名，已有作品保持原样。</p>
          <label htmlFor="default-name">名称</label>
          <div className="inline-form">
            <input
              id="default-name"
              className="field-input"
              value={brand.name}
              onChange={(e) => {
                if ([...e.target.value].length <= 24) setBrand({ ...brand, name: e.target.value });
              }}
            />
            <button
              className="button primary"
              onClick={() =>
                act(
                  () => saveBrand({ ...newDraft(), brand, logoDataUrl: logo }),
                  '默认署名已保存。',
                )
              }
            >
              保存
            </button>
          </div>
          <p className="field-hint">Logo 可在文章转图片工具中设置，再选择“设为默认署名”。</p>
        </section>
        <section>
          <h2>本机数据</h2>
          <p>当前保留 {count} 份草稿。清除后无法恢复，请先在工具中备份需要的项目。</p>
          <button
            className="button secondary"
            onClick={() => {
              if (confirm('清除当前浏览器的全部草稿、默认署名、收藏和最近使用？此操作无法撤销。'))
                act(async () => {
                  await clearLocal();
                  setCount(0);
                  setBrand(newDraft().brand);
                  setLogo('');
                }, '本机数据已清除。');
            }}
          >
            清除本机数据
          </button>
        </section>
        <section>
          <h2>临时图片</h2>
          <p>
            清理本机服务中的 Logo、渲染快照和导出结果。正在生成的任务会取消，浏览器草稿不会删除。
          </p>
          <button
            className="button secondary"
            onClick={() => {
              if (confirm('清理当前匿名会话的临时图片，并取消进行中的任务？'))
                act(async () => {
                  await connect();
                  await api('/session/data', { method: 'DELETE' });
                }, '清理已安排，临时文件会在后台移除。');
            }}
          >
            清理服务器临时数据
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
