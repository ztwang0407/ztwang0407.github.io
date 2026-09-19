import { extractMath, renderMathHtml } from "./math.js?v=6";

const escapeMap = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap.get(char));
}

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;
// 已经带了 posts/ 前缀的路径（作者按站点根目录写的），不要再补一层
const SITE_ROOT_DIRS = /^posts\//;

/**
 * 把文章内的相对链接解析成站点根目录下的路径。
 * Markdown 里写 `![x](a.png)`，指的是 posts/a.png；直接注入 post.html 的话
 * 浏览器会去站点根目录找 a.png，所以要补上 posts/ 前缀。
 */
export function resolveRelativeUrl(url, basePath) {
  const value = String(url ?? "").trim();
  if (!value) return value;
  if (ABSOLUTE_URL.test(value) || value.startsWith("//") || value.startsWith("/") || value.startsWith("#")) {
    return value;
  }
  if (!basePath) return value;

  const normalized = value.replace(/^\.\//, "");
  if (SITE_ROOT_DIRS.test(normalized)) return normalized;

  const base = String(basePath).replace(/^\.\//, "").replace(/\/+$/, "");
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized;

  return `${base}/${normalized}`;
}

function resolveRelativeUrls(html, basePath) {
  if (!basePath) return html;
  // 代码块里的引号已经被转义成 &quot;，不会误伤
  return html.replace(/\b(href|src)="([^"]*)"/g, (match, attribute, value) => {
    const resolved = resolveRelativeUrl(value, basePath);
    return `${attribute}="${resolved}"`;
  });
}

/* ------------------------------------------------------------------ *
 * 代码块 / 公式占位符
 * ------------------------------------------------------------------ */

function createRenderer() {
  if (!window.marked) return null;
  const renderer = new window.marked.Renderer();

  renderer.code = (tokenOrCode, languageArg) => {
    const isToken = typeof tokenOrCode === "object" && tokenOrCode !== null;
    const code = String((isToken ? tokenOrCode.text : tokenOrCode) ?? "");
    const language = String((isToken ? tokenOrCode.lang : languageArg) || "")
      .trim()
      .toLowerCase();

    if (language === "mermaid") {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }

    if (["math", "katex", "tex", "latex"].includes(language)) {
      return mathNode({ tex: code, display: true }, true);
    }

    const langClass = language ? ` class="language-${escapeHtml(language)}"` : "";
    return `<pre><code${langClass}>${escapeHtml(code)}</code></pre>`;
  };

  return renderer;
}

function mathNode(item, display) {
  if (!item) return "";
  const isDisplay = Boolean(display && item.display);
  const inner = renderMathHtml(item.tex, isDisplay);
  const tag = isDisplay ? "div" : "span";
  const className = isDisplay ? "math-block" : "math-inline";
  // KaTeX 的输出里已经带了 application/x-tex 注释，不用再存一份原文
  return `<${tag} class="${className}">${inner}</${tag}>`;
}

function injectMath(html, placeholders) {
  if (!placeholders.length) return html;

  // 独占一个段落的块级公式：把 <p> 换成 <div>，避免 <div> 嵌在 <p> 里
  let output = html.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner) => {
    if (!/^(?:\s*@@KATEXBLOCK\d+@@)+\s*$/.test(inner)) return match;
    return inner.replace(/@@KATEXBLOCK(\d+)@@/g, (_, id) => mathNode(placeholders[Number(id)], true));
  });

  output = output.replace(/@@KATEX(BLOCK|INLINE)(\d+)@@/g, (_, kind, id) =>
    mathNode(placeholders[Number(id)], kind === "BLOCK"),
  );

  return output;
}

/* ------------------------------------------------------------------ *
 * 渲染入口
 * ------------------------------------------------------------------ */

export function renderMarkdown(markdown = "", options = {}) {
  const basePath = typeof options === "string" ? options : options.basePath || "";

  if (!window.marked) {
    return `<pre><code>${escapeHtml(markdown)}</code></pre>`;
  }

  const { markdown: prepared, placeholders } = extractMath(markdown);
  const marked = new window.marked.Marked({
    gfm: true,
    breaks: false,
    renderer: createRenderer(),
  });

  return injectMath(resolveRelativeUrls(marked.parse(prepared), basePath), placeholders);
}

/** 渲染单段行内 Markdown（摘要用），支持行内公式。 */
export function renderInlineMarkdown(value = "") {
  const text = String(value ?? "");
  if (!text.trim()) return "";
  if (!window.marked) return escapeHtml(text);

  const { markdown, placeholders } = extractMath(text);
  const html = window.marked.parseInline
    ? window.marked.parseInline(markdown)
    : window.marked(markdown);

  return injectMath(html, placeholders);
}

/** 列表卡片用的纯文本摘要：去掉 **、`、链接等标记。 */
export function stripMarkdown(value = "") {
  return String(value ?? "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/(\*|_)(?=\S)([\s\S]*?)(?<=\S)\1/g, "$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function renderMermaid(root = document) {
  if (!window.mermaid || !root.querySelector(".mermaid")) return;
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });
  await window.mermaid.run({
    nodes: root.querySelectorAll(".mermaid"),
  });
}

/** 站外链接统一新窗口打开。 */
export function attachExternalLinks(root = document) {
  root.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) return;
    if (typeof window !== "undefined" && href.startsWith(window.location.origin)) return;
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });
}

/* ------------------------------------------------------------------ *
 * 文章头部与元信息
 * ------------------------------------------------------------------ */

export function postHeader(post = {}) {
  const kind = post.kind || "markdown";
  const tags = (post.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const badge = post.kindLabel
    ? `<span class="type-badge">${escapeHtml(post.kindLabel)}</span>`
    : "";

  const readTime =
    kind === "markdown"
      ? `<span>${readingTime(post.content || post.summary || "")} min read</span>`
      : "";

  const summary = post.summary ? `<p>${renderInlineMarkdown(post.summary)}</p>` : "";

  return `
    <header>
      <div class="meta-row">
        <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
        ${badge}
        ${readTime}
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      ${summary}
      <div class="tag-row">${tags}</div>
    </header>
  `;
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function readingTime(text) {
  const plain = String(text || "").trim();
  if (!plain) return 1;
  const latinWords = plain.match(/[A-Za-z0-9_]+/g)?.length || 0;
  const cjkChars = plain.match(/[\u3400-\u9fff]/g)?.length || 0;
  return Math.max(1, Math.ceil((latinWords + cjkChars / 2) / 220));
}
