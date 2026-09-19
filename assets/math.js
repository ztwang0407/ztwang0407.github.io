/**
 * Markdown 数学公式支持。
 *
 * 支持四种写法：
 *   $$ ... $$   \[ ... \]   块级公式
 *   $ ... $     \( ... \)   行内公式
 *
 * 公式在 Markdown 解析「之前」就被抽出来，换成占位符，解析完再换回 KaTeX 的 HTML。
 * 这样 `_`、`*`、`\` 等 LaTeX 字符不会被 Marked 当成 Markdown 语法吃掉，
 * 缩进在列表里的公式也不会被误判成代码块。
 *
 * KaTeX 默认从 CDN 加载。若想完全离线，把 katex 发行包放到
 * assets/vendor/katex/（含 katex.min.js、katex.min.css、fonts/），
 * 再在 post.html 的 <head> 里加一行：
 *   <script>window.KATEX_BASE = "assets/vendor/katex";</script>
 */

const KATEX_VERSION = "0.16.11";

const CDN_BASES = [
  `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`,
  `https://unpkg.com/katex@${KATEX_VERSION}/dist`,
  `https://cdnjs.cloudflare.com/ajax/libs/katex/${KATEX_VERSION}`,
];

const BLOCK_TOKEN = (id) => `@@KATEXBLOCK${id}@@`;
const INLINE_TOKEN = (id) => `@@KATEXINLINE${id}@@`;

const escapeMap = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap.get(char));
}

/* ------------------------------------------------------------------ *
 * 1. KaTeX 资源加载
 * ------------------------------------------------------------------ */

function baseCandidates() {
  const bases = [];
  const override =
    (typeof window !== "undefined" && typeof window.KATEX_BASE === "string"
      ? window.KATEX_BASE
      : "") ||
    (typeof document !== "undefined"
      ? document.querySelector('meta[name="katex-base"]')?.getAttribute("content") || ""
      : "");

  const custom = String(override).trim().replace(/\/+$/, "");
  if (custom) bases.push(custom);
  bases.push(...CDN_BASES);
  return bases;
}

function hasKatexStylesheet() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((link) =>
    String(link.getAttribute("href") || "").includes("katex"),
  );
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve(url);
    script.onerror = () => {
      script.remove();
      reject(new Error(`无法加载 ${url}`));
    };
    document.head.append(script);
  });
}

function loadStylesheet(url) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.append(link);
}

let katexPromise = null;

/**
 * 确保 KaTeX 可用。返回 true 表示加载成功，false 表示全部源都失败
 * （此时公式会退化成可读的原文，页面不会崩）。
 */
export function ensureKatex() {
  if (katexPromise) return katexPromise;

  katexPromise = (async () => {
    if (typeof window === "undefined") return false;
    if (window.katex) return true;

    for (const base of baseCandidates()) {
      try {
        await loadScript(`${base}/katex.min.js`);
        if (!window.katex) throw new Error("KaTeX 未挂到 window");
        if (!hasKatexStylesheet()) loadStylesheet(`${base}/katex.min.css`);
        return true;
      } catch (error) {
        // 换下一个源
      }
    }
    return false;
  })();

  return katexPromise;
}

export function hasKatex() {
  return typeof window !== "undefined" && Boolean(window.katex);
}

/* ------------------------------------------------------------------ *
 * 2. TeX 预处理
 * ------------------------------------------------------------------ */

// 少数在正文里直接写成 Unicode 的数学符号，统一换成 LaTeX 命令。
const UNICODE_SYMBOLS = new Map([
  ["\u2223", "\\mid "], // ∣
  ["\u22c5", "\\cdot "], // ⋅
]);

// 需要包进 \text{} 的字符：CJK 标点、汉字、全角符号。
const SPECIAL_PATTERN =
  /[\u2223\u22c5]|[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff01-\uff5e]+/g;

