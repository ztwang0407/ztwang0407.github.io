import { escapeHtml, formatDate, readingTime, stripMarkdown } from "./markdown.js?v=7";
import { postCardMeta, postKind, postLabel, postSummary, postTitle, postUrl } from "./posts.js?v=7";

const i18n = window.BlogI18N || { t: (key) => key, getLang: () => "zh", LANG_EVENT: "bloglangchange" };

const postList = document.querySelector("#postList");
const searchInput = document.querySelector("#searchInput");
const tagFilters = document.querySelector("#tagFilters");
const emptyState = document.querySelector("#emptyState");

/* “全部”按钮用语言无关的哨兵值，显示文案再按当前语言取词。 */
const ALL_TAG = "__all__";

let posts = [];
let activeTag = ALL_TAG;

/** 卡片右下角的一行说明：Markdown 显示阅读时长，PDF / HTML 显示形态。 */
function cardMeta(post) {
  if (postKind(post) !== "markdown") return postCardMeta(post);
  const minutes = readingTime(stripMarkdown(postSummary(post)));
  return i18n.t("meta.minRead", { n: minutes });
}

function tagDisplayName(tag) {
  return tag === ALL_TAG ? i18n.t("home.tagAll") : tag;
}

function renderTags() {
  const tags = [
    ALL_TAG,
    ...Array.from(new Set(posts.flatMap((post) => post.tags || []))).sort(),
  ];

  tagFilters.innerHTML = tags
    .map((tag) => {
      const active = tag === activeTag ? " active" : "";
      return `<button class="tag-filter${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tagDisplayName(tag))}</button>`;
    })
    .join("");
}

function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const inTag = activeTag === ALL_TAG || (post.tags || []).includes(activeTag);
    /* 中英标题/摘要都参与检索，任意语言都能搜到文章 */
    const haystack = [
      post.title,
      postTitle(post),
      stripMarkdown(post.summary),
      stripMarkdown(postSummary(post)),
      post.date,
      postLabel(post),
      ...(post.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return inTag && (!query || haystack.includes(query));
  });

  postList.innerHTML = filtered
    .map((post) => {
      const tags = (post.tags || [])
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");
      const summary = stripMarkdown(postSummary(post));
      return `
        <a class="post-card" href="${postUrl(post)}">
          <div class="meta-row">
            <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
            <span class="type-badge">${escapeHtml(postLabel(post))}</span>
          </div>
          <h3>${escapeHtml(postTitle(post))}</h3>
          <p>${escapeHtml(summary)}</p>
          <div class="tag-row">${tags}</div>
          <span class="read-more">${escapeHtml(i18n.t("home.readMore"))} · ${escapeHtml(cardMeta(post))}</span>
        </a>
      `;
    })
    .join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);
}

async function loadPosts() {
  try {
    const response = await fetch("posts/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(i18n.t("home.indexFailed"));
    posts = await response.json();
    posts.sort((a, b) => b.date.localeCompare(a.date));
    renderTags();
    renderPosts();
  } catch (error) {
    postList.innerHTML = "";
    emptyState.textContent = error.message + (i18n.getLang() === "zh" ? "。" : "");
    emptyState.classList.remove("hidden");
  }
}

tagFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  activeTag = button.dataset.tag;
  renderTags();
  renderPosts();
});

searchInput.addEventListener("input", renderPosts);

/* 左上角切换语言后，重新渲染列表和标签文案 */
document.addEventListener(i18n.LANG_EVENT, () => {
  renderTags();
  renderPosts();
});

loadPosts();
