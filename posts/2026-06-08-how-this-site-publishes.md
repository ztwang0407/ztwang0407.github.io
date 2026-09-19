# 这个站点如何发布

这个博客是纯静态站点，不需要后端服务。

发布流程很直接：

- 在 `posts/` 下新增一篇 Markdown 文件。
- 在 `posts/index.json` 里新增文章元信息。
- 本地提交并推送到 GitHub。

```powershell
cd D:\blog
git add .
git commit -m "Add new post"
git push
```

GitHub Pages 会在推送后自动更新网站。
