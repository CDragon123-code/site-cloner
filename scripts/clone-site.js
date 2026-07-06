#!/usr/bin/env node
/**
 * site-cloner - 网站设计复刻工具
 * 组合 Firecrawl + Playwright + SingleFile 三件套
 * 
 * 用法:
 *   node clone-site.js <url> [--output <dir>]
 *   node clone-site.js https://dribbble.com --output ./dribbble-clone
 *
 * 输出:
 *   <output>/
 *   ├── original.html          # SingleFile 完整存档
 *   ├── screenshot.png         # 全页截图
 *   ├── design-tokens.json     # 提取的设计 token
 *   ├── structure.md           # Firecrawl 抓取的 Markdown 结构
 *   ├── styled-dump.html       # 内联样式后的完整 HTML
 *   └── replica.html           # 基于 token 生成的复刻版
 */

const { chromium } = require('playwright');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

const TARGET_URL = process.argv[2];
const OUTPUT_DIR = process.argv[4] || './clone-output';

if (!TARGET_URL) {
  console.error('用法: node clone-site.js <url> [--output <dir>]');
  process.exit(1);
}

async function main() {
  // Prepare
  const domain = new URL(TARGET_URL).hostname.replace(/\./g, '-');
  const outDir = path.resolve(OUTPUT_DIR, domain);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`📁 输出目录: ${outDir}\n`);

  // ═══ Step 1: Firecrawl — 抓取 HTML 结构和 Markdown ═══
  console.log('🔍 [1/5] Firecrawl 抓取中...');
  try {
    const mdResult = spawnSync('firecrawl', [TARGET_URL, '--format', 'markdown'], {
      encoding: 'utf-8', timeout: 60000, shell: true
    });
    if (mdResult.stdout) {
      fs.writeFileSync(path.join(outDir, 'structure.md'), mdResult.stdout);
      console.log('   ✅ structure.md 已保存');
    }

    const htmlResult = spawnSync('firecrawl', [TARGET_URL, '--format', 'html'], {
      encoding: 'utf-8', timeout: 60000, shell: true, maxBuffer: 50 * 1024 * 1024
    });
    if (htmlResult.stdout) {
      const html = htmlResult.stdout.replace(/^Scrape ID:.*\n/m, '');
      fs.writeFileSync(path.join(outDir, 'firecrawl-raw.html'), html);
      console.log('   ✅ firecrawl-raw.html 已保存');
    }
  } catch (e) {
    console.log('   ⚠️  Firecrawl 部分失败:', e.message);
  }

  // ═══ Step 2: Playwright — 截图 + 提取设计 token ═══
  console.log('📸 [2/5] Playwright 截图中...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
    // 等待额外渲染
    await page.waitForTimeout(3000);

    // 全页截图
    await page.screenshot({
      path: path.join(outDir, 'screenshot.png'),
      fullPage: true,
    });
    console.log('   ✅ screenshot.png 已保存');

    // 提取设计 token
    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);

      // 收集所有 CSS 自定义属性
      const cssVars = {};
      const rules = [...document.styleSheets]
        .filter(s => { try { return !!s.cssRules; } catch(e) { return false; }})
        .flatMap(s => [...s.cssRules])
        .filter(r => r.style);
      
      // 从 :root 提取变量
      const rootRule = rules.find(r => r.selectorText === ':root' || r.selectorText === 'html');
      if (rootRule) {
        for (let i = 0; i < rootRule.style.length; i++) {
          const prop = rootRule.style[i];
          if (prop.startsWith('--')) {
            cssVars[prop] = rootRule.style.getPropertyValue(prop).trim();
          }
        }
      }

      // 提取颜色信息
      const colorUsage = {};
      const allElements = document.querySelectorAll('*');
      const sampleSize = Math.min(allElements.length, 500);
      for (let i = 0; i < sampleSize; i++) {
        const el = allElements[i];
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        const clr = style.color;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          colorUsage[bg] = (colorUsage[bg] || 0) + 1;
        }
        if (clr && clr !== 'rgba(0, 0, 0, 0)') {
          colorUsage[clr] = (colorUsage[clr] || 0) + 1;
        }
      }

      // 提取字体信息
      const fonts = new Set();
      document.querySelectorAll('*').forEach(el => {
        const ff = getComputedStyle(el).fontFamily;
        if (ff) fonts.add(ff);
      });

      // 提取布局信息
      const layout = {
        maxWidths: new Set(),
        commonMargins: [],
        commonPaddings: [],
      };

      // 查找主要容器
      const containers = document.querySelectorAll('header, main, nav, section, footer, .container, [class*="container"], [class*="wrapper"]');
      containers.forEach(el => {
        const style = getComputedStyle(el);
        const mw = style.maxWidth;
        if (mw && mw !== 'none') layout.maxWidths.add(mw);
        layout.commonMargins.push({ selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''), margin: style.margin, padding: style.padding });
      });

      // 提取导航样式
      const nav = document.querySelector('nav, header, [class*="nav"]');
      let navStyles = null;
      if (nav) {
        const ns = getComputedStyle(nav);
        navStyles = {
          height: ns.height,
          backgroundColor: ns.backgroundColor,
          padding: ns.padding,
          position: ns.position,
          top: ns.top,
          backdropFilter: ns.backdropFilter,
        };
      }

      // 提取关键按钮样式
      const primaryBtn = document.querySelector('a[class*="btn"], button[class*="primary"], a[class*="signup"], .btn');
      let btnStyles = null;
      if (primaryBtn) {
        const bs = getComputedStyle(primaryBtn);
        btnStyles = {
          backgroundColor: bs.backgroundColor,
          color: bs.color,
          borderRadius: bs.borderRadius,
          padding: bs.padding,
          fontSize: bs.fontSize,
          fontWeight: bs.fontWeight,
          fontFamily: bs.fontFamily,
        };
      }

      return {
        cssVariables: cssVars,
        bodyFont: body.fontFamily,
        bodyFontSize: body.fontSize,
        bodyLineHeight: body.lineHeight,
        bodyColor: body.color,
        bodyBackground: body.backgroundColor,
        topColors: Object.entries(colorUsage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([color, count]) => ({ color, count })),
        fonts: [...fonts],
        maxWidths: [...layout.maxWidths],
        navStyles,
        btnStyles,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    fs.writeFileSync(
      path.join(outDir, 'design-tokens.json'),
      JSON.stringify(tokens, null, 2)
    );
    console.log('   ✅ design-tokens.json 已保存');
    console.log(`   🎨 主色: ${tokens.bodyColor}`);
    console.log(`   🔤 字体: ${tokens.bodyFont}`);
    console.log(`   📐 字号: ${tokens.bodyFontSize}`);
    console.log(`   🧭 导航: ${tokens.navStyles ? tokens.navStyles.height + ' / ' + tokens.navStyles.backgroundColor : '未检测到'}`);

    // 提取完整内联样式后的 HTML
    const styledHTML = await page.evaluate(() => {
      // 把所有外部样式表内容内联
      const styles = [...document.styleSheets]
        .filter(sheet => {
          try { return !!sheet.cssRules; } catch(e) { return false; }
        })
        .map(sheet => {
          try {
            return [...sheet.cssRules].map(r => r.cssText).join('\n');
          } catch(e) { return ''; }
        })
        .join('\n\n');
      return styles;
    });

    fs.writeFileSync(
      path.join(outDir, 'styles-computed.css'),
      styledHTML
    );
    console.log('   ✅ styles-computed.css 已保存');

  } catch (e) {
    console.log('   ⚠️  Playwright 部分失败:', e.message);
  } finally {
    await browser.close();
  }

  // ═══ Step 3: SingleFile — 完整存档 ═══
  console.log('💾 [3/5] SingleFile 存档中...');
  try {
    spawnSync('single-file', [TARGET_URL, path.join(outDir, 'original.html')], {
      encoding: 'utf-8', timeout: 120000, shell: true,
    });
    console.log('   ✅ original.html 已保存（包含所有资源）');
  } catch (e) {
    console.log('   ⚠️  SingleFile 失败:', e.message);
  }

  // ═══ Step 4: 生成设计系统分析报告 ═══
  console.log('📊 [4/5] 生成分析报告...');
  const tokens = JSON.parse(fs.readFileSync(path.join(outDir, 'design-tokens.json'), 'utf-8'));
  
  const report = `# ${domain} 网站设计系统分析

## 基本信息
- URL: ${TARGET_URL}
- 页面宽度: ${tokens.viewportWidth}px
- 页面高度: ${tokens.viewportHeight}px

## 色彩系统
**主文字色**: ${tokens.bodyColor}
**背景色**: ${tokens.bodyBackground}
**使用频率最高的颜色:**
${tokens.topColors.map(c => `- \`${c.color}\` (${c.count} 次)`).join('\n')}

