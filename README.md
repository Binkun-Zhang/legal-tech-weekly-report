# 法律科技竞品监控周报

这是一个可部署到 GitHub Pages 的静态周报网站。

## 本地预览

```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

打开 `http://localhost:8001/`。

## 每周更新

1. 将新一期 HTML 放入 `issues/`。
2. 在 `data/issues.json` 顶部增加一条记录。
3. 提交并推送到 `main` 分支。

GitHub Actions 会自动发布新版本。

## GitHub Pages

建议将本目录中的所有文件作为 GitHub 仓库根目录内容上传，然后在仓库设置中将 Pages 的发布源设为 **GitHub Actions**。

网站地址通常为：

`https://你的用户名.github.io/仓库名/`