// 已经处在文本模式里的内容不需要再包 \text{}（比如 \text{中文}）。
const TEXT_COMMAND_PATTERN =
  /\\(?:text|textbf|textit|textrm|textsf|texttt|textnormal|mbox|hbox|mathrm|operatorname)\s*\{/g;

function textModeRanges(tex) {
  const ranges = [];
  TEXT_COMMAND_PATTERN.lastIndex = 0;
  let match;
  while ((match = TEXT_COMMAND_PATTERN.exec(tex))) {
    const open = tex.indexOf("{", match.index + match[0].length - 1);
    if (open === -1) continue;

    let depth = 0;
    let index = open;
    for (; index < tex.length; index += 1) {
      const char = tex[index];
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
      }
    }
    ranges.push([match.index, index]);
    TEXT_COMMAND_PATTERN.lastIndex = index;
  }
  return ranges;
}

/**
 * 把公式源码整理成 KaTeX 更容易接受的形式：
 * 中文、全角标点包进 \text{}，Unicode 符号换成命令。
 */
export function normalizeTex(tex) {
  const source = String(tex ?? "");
  if (!source) return "";
  if (!SPECIAL_PATTERN.test(source)) return source;
  SPECIAL_PATTERN.lastIndex = 0;

  const ranges = textModeRanges(source);
  const inTextMode = (start, length) =>
    ranges.some(([from, to]) => start >= from && start + length <= to);

  return source.replace(SPECIAL_PATTERN, (run, offset) => {
    if (inTextMode(offset, run.length)) return run;
    const symbol = UNICODE_SYMBOLS.get(run);
    if (symbol) return symbol;
    return `\\text{${run}}`;
  });
}

/* ------------------------------------------------------------------ *
 * 3. 渲染成 HTML
 * ------------------------------------------------------------------ */

function fallbackHtml(tex, display) {
  const tag = display ? "div" : "span";
  const modifier = display ? " math-fallback-block" : "";
  return `<${tag} class="math-fallback${modifier}"><code>${escapeHtml(tex)}</code></${tag}>`;
}

/**
 * 把一段 TeX 渲染成 HTML 片段。KaTeX 不可用时返回可读的公式原文。
 */
export function renderMathHtml(tex, display = false) {
  const source = normalizeTex(tex);

  if (hasKatex()) {
    try {
      return window.katex.renderToString(source, {
        displayMode: Boolean(display),
        throwOnError: false,
        errorColor: "#b9584f",
        strict: false,
        trust: false,
      });
    } catch (error) {
      // 落到下面的兜底
    }
  }

  return fallbackHtml(source, Boolean(display));
}

/* ------------------------------------------------------------------ *
 * 4. 从 Markdown 源码里抽出公式
 * ------------------------------------------------------------------ */

function matchInlineDollar(text, start) {
  const first = text[start + 1];
  if (first === undefined || first === "$" || /\s/.test(first)) return null;

  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\n") return null;
    if (char === "$") break;
    index += 1;
  }

  if (index >= text.length || text[index] !== "$") return null;

  const tex = text.slice(start + 1, index);
  if (!tex || /\s$/.test(tex)) return null;

  // "$5 到 $10" 这类金额不要误判成公式
  const next = text[index + 1];
  if (next !== undefined && /[0-9]/.test(next)) return null;

  return { tex, end: index + 1 };
}

