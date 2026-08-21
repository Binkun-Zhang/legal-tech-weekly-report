# 法律科技竞品监控周报

这是一个可部署到 GitHub Pages 的静态周报网站。

## 本地预览

```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

打开 `http://localhost:8001/`。

## 当前功能

- 首页按关键词、日期、竞品和主题筛选周报。
- 竞品档案按竞品沉淀定位、产品能力和历史动态。
- 竞品档案页：能力、历史时间线、产品判断、关注事项和个人备注。
- 法律 AI 术语解释：在竞品档案页点击术语即可查看简释。
- 我的工作台：收藏完整一期周报、归类到专题并添加本机备注。
- 单期阅读页提供返回首页、分享、相关周报和错误反馈。
- 周报证据图使用独立压缩资源并懒加载，减少首屏等待。
- 错误反馈通过 GitHub Issues 提交，便于团队集中处理。
- 评论区支持 GitHub Discussions；需要进一步配置 Giscus 才能嵌入页面。
- 单期阅读页已接入 Vercount，显示本页阅读量和全站访问量；它适合 GitHub Pages 这类静态站点。

## 每周更新

1. 将新一期 HTML 放入 `issues/`。
2. 在 `data/issues.json` 顶部增加一条记录，并填写 `competitors` 与 `highlights`。
3. 如果出现新的竞品，在 `data/competitors.json` 增加竞品档案。
4. 如果出现新的专业术语，在 `data/glossary.json` 增加解释。
5. 提交并推送到 `main` 分支。

GitHub Actions 会自动发布新版本。

## 评论区配置

最简单的方式是先在仓库的 `Settings → Features` 中启用 Discussions，然后使用首页或单期页面的“打开讨论区”入口。

如果希望评论直接嵌入单期页面：

1. 在 Giscus 官网为本仓库生成 `repoId` 和 `categoryId`。
2. 打开 `data/site-config.json`。
3. 将 `giscus.enabled` 改为 `true`，并填入 `repoId`、`categoryId`。
4. 推送代码后，评论会按期次绑定到对应的 Discussion。

## 浏览量配置

当前使用 Vercount：

```json
{
  "provider": "vercount",
  "scriptUrl": "https://events.vercount.one/js"
}
```

单期页面显示本页 PV 和全站 PV。Vercount 官方提供的 HTML 用法是引入统计脚本，并在页面中放置 `vercount_value_page_pv`、`vercount_value_site_pv` 等元素。citeturn0search3

如果统计服务暂时不可用，页面不会影响周报阅读。

## 回退到升级前版本

升级前稳定版本已保留为：

- Git tag：`before-personal-workspace-2026-08-20`
- Git branch：`stable-before-personal-workspace`

如需在本地查看旧版本：

```bash
git switch stable-before-personal-workspace
```

恢复完成后切回新版：

```bash
git switch main
```

不要删除上述 tag 或 branch，除非确认不再需要回退。

## GitHub Pages

建议将本目录中的所有文件作为 GitHub 仓库根目录内容上传，然后在仓库设置中将 Pages 的发布源设为 **GitHub Actions**。

网站地址通常为：

`https://你的用户名.github.io/仓库名/`
