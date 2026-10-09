# dunocoin 2026-10-09 更新步骤

## 1. 先升级 Supabase

打开 Supabase 项目，进入 **SQL Editor → New query**，粘贴并执行：

`upgrade-2026-10-09-child-cover.sql`

看到 Success 后再继续。这个脚本只增加儿童首页封面字段，并把现有私有图片桶上限调整为 5MB，不会删除现有账户、积分或流水。

## 2. 覆盖 GitHub 文件

在 `suehao-pages/dunocoin` 仓库中选择 **Add file → Upload files**，上传并覆盖：

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `dunocoin-logo.png`

建议同时上传更新后的 `README.md`、`database.sql` 和升级 SQL，方便以后维护。

## 3. 等待 Pages 发布

点击 **Commit changes**，等待 GitHub Actions 里的 Pages 工作流变成绿色。重新打开网页；如果手机仍显示旧版本，完全关闭浏览器标签后再打开一次。

已经添加到桌面的旧图标可能由手机系统缓存。若图标没有立即变更，先移除旧桌面快捷方式，再从浏览器重新“添加到主屏幕”。
