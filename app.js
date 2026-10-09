import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const fmtTime = (value) => new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

const taskTemplates = [
  ["📚", "认真写作业", "按时独立完成当天作业", "main", 20],
  ["🎹", "弹钢琴", "专注练习钢琴 30 分钟", "main", 15],
  ["🏀", "打篮球", "完成一次篮球练习", "assist", 15],
  ["🌳", "户外运动", "户外活动至少 45 分钟", "assist", 20],
  ["🧹", "做家务", "主动完成一项家庭劳动", "assist", 10],
  ["📖", "阅读", "安静阅读课外书 30 分钟", "main", 15],
  ["🌙", "早睡早起", "按约定时间睡觉和起床", "main", 20],
  ["🧺", "整理房间", "整理书桌、床铺和物品", "main", 12]
];

const rewardTemplates = [
  ["🧸", "买一个玩具", "挑选一件约定价格内的玩具", 300],
  ["🎡", "游乐园游玩", "周末全家去游乐园一次", 500],
  ["📺", "看电视 30 分钟", "额外获得 30 分钟电视时间", 80],
  ["🍪", "吃喜欢的零食", "选择一份喜欢的小零食", 60],
  ["🚗", "短途出游", "一起安排一次周边短途旅行", 800],
  ["✨", "免做一次家务", "免除一次指定的日常家务", 100]
];

const demoData = () => {
  const childId = "demo-child-1";
  const task1 = "demo-task-1", task2 = "demo-task-2", task3 = "demo-task-3";
  return {
    family: { id: "demo-family", name: "星星家庭" },
    membership: { role: "admin", display_name: "乐乐妈妈" },
    children: [
      { id: childId, name: "乐乐", avatar: "🚀", age: 9, balance: 286, level: 3 },
      { id: "demo-child-2", name: "果果", avatar: "🌈", age: 7, balance: 168, level: 2 }
    ],
    tasks: [
      { id: task1, child_id: childId, name: "认真写作业", description: "放学后独立完成当天作业", type: "main", cycle: "daily", reward_points: 20, penalty_points: 10, icon: "📚", active: true },
      { id: task2, child_id: childId, name: "阅读 30 分钟", description: "选择喜欢的课外书安静阅读", type: "main", cycle: "daily", reward_points: 15, penalty_points: 8, icon: "📖", active: true },
      { id: task3, child_id: childId, name: "帮忙做家务", description: "主动完成一项家庭劳动", type: "assist", cycle: "weekly", reward_points: 10, penalty_points: 0, icon: "🧹", active: true }
    ],
    submissions: [{ id: "demo-sub-1", task_id: task2, child_id: childId, status: "pending", submitted_at: new Date().toISOString(), note: "今天读了《夏洛的网》" }],
    rewards: [
      { id: "demo-reward-1", name: "周末看电影", description: "一起选一部喜欢的电影", cost_points: 120, available_time: "周五至周日", conditions: "本周主线任务完成率 ≥ 80%", emoji: "🎬", active: true },
      { id: "demo-reward-2", name: "游乐园半日游", description: "选择一家游乐园，快乐出发", cost_points: 500, available_time: "周末或节假日", conditions: "需提前一天预约", emoji: "🎡", active: true },
      { id: "demo-reward-3", name: "喜欢的小零食", description: "挑选一份喜欢的健康零食", cost_points: 60, available_time: "每天晚饭后", conditions: "当天作业已完成", emoji: "🍪", active: true }
    ],
    redemptions: [{ id: "demo-red-1", reward_id: "demo-reward-3", child_id: childId, status: "pending", created_at: new Date().toISOString() }],
    ledger: [
      { id: "l1", child_id: childId, amount: 15, balance_after: 286, source_type: "task", description: "完成：阅读 30 分钟", created_at: new Date().toISOString() },
      { id: "l2", child_id: childId, amount: -60, balance_after: 271, source_type: "redemption", description: "兑换：喜欢的小零食", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "l3", child_id: childId, amount: 20, balance_after: 331, source_type: "task", description: "完成：认真写作业", created_at: new Date(Date.now() - 172800000).toISOString() }
    ],
    members: [
      { id: "m1", display_name: "乐乐妈妈", role: "admin" },
      { id: "m2", display_name: "乐乐爸爸", role: "admin" },
      { id: "m3", display_name: "乐乐", role: "child" }
    ]
  };
};

const state = {
  supabase: null,
  demo: false,
  authMode: "login",
  page: "home",
  taskFilter: "all",
  activeChildId: null,
  session: null,
  data: null
};

function icons() { window.lucide?.createIcons({ attrs: { "aria-hidden": "true" } }); }
function toast(message, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toastRoot").append(el);
  setTimeout(() => el.remove(), 2800);
}
function setLoading(show) {
  $("#loadingScreen").classList.toggle("hidden", !show);
  $("#authScreen").classList.add("hidden");
  $("#mainApp").classList.add("hidden");
}
function showAuth() {
  $("#loadingScreen").classList.add("hidden");
  $("#mainApp").classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
  const invite = new URLSearchParams(location.search).get("invite");
  if (invite) {
    $("#inviteHint").textContent = "你正在通过家庭邀请加入，注册或登录后会自动进入对应家庭。";
    $("#inviteHint").classList.remove("hidden");
  }
}
function showApp() {
  $("#loadingScreen").classList.add("hidden");
  $("#authScreen").classList.add("hidden");
  $("#mainApp").classList.remove("hidden");
  $("#demoBadge").classList.toggle("hidden", !state.demo);
  render();
}

async function init() {
  const cfg = window.APP_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(cfg.SUPABASE_URL || "") && !String(cfg.SUPABASE_ANON_KEY || "").includes("YOUR_");
  if (!configured) {
    setTimeout(showAuth, 450);
    return;
  }
  state.supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  const { data: { session } } = await state.supabase.auth.getSession();
  if (session) await bootSession(session); else showAuth();
  state.supabase.auth.onAuthStateChange(async (event, sessionValue) => {
    if (event === "SIGNED_OUT") showAuth();
    if (event === "SIGNED_IN" && sessionValue && sessionValue.user.id !== state.session?.user?.id) await bootSession(sessionValue);
  });
}

async function bootSession(session) {
  setLoading(true);
  state.session = session;
  state.demo = false;
  try {
    const inviteToken = new URLSearchParams(location.search).get("invite");
    if (inviteToken) {
      const { error: inviteError } = await state.supabase.rpc("accept_family_invitation", { p_token: inviteToken });
      if (inviteError) throw inviteError;
      history.replaceState({}, "", location.pathname);
    }
    await loadRemoteData();
    showApp();
  } catch (error) {
    console.error(error);
    toast(error.message || "加载家庭数据失败", "error");
    showAuth();
  }
}

