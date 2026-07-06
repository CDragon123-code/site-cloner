---
name: site-cloner
description: |
  Website design cloning toolkit. Combines Firecrawl + Playwright + SingleFile — three free, 
  no-API-key tools — to automatically extract design tokens, screenshots, and HTML structure 
  from any website, then generate a high-fidelity replica.
  网站设计克隆工具。组合 Firecrawl + Playwright + SingleFile 三种免费无 API 工具，
  自动抓取目标网站的设计 token、截图和 HTML 结构，生成高还原度复刻版。
  
  Triggers / 触发词: clone a website, replicate website design, 复刻网站, 克隆网站设计, 
  analyze website UI, 分析网站UI, copy website design, 扒网站, 模仿这个网站, 
  create a replica of, 帮我复刻, design tokens extraction
---

# Site Cloner — 网站设计克隆 / Website Design Cloner

> 🇬🇧 AI-powered website design reverse-engineering pipeline  
> 🇨🇳 AI 驱动的网站设计逆向工程管道

## Overview / 概述

Combines three free, open-source tools into a single automated pipeline:
组合三个免费开源工具为一条自动化管道：

| Tool 工具 | Role 角色 | Output 输出 |
|-----------|----------|-------------|
| **Firecrawl** | HTML structure scraping / 结构抓取 | DOM + Markdown |
| **Playwright** | Browser automation / 浏览器自动化 | Screenshot + Computed Styles + CSS vars |
| **SingleFile** | Page archiving / 页面存档 | Offline HTML with all resources |

**All free. No API keys. Runs locally. / 全部免费。无需 API Key。本地运行。**

## Quick Use / 快速使用

```bash
# Install once / 一次性安装
npm install -g firecrawl-cli playwright single-file-cli
npx playwright install chromium

# Clone a site / 克隆网站
node scripts/clone-site.js <url> [--output <dir>]

# Example / 示例
node scripts/clone-site.js https://dribbble.com --output ./clone-output
```

## Output / 输出文件

```
output/<domain>/
├── screenshot.png          🖼  Full-page screenshot / 全页截图
├── design-tokens.json      🎨  Complete design tokens / 完整设计参数
├── design-report.md        📊  Analysis report / 分析报告
├── firecrawl-raw.html      🏗  JS-rendered HTML / JS 渲染后 HTML
├── structure.md            📝  Markdown content / Markdown 内容
├── styles-computed.css     💅  All CSS merged / 所有 CSS 合并
├── original.html           📦  Offline archive / 离线存档
└── replica.html            🎯  Replica framework / 复刻框架
```

## What It Extracts / 提取内容

| 🇬🇧 Dimension | 🇨🇳 维度 | Method / 方法 |
|---------------|---------|---------------|
| Body font & size | 正文字体和大小 | `getComputedStyle(document.body)` |
| Text color | 文字颜色 | Computed `color` |
| Background | 背景色 | Computed `backgroundColor` |
| Top 15 colors by usage | 使用频率 Top 15 颜色 | Sampling 500 elements |
| All CSS custom properties | 所有 CSS 变量 | `document.styleSheets` → `:root` rules |
| Font stack | 字体栈 | Iterating all elements' `fontFamily` |
| Nav height & style | 导航高度和样式 | Computed nav element |
| Primary button style | 按钮样式 | First `.btn` / `[class*="primary"]` |
| Max-width breakpoints | 最大宽度断点 | Container elements' `maxWidth` |

## AI Agent Integration / AI Agent 集成

After placing this SKILL.md in your agent's skills directory, the agent can:

放置本文件到 Agent 的 skills 目录后，Agent 可以：

1. **Detect the intent / 检测意图** — User asks to clone/analyze a website design
2. **Run the pipeline / 运行管道** — `node scripts/clone-site.js <url>`
3. **Read the output / 读取输出** — `design-tokens.json` + `screenshot.png` + `firecrawl-raw.html`
4. **Generate replica / 生成复刻** — Produce pixel-accurate HTML/CSS replica

### AI Prompt Template / AI 提示模板

```
You are a web design replication expert. Given:
1. screenshot.png — visual reference
2. design-tokens.json — exact colors, fonts, spacing
3. firecrawl-raw.html — DOM structure and class names

Generate a complete replica.html that matches the original website's design.
Use the exact token values from the JSON. Prioritize pixel accuracy.

你是一个网页设计复刻专家。根据：
1. screenshot.png — 视觉参照
2. design-tokens.json — 精确的颜色、字体、间距
3. firecrawl-raw.html — DOM 结构和类名

生成一个匹配原网站设计的完整 replica.html。
使用 JSON 中的精确 token 值。优先保证像素准确度。
```

## Fault Tolerance / 容错

- If Firecrawl keyless rate-limited → retry after 60s
- If Playwright times out → increase `waitUntil: 'networkidle'` timeout
- If SingleFile fails → skip, use firecrawl-raw.html instead
- All errors logged, non-fatal failures don't stop pipeline
