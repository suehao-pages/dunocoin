# dunocoin 2026-10-09 更新步骤

## 1. 先升级 Supabase

打开 Supabase 项目，进入 **SQL Editor → New query**，粘贴并执行：

如果之前已经执行过儿童封面升级，请执行：

`upgrade-2026-10-09-cover-position.sql`

如果尚未执行过任何儿童封面升级，则直接执行最新版：

`upgrade-2026-10-09-child-cover.sql`

看到 Success 后再继续。这些脚本只增加儿童首页封面及位置字段，并把现有私有图片桶上限调整为 5MB，不会删除现有账户、积分或流水。

然后再执行：

`upgrade-2026-10-09-ledger-tools.sql`

该脚本增加积分时间统计和手动流水安全更正功能。页面中的“删除”会生成冲正记录并修正余额，不会直接抹掉原始账目。

## 最新快捷结算升级

本次更新请在 Supabase SQL Editor 执行：

`upgrade-2026-10-09-quick-settlement.sql`

该脚本可重复执行，并且已包含流水更正所需字段；即使还没执行上一版 `ledger-tools`，也可以直接运行。它会增加“任务奖励”“积分兑换”即时结算，并让被删除流水永久从首页最近积分隐藏。

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

进入 **家庭 → 儿童账户 → 编辑**，选择封面后即可用“左右位置”和“上下位置”滑杆实时调整裁切，满意后再保存。

首页“最近积分”可选择 **本周 / 最近一个月 / 全部**，积分卡会同步显示该窗口的净变化；进入“全部流水”后，管理员可编辑调整或删除手动积分流水。

首页第三、第四个快捷入口现在是 **任务奖励 / 积分兑换**。存入积分、扣除积分、任务奖励、积分兑换在流水中使用不同颜色与图标。