async function loadRemoteData() {
  const sb = state.supabase;
  const userId = state.session.user.id;
  const { data: membership, error: memberError } = await sb.from("family_members").select("*, families(*)").eq("user_id", userId).limit(1).maybeSingle();
  if (memberError) throw memberError;
  if (!membership) throw new Error("尚未找到家庭资料，请确认已执行 database.sql");
  const familyId = membership.family_id;
  // 幂等结算已过期的主线任务；数据库函数会加锁并确保同一周期只扣一次。
  await sb.rpc("settle_overdue_main_tasks", { p_family_id: familyId });
  const queries = await Promise.all([
    sb.from("children").select("*").eq("family_id", familyId).order("created_at"),
    sb.from("tasks").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
    sb.from("task_submissions").select("*").eq("family_id", familyId).order("submitted_at", { ascending: false }),
    sb.from("rewards").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
    sb.from("reward_redemptions").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
    sb.from("point_ledger").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(100),
    sb.from("family_members").select("id,display_name,role,user_id,created_at").eq("family_id", familyId).order("created_at")
  ]);
  queries.forEach(q => { if (q.error) throw q.error; });
  const remoteChildren = queries[0].data;
  await Promise.all(remoteChildren.map(async child => {
    if (child.avatar?.startsWith("child-avatars/")) {
      const objectPath = child.avatar.slice("child-avatars/".length);
      const { data: signed } = await sb.storage.from("child-avatars").createSignedUrl(objectPath, 3600);
      child.avatar_url = signed?.signedUrl || null;
    }
  }));
  state.data = {
    family: membership.families,
    membership,
    children: remoteChildren,
    tasks: queries[1].data,
    submissions: queries[2].data,
    rewards: queries[3].data,
    redemptions: queries[4].data,
    ledger: queries[5].data,
    members: queries[6].data
  };
  const linkedChild = membership.role === "child" ? state.data.children.find(c => c.user_id === userId) : null;
  state.activeChildId = linkedChild?.id || state.activeChildId || state.data.children[0]?.id || null;
}

async function refresh() {
  if (!state.demo) await loadRemoteData();
  render();
}

function isAdmin() { return state.data?.membership?.role === "admin"; }
function activeChild() { return state.data?.children.find(c => c.id === state.activeChildId) || state.data?.children[0]; }
function taskSubmission(taskId) { return state.data.submissions.find(s => s.task_id === taskId && s.child_id === state.activeChildId && ["pending", "approved"].includes(s.status)); }
function rewardRedemption(rewardId) { return state.data.redemptions.find(r => r.reward_id === rewardId && r.child_id === state.activeChildId && r.status === "pending"); }
function childName(id) { return state.data.children.find(c => c.id === id)?.name || "孩子"; }
function childAvatarSymbol(child) {
  const avatar = String(child?.avatar || "");
  const isImage = Boolean(child?.avatar_url) || avatar.startsWith("child-avatars/") || avatar.startsWith("data:image/") || /^https?:\/\//i.test(avatar);
  return isImage ? "👤" : (avatar || "⭐");
}
function childAvatarMarkup(child) {
  const inlineAvatar = /^data:image\//.test(child?.avatar || "") ? child.avatar : null;
  const imageSource = child?.avatar_url || inlineAvatar;
  return imageSource
    ? `<img src="${escapeHTML(imageSource)}" alt="${escapeHTML(child.name)}的头像" />`
    : escapeHTML(childAvatarSymbol(child));
}
function taskName(id) { return state.data.tasks.find(t => t.id === id)?.name || "任务"; }
function rewardName(id) { return state.data.rewards.find(r => r.id === id)?.name || "奖励"; }
function cycleLabel(cycle) { return ({ daily: "每日", weekly: "每周", custom: "自定义" })[cycle] || cycle || "自定义"; }
function greeting() { const h = new Date().getHours(); return h < 6 ? "夜深了" : h < 11 ? "早上好" : h < 14 ? "中午好" : h < 18 ? "下午好" : "晚上好"; }

function render() {
  if (!state.data) return;
  $("#greeting").textContent = greeting();
  $("#familyName").textContent = state.data.family.name;
  $("#profileInitial").textContent = (state.data.membership.display_name || "家").slice(-1);
  $$(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin()));
  $$(".nav-item[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === state.page));
  const pages = { home: renderHome, tasks: renderTasks, rewards: renderRewards, family: renderFamily };
  $("#pageContent").innerHTML = (pages[state.page] || renderHome)();
  icons();
}

function renderHome() {
  const child = activeChild();
  if (!child) return `<div class="page-title"><div><h2>欢迎回家</h2><p>先为孩子开设第一个成长账户</p></div></div>${empty("user-plus", "还没有儿童账户", "开户后即可创建任务、记录积分和兑换奖励。", isAdmin() ? "开设账户" : "等待管理员开户", "add-child")}`;
  const pending = state.data.submissions.filter(s => s.status === "pending" && (!isAdmin() || true));
  const tasks = state.data.tasks.filter(t => t.child_id === child.id && t.active).slice(0, 3);
  const ledger = state.data.ledger.filter(l => l.child_id === child.id).slice(0, 4);
  const options = state.data.children.map(c => `<option value="${c.id}" ${c.id === child.id ? "selected" : ""}>${escapeHTML(childAvatarSymbol(c))} ${escapeHTML(c.name)}</option>`).join("");
  return `
    <section class="hero-balance">
      <div class="hero-top"><span class="hero-label">成长积分余额</span>${isAdmin() && state.data.children.length > 1 ? `<select class="child-switch" id="childSwitch" aria-label="切换儿童账户">${options}</select>` : `<span class="level-chip">${escapeHTML(childAvatarSymbol(child))} ${escapeHTML(child.name)}</span>`}</div>
      <div class="balance-number">${Number(child.balance || 0).toLocaleString()} <small>积分</small></div>
      <div class="balance-foot"><span>每一点，都是努力的见证</span><span class="level-chip">Lv.${child.level || Math.max(1, Math.floor((child.balance || 0) / 100) + 1)}</span></div>
    </section>
    <div class="quick-grid">
      ${isAdmin() ? quick("plus-circle", "存入积分", "adjust-points", "tone-green") : quick("check-circle-2", "提交任务", "go-tasks", "tone-green")}
      ${isAdmin() ? quick("minus-circle", "扣除积分", "deduct-points", "tone-red") : quick("gift", "兑换奖励", "go-rewards", "tone-orange")}
      ${isAdmin() ? quick("clipboard-check", `待审核 ${pending.length}`, "show-reviews", "tone-orange") : quick("scroll-text", "积分流水", "show-ledger", "tone-purple")}
      ${quick("bar-chart-3", "成长记录", "show-ledger", "tone-purple")}
    </div>
    <section class="section"><div class="section-head"><div><h2>今天的任务</h2><p>${tasks.length ? "稳稳完成，一点点变优秀" : "今天还没有安排"}</p></div><button class="link-btn" data-page="tasks">查看全部</button></div>
      <div class="card list-card">${tasks.length ? tasks.map(task => taskRow(task)).join("") : emptyInline("calendar-check", "暂无任务")}</div>
    </section>
    <section class="section"><div class="section-head"><div><h2>最近积分</h2><p>每一笔变化都有记录</p></div><button class="link-btn" data-action="show-ledger">全部流水</button></div>
      <div class="card list-card">${ledger.length ? ledger.map(ledgerRow).join("") : emptyInline("receipt-text", "暂无积分记录")}</div>
    </section>`;
}

