# dunocoin · 家庭儿童积分管理系统

一个移动端优先的家庭积分 Web App。纯 HTML、CSS、JavaScript 前端，Supabase 负责注册登录、数据库、事务与行级安全，可直接部署到 GitHub Pages。

## 已实现

- 注册自动创建独立家庭；邀请链接自动加入对应家庭
- 家长管理员与儿童受限账号；儿童端无创建、编辑、删除、审核入口
- 多儿童独立积分账户、手动存取、不可篡改的完整流水
- 儿童账户资料编辑、头像上传、首页积分卡专属封面图
- 主线/辅助任务、常用模板、周期、赏金、主线逾期自动扣分
- 儿童提交任务，家长按 0%–100% 审核并按比例结算
- 奖励卡模板、兑换申请、家长审核、自动扣分与流水
- Android / iOS 响应式布局、底部导航、底部弹窗、Toast 反馈
- dunocoin 品牌图标、浏览器 favicon 与 Android/iOS 添加到桌面图标
- 未配置 Supabase 时可使用内置演示家庭完整体验

## 连接你的 dunocoin Supabase 项目

1. 打开 Supabase 的 **SQL Editor**，新建查询并执行 [`database.sql`](./database.sql)。
   - 如果之前已经执行过旧版 `database.sql`，只需额外执行 [`upgrade-2026-10-09-child-cover.sql`](./upgrade-2026-10-09-child-cover.sql)。
2. 在 **Authentication → URL Configuration** 中配置：
   - Site URL：你的 GitHub Pages 地址（本地调试可填 `http://localhost:5500`）
   - Redirect URLs：加入本地和 GitHub Pages 地址
3. 复制 [`config.example.js`](./config.example.js) 为 `config.js`，填入 **Project URL** 和公开的 **Publishable key**（旧项目也可使用 anon key）：

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://你的项目.supabase.co",
  SUPABASE_ANON_KEY: "你的公开 publishable key"
};
```

Publishable key 本来就用于浏览器，可公开；不要把 Secret key 或旧版 `service_role` key 放进前端。

4. 用静态服务器打开项目（ES Module 不能直接通过 `file://` 使用）：

```powershell
npx serve .
```

## GitHub Pages 部署

1. 将本目录提交到 GitHub 仓库。
2. 仓库 **Settings → Pages → Build and deployment** 选择 **Deploy from a branch**。
3. Branch 选择 `main`，目录选择 `/ (root)` 并保存。
4. 将生成的 Pages 地址加入 Supabase 的 Site URL 和 Redirect URLs。

如果仓库是公开的，`config.js` 中只能出现 Publishable key（或旧版 anon key），绝不能出现 Secret key 或 service role key。

## 自动扣除主线任务积分

前端每次打开家庭时会调用幂等函数 `settle_overdue_main_tasks`，同一任务周期最多扣除一次。若希望即使无人打开页面也准点处理，可在 Supabase 的 Cron 中按小时调用：

```sql
select public.settle_overdue_main_tasks(id) from public.families;
```

Cron 使用数据库内部调用时需要另建专用无鉴权版本或通过 Edge Function 使用服务端凭据；当前公开 RPC 只允许家庭成员触发，避免任意访客调用。

## 文件说明

- `index.html`：应用壳、登录与导航
- `styles.css`：移动端设计系统与响应式样式
- `app.js`：页面渲染、交互、演示数据、Supabase 调用
- `database.sql`：数据表、注册触发器、RLS、事务函数、索引
- `upgrade-2026-10-09-child-cover.sql`：已有项目增加儿童首页封面的升级脚本
- `manifest.webmanifest`、`sw.js`：桌面图标、独立窗口与基础离线缓存
- `dunocoin-logo.png`：dunocoin 应用标志
- `DESIGN.md`：视觉与交互规范

## 安全模型

浏览器从不直接写余额或积分流水。开户、手动调分、任务审核、奖励审核都由 `security definer` 数据库函数在事务内加锁执行。所有查询受 RLS 约束：管理员只能访问自己的家庭；儿童只能读取绑定给自己的账户、任务、提交和流水。
