# ztwang0407.github.io

这是部署到 `ztwang0407/ztwang0407.github.io` 的个人主页与静态博客。
仓库名和账号名相同（`<账号>.github.io`），所以它是 GitHub 的**用户主页站点**，
直接由 <https://ztwang0407.github.io/> 提供服务（不带子路径）。

本地文件夹叫 `ztwang0407.github.io-main` 只是 ZIP 解压带的 `-main` 后缀，
git 不关心文件夹名，仓库名以 GitHub 上那个为准。

首页参考 <https://yyzhang2025.github.io/> 的组织方式：第一屏是个人简介，下面是教育经历、实践经历、技术方向和项目。文章列表被拆到独立的 `articles.html`，右上角“文章”会直接跳转到文章页。
`publish.html` 现在作为论文与奖项页使用，后续可以直接在页面中替换占位内容。

## 本地预览

```powershell
cd D:\blog\ztwang0407.github.io-main
python -m http.server 4173
```

打开 <http://localhost:4173>。

## 推送到 GitHub

仓库地址：<https://github.com/ztwang0407/ztwang0407.github.io.git>

**第一次推送**（当前文件夹是 ZIP 解压出来的，还没有 `.git`），用 clone 覆盖的方式，
远端历史不会丢：

```powershell
cd D:\blog
git clone https://github.com/ztwang0407/ztwang0407.github.io.git site-repo
# 把 ztwang0407.github.io-main 里的全部内容复制进 D:\blog\site-repo，覆盖同名文件
cd D:\blog\site-repo
git add .
git commit -m "Update personal site"
git push
```

如果远端内容就是这个站、历史也不重要，也可以直接在站点文件夹里初始化
（**注意必须在 `ztwang0407.github.io-main` 里，不要在 `D:\blog` 里**，
否则同级目录下的 `ztwang0407.github.io-main.zip` 会被一起提交）：

```powershell
cd D:\blog\ztwang0407.github.io-main
git init
git branch -M main
git remote add origin https://github.com/ztwang0407/ztwang0407.github.io.git
git add .
git commit -m "Update personal site"
git push -u origin main --force
```

之后日常更新：

```powershell
cd D:\blog\site-repo          # 或者 D:\blog\ztwang0407.github.io-main
git add .
git commit -m "Update personal site"
git push
```

## 开启 GitHub Pages

进入仓库：

`Settings -> Pages -> Build and deployment`

选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`

保存后访问：

<https://ztwang0407.github.io/>

仓库根目录里的 `.nojekyll` 会让 Pages 跳过 Jekyll 构建。本站是纯静态页面、
没有用到 Jekyll/Liquid，所以留着它更稳（顺带避免了将来导入的 HTML 文章里
`{{ }}` 被 Jekyll 当成模板语法处理）。

## 发布新文章

文章分三种形态，都在 `posts/index.json` 里登记，列表页会自动识别：

| 形态 | 说明 | 需要的文件 |
| --- | --- | --- |
| `markdown` | 默认。渲染成网页，支持公式、mermaid、表格、代码块 | `posts/<slug>.md` |
| `pdf` | 用浏览器内置阅读器内嵌，附“新窗口打开 / 下载”按钮 | 任意 `.pdf` |
| `html` | 独立网页文章，默认用 iframe 原样内嵌（保留它自己的样式） | 任意 `.html` |

### 1. Markdown 文章（最常用）

1. 在 `posts/` 下新建 Markdown 文件，例如 `2026-06-11-my-note.md`。
2. 在 `posts/index.json` 顶部新增文章信息：

```json
{
  "slug": "2026-06-11-my-note",
  "title": "文章标题",
  "date": "2026-06-11",
  "summary": "文章摘要",
  "tags": ["Notes"],
  "type": "markdown"
}
```

`slug` 必须和文件名（去掉 `.md`）一致；`type` 可以省略，默认就是 markdown。

### 2. PDF 文章

把 PDF 放进 `posts/`（或任何子目录），然后登记：

```json
{
  "slug": "my-paper",
  "title": "论文标题",
  "date": "2026-06-20",
  "summary": "一句话说明",
  "tags": ["Paper"],
  "type": "pdf",
  "file": "papers/spectral-aware-cd-fsod.pdf",
  "height": "90vh"
}
```

- `slug` 是这一篇的标识，和文件名无关也可以。
- `file` 省略 `posts/` 前缀时会自动补上（所以上面写的是 `papers/xxx.pdf`，
  实际路径是 `posts/papers/xxx.pdf`）；也可以直接写 `/xxx.pdf` 或完整 `https://...` 链接。