function quick(icon, label, action, tone) { return `<button class="quick-action" data-action="${action}"><span class="quick-icon ${tone}"><i data-lucide="${icon}"></i></span><span>${label}</span></button>`; }
function taskRow(task) {
  const sub = taskSubmission(task.id);
  const status = sub?.status === "pending" ? "待审核" : sub?.status === "approved" ? "已完成" : "进行中";
  return `<div class="list-row"><div class="row-icon ${task.type === "main" ? "tone-purple" : "tone-green"}">${escapeHTML(task.icon || (task.type === "main" ? "🎯" : "✨"))}</div><div class="row-main"><h3>${escapeHTML(task.name)}</h3><p>${cycleLabel(task.cycle)} · ${status}</p></div><div class="row-value positive">+${task.reward_points}<small>积分赏金</small></div></div>`;
}
function ledgerRow(item) { return `<div class="list-row"><div class="row-icon ${item.amount >= 0 ? "tone-green" : "tone-red"}"><i data-lucide="${item.amount >= 0 ? "arrow-down-left" : "arrow-up-right"}"></i></div><div class="row-main"><h3>${escapeHTML(item.description)}</h3><p>${fmtTime(item.created_at)}</p></div><div class="row-value ${item.amount >= 0 ? "positive" : "negative"}">${item.amount >= 0 ? "+" : ""}${item.amount}<small>余额 ${item.balance_after}</small></div></div>`; }

function renderTasks() {
  const filters = [["all", "全部"], ["main", "主线任务"], ["assist", "辅助任务"], ["pending", "待审核"]];
  let tasks = state.data.tasks.filter(t => !state.activeChildId || t.child_id === state.activeChildId);
  if (state.taskFilter === "main" || state.taskFilter === "assist") tasks = tasks.filter(t => t.type === state.taskFilter);
  if (state.taskFilter === "pending") tasks = tasks.filter(t => state.data.submissions.some(s => s.task_id === t.id && s.status === "pending"));
  return `
    <div class="page-title"><div><h2>任务中心</h2><p>主线坚持，辅助探索</p></div>${isAdmin() ? `<button class="primary-btn" data-action="add-task"><i data-lucide="plus"></i> 创建</button>` : ""}</div>
    <div class="tabs">${filters.map(([id, label]) => `<button class="tab-chip ${state.taskFilter === id ? "active" : ""}" data-task-filter="${id}">${label}</button>`).join("")}</div>
    <div class="task-grid">${tasks.length ? tasks.map(renderTaskCard).join("") : empty("list-checks", "这里还没有任务", isAdmin() ? "从模板快速创建，或安排一个专属任务。" : "家长创建后，任务会出现在这里。", isAdmin() ? "创建任务" : "", "add-task")}</div>`;
}

function renderTaskCard(task) {
  const sub = state.data.submissions.find(s => s.task_id === task.id && s.child_id === task.child_id && s.status === "pending");
  const approved = state.data.submissions.find(s => s.task_id === task.id && s.child_id === task.child_id && s.status === "approved" && s.due_date === today());
  let action = "";
  if (isAdmin()) {
    action = sub ? `<button class="primary-btn" data-action="review-task" data-id="${sub.id}">审核评分</button>` : `<button class="ghost-btn" data-action="edit-task" data-id="${task.id}">编辑任务</button><button class="danger-btn" data-action="delete-task" data-id="${task.id}">删除</button>`;
  } else if (sub) action = `<button class="ghost-btn" disabled>已提交 · 等待审核</button>`;
  else if (approved) action = `<button class="ghost-btn" disabled>今日已完成</button>`;
  else action = `<button class="primary-btn" data-action="submit-task" data-id="${task.id}">提交完成</button>`;
  return `<article class="card task-card">
    <div class="task-card-head"><div class="row-icon ${task.type === "main" ? "tone-purple" : "tone-green"}">${escapeHTML(task.icon || "🎯")}</div><div style="flex:1;min-width:0"><div style="display:flex;gap:7px;align-items:center"><h3>${escapeHTML(task.name)}</h3><span class="type-badge ${task.type === "main" ? "badge-main" : "badge-assist"}">${task.type === "main" ? "主线" : "辅助"}</span></div><p>${escapeHTML(task.description || "用行动完成这次成长挑战")}</p></div></div>
    <div class="task-meta"><span class="meta-chip">${cycleLabel(task.cycle)}</span><span class="meta-chip">赏金 +${task.reward_points}</span>${task.type === "main" ? `<span class="meta-chip">未完成 -${task.penalty_points || 0}</span>` : ""}<span class="meta-chip">${escapeHTML(childName(task.child_id))}</span></div>
    <div class="card-actions">${action}</div>
  </article>`;
}

function renderRewards() {
  const child = activeChild();
  const rewards = state.data.rewards.filter(r => r.active !== false);
  return `<div class="page-title"><div><h2>奖励商店</h2><p>${child ? `${escapeHTML(child.name)}有 ${child.balance || 0} 积分可用` : "收获努力带来的快乐"}</p></div>${isAdmin() ? `<button class="primary-btn" data-action="add-reward"><i data-lucide="plus"></i> 创建</button>` : ""}</div>
    <div class="reward-grid">${rewards.length ? rewards.map(renderRewardCard).join("") : empty("gift", "奖励架还是空的", isAdmin() ? "创建一张奖励卡，给坚持一个惊喜。" : "家长创建奖励后会展示在这里。", isAdmin() ? "创建奖励" : "", "add-reward")}</div>`;
}
function renderRewardCard(reward) {
  const child = activeChild();
  const pending = rewardRedemption(reward.id);
  const canAfford = child && Number(child.balance) >= Number(reward.cost_points);
  let actions = "";
  if (isAdmin()) actions = `<button class="ghost-btn" data-action="edit-reward" data-id="${reward.id}">编辑</button><button class="danger-btn" data-action="delete-reward" data-id="${reward.id}">删除</button>`;
  else if (pending) actions = `<button class="ghost-btn" disabled>申请已提交</button>`;
  else actions = `<button class="primary-btn" data-action="redeem" data-id="${reward.id}" ${canAfford ? "" : "disabled"}>${canAfford ? "申请兑换" : "积分不足"}</button>`;
  return `<article class="card reward-card"><div class="reward-visual">${escapeHTML(reward.emoji || "🎁")}</div><div class="reward-card-head"><div style="flex:1"><h3>${escapeHTML(reward.name)}</h3><p>${escapeHTML(reward.description || "一份特别的成长奖励")}</p></div><div class="reward-cost">${reward.cost_points}<small> 分</small></div></div><div class="reward-meta"><span class="meta-chip">⏰ ${escapeHTML(reward.available_time || "随时可兑换")}</span>${reward.conditions ? `<span class="meta-chip">✓ ${escapeHTML(reward.conditions)}</span>` : ""}</div><div class="card-actions">${actions}</div></article>`;
}