## 字体系统
**正文字体**: ${tokens.bodyFont}
**正文字号**: ${tokens.bodyFontSize}
**行高**: ${tokens.bodyLineHeight}
**所有字体族:**
${tokens.fonts.map(f => `- ${f}`).join('\n')}

## CSS 自定义属性
${Object.entries(tokens.cssVariables).map(([k,v]) => `- \`${k}\`: \`${v}\``).join('\n')}

## 导航栏
${tokens.navStyles ? `- 高度: ${tokens.navStyles.height}
- 背景: ${tokens.navStyles.backgroundColor}
- 内边距: ${tokens.navStyles.padding}
- 定位: ${tokens.navStyles.position}
- 毛玻璃: ${tokens.navStyles.backdropFilter}` : '- 未检测到独立导航栏'}

## 最大宽度
${tokens.maxWidths.map(w => `- ${w}`).join('\n')}

## 主要按钮样式
${tokens.btnStyles ? `- 背景: ${tokens.btnStyles.backgroundColor}
- 文字色: ${tokens.btnStyles.color}
- 圆角: ${tokens.btnStyles.borderRadius}
- 内边距: ${tokens.btnStyles.padding}
- 字号: ${tokens.btnStyles.fontSize}` : '- 未检测到'}

---

*由 site-cloner 自动生成 | Firecrawl + Playwright + SingleFile*
`;

  fs.writeFileSync(path.join(outDir, 'design-report.md'), report);
  console.log('   ✅ design-report.md 已保存');

  // ═══ Step 5: 生成复刻版 HTML ═══
  console.log('🎨 [5/5] 生成复刻版 HTML...');
  
  const brandColor = tokens.topColors.length > 0 ? tokens.topColors[0].color : '#1a1a1a';
  const bgColor = tokens.bodyBackground !== 'rgba(0, 0, 0, 0)' ? tokens.bodyBackground : '#ffffff';
  const textColor = tokens.bodyColor !== 'rgba(0, 0, 0, 0)' ? tokens.bodyColor : '#1a1a1a';
  const fonts = tokens.bodyFont || 'system-ui, -apple-system, sans-serif';
  const btnBg = tokens.btnStyles?.backgroundColor || brandColor;
  const btnRadius = tokens.btnStyles?.borderRadius || '8px';
  const btnPadding = tokens.btnStyles?.padding || '10px 20px';

  const replica = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${domain} — 设计复刻</title>
<style>
  :root {
    --brand: ${brandColor};
    --text: ${textColor};
    --bg: ${bgColor};
    --font: ${fonts};
    --btn-radius: ${btnRadius};
    --btn-padding: ${btnPadding};
${Object.entries(tokens.cssVariables).slice(0, 20).map(([k,v]) => `    ${k}: ${v};`).join('\n')}
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font);
    color: var(--text);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  /* 🎨 从 design-tokens.json 中提取的样式已注入 */

  /* TODO: 分析 firecrawl-raw.html 的结构后手动补充组件样式 */
  /* 建议打开 screenshot.png 做视觉对照 */

</style>
</head>
<body>
  <!-- 🔧 结构参考 firecrawl-raw.html，样式参考 design-tokens.json，视觉对照 screenshot.png -->
  <h1>复刻框架已生成</h1>
  <p>请根据 <code>design-tokens.json</code> 中的设计 token 和 <code>screenshot.png</code> 手动完善组件。</p>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'replica.html'), replica);
  console.log('   ✅ replica.html 已保存（框架）');

  // ═══ 总结 ═══
  console.log('\n✨ 完成！输出文件:');
  const files = fs.readdirSync(outDir);
  files.forEach(f => {
    const stat = fs.statSync(path.join(outDir, f));
    const size = stat.size > 1024 * 1024 
      ? (stat.size / 1024 / 1024).toFixed(1) + ' MB'
      : stat.size > 1024 
        ? (stat.size / 1024).toFixed(1) + ' KB'
        : stat.size + ' B';
    console.log(`   ${f.padEnd(30)} ${size}`);
  });
}

main().catch(e => {
  console.error('❌ 出错:', e.message);
  process.exit(1);
});
