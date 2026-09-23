import {
  attachExternalLinks,
  escapeHtml,
  postHeader,
  renderMarkdown,
  renderMermaid,
  resolveRelativeUrl,
} from "./markdown.js?v=7";
import { ensureKatex, hasKatex } from "./math.js?v=7";
import {
  POSTS_DIR,
  POST_KIND,
  postEmbed,
  postHeight,
  postKind,
  postLabel,
  postLang,
  postSummary,
  postTitle,
  resolvePostFile,
  uiLang,
} from "./posts.js?v=7";

const i18n = window.BlogI18N || { t: (key) => key, getLang: () => "zh", LANG_EVENT: "bloglangchange" };

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

function suffixPeriod() {
  return i18n.getLang() === "zh" ? "。" : "";
}

async function fetchText(url, labelKey, params = {}) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(i18n.t("post.httpError", { label: i18n.t(labelKey), status: response.status, ...params }));
  }
  return response.text();
}

async function loadIndex() {
  const response = await fetch(`${POSTS_DIR}/index.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(i18n.t("post.httpError", { label: i18n.t("post.indexLabel"), status: response.status }));
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error(i18n.t("post.indexBadFormat"));
  return posts;
}

/* ------------------------------------------------------------------ *
 * 正文语言提示：界面语言与正文语言不一致时给出说明
 * ------------------------------------------------------------------ */

function contentLangNotice(post) {
  if (postKind(post, uiLang()) !== POST_KIND.MARKDOWN) return "";
  const hasEn = Boolean(String(post.file_en || "").trim());
  const hasZh = Boolean(String(post.file_zh || "").trim());
  if (uiLang() === "en" && !hasEn) {
    return `<p class="lang-notice">${escapeHtml(i18n.t("post.zhOnly"))}</p>`;
  }
  if (uiLang() === "zh" && postLang(post) === "en" && !hasZh) {
    return `<p class="lang-notice">${escapeHtml(i18n.t("post.enOnly"))}</p>`;
  }
  return "";
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
        <a href="${escapeHtml(file)}" target="_blank" rel="noopener">${escapeHtml(i18n.t("post.openNewTab"))}</a>
        ${post.kind === POST_KIND.PDF ? `<a href="${escapeHtml(file)}" download>${escapeHtml(i18n.t("post.download"))}</a>` : ""}
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
      <p class="embed-hint">${i18n.t("post.pdfHint", { file: escapeHtml(file) })}</p>
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
      <p class="embed-hint">${i18n.t("post.htmlHint", { file: escapeHtml(file) })}</p>
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
  const raw = await fetchText(file, "post.bodyLabel");
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
  if (!body) throw new Error(i18n.t("post.noContent"));

  article.innerHTML = `
    ${postHeader(post)}
    <div class="html-post">${body}</div>
    <p class="embed-hint">${i18n.t("post.inlineHint")}</p>
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
  notice.textContent = i18n.t("post.mathFallback");
  article.querySelector("header")?.after(notice);
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

async function loadArticle() {
  if (!slug) {
    article.innerHTML = `<p class="empty-state">${escapeHtml(i18n.t("post.missingSlug"))}</p>`;
    return;
  }

  try {
    const posts = await loadIndex();
    const post = posts.find((item) => item.slug === slug);
    if (!post) throw new Error(i18n.t("post.notFound"));

    const lang = uiLang();
    const kind = postKind(post, lang);
    const file = resolvePostFile(post, lang);
    const view = {
      ...post,
      title: postTitle(post),
      summary: postSummary(post),
      kind,
      kindLabel: postLabel(post),
    };

    document.title = `${view.title} - ztwang`;
    article.classList.toggle("article-wide", kind !== POST_KIND.MARKDOWN);
    const notice = contentLangNotice(post);

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
    const [content] = await Promise.all([fetchText(file, "post.bodyLabel"), ensureKatex()]);
    article.innerHTML = `${postHeader({ ...view, content })}${notice}${renderMarkdown(content, {
      basePath: dirOf(file) || POSTS_DIR,
    })}`;
    await renderMermaid(article);
    attachExternalLinks(article);
    notifyMathFallback();
  } catch (error) {
    article.classList.remove("article-wide");
    article.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}${escapeHtml(suffixPeriod())}</p>`;
  }
}

/* 左上角切换语言后，重新按当前语言渲染文章（标题/摘要/提示语/译文文件） */
document.addEventListener(i18n.LANG_EVENT, () => {
  loadArticle();
});

loadArticle();