function renderFamily() {
  const pendingTasks = state.data.submissions.filter(s => s.status === "pending").length;
  const pendingRewards = state.data.redemptions.filter(r => r.status === "pending").length;
  return `<div class="page-title"><div><h2>我的家庭</h2><p>${escapeHTML(state.data.family.name)} · ${state.data.members.length} 位成员</p></div>${isAdmin() ? `<button class="primary-btn" data-action="invite-member"><i data-lucide="user-plus"></i> 邀请</button>` : ""}</div>
    <div class="stats-grid"><div class="card stat-card"><strong>${state.data.children.length}</strong><span>儿童账户</span></div><div class="card stat-card"><strong>${pendingTasks}</strong><span>任务待审核</span></div><div class="card stat-card"><strong>${pendingRewards}</strong><span>兑换待审核</span></div></div>
    <section class="section"><div class="section-head"><div><h2>儿童账户</h2><p>独立余额与完整流水</p></div>${isAdmin() ? `<button class="link-btn" data-action="add-child">＋ 开户</button>` : ""}</div><div class="child-grid">${state.data.children.length ? state.data.children.map(c => `<article class="card child-card"><div class="child-avatar">${childAvatarMarkup(c)}</div><div><h3>${escapeHTML(c.name)}</h3><p>${c.age || "–"} 岁 · Lv.${c.level || 1}</p></div><div class="child-balance">${c.balance || 0}<small>积分余额</small></div></article>`).join("") : emptyInline("user-plus", "暂无儿童账户")}</div></section>
    <section class="section"><div class="section-head"><div><h2>家庭成员</h2><p>管理员与儿童权限严格区分</p></div></div><div class="card list-card">${state.data.members.map(m => `<div class="list-row member-row"><div class="avatar">${escapeHTML((m.display_name || "家").slice(-1))}</div><div class="row-main"><h3>${escapeHTML(m.display_name || "家庭成员")}</h3><p>${m.role === "admin" ? "可管理家庭全部内容" : "仅可查看和提交申请"}</p></div><span class="role-pill">${m.role === "admin" ? "管理员" : "儿童"}</span></div>`).join("")}</div></section>
    ${isAdmin() && (pendingTasks || pendingRewards) ? `<section class="section"><button class="primary-btn full" data-action="show-reviews">处理 ${pendingTasks + pendingRewards} 条待审核申请</button></section>` : ""}`;
}

function empty(icon, title, text, button, action) { return `<div class="card empty-state" style="grid-column:1/-1"><div class="empty-icon"><i data-lucide="${icon}"></i></div><h3>${title}</h3><p>${text}</p>${button ? `<button class="secondary-btn" data-action="${action}">${button}</button>` : ""}</div>`; }
function emptyInline(icon, title) { return `<div class="empty-state"><div class="empty-icon"><i data-lucide="${icon}"></i></div><h3>${title}</h3></div>`; }

function openModal(title, body) {
  document.body.classList.add("modal-open");
  $("#modalRoot").innerHTML = `<div class="modal-backdrop" data-modal-backdrop="true"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><header class="modal-head"><h2>${escapeHTML(title)}</h2><button class="close-btn" type="button" data-action="close-modal" aria-label="关闭弹窗">×</button></header><div class="modal-body">${body}</div></section></div>`;
  icons();
  setTimeout(() => $("#modalRoot input, #modalRoot select, #modalRoot textarea")?.focus(), 50);
}
function closeModal() { $("#modalRoot").innerHTML = ""; document.body.classList.remove("modal-open"); }

