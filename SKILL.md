---
name: site-cloner
description: |
  网站设计复刻工具。组合 Firecrawl + Playwright + SingleFile 三种无 API 工具，
  全自动抓取目标网站的 HTML 结构、设计 token、截图和完整存档。
  当用户要求分析/复刻/克隆网站设计时触发。
  触发词：复刻网站、克隆网站设计、分析网站UI、模仿这个网站、copy网站设计、
  clone website design、扒一个网站。
---

# Site Cloner — 网站设计复刻工具

基于 Firecrawl + Playwright + SingleFile 三件套，全免费、无 API Key 依赖。

## 三步使用

```bash
# 1. 抓取目标网站的所有设计数据
node skills/site-cloner/scripts/clone-site.js <url> [--output <dir>]

# 2. 查看分析报告和截图
# 打开 clone-output/<domain>/design-report.md + screenshot.png

# 3. 基于 design-tokens.json + firecrawl-raw.html 手写或 AI 辅助生成复刻版
```

## 输出文件说明

```
clone-output/<domain>/
├── screenshot.png          ← 🖼  1440px 全页截图（像素级视觉参考）
├── design-tokens.json      ← 🎨  颜色、字体、间距、CSS 变量、导航/按钮样式
├── design-report.md        ← 📊  人类可读的设计系统分析报告
├── firecrawl-raw.html      ← 🏗  抓取的 HTML 结构（JS 渲染后）
├── structure.md            ← 📝  页面内容的 Markdown 版本
├── styles-computed.css     ← 💅  所有内部/外部 CSS 合并（含内联）
├── original.html           ← 📦  SingleFile 完整存档（含图片/CSS/JS 全部内联）
└── replica.html            ← 🎯  复刻框架（需要手动完善组件）
```

## 三个工具的分工

| 工具 | 用途 | 无 API？ | 输出内容 |
|------|------|---------|---------|
| **Firecrawl** | HTML 结构 + Markdown 内容 | ✅ keyless | DOM 骨架、文本内容 |
| **Playwright** | 截图 + 渲染后样式提取 | ✅ 本地浏览器 | 像素级截图、computed styles、CSS 变量 |
| **SingleFile** | 完整页面存档 | ✅ 本地 | 所有资源内联的单 HTML 文件 |

## 工作流程详解

### 阶段 1：数据采集（clone-site.js 自动完成）

```
目标 URL
  ├── Firecrawl → 抓取 HTML 结构 + Markdown 内容
  ├── Playwright → 全页截图 + computed styles 提取
  │     ├── 色彩系统（使用频率 Top 15 + CSS 变量）
  │     ├── 字体系统（所有 font-family）
  │     ├── 导航栏样式（高度/背景/毛玻璃/定位）
  │     ├── 按钮样式（颜色/圆角/内边距/字号）
  │     └── 布局系统（max-width、容器 margin/padding）
  └── SingleFile → 完整离线存档
```

### 阶段 2：设计分析（AI 辅助）

打开 `design-tokens.json` + `screenshot.png` + `firecrawl-raw.html`，AI 可以：

1. **识别设计风格**：极简/Swiss/新拟态/毛玻璃/渐变…
2. **提取组件层级**：导航 → Hero → 内容区 → 卡片网格 → Footer
3. **匹配设计 token**：从 JSON 中找到每个组件对应的颜色/字号/间距
4. **生成复刻代码**：基于分析结果写出 HTML/CSS

### 阶段 3：生成复刻版

AI 结合截图（视觉）+ JSON（数值）+ HTML（结构）生成复刻版 HTML。

## 为什么比单用 Firecrawl 好？

| 数据 | 单用 Firecrawl | Firecrawl + Playwright + SingleFile |
|------|---------------|-------------------------------------|
| HTML 结构 | ✅ | ✅ |
| CSS 样式内容 | ❌ 只有 `<link>` 标签 | ✅ computed styles + CSS 变量 + 完整内联 CSS |
| 像素级截图 | ❌ keyless 模式截图有问题 | ✅ 1440px 全页截图 |
| 真实颜色值 | ❌ 只能从 class 名猜 | ✅ `getComputedStyle` 提取 |
| 字体信息 | ❌ | ✅ 完整字体栈 |
| 交互状态样式 | ❌ | ✅ hover/focus/active 的 computed values |
| JS 渲染后的完整 DOM | ❌ 不完整 | ✅ `networkidle` + 3s 等待 |
| 离线完整存档 | ❌ | ✅ SingleFile 包含所有资源 |
| 设计 Token JSON | ❌ | ✅ 可直接用于代码生成 |

## 前置依赖

```bash
# 一次性安装（已完成）
npm install -g firecrawl-cli playwright single-file-cli
npx playwright install chromium
```

全部免费，无 API Key 依赖。

## 示例

```bash
# 克隆 Dribbble
node skills/site-cloner/scripts/clone-site.js https://dribbble.com --output ./clone-output

# 克隆 Apple
node skills/site-cloner/scripts/clone-site.js https://apple.com --output ./clone-output

# 克隆 Linear
node skills/site-cloner/scripts/clone-site.js https://linear.app --output ./clone-output
```

## 复刻质量提升技巧

1. **先看截图，再看 JSON**：视觉第一印象比数值重要
2. **对照 firecrawl-raw.html 的 class 名**：BEM 命名往往暴露组件意图
3. **用 design-tokens.json 的 topColors 建立色板**：使用频率最高的颜色通常是主色
4. **检查 styles-computed.css**：完整的 CSS 规则，搜索类名找具体组件样式
5. **SingleFile 存档做备查**：当需要检查某个动画或多状态交互时
