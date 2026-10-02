import { Download, FileText, FolderHeart, ScanLine, SlidersHorizontal, Type } from 'lucide-react';

export const capabilities = [
  {
    icon: FileText,
    title: '保留你的表达',
    description: '支持纯文本与 Markdown。把文章排成图片，保留原文的内容和措辞。',
  },
  {
    icon: Type,
    title: '形成个人风格',
    description: '大标题、个人署名与 Logo，让每一组内容都带着自己的辨识度。',
  },
  {
    icon: SlidersHorizontal,
    title: '留白由你决定',
    description: '自由调整字号、行距与边距。收藏合适的留白，下一次继续用。',
  },
  {
    icon: ScanLine,
    title: '完整预览每一页',
    description: '3:4 与 9:16 图片比例，自动分行分页，也支持手动指定分页位置。',
  },
  {
    icon: FolderHeart,
    title: '接着上次创作',
    description: '本机草稿自动保存，支持撤销、重做，以及项目备份导入和导出。',
  },
  {
    icon: Download,
    title: '下载即可发布',
    description: '导出高清 PNG 或 JPG，逐张下载或打包 ZIP，再发布到常用平台。',
  },
];
export const steps = [
  {
    step: '01',
    title: '找到适合的工具',
    description: '进入工具仓库，按名称或平台搜索，收藏常用工具。',
  },
  {
    step: '02',
    title: '完成你的创作',
    description: '放入内容，调整到合适的样子。草稿保存在当前浏览器。',
  },
  {
    step: '03',
    title: '带走创作成果',
    description: '预览并下载文件，自行发布到小红书、抖音或知乎。',
  },
];
export const faqs = [
  {
    question: 'CreatorHub 是什么？',
    answer:
      'CreatorHub 是面向自媒体创作者的工具集合入口，服务小红书、抖音、知乎等平台。首页介绍平台，工具仓库集中承载可用工具。目前已上线文章转图片工具。',
  },
  {
    question: '需要注册或登录吗？',
    answer: '不需要。进入工具仓库即可使用当前工具，也不需要绑定任何内容平台账号。',
  },
  {
    question: '我的内容保存在哪里？',
    answer:
      '草稿、个人署名和边距收藏保存在当前浏览器。生成图片时，文章交给本机服务处理，生成结果默认保留 24 小时。清理浏览器数据前，建议先导出草稿备份。',
  },
  {
    question: '可以直接发布到小红书吗？',
    answer:
      '可以下载图片后自行发布。CreatorHub 不代发内容，也不连接平台账号。发布前请检查平台对图片的裁切和压缩效果。',
  },
];
