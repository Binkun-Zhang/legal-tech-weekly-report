# 法律科技竞品监控周报

这是一个可部署到 GitHub Pages 的静态周报网站。

## 本地预览

```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

打开 `http://localhost:8001/`。

## 当前功能

- 首页按关键词、日期、竞品和主题筛选周报。
- “竞品动态索引”跨期聚合同一竞品的重点变化。
- 单期阅读页提供返回首页、分享、相关周报和错误反馈。
- 错误反馈通过 GitHub Issues 提交，便于团队集中处理。
- 评论区支持 GitHub Discussions；需要进一步配置 Giscus 才能嵌入页面。
- 阅读次数默认显示“本机统计”。GitHub Pages 本身是静态托管，无法直接提供全站共享浏览量；如需真实总浏览量，需要配置一个带 CORS 的统计 API。

## 每周更新

1. 将新一期 HTML 放入 `issues/`。
2. 在 `data/issues.json` 顶部增加一条记录，并填写 `competitors` 与 `highlights`。
3. 提交并推送到 `main` 分支。

GitHub Actions 会自动发布新版本。

## 评论区配置

最简单的方式是先在仓库的 `Settings → Features` 中启用 Discussions，然后使用首页或单期页面的“打开讨论区”入口。

如果希望评论直接嵌入单期页面：

1. 在 Giscus 官网为本仓库生成 `repoId` 和 `categoryId`。
2. 打开 `data/site-config.json`。
3. 将 `giscus.enabled` 改为 `true`，并填入 `repoId`、`categoryId`。
4. 推送代码后，评论会按期次绑定到对应的 Discussion。

## 浏览量配置

`data/site-config.json` 中的 `views.apiUrl` 是可选项。它需要提供一个允许跨域访问的 GET 接口，接收 `issue` 参数并返回：

```json
{ "views": 123 }
```

配置后，单期页面会优先显示共享浏览量；接口不可用时自动回退到本机次数，不影响阅读。

## GitHub Pages

建议将本目录中的所有文件作为 GitHub 仓库根目录内容上传，然后在仓库设置中将 Pages 的发布源设为 **GitHub Actions**。

网站地址通常为：

`https://你的用户名.github.io/仓库名/`
