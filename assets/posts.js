/**
 * posts/index.json 里每篇文章的元信息处理。
 *
 * 一篇文章可以是三种形态：
 *   markdown —— posts/<slug>.md，渲染成 HTML（支持公式、mermaid、表格）
 *   pdf      —— 任意 PDF 路径，用浏览器内置阅读器内嵌
 *   html     —— 任意 HTML 页面，默认用 iframe 原样内嵌（保留它自己的样式）
 *
 * index.json 里可用的字段：
 *   slug      必填，URL 里的标识
 *   title     必填
 *   date      必填，YYYY-MM-DD
 *   summary   摘要，显示在列表卡片和详情页
 *   tags      标签数组，用于筛选
 *   type      "markdown" | "pdf" | "html"，省略时按 file 后缀猜，默认 markdown
 *   file      可选。省略时 markdown 用 <slug>.md；也可以写 "papers/xx.pdf"
 *   embed     仅 html 用："iframe"（默认，保留原样式）或 "inline"（去掉原文样式，融入本站）
 *   height    仅 pdf / html 用，内嵌窗口高度，例如 "900px" 或 "80vh"
 */

export const POSTS_DIR = "posts";

export const POST_KIND = {
  MARKDOWN: "markdown",
  PDF: "pdf",
  HTML: "html",
};

export const KIND_LABEL = {
  [POST_KIND.MARKDOWN]: "MD",
  [POST_KIND.PDF]: "PDF",
  [POST_KIND.HTML]: "HTML",
};

const EXPLICIT_KINDS = {
  markdown: POST_KIND.MARKDOWN,
  md: POST_KIND.MARKDOWN,
  pdf: POST_KIND.PDF,
  html: POST_KIND.HTML,
  htm: POST_KIND.HTML,
};

function isAbsoluteUrl(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//") || value.startsWith("/");
}

/**
 * 解析出文章真正的资源路径。相对路径一律相对站点根目录（而不是 post.html 所在目录）。
 */
export function resolvePostFile(post = {}) {
  const raw = String(post.file || "").trim();
  if (!raw) return `${POSTS_DIR}/${post.slug}.md`;
  if (isAbsoluteUrl(raw)) return raw;
  const normalized = raw.replace(/^\.\//, "");
  return normalized.startsWith(`${POSTS_DIR}/`) ? normalized : `${POSTS_DIR}/${normalized}`;
}

/**
 * 判断文章类型：显式 type 优先，其次看 file 后缀，最后默认 markdown。
 */
export function postKind(post = {}) {
  const explicit = EXPLICIT_KINDS[String(post.type || "").trim().toLowerCase()];
  if (explicit) return explicit;

  const path = resolvePostFile(post).split("?")[0].split("#")[0];
  const extension = (/\.([a-z0-9]+)$/i.exec(path)?.[1] || "").toLowerCase();
  if (extension === "pdf") return POST_KIND.PDF;
  if (extension === "html" || extension === "htm") return POST_KIND.HTML;
  return POST_KIND.MARKDOWN;
}

export function postLabel(post = {}) {
  return KIND_LABEL[postKind(post)] || KIND_LABEL[POST_KIND.MARKDOWN];
}

/** HTML 文章的嵌入方式：默认 iframe，可显式设为 inline。 */
export function postEmbed(post = {}) {
  return String(post.embed || "").trim().toLowerCase() === "inline" ? "inline" : "iframe";
}

/** 校验高度值，只放行 px / vh / rem / em / % 这类 CSS 长度。 */
export function postHeight(post = {}) {
  const value = String(post.height || "").trim();
  if (!value) return "";
  if (/^\d+(\.\d+)?(px|vh|vw|rem|em|%)$/.test(value)) return value;
  if (/^\d+$/.test(value)) return `${value}px`;
  return "";
}

/** 列表页和详情页统一的文章地址。 */
export function postUrl(post = {}) {
  return `post.html?slug=${encodeURIComponent(post.slug)}`;
}

/** 卡片上的阅读时长/说明：markdown 用摘要估，其它类型直接标注形态。 */
export function postCardMeta(post = {}) {
  const kind = postKind(post);
  if (kind === POST_KIND.PDF) return "PDF 文档";
  if (kind === POST_KIND.HTML) return "网页文章";
  return "";
}
