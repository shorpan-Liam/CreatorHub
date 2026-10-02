# TweakCN 前端源码阅读与移植

日期：2026-10-02。项目：CreatorHub。

## 源码版本

来源：<https://github.com/jnsahaj/tweakcn>。读取提交：`a3b47b37cba97dd637de517aab52c45ec0f83456`。

完整参考仓库位于`storage/ui-references/tweakcn-source`，仅用于阅读，没有安装或执行该仓库服务。Apache-2.0文本保留在`licenses/TweakCN-Apache-2.0.txt`。此次直接移植首页组件和基础UI，移除此前近似实现的自定义尺寸规则。

## 前端结构与阅读结论

| 上游路径 | 职责与结论 |
| --- | --- |
| `app/layout.tsx` | 全站主题、Query、Tooltip、对话框及字体入口；认证、付费、AI、统计依赖不是首页尺寸来源 |
| `app/page.tsx` | `min-h-[100dvh]`页面外壳、Header、`w-full flex-1`主体、各首页区块、Footer；区块没有统一100vh高度 |
| `app/globals.css` | Tailwind v4、主题变量和基础样式层；没有自定义container宽度，采用Tailwind默认响应式容器 |
| `postcss.config.mjs`、`pnpm-lock.yaml` | 使用PostCSS编译；锁文件中Tailwind与`@tailwindcss/postcss`为4.1.4 |
| `config/theme.ts` | 默认黑白主题、sans/serif字体、圆角和主题变量；基础间距0.25rem |
| `components/theme-script.tsx`、`theme-provider.tsx` | 根节点应用编辑器主题；CreatorHub只移植隔离的默认首页主题，避免更改图片画布 |
| `components/home/header.tsx` | 64px高、容器水平内边距16/24px、绝对居中导航、768px菜单断点、1024px字号断点 |
| `components/home/hero.tsx` | 自然内容流、间距等级、响应式标题、说明宽度上限、按钮、勾选列表、80px后接展示条 |
| `components/home/features.tsx` | 1024px起1:2分区；640px起卡片两列；24px卡片留白与间距；父级错峰入场 |
| `components/home/how-it-works.tsx` | 96/128px上下留白、768px起三列、32px列间距、大号步骤和横线 |
| `components/home/faq.tsx` | 1024px起12列网格中的4/8列分区；16px条目间距与水平留白、24px触发按钮留白 |
| `components/home/cta.tsx` | 80/128px上下留白、24px内容间距、48px按钮 |
| `components/footer.tsx` | 40/64px上下留白、32px网格间距、768px起四列 |
| `components/home/theme-preset-buttons.tsx` | 三行、每项200px、间距16px、复制四份、每项5秒周期；适配为真实创作能力展示 |
| `components/home/testimonials.tsx` | 80/128px区块留白、30/48/60px居中标题；本地在此位置展示实际出图样例，不复制用户证言 |
| `components/home/ai-generation-cta.tsx` | 阅读双列说明与演示布局；CreatorHub尚无AI服务，不引入此业务区块 |
| `components/ui/button.tsx`、`accordion.tsx` | CVA变体、Slot组合、Radix折叠；直接移植所需变体和交互 |
| `lib/utils.ts` | clsx与tailwind-merge合并类名，保留变体尺寸覆盖机制 |
| `app/editor/theme/[[...themeId]]/layout.tsx` | 编辑器才使用`h-svh flex-col overflow-hidden`，首页不使用 |
| `components/editor/editor.tsx`、`ui/resizable.tsx`、`hooks/use-mobile.tsx` | 可调整面板、flex-1/min-h-0与手机页签分配视口；主题编辑业务不同于文章出图，本次保留原工作区 |

## 尺寸机制

外层区块宽度100%，内层直接采用`container mx-auto px-4 md:px-6`，不再使用固定1400px上限的自定义容器。

| 视口宽度 | 容器最大宽度 | 水平内边距 |
| --- | --- | --- |
| 小于640px | 100% | 16px |
| 640–767px | 640px | 16px |
| 768–1023px | 768px | 24px |
| 1024–1279px | 1024px | 24px |
| 1280–1535px | 1280px | 24px |
| 不小于1536px | 1536px | 24px |

可用宽度不足时受父节点限制。页头、所有首页区块和页脚采用同一规则。

| 区块 | 手机上下留白 | 不小于768px |
| --- | --- | --- |
| Hero | 顶部80px、底部128px | 顶部128px、底部160px |
| 作品样例、功能、CTA | 80px | 128px |
| 流程、FAQ | 96px | 128px |
| Footer | 40px | 40px；1024px起64px |

Hero字号依次为48/60/72/96px，对应0/640/768/1024px断点。说明最大672px、字号18/20px。按钮高48px、最小宽180px；手机纵向排列，640px起横向排列。标题到说明24px、说明到按钮40px、按钮到勾选列表48px、列表到展示条80px。

中文沿用同一字号断点和自然换行，内容决定行数。较窄功能左栏使用“创作所需工具”，避免单字独占一行。中文和英文的字形与行数不同，不能靠固定区块高度强制裁切。