function fillForm(form, values) {
  if (!form) return;
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function showHelp() {
  openModal("小小成长银行怎么用？", `<div class="info-list">
    ${info("1", "开设成长账户", "管理员为每个孩子建立独立积分账户，余额和流水互不混淆。")}
    ${info("2", "安排成长任务", "主线任务未完成可扣分，辅助任务自愿参与，只奖励不惩罚。")}
    ${info("3", "提交与审核", "孩子提交完成状态，家长按 0%–100% 评分，系统按比例自动结算积分。")}
    ${info("4", "兑换家庭奖励", "孩子发起申请，家长审核通过后自动扣分并永久记录。")}
    ${info("✓", "家庭数据隔离", "真实模式由 Supabase 行级安全策略保护，不同家庭无法读取彼此数据。")}
  </div>`);
}
function info(num, title, text) { return `<div class="info-item"><span class="info-num">${num}</span><div><strong>${title}</strong><p>${text}</p></div></div>`; }

function showChildModal() {
  openModal("开设儿童积分账户", `<form class="modal-form" data-form="child"><label class="field"><span>儿童姓名 *</span><input name="name" required maxlength="20" placeholder="例如：乐乐" /></label><div class="form-grid"><label class="field"><span>预设头像</span><select name="avatar"><option>🚀</option><option>🌈</option><option>🦊</option><option>🐼</option><option>⚽</option><option>🎨</option></select></label><label class="field"><span>年龄 *</span><input name="age" type="number" required min="3" max="18" value="8" /></label></div><label class="field"><span>上传头像（可选）</span><input name="avatar_file" type="file" accept="image/png,image/jpeg,image/webp" /></label><p class="helper">支持 JPG、PNG、WebP，最大 2MB；上传图片会替代预设头像。</p><label class="field"><span>初始积分 *</span><input name="balance" type="number" required min="0" max="100000" value="100" /></label><p class="helper">开户后初始积分会自动生成第一笔“开户积分”流水。</p><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">确认开户</button></div></form>`);
}

function showTaskModal(task = {}) {
  const childOptions = state.data.children.map(c => `<option value="${c.id}" ${c.id === (task.child_id || state.activeChildId) ? "selected" : ""}>${escapeHTML(c.name)}</option>`).join("");
  openModal(task.id ? "编辑任务" : "创建成长任务", `<form class="modal-form" data-form="task" data-id="${task.id || ""}">
    <div><div class="helper" style="margin-bottom:7px">常用模板 · 点击自动填写</div><div class="template-scroller">${taskTemplates.map((t, i) => `<button class="template-btn" type="button" data-task-template="${i}">${t[0]} ${t[1]}</button>`).join("")}</div></div>
    <label class="field"><span>任务名称 *</span><input name="name" required maxlength="40" value="${escapeHTML(task.name || "")}" placeholder="这次要完成什么？" /></label>
    <label class="field"><span>详细描述</span><textarea name="description" maxlength="240" placeholder="简单说明完成标准">${escapeHTML(task.description || "")}</textarea></label>
    <div class="form-grid"><label class="field"><span>任务类型 *</span><select name="type"><option value="main" ${task.type === "main" ? "selected" : ""}>主线任务</option><option value="assist" ${task.type === "assist" ? "selected" : ""}>辅助任务</option></select></label><label class="field"><span>执行周期 *</span><select name="cycle"><option value="daily">每日</option><option value="weekly" ${task.cycle === "weekly" ? "selected" : ""}>每周</option><option value="custom" ${task.cycle === "custom" ? "selected" : ""}>自定义</option></select></label></div>
    <label class="field"><span>分配给 *</span><select name="child_id" required>${childOptions}</select></label>
    <div class="form-grid"><label class="field"><span>赏金积分 *</span><input name="reward_points" type="number" min="0" max="10000" required value="${task.reward_points ?? 20}" /></label><label class="field"><span>主线未完成扣分</span><input name="penalty_points" type="number" min="0" max="10000" value="${task.penalty_points ?? 10}" /></label></div>
    <label class="field"><span>完成度考核维度</span><input name="assessment_criteria" maxlength="180" value="${escapeHTML(task.assessment_criteria || "完成质量、主动性、专注度")}" /></label>
    <input type="hidden" name="icon" value="${escapeHTML(task.icon || "🎯")}" /><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">保存任务</button></div></form>`);
}

function showRewardModal(reward = {}) {
  openModal(reward.id ? "编辑奖励卡" : "创建奖励卡", `<form class="modal-form" data-form="reward" data-id="${reward.id || ""}"><div><div class="helper" style="margin-bottom:7px">奖励模板 · 点击自动填写</div><div class="template-scroller">${rewardTemplates.map((t, i) => `<button class="template-btn" type="button" data-reward-template="${i}">${t[0]} ${t[1]}</button>`).join("")}</div></div><label class="field"><span>奖励名称 *</span><input name="name" required maxlength="40" value="${escapeHTML(reward.name || "")}" /></label><label class="field"><span>奖励详细描述 *</span><textarea name="description" required maxlength="240">${escapeHTML(reward.description || "")}</textarea></label><div class="form-grid"><label class="field"><span>消耗积分 *</span><input name="cost_points" type="number" required min="1" max="100000" value="${reward.cost_points || 100}" /></label><label class="field"><span>图标</span><select name="emoji"><option>🎁</option><option>🧸</option><option>🎡</option><option>📺</option><option>🍪</option><option>🚗</option><option>✨</option></select></label></div><label class="field"><span>可兑换时间 *</span><input name="available_time" required maxlength="80" value="${escapeHTML(reward.available_time || "周末或节假日")}" /></label><label class="field"><span>额外兑换条件</span><input name="conditions" maxlength="180" value="${escapeHTML(reward.conditions || "")}" placeholder="例如：本周主线完成率 ≥ 80%" /></label><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">保存奖励</button></div></form>`);
}

function showPointsModal(deduct = false) {
  const c = activeChild(); if (!c) return toast("请先开设儿童账户", "error");
  openModal(deduct ? "扣除积分" : "存入积分", `<form class="modal-form" data-form="points"><input type="hidden" name="direction" value="${deduct ? -1 : 1}" /><label class="field"><span>儿童账户</span><select name="child_id">${state.data.children.map(x => `<option value="${x.id}" ${x.id === c.id ? "selected" : ""}>${escapeHTML(x.name)} · ${x.balance} 分</option>`).join("")}</select></label><label class="field"><span>${deduct ? "扣除" : "存入"}积分 *</span><input name="amount" type="number" min="1" max="100000" required value="10" /></label><label class="field"><span>原因 *</span><input name="description" required maxlength="120" placeholder="例如：主动帮助家人" /></label><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="${deduct ? "danger-btn" : "primary-btn"}" type="submit">确认${deduct ? "扣除" : "存入"}</button></div></form>`);
}

function showSubmitTask(task) {
  openModal("提交任务", `<form class="modal-form" data-form="submission" data-id="${task.id}"><div class="info-item"><span class="info-num">${escapeHTML(task.icon || "✓")}</span><div><strong>${escapeHTML(task.name)}</strong><p>提交后等待家长审核，最高可获得 ${task.reward_points} 积分。</p></div></div><label class="field"><span>完成说明</span><textarea name="note" maxlength="240" placeholder="我完成了什么？有什么收获？"></textarea></label><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">确认提交</button></div></form>`);
}

function showReviewTask(submission) {
  const task = state.data.tasks.find(t => t.id === submission.task_id);
  openModal("任务完成度审核", `<form class="modal-form" data-form="review-task" data-id="${submission.id}"><div class="info-item"><span class="info-num">${escapeHTML(task?.icon || "✓")}</span><div><strong>${escapeHTML(task?.name || "任务")}</strong><p>${escapeHTML(childName(submission.child_id))}：${escapeHTML(submission.note || "已完成，未填写说明")}</p></div></div><div class="score-display"><strong id="scoreValue">100%</strong><span>预计获得 <b id="scorePoints">${task?.reward_points || 0}</b> 积分</span></div><label class="field"><span>完成度（0%–100%）</span><input id="scoreRange" name="completion_pct" type="range" min="0" max="100" step="5" value="100" data-reward="${task?.reward_points || 0}" /></label><label class="field"><span>家长评语</span><textarea name="review_note" maxlength="240" placeholder="给孩子一点具体、正向的反馈"></textarea></label><div class="modal-actions"><button type="button" class="danger-btn" data-action="reject-task" data-id="${submission.id}">退回</button><button class="primary-btn" type="submit">通过并结算</button></div></form>`);
}

function showReviews() {
  const tasks = state.data.submissions.filter(s => s.status === "pending");
  const rewards = state.data.redemptions.filter(r => r.status === "pending");
  openModal("待审核申请", `<div class="info-list">${tasks.map(s => `<div class="info-item"><span class="info-num">任</span><div style="flex:1"><strong>${escapeHTML(childName(s.child_id))} · ${escapeHTML(taskName(s.task_id))}</strong><p>${escapeHTML(s.note || "孩子已提交完成")}</p></div><button class="secondary-btn" data-action="review-task" data-id="${s.id}">评分</button></div>`).join("")}${rewards.map(r => `<div class="info-item"><span class="info-num">兑</span><div style="flex:1"><strong>${escapeHTML(childName(r.child_id))} · ${escapeHTML(rewardName(r.reward_id))}</strong><p>申请兑换，等待确认</p></div><button class="secondary-btn" data-action="review-redemption" data-id="${r.id}">审核</button></div>`).join("")}${!tasks.length && !rewards.length ? `<div class="empty-state"><h3>全部处理完啦</h3><p>当前没有待审核申请。</p></div>` : ""}</div>`);
}

function showRedemptionReview(redemption) {
  const reward = state.data.rewards.find(r => r.id === redemption.reward_id);
  const child = state.data.children.find(c => c.id === redemption.child_id);
  openModal("审核奖励兑换", `<div class="modal-form"><div class="reward-visual" style="margin:0;border-radius:18px">${escapeHTML(reward?.emoji || "🎁")}</div><div class="info-item"><span class="info-num">兑</span><div><strong>${escapeHTML(child?.name)}想兑换“${escapeHTML(reward?.name)}”</strong><p>需要 ${reward?.cost_points} 积分，当前余额 ${child?.balance} 积分。通过后将自动扣除并记录流水。</p></div></div><div class="modal-actions"><button class="danger-btn" data-action="reject-redemption" data-id="${redemption.id}">拒绝</button><button class="primary-btn" data-action="approve-redemption" data-id="${redemption.id}" ${Number(child?.balance) >= Number(reward?.cost_points) ? "" : "disabled"}>通过兑换</button></div></div>`);
}

function showLedger() {
  const c = activeChild();
  const items = state.data.ledger.filter(l => !c || l.child_id === c.id);
  openModal(`${c?.name || "孩子"}的积分流水`, `<div class="card list-card">${items.length ? items.map(ledgerRow).join("") : emptyInline("receipt-text", "暂无积分记录")}</div>`);
}

function showInvite() {
  if (state.demo) {
    const token = uid();
    const url = `${location.origin}${location.pathname}?invite=${token}`;
    openModal("邀请家庭成员", `<form class="modal-form" data-form="invite"><label class="field"><span>成员身份</span><select name="role"><option value="admin">家长管理员</option><option value="child">儿童只读账号</option></select></label><label class="field"><span>署名备注</span><input name="display_name" required placeholder="例如：乐乐爸爸" /></label><div class="copy-box"><code>${escapeHTML(url)}</code><button type="button" class="secondary-btn" data-copy="${escapeHTML(url)}">复制</button></div><p class="helper">演示模式下链接仅用于体验界面，不会创建真实账号。</p><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">生成邀请</button></div></form>`);
    return;
  }
  openModal("邀请家庭成员", `<form class="modal-form" data-form="invite"><label class="field"><span>成员身份 *</span><select name="role"><option value="admin">家长管理员</option><option value="child">儿童只读账号</option></select></label><label class="field"><span>署名备注 *</span><input name="display_name" required maxlength="30" placeholder="例如：乐乐爸爸" /></label><label class="field"><span>绑定儿童账户（儿童身份可选）</span><select name="child_id"><option value="">暂不绑定</option>${state.data.children.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("")}</select></label><label class="field"><span>受邀邮箱（选填）</span><input name="email" type="email" placeholder="用于核对邀请人" /></label><p class="helper">邀请链接 7 天内有效。对方注册时会自动加入当前家庭，不会另建家庭。</p><div class="modal-actions"><button type="button" class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" type="submit">生成邀请链接</button></div></form>`);
}

function showProfile() {
  openModal("账号与家庭", `<div class="info-list"><div class="info-item"><span class="info-num">我</span><div><strong>${escapeHTML(state.data.membership.display_name)}</strong><p>${isAdmin() ? "家庭管理员 · 拥有全部管理权限" : "儿童账号 · 仅可查看和提交申请"}</p></div></div><div class="info-item"><span class="info-num">家</span><div><strong>${escapeHTML(state.data.family.name)}</strong><p>${state.data.members.length} 位家庭成员 · ${state.data.children.length} 个成长账户</p></div></div></div><div class="modal-actions" style="margin-top:16px"><button class="danger-btn" data-action="logout">退出登录</button></div>`);
}

async function handleForm(form) {
  const fd = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.form;
  const submit = form.querySelector("button[type=submit]");
  if (submit) submit.disabled = true;
  try {
    if (type === "child") await createChild(fd);
    if (type === "task") await saveTask(fd, form.dataset.id);
    if (type === "reward") await saveReward(fd, form.dataset.id);
    if (type === "points") await adjustPoints(fd);
    if (type === "submission") await submitTask(form.dataset.id, fd.note);
    if (type === "review-task") await reviewTask(form.dataset.id, fd);
    if (type === "invite") await createInvite(fd);
  } catch (error) {
    console.error(error); toast(error.message || "操作失败，请重试", "error");
    if (submit) submit.disabled = false;
  }
}

async function createChild(fd) {
  const file = fd.avatar_file instanceof File && fd.avatar_file.size ? fd.avatar_file : null;
  if (file && file.size > 2 * 1024 * 1024) throw new Error("头像文件不能超过 2MB");
  let avatar = fd.avatar;
  if (file && state.demo) avatar = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  if (file && !state.demo) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const objectPath = `${state.data.family.id}/${uid()}.${ext}`;
    const { error: uploadError } = await state.supabase.storage.from("child-avatars").upload(objectPath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    avatar = `child-avatars/${objectPath}`;
  }
  const row = { id: uid(), family_id: state.data.family.id, name: fd.name.trim(), avatar, age: Number(fd.age), balance: Number(fd.balance), level: 1 };
  if (state.demo) {
    state.data.children.push(row);
    state.data.ledger.unshift({ id: uid(), child_id: row.id, amount: row.balance, balance_after: row.balance, source_type: "initial", description: "开户初始积分", created_at: new Date().toISOString() });
  } else {
    const { error } = await state.supabase.rpc("create_child_account", { p_name: row.name, p_avatar: row.avatar, p_age: row.age, p_initial_balance: row.balance }); if (error) throw error;
  }
  closeModal(); await refresh(); toast("儿童成长账户已开设", "success");
}
async function saveTask(fd, id) {
  const row = { family_id: state.data.family.id, child_id: fd.child_id, name: fd.name.trim(), description: fd.description.trim(), type: fd.type, cycle: fd.cycle, reward_points: Number(fd.reward_points), penalty_points: fd.type === "main" ? Number(fd.penalty_points || 0) : 0, assessment_criteria: fd.assessment_criteria.trim(), icon: fd.icon || "🎯", active: true };
  if (state.demo) {
    if (id) Object.assign(state.data.tasks.find(t => t.id === id), row); else state.data.tasks.unshift({ id: uid(), ...row });
  } else {
    const query = id ? state.supabase.from("tasks").update(row).eq("id", id) : state.supabase.from("tasks").insert(row); const { error } = await query; if (error) throw error;
  }
  closeModal(); await refresh(); toast(id ? "任务已更新" : "成长任务已创建", "success");
}
async function saveReward(fd, id) {
  const row = { family_id: state.data.family.id, name: fd.name.trim(), description: fd.description.trim(), cost_points: Number(fd.cost_points), available_time: fd.available_time.trim(), conditions: fd.conditions.trim(), emoji: fd.emoji, active: true };
  if (state.demo) { if (id) Object.assign(state.data.rewards.find(r => r.id === id), row); else state.data.rewards.unshift({ id: uid(), ...row }); }
  else { const query = id ? state.supabase.from("rewards").update(row).eq("id", id) : state.supabase.from("rewards").insert(row); const { error } = await query; if (error) throw error; }
  closeModal(); await refresh(); toast(id ? "奖励卡已更新" : "奖励卡已创建", "success");
}
async function adjustPoints(fd) {
  const amount = Number(fd.amount) * Number(fd.direction);
  if (state.demo) {
    const child = state.data.children.find(c => c.id === fd.child_id); if (child.balance + amount < 0) throw new Error("积分余额不足"); child.balance += amount;
    state.data.ledger.unshift({ id: uid(), child_id: child.id, amount, balance_after: child.balance, source_type: "manual", description: fd.description.trim(), created_at: new Date().toISOString() });
  } else { const { error } = await state.supabase.rpc("adjust_child_points", { p_child_id: fd.child_id, p_amount: amount, p_description: fd.description.trim() }); if (error) throw error; }
  closeModal(); await refresh(); toast(amount > 0 ? "积分已存入" : "积分已扣除", "success");
}
async function submitTask(taskId, note) {
  const task = state.data.tasks.find(t => t.id === taskId); const row = { id: uid(), family_id: state.data.family.id, task_id: taskId, child_id: task.child_id, due_date: today(), status: "pending", note: note?.trim(), submitted_at: new Date().toISOString() };
  if (state.demo) state.data.submissions.unshift(row); else { const { error } = await state.supabase.from("task_submissions").insert(row); if (error) throw error; }
  closeModal(); await refresh(); toast("任务已提交，等待家长审核", "success");
}
async function reviewTask(submissionId, fd) {
  if (state.demo) {
    const sub = state.data.submissions.find(s => s.id === submissionId); const task = state.data.tasks.find(t => t.id === sub.task_id); const child = state.data.children.find(c => c.id === sub.child_id); const points = Math.round(task.reward_points * Number(fd.completion_pct) / 100); child.balance += points; Object.assign(sub, { status: "approved", completion_pct: Number(fd.completion_pct), awarded_points: points, review_note: fd.review_note }); state.data.ledger.unshift({ id: uid(), child_id: child.id, amount: points, balance_after: child.balance, source_type: "task", description: `完成：${task.name}`, created_at: new Date().toISOString() });
  } else { const { error } = await state.supabase.rpc("review_task_submission", { p_submission_id: submissionId, p_completion_pct: Number(fd.completion_pct), p_review_note: fd.review_note?.trim() || null, p_approve: true }); if (error) throw error; }
  closeModal(); await refresh(); toast("审核完成，积分已自动结算", "success");
}
async function rejectTask(id) {
  if (state.demo) Object.assign(state.data.submissions.find(s => s.id === id), { status: "rejected" }); else { const { error } = await state.supabase.rpc("review_task_submission", { p_submission_id: id, p_completion_pct: 0, p_review_note: "请完善后重新提交", p_approve: false }); if (error) throw error; }
  closeModal(); await refresh(); toast("任务已退回");
}
async function requestRedemption(rewardId) {
  const reward = state.data.rewards.find(r => r.id === rewardId); const child = activeChild(); if (!child || child.balance < reward.cost_points) return toast("积分余额不足", "error");
  const row = { id: uid(), family_id: state.data.family.id, reward_id: rewardId, child_id: child.id, status: "pending", cost_points: reward.cost_points, created_at: new Date().toISOString() };
  if (state.demo) state.data.redemptions.unshift(row); else { const { error } = await state.supabase.from("reward_redemptions").insert(row); if (error) throw error; }
  await refresh(); toast("兑换申请已提交", "success");
}
async function reviewRedemption(id, approve) {
  if (state.demo) {
    const red = state.data.redemptions.find(r => r.id === id); red.status = approve ? "approved" : "rejected";
    if (approve) { const reward = state.data.rewards.find(r => r.id === red.reward_id); const child = state.data.children.find(c => c.id === red.child_id); if (child.balance < reward.cost_points) throw new Error("积分余额不足"); child.balance -= reward.cost_points; state.data.ledger.unshift({ id: uid(), child_id: child.id, amount: -reward.cost_points, balance_after: child.balance, source_type: "redemption", description: `兑换：${reward.name}`, created_at: new Date().toISOString() }); }
  } else { const { error } = await state.supabase.rpc("review_reward_redemption", { p_redemption_id: id, p_approve: approve, p_review_note: approve ? "兑换通过" : "兑换未通过" }); if (error) throw error; }
  closeModal(); await refresh(); toast(approve ? "兑换通过，积分已扣除" : "兑换申请已拒绝", approve ? "success" : "");
}
async function createInvite(fd) {
  if (state.demo) { closeModal(); toast("演示邀请已生成", "success"); return; }
  const token = uid(); const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const { error } = await state.supabase.from("family_invitations").insert({ family_id: state.data.family.id, token, role: fd.role, display_name: fd.display_name.trim(), email: fd.email?.trim() || null, child_id: fd.role === "child" && fd.child_id ? fd.child_id : null, expires_at: expires, created_by: state.session.user.id }); if (error) throw error;
  const url = `${location.origin}${location.pathname}?invite=${token}`;
  openModal("邀请链接已生成", `<div class="modal-form"><div class="info-item"><span class="info-num">✓</span><div><strong>7 天内有效</strong><p>将链接发给家庭成员，对方注册或登录后会自动加入。</p></div></div><div class="copy-box"><code>${escapeHTML(url)}</code><button class="secondary-btn" data-copy="${escapeHTML(url)}">复制</button></div><button class="primary-btn" data-action="close-modal">完成</button></div>`);
}
async function deleteItem(table, id, collection, label) {
  if (!confirm(`确定删除这个${label}吗？`)) return;
  if (state.demo) state.data[collection] = state.data[collection].filter(x => x.id !== id); else { const { error } = await state.supabase.from(table).delete().eq("id", id); if (error) return toast(error.message, "error"); }
  await refresh(); toast(`${label}已删除`);
}

document.addEventListener("click", async event => {
  if (event.target.matches("[data-modal-backdrop]")) { closeModal(); return; }
  const tab = event.target.closest("[data-auth-tab]");
  if (tab) {
    state.authMode = tab.dataset.authTab; $$("[data-auth-tab]").forEach(x => x.classList.toggle("active", x === tab)); $("#nameField").classList.toggle("hidden", state.authMode !== "signup"); $("#authSubmitText").textContent = state.authMode === "signup" ? "创建我的家庭" : "登录家庭"; $("#authForm [name=password]").autocomplete = state.authMode === "signup" ? "new-password" : "current-password"; return;
  }
  const page = event.target.closest("[data-page]"); if (page) { state.page = page.dataset.page; window.scrollTo({ top: 0, behavior: "instant" }); render(); return; }
  const filter = event.target.closest("[data-task-filter]"); if (filter) { state.taskFilter = filter.dataset.taskFilter; render(); return; }
  const copy = event.target.closest("[data-copy]"); if (copy) { await navigator.clipboard.writeText(copy.dataset.copy); toast("邀请链接已复制", "success"); return; }
  const taskTemplate = event.target.closest("[data-task-template]");
  if (taskTemplate) {
    const t = taskTemplates[Number(taskTemplate.dataset.taskTemplate)];
    fillForm(taskTemplate.closest("form"), { name: t[1], description: t[2], type: t[3], reward_points: t[4], icon: t[0] });
    $$("[data-task-template]", taskTemplate.parentElement).forEach(button => button.classList.toggle("selected", button === taskTemplate));
    return;
  }
  const rewardTemplate = event.target.closest("[data-reward-template]");
  if (rewardTemplate) {
    const t = rewardTemplates[Number(rewardTemplate.dataset.rewardTemplate)];
    fillForm(rewardTemplate.closest("form"), { name: t[1], description: t[2], cost_points: t[3], emoji: t[0] });
    $$("[data-reward-template]", rewardTemplate.parentElement).forEach(button => button.classList.toggle("selected", button === rewardTemplate));
    return;
  }
  const el = event.target.closest("[data-action]"); if (!el) return; const action = el.dataset.action, id = el.dataset.id;
  if (action === "close-modal") { closeModal(); return; }
  if (action === "show-help") showHelp();
  if (action === "add-child") showChildModal();
  if (action === "add-task") state.data.children.length ? showTaskModal() : showChildModal();
  if (action === "edit-task") showTaskModal(state.data.tasks.find(t => t.id === id));
  if (action === "delete-task") await deleteItem("tasks", id, "tasks", "任务");
  if (action === "add-reward") showRewardModal();
  if (action === "edit-reward") showRewardModal(state.data.rewards.find(r => r.id === id));
  if (action === "delete-reward") await deleteItem("rewards", id, "rewards", "奖励卡");
  if (action === "adjust-points") showPointsModal(false);
  if (action === "deduct-points") showPointsModal(true);
  if (action === "submit-task") showSubmitTask(state.data.tasks.find(t => t.id === id));
  if (action === "review-task") showReviewTask(state.data.submissions.find(s => s.id === id));
  if (action === "reject-task") await rejectTask(id);
  if (action === "redeem") await requestRedemption(id);
  if (action === "review-redemption") showRedemptionReview(state.data.redemptions.find(r => r.id === id));
  if (action === "approve-redemption") await reviewRedemption(id, true);
  if (action === "reject-redemption") await reviewRedemption(id, false);
  if (action === "show-reviews") showReviews();
  if (action === "show-ledger") showLedger();
  if (action === "invite-member") showInvite();
  if (action === "go-tasks") { state.page = "tasks"; window.scrollTo({ top: 0, behavior: "instant" }); render(); }
  if (action === "go-rewards") { state.page = "rewards"; window.scrollTo({ top: 0, behavior: "instant" }); render(); }
  if (action === "quick-add") openModal("快速创建", `<div class="info-list"><button class="info-item" data-action="add-task" style="border:0;text-align:left;cursor:pointer"><span class="info-num">任</span><div><strong>创建任务</strong><p>安排主线或辅助成长任务</p></div></button><button class="info-item" data-action="add-reward" style="border:0;text-align:left;cursor:pointer"><span class="info-num">奖</span><div><strong>创建奖励</strong><p>制作一张家庭奖励兑换卡</p></div></button><button class="info-item" data-action="add-child" style="border:0;text-align:left;cursor:pointer"><span class="info-num">＋</span><div><strong>儿童开户</strong><p>新建独立的积分成长账户</p></div></button></div>`);
  if (action === "logout") { closeModal(); if (state.demo) { state.data = null; state.demo = false; showAuth(); } else await state.supabase.auth.signOut(); }
});

document.addEventListener("submit", async event => {
  event.preventDefault();
  if (event.target.id === "authForm") {
    const fd = Object.fromEntries(new FormData(event.target).entries()); const btn = event.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      if (!state.supabase) throw new Error("尚未配置 dunocoin 的 Supabase 连接，请先使用演示模式或填写 config.js");
      if (state.authMode === "signup") {
        const inviteToken = new URLSearchParams(location.search).get("invite");
        const { data, error } = await state.supabase.auth.signUp({ email: fd.email, password: fd.password, options: { data: { display_name: fd.displayName?.trim() || "家庭管理员", invite_token: inviteToken || null } } }); if (error) throw error;
        if (!data.session) toast("注册成功，请到邮箱完成验证", "success");
      } else { const { data, error } = await state.supabase.auth.signInWithPassword({ email: fd.email, password: fd.password }); if (error) throw error; if (data.session) await bootSession(data.session); }
    } catch (error) { toast(error.message, "error"); } finally { btn.disabled = false; }
    return;
  }
  if (event.target.matches("[data-form]")) await handleForm(event.target);
});

document.addEventListener("input", event => {
  if (event.target.id === "scoreRange") { const pct = Number(event.target.value), reward = Number(event.target.dataset.reward); $("#scoreValue").textContent = `${pct}%`; $("#scorePoints").textContent = Math.round(reward * pct / 100); }
});
document.addEventListener("change", event => { if (event.target.id === "childSwitch") { state.activeChildId = event.target.value; render(); } });
$("#demoLogin").addEventListener("click", () => { state.demo = true; state.data = demoData(); state.activeChildId = state.data.children[0].id; showApp(); toast("已进入演示家庭，数据仅保存在本次页面", "success"); });
$("#profileButton").addEventListener("click", showProfile);
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

init();