- `height` 可选，默认 `min(88vh, 1400px)`。
- 也可以在 PDF 后面加 `#page=3` 让阅读器直接跳到第 3 页，例如
  `"file": "papers/xxx.pdf#page=3"`（`#` 之后的锚点由浏览器阅读器处理）。

### 3. HTML 网页文章

把导出的 HTML（连同它的 `xxx.assets/` 资源目录）一起放进 `posts/` 下，例如
`posts/typora-notes/rag.html`，然后登记：

```json
{
  "slug": "rag-notes",
  "title": "RAG 学习笔记",
  "date": "2026-06-22",
  "summary": "从导出的 HTML 页面直接发布。",
  "tags": ["Notes"],
  "type": "html",
  "file": "typora-notes/rag.html"
}
```

两种嵌入方式，用 `embed` 切换：

- 省略 `embed`（= `"iframe"`）：页面在自己的容器里**原样渲染**，原文 CSS、字体、
  图片全部保留，不会污染本站样式。推荐。
- `"embed": "inline"`：只取 `<body>` 内容注入文章页，去掉原文 `<style>`/`<script>`，
  改用本站排版，看起来更像一篇普通文章。原文的类名样式会丢失。

### 4. 公式

Markdown 文章里四种写法都支持，由 KaTeX 渲染：

```text
$$ E = mc^2 $$          块级公式（居中，可横向滚动）
\[ E = mc^2 \]          同上
$ r_k = p \log p $      行内公式
\( x_{i,j} \)           同上
```

- 中文可以直接写在公式里，会自动按 `\text{}` 处理，例如
  `$$\underbrace{\beta_k}_{倍数,变}$$`。
- 正文里直接写的 `⋅`、`∣` 会自动换成 `\cdot`、`\mid`。
- Markdown 里的代码块（``` 围起来）和行内代码里的 `$` 不会被当成公式。
- 公式一律**相对于文章文件**解析，写成 `$$...$$` 时前后会自动补空行，
  所以缩进在列表项里的公式也能正常显示。

KaTeX 默认从 jsDelivr 加载，并带有 unpkg / cdnjs 备用源。**想完全离线**：

```powershell
# 下载 katex 发行包（含 katex.min.js、katex.min.css、fonts/）
# https://github.com/KaTeX/KaTeX/releases  ->  katex.tar.gz / katex.zip
# 解压后把内容放到 assets/vendor/katex/
```

然后在 `post.html` 里做两处改动：

1. `<script>window.KATEX_BASE = "assets/vendor/katex";</script>` 放在样式之前；
2. 把 KaTeX 的 `<link rel="stylesheet">` 换成本地路径
   `assets/vendor/katex/katex.min.css`。

加载失败时不会白屏：公式会退化成带虚线框的 LaTeX 原文，并在文章顶部给出提示。

### 5. 提交并推送

```powershell
cd D:\blog
git add .
git commit -m "Add new post"
git push
```

## 修改 JS / CSS 后要清缓存

页面用 `?v=` 给资源打版本号。改完 `assets/` 下的文件后，把这些版本号一起往上加，
否则浏览器会用旧缓存。目前所有模块统一用 `v=6`，出现的 6 个地方是：

| 文件 | 位置 |
| --- | --- |
| `post.html` | `assets/post.js?v=6`、`assets/styles.css?v=...` |
| `articles.html` | `assets/home.js?v=6`、`assets/styles.css?v=...` |
| `assets/post.js` | `./markdown.js?v=6`、`./math.js?v=6`、`./posts.js?v=6` |
| `assets/home.js` | `./markdown.js?v=6`、`./posts.js?v=6` |
| `assets/markdown.js` | `./math.js?v=6` |

注意这些 import 的 URL 必须**完全一致**，否则同一个模块会被加载两份。

## 文件结构

```text
.
├── index.html
├── articles.html
├── post.html
├── publish.html        # Publications & Awards
├── assets/
│   ├── home.js         # 文章列表：搜索、标签筛选、类型徽标
│   ├── markdown.js     # Markdown → HTML（公式占位、相对链接、mermaid）
│   ├── math.js         # KaTeX 加载 + $$/$ 公式抽取与渲染
│   ├── post.js         # 文章详情：按 type 分派 markdown / pdf / html
│   ├── posts.js        # index.json 元信息解析（type、file、embed、height）
│   └── styles.css
└── posts/
    ├── index.json
    ├── <slug>.md       # markdown 文章
    ├── <name>.pdf      # pdf 文章
    └── <dir>/<name>.html   # html 文章（连同它的资源目录）
```