function fencedBlockEnd(text, start) {
  const marker = /^( {0,3})(`{3,}|~{3,})/.exec(text.slice(start, start + 24));
  if (!marker) return -1;

  const fenceChar = marker[2][0];
  const fenceLength = marker[2].length;
  const closer = new RegExp(`^ {0,3}\\${fenceChar}{${fenceLength},}\\s*$`);

  let index = start + marker[0].length;
  while (index < text.length) {
    const lineEnd = text.indexOf("\n", index);
    const stop = lineEnd === -1 ? text.length : lineEnd;
    if (closer.test(text.slice(index, stop))) {
      return lineEnd === -1 ? text.length : lineEnd + 1;
    }
    if (lineEnd === -1) break;
    index = lineEnd + 1;
  }
  return -1;
}

/**
 * 抽出公式，返回 { markdown, placeholders }。
 * markdown 里的公式位置已经换成 @@KATEXBLOCKn@@ / @@KATEXINLINEn@@。
 */
export function extractMath(source) {
  const text = String(source ?? "");
  const store = [];
  const parts = [];
  const total = text.length;

  let copied = 0; // 已经输出到 parts 的位置
  let index = 0;

  // 块级公式前后补空行，保证 Marked 把它当成独立段落，而不是粘在正文里
  const pushDisplay = (tex, indent) => {
    const id = store.length;
    store.push({ tex, display: true });
    parts.push(`${indent}${BLOCK_TOKEN(id)}`);
  };

  while (index < total) {
    const char = text[index];

    // 围栏代码块：整块跳过，里面的 $ 不算公式
    if ((char === "`" || char === "~") && (index === 0 || text[index - 1] === "\n")) {
      const fenceEnd = fencedBlockEnd(text, index);
      if (fenceEnd !== -1) {
        index = fenceEnd;
        continue;
      }
    }

    // 行内代码：跳过，里面的 $ 不算公式
    if (char === "`") {
      const run = /^`+/.exec(text.slice(index, index + 32))?.[0];
      if (run) {
        const close = text.indexOf(run, index + run.length);
        if (close !== -1) {
          index = close + run.length;
          continue;
        }
      }
      index += 1;
      continue;
    }

    // $$ ... $$
    if (char === "$" && text[index + 1] === "$") {
      const close = text.indexOf("$$", index + 2);
      if (close !== -1) {
        const tex = text.slice(index + 2, close);
        if (tex.trim()) {
          const lineStart = text.lastIndexOf("\n", index - 1) + 1;
          const before = text.slice(lineStart, index);
          const indent = /^[ \t]*$/.test(before) ? before : "";

          let after = close + 2;
          const lineEnd = text.indexOf("\n", after);
          const tail = text.slice(after, lineEnd === -1 ? total : lineEnd);
          if (/^[ \t]*$/.test(tail)) after = lineEnd === -1 ? total : lineEnd + 1;

          const from = indent ? lineStart : index;
          parts.push(text.slice(copied, from).replace(/[ \t]+$/, ""), "\n\n");
          pushDisplay(tex, indent);
          parts.push("\n\n");
          copied = after;
          index = after;
          continue;
        }
      }
      index += 2;
      continue;
    }

    // $ ... $
    if (char === "$" && text[index - 1] !== "\\") {
      const inline = matchInlineDollar(text, index);
      if (inline) {
        const id = store.length;
        store.push({ tex: inline.tex, display: false });
        parts.push(text.slice(copied, index), INLINE_TOKEN(id));
        copied = inline.end;
        index = inline.end;
        continue;
      }
      index += 1;
      continue;
    }

    // \[ ... \] 与 \( ... \)
    if (char === "\\" && text[index - 1] !== "\\" && (text[index + 1] === "[" || text[index + 1] === "(")) {
      const opener = text[index + 1];
      const closer = opener === "(" ? "\\)" : "\\]";
      const close = text.indexOf(closer, index + 2);
      if (close !== -1) {
        const tex = text.slice(index + 2, close);
        if (tex.trim()) {
          const id = store.length;
          store.push({ tex, display: opener === "[" });
          parts.push(text.slice(copied, index), opener === "[" ? BLOCK_TOKEN(id) : INLINE_TOKEN(id));
          copied = close + 2;
          index = close + 2;
          continue;
        }
      }
      index += 2;
      continue;
    }

    index += 1;
  }

  parts.push(text.slice(copied));

  return { markdown: parts.join(""), placeholders: store };
}
