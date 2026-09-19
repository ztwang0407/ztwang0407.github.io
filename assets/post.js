import {
  attachExternalLinks,
  escapeHtml,
  postHeader,
  renderMarkdown,
  renderMermaid,
  resolveRelativeUrl,
} from "./markdown.js?v=6";
import { ensureKatex, hasKatex } from "./math.js?v=6";
import {
  POSTS_DIR,
  POST_KIND,
  postEmbed,
  postHeight,
  postKind,
  postLabel,
  resolvePostFile,
} from "./posts.js?v=6";

const article = document.querySelector("#article");
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

function dirOf(path) {
  const clean = String(path).split("?")[0].split("#")[0];
  const index = clean.lastIndexOf("/");
  return index === -1 ? "" : clean.slice(0, index);
}

function displayPath(file) {
  try {
    return decodeURIComponent(file);
  } catch (error) {
    return file;
  }
}

async function fetchText(url, label) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${label}加载失败（HTTP ${response.status}）`);
  return response.text();
}

async function loadIndex() {
  const response = await fetch(`${POSTS_DIR}/index.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("文章索引加载失败");
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error("文章索引格式不正确");
  return posts;
}

/* ------------------------------------------------------------------ *
 * PDF / HTML 内嵌
 * ------------------------------------------------------------------ */

function embedToolbar(post, file) {
  return `
    <div class="embed-bar">
      <span class="type-badge">${escapeHtml(post.kindLabel)}</span>
      <span class="embed-name">${escapeHtml(displayPath(file))}</span>
      <span class="embed-actions">
        <a href="${escapeHtml(file)}" target="_blank" rel="noopener">新窗口打开</a>
        ${post.kind === POST_KIND.PDF ? `<a href="${escapeHtml(file)}" download>下载</a>` : ""}
      </span>
    </div>
  `;
}

/** 只有作者显式写了 height 才用内联样式，否则交给 CSS 的响应式默认值。 */
function heightAttribute(post) {
  const height = postHeight(post);
  return height ? ` style="height: ${height}"` : "";
}

function renderPdf(post, file) {
  return `
    <div class="embed-shell">
      ${embedToolbar(post, file)}
      <iframe
        class="embed-frame embed-frame-pdf"
        src="${escapeHtml(file)}"
        title="${escapeHtml(post.title)}"${heightAttribute(post)}
        loading="lazy"
      ></iframe>
      <p class="embed-hint">
        没有显示内容？请<a href="${escapeHtml(file)}" target="_blank" rel="noopener">在新窗口打开 PDF</a>
        （移动端浏览器一般不支持内嵌预览）。
      </p>
    </div>
  `;
}

function renderHtmlEmbed(post, file) {
  return `
    <div class="embed-shell">
      ${embedToolbar(post, file)}
      <iframe
        class="embed-frame embed-frame-html"
        src="${escapeHtml(file)}"
        title="${escapeHtml(post.title)}"${heightAttribute(post)}
        loading="lazy"
      ></iframe>
      <p class="embed-hint">
        页面在独立容器里原样渲染。如果显示异常，可以
        <a href="${escapeHtml(file)}" target="_blank" rel="noopener">在新窗口打开</a>，
        或在 index.json 里把这一篇改成 <code>"embed": "inline"</code> 让它融入本站排版。
      </p>
    </div>
  `;
}

/** iframe 高度不够时自动撑开（同源才能测量，测不到就保留默认高度）。 */
function autoSizeFrame(frame) {
  const apply = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const height = Math.max(
        doc.body?.scrollHeight || 0,
        doc.documentElement?.scrollHeight || 0,
      );
      if (height > 240) frame.style.height = `${Math.min(height + 24, 20000)}px`;
    } catch (error) {
      // 跨域时读不到，保留默认高度
    }
  };

  frame.addEventListener("load", () => {
    apply();
    // 等图片/字体加载完再量一次
    window.setTimeout(apply, 400);
  });
  if (frame.contentDocument?.readyState === "complete") apply();
}

async function renderInlineHtmlPost(post, file) {
  const raw = await fetchText(file, "文章正文");
  const doc = new DOMParser().parseFromString(raw, "text/html");

  doc
    .querySelectorAll("script, noscript, iframe, object, embed, form, input, button, style, link, base, meta")
    .forEach((node) => node.remove());

  const base = dirOf(file);
  doc.querySelectorAll("[href]").forEach((node) => {
    const value = node.getAttribute("href");
    if (value && !/^javascript:/i.test(value)) node.setAttribute("href", resolveRelativeUrl(value, base));
  });
  doc.querySelectorAll("[src]").forEach((node) => {
    const value = node.getAttribute("src");
    if (value) node.setAttribute("src", resolveRelativeUrl(value, base));
  });

  // 去掉内联事件处理器
  doc.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes || []).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    });
  });

  const body = doc.body?.innerHTML?.trim() || "";
  if (!body) throw new Error("这个 HTML 文件里没有可显示的内容");

  article.innerHTML = `
    ${postHeader(post)}
    <div class="html-post">${body}</div>
    <p class="embed-hint">
      该 HTML 文章以 <code>"embed": "inline"</code> 方式嵌入，原文样式已移除；
      想保留原页面外观就去掉 index.json 里的这个字段。
    </p>
  `;
  attachExternalLinks(article);
}

/* ------------------------------------------------------------------ *
 * 公式兜底提示
 * ------------------------------------------------------------------ */

function notifyMathFallback() {
  if (hasKatex()) return;
  if (!article.querySelector(".math-fallback")) return;
  const notice = document.createElement("p");
  notice.className = "math-notice";
  notice.textContent =
    "公式渲染库（KaTeX）没能加载，下面按 LaTeX 原文显示。检查网络后刷新页面即可恢复。";
  article.querySelector("header")?.after(notice);
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

async function loadArticle() {
  if (!slug) {
    article.innerHTML = '<p class="empty-state">缺少文章 slug。</p>';
    return;
  }

  try {
    const posts = await loadIndex();
    const post = posts.find((item) => item.slug === slug);
    if (!post) throw new Error("没有找到这篇文章");

    const kind = postKind(post);
    const file = resolvePostFile(post);
    const view = { ...post, kind, kindLabel: postLabel(post) };

    document.title = `${post.title} - ztwang`;
    article.classList.toggle("article-wide", kind !== POST_KIND.MARKDOWN);

    if (kind === POST_KIND.PDF) {
      article.innerHTML = `${postHeader(view)}${renderPdf(view, file)}`;
      return;
    }

    if (kind === POST_KIND.HTML) {
      if (postEmbed(post) === "inline") {
        await renderInlineHtmlPost(view, file);
        return;
      }
      article.innerHTML = `${postHeader(view)}${renderHtmlEmbed(view, file)}`;
      const frame = article.querySelector("iframe.embed-frame-html");
      if (frame) autoSizeFrame(frame);
      return;
    }

    // markdown：正文和 KaTeX 并行加载
    const [content] = await Promise.all([fetchText(file, "文章正文"), ensureKatex()]);
    article.innerHTML = `${postHeader({ ...view, content })}${renderMarkdown(content, {
      basePath: dirOf(file) || POSTS_DIR,
    })}`;
    await renderMermaid(article);
    attachExternalLinks(article);
    notifyMathFallback();
  } catch (error) {
    article.classList.remove("article-wide");
    article.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}。</p>`;
  }
}

loadArticle();
