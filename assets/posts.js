/**
 * posts/index.json 里每篇文章的元信息处理。
 *
 * 一篇文章可以是三种形态：
 *   markdown —— posts/<slug>.md，渲染成 HTML（支持公式、mermaid、表格）
 *   pdf      —— 任意 PDF 路径，用浏览器内置阅读器内嵌
 *   html     —— 任意 HTML 页面，默认用 iframe 原样内嵌（保留它自己的样式）
 *
 * index.json 里可用的字段：
 *   slug       必填，URL 里的标识
 *   title      必填，默认（中文）标题
 *   title_en   可选，英文标题；缺失时回退 title
 *   date       必填，YYYY-MM-DD
 *   summary    摘要（中文），显示在列表卡片和详情页
 *   summary_en 可选，英文摘要；缺失时回退 summary
 *   tags       标签数组，用于筛选
 *   type       "markdown" | "pdf" | "html"，省略时按 file 后缀猜，默认 markdown
 *   file       可选。省略时 markdown 用 <slug>.md；也可以写 "papers/xx.pdf"
 *   file_en    可选，英文版正文路径（如 "posts/xx.en.md"）；英文界面下优先使用
 *   file_zh    可选，中文版正文路径；中文界面下优先使用
 *   lang       可选，正文语言 "zh"（默认）| "en"，用于“仅xx版本”提示
 *   embed      仅 html 用："iframe"（默认，保留原样式）或 "inline"（去掉原文样式，融入本站）
 *   height     仅 pdf / html 用，内嵌窗口高度，例如 "900px" 或 "80vh"
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

/** 当前界面语言："zh" | "en"（i18n.js 没加载时回退中文）。 */
export function uiLang() {
  return window.BlogI18N ? window.BlogI18N.getLang() : "zh";
}

/** 按当前界面语言取标题：英文优先 title_en，缺失时回退中文 title。 */
export function postTitle(post = {}) {
  if (uiLang() === "en" && post.title_en) return post.title_en;
  return post.title;
}

/** 按当前界面语言取摘要：英文优先 summary_en，缺失时回退中文 summary。 */
export function postSummary(post = {}) {
  if (uiLang() === "en" && post.summary_en) return post.summary_en;
  return post.summary;
}

/** 正文语言（作者写入的 lang 字段，默认中文）。 */
export function postLang(post = {}) {
  return String(post.lang || "").trim().toLowerCase() === "en" ? "en" : "zh";
}

/**
 * 解析出文章真正的资源路径。相对路径一律相对站点根目录（而不是 post.html 所在目录）。
 * 传入 lang 时，优先使用对应语言的译文文件（file_en / file_zh）。
 */
export function resolvePostFile(post = {}, lang = "") {
  let raw = String(post.file || "").trim();
  if (lang === "en" && String(post.file_en || "").trim()) raw = String(post.file_en).trim();
  if (lang === "zh" && String(post.file_zh || "").trim()) raw = String(post.file_zh).trim();
  if (!raw) return `${POSTS_DIR}/${post.slug}.md`;
  if (isAbsoluteUrl(raw)) return raw;
  const normalized = raw.replace(/^\.\//, "");
  return normalized.startsWith(`${POSTS_DIR}/`) ? normalized : `${POSTS_DIR}/${normalized}`;
}

/**
 * 判断文章类型：显式 type 优先，其次看 file 后缀，最后默认 markdown。
 * 语言专属文件（file_en / file_zh）也可能改变后缀，所以这里同样考虑当前语言。
 */
export function postKind(post = {}, lang = "") {
  const explicit = EXPLICIT_KINDS[String(post.type || "").trim().toLowerCase()];
  if (explicit) return explicit;

  const path = resolvePostFile(post, lang).split("?")[0].split("#")[0];
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
  const t = window.BlogI18N ? window.BlogI18N.t : (key) => key;
  const kind = postKind(post);
  if (kind === POST_KIND.PDF) return t("posts.pdfDoc");
  if (kind === POST_KIND.HTML) return t("posts.htmlDoc");
  return "";
}