原站至少撑满动态视口的是页面外壳，区块使用自然高度。此前为Hero添加的`calc(100svh - ...)`、短窗口高度规则和clamp间距已移除。窗口变高不会拉大每个区块的留白。

顶部导航现在由应用外壳持续挂载，首页和工具仓库共用同一个TweakCN Header，不随路由重新挂载或更换样式。首页内容区最小高度相应扣除64px页头，保持原页面总尺寸。工具仓库导航只切换下方内容，平台功能、流程和FAQ链接通过React Router返回首页对应区块，并等待延迟加载完成后定位。旧页头的尺寸规则限定到`.site-header`，避免全局样式加载次序影响共用导航的响应式容器。

导航稳定性复查确认了三处问题：按pathname重建内容外壳并播放透明度动画会造成闪白；重建的Suspense边界在慢加载时立即显示加载占位；滚动后添加边框使页头从64px增至65px。现已保持内容外壳和Suspense边界不变，利用React Router的transition等新页面准备完成再替换内容，移除整页淡入，并通过绝对定位伪元素绘制分隔线，避免改变高度。

后续逐帧复查进一步发现，页头仍使用导航文字的Motion入场、随滚动切换的透明背景与backdrop-filter；路由和滚动变化会使页头在视觉上闪动。导航文字现使用普通React Router Link，页头始终为同一白色背景与分隔线，不再淡入、位移或根据下方内容进行毛玻璃合成。页头按钮只保留颜色反馈，移除缩放。首页主体的入场与滚动动效继续保留。

本机服务的构建默认清空dist，还会使已打开标签页请求旧版延迟加载脚本时返回404，触发全局错误界面。Vite已设置`emptyOutDir: false`保留带哈希的旧资源；新入口仍由no-cache的index.html指向最新构建。旧标签页可以继续工作，新打开的标签页使用新版。旧资源随构建积累，清理dist应在本地服务停止且旧标签页关闭后进行。

## 移植对应关系

| 本地文件 | 上游对应 |
| --- | --- |
| `frontend/src/pages/Landing.tsx` | `app/page.tsx`外壳与首页组装 |
| `frontend/src/pages/home/header.tsx`、`hero.tsx` | `components/home`同名组件 |
| `home/features.tsx`、`how-it-works.tsx`、`faq.tsx`、`cta.tsx` | 同名首页组件 |
| `home/footer.tsx` | `components/footer.tsx` |
| `home/ui/button.tsx`、`accordion.tsx`、`utils.ts` | Button、Accordion与cn合并 |
| `home/content.ts` | CreatorHub功能、流程与FAQ内容 |
| `landing.css`、`home/base.css` | 隔离的Tailwind入口和reset；自定义CSS仅保留图片查看器、展示条等业务适配 |

保留组件层级及Tailwind布局类，统一添加`ch:`命名空间，避免影响现有工作区。Next Link改为React Router Link；首页主体motion改为已有m/LazyMotion，保留入场参数；共用页头根据导航稳定性要求使用静态链接和背景。品牌、文案和链接替换为CreatorHub；移动菜单使用Radix保留键盘与焦点行为。

默认颜色采用`config/theme.ts`。Tailwind和PostCSS锁定4.1.4，使用Vite的PostCSS配置。不为移植纯React首页迁移到Next，也不引入原站的账户、支付、云数据库或AI接口。

首页reset限定在`.tweak-home`并先于utilities。原全局标题和段落零边距放入基础样式层，使space-y类能够覆盖默认margin。这个关系影响标题、说明、FAQ和CTA的实际间距，测试专门检查16px的标题间距。没有导入全局Preflight；`/_render`没有首页外壳，ch类不匹配出图节点。

装饰渐变、光晕、第三方证言、主题编辑业务和收费功能未移植。首页仍为CreatorHub的平台介绍；工具仓库与业务工作区继续使用现有入口和数据格式。保留草稿、边距收藏、两汉字缩进、真实出图和下载。首页独立延迟加载；导航保持无刷新单页面切换，绘制前复位滚动，不叠加旧页面。

## 验证

`frontend/tests/e2e/upstream-layout.spec.ts`覆盖390、639、640、767、768、1023、1024、1279、1280、1535、1536、1920px边界。逐项核对所有容器宽度一致、各区块间距、字号断点、列数、24px卡片留白与间距、80px展示条间距和16px标题说明间距。

另检查同宽窗口从720px增高到1440px时Hero高度不变。现有桌面/手机导航、动效、图片查看器、瀑布流、草稿、边距收藏、真实出图和ZIP继续回归。验收项为构建、10项单元测试、格式检查及36项端到端测试。新增navigation-stability.spec.ts验证内容外壳身份、导航高度不变、取消整页淡入、慢加载保留旧内容、全部导航目标、浏览器历史以及无document请求或运行时错误。重新构建前后的旧资源保留另经实际打开的旧标签页验证。截图与构建日志保存在storage。

最新页头修复新增桌面/手机逐帧回归，连续记录重复导航和浏览器返回过程中的页头背景、模糊效果、连接状态、高度、导航文字透明度与位移，避免只检查切换结束后的状态。测试库共38项，本次针对页头、导航、尺寸、动效和草稿切换运行20项回归。
