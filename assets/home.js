import { escapeHtml, formatDate, readingTime, stripMarkdown } from "./markdown.js?v=6";
import { postCardMeta, postKind, postLabel, postUrl } from "./posts.js?v=6";

const postList = document.querySelector("#postList");
const searchInput = document.querySelector("#searchInput");
const tagFilters = document.querySelector("#tagFilters");
const emptyState = document.querySelector("#emptyState");

let posts = [];
let activeTag = "全部";

/** 卡片右下角的一行说明：Markdown 显示阅读时长，PDF / HTML 显示形态。 */
function cardMeta(post) {
  if (postKind(post) !== "markdown") return postCardMeta(post);
  return `${readingTime(stripMarkdown(post.summary))} min read`;
}

function renderTags() {
  const tags = [
    "全部",
    ...Array.from(new Set(posts.flatMap((post) => post.tags || []))).sort(),
  ];

  tagFilters.innerHTML = tags
    .map((tag) => {
      const active = tag === activeTag ? " active" : "";
      return `<button class="tag-filter${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    })
    .join("");
}

function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const inTag = activeTag === "全部" || (post.tags || []).includes(activeTag);
    const haystack = [
      post.title,
      stripMarkdown(post.summary),
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
      const summary = stripMarkdown(post.summary);
      return `
        <a class="post-card" href="${postUrl(post)}">
          <div class="meta-row">
            <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
            <span class="type-badge">${escapeHtml(postLabel(post))}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(summary)}</p>
          <div class="tag-row">${tags}</div>
          <span class="read-more">阅读全文 · ${escapeHtml(cardMeta(post))}</span>
        </a>
      `;
    })
    .join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);
}

async function loadPosts() {
  try {
    const response = await fetch("posts/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error("文章索引加载失败");
    posts = await response.json();
    posts.sort((a, b) => b.date.localeCompare(a.date));
    renderTags();
    renderPosts();
  } catch (error) {
    postList.innerHTML = "";
    emptyState.textContent = `${error.message}。`;
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

loadPosts();
