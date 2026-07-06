# Site Cloner — AI 驱动的网站设计克隆工具

> 一句话：输入任意网站 URL，自动提取完整的视觉设计系统、HTML 结构和像素级截图，帮你复刻网站界面。

## 它是什么

Site Cloner 是一个**全自动网站设计逆向工程工具**，组合了三个免费开源工具：

| 工具 | 角色 | 输出 |
|------|------|------|
| **Firecrawl** 🔥 | HTML 结构抓取 | DOM 骨架 + Markdown 内容 |
| **Playwright** 🎭 | 浏览器自动化 | 全页截图 + Computed Styles + CSS 变量 |
| **SingleFile** 📦 | 完整页面存档 | 所有资源内联的单 HTML 文件 |

三个工具全部**免费、无需 API Key、本地运行**。

## 能做什么

- 🎨 提取网站的真实设计 Token（颜色、字体、间距、圆角、阴影）
- 📸 生成 2x 高清全页截图
- 🏗️ 抓取 JS 渲染后的完整 HTML 结构
- 💾 保存包含所有 CSS/图片的离线存档
- 📊 自动生成设计系统分析报告

## 五步上手

```bash
# 1. 一键安装依赖
npm install -g firecrawl-cli playwright single-file-cli
npx playwright install chromium

# 2. 克隆目标网站
node scripts/clone-site.js https://dribbble.com

# 3. 查看结果
# → output/dribbble-com/screenshot.png     全页截图
# → output/dribbble-com/design-tokens.json  设计参数
# → output/dribbble-com/design-report.md    分析报告
# → output/dribbble-com/firecrawl-raw.html  HTML 结构
# → output/dribbble-com/original.html       完整存档

# 4. 用 AI 分析设计
# 把 design-tokens.json + screenshot.png 交给 AI，生成复刻 HTML

# 5. 对照截图微调
```

## 输出文件说明

```
output/<domain>/
├── screenshot.png          🖼  1440px 全页截图（像素级参考）
├── design-tokens.json      🎨  完整设计参数（颜色/字体/间距/CSS 变量）
├── design-report.md        📊  人类可读的设计系统分析
├── firecrawl-raw.html      🏗  JS 渲染后的 HTML 结构
├── structure.md            📝  页面内容 Markdown 版
├── styles-computed.css     💅  所有内/外部 CSS 合并（含内联样式）
├── original.html           📦  完整离线存档（图片/CSS/JS 全部内联）
└── replica.html            🎯  复刻框架（需手动/ AI 完善）
```

## 设计提取能力

`design-tokens.json` 包含：

```json
{
  "bodyFont": "\"Mona Sans\", \"Helvetica Neue\", sans-serif",
  "bodyFontSize": "16px",
  "bodyLineHeight": "28px",
  "bodyColor": "rgb(13, 12, 34)",
  "bodyBackground": "rgb(255, 255, 255)",
  "topColors": [
    { "color": "rgb(6, 3, 24)", "count": 143 },
    { "color": "rgb(234, 76, 137)", "count": 16 }
  ],
  "cssVariables": {
    "--sl-color-primary-500": "rgb(234 76 137)",
    "--sl-color-primary-600": "rgb(228 74 133)"
  },
  "fonts": ["\"Mona Sans\"", "Arial"],
  "navStyles": {
    "height": "92px",
    "backgroundColor": "rgba(0, 0, 0, 0)"
  },
  "btnStyles": {
    "borderRadius": "1e+07px",
    "padding": "0px 16px"
  },
  "maxWidths": ["1650px", "1200px", "618px"]
}
```

## 为什么比单独用 Firecrawl 好

| 数据维度 | 单用 Firecrawl | + Playwright + SingleFile |
|---------|---------------|--------------------------|
| HTML 结构 | ✅ | ✅ |
| **CSS 样式内容** | ❌ 只有 &lt;link&gt; | ✅ Computed Styles + CSS 变量 + 内联 CSS |
| **像素级截图** | ❌ | ✅ 1440px 2x 全页截图 |
| **真实颜色值** | ❌ 从 class 猜 | ✅ getComputedStyle |
| **字体信息** | ❌ | ✅ 完整字体栈 + font-face |
| **JS 渲染后的 DOM** | ❌ 不完整 | ✅ networkidle + 3s 等待 |
| **设计 Token JSON** | ❌ | ✅ 机器可直接消费 |
| **离线完整存档** | ❌ | ✅ SingleFile 含所有资源 |

## 改造你的 skill 配置

在 `~/.openclaw/workspace/skills/site-cloner/SKILL.md` 中放置完整的 Agent Skill 定义文件，
这样 AI Agent（Claude Code / Codex / OpenClaw 等）可以直接调用 `clone-site.js` 自动完成网站分析工作流。

## 复刻效果

以 Dribbble 官网为例：

- 品牌色：`#EA4C89` ✅ 精确匹配
- 字体：Mona Sans ✅ 识别
- 导航高度：92px ✅ 精确匹配
- 按钮：白色药丸形 ✅ 精确匹配
- 整体复刻度：80%+

## 依赖

- Node.js >= 18
- firecrawl-cli（免费 keyless 模式，每月 1,000 页）
- playwright + chromium
- single-file-cli

## License

MIT
