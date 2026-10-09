-- dunocoin · Supabase 数据库初始化
-- 在 Supabase Dashboard > SQL Editor 中一次性执行。

create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','child')),
  display_name text not null check (char_length(display_name) between 1 and 30),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 20),
  avatar text not null default '⭐',
  cover_image text,
  age smallint not null check (age between 3 and 18),
  balance integer not null default 0 check (balance >= 0),
  level integer not null default 1 check (level >= 1),
  created_at timestamptz not null default now()
);

-- 兼容已经建立过 children 表的项目：为儿童首页封面补充可空字段。
alter table public.children add column if not exists cover_image text;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  description text not null default '' check (char_length(description) <= 240),
  type text not null check (type in ('main','assist')),
  cycle text not null check (cycle in ('daily','weekly','custom')),
  reward_points integer not null default 0 check (reward_points between 0 and 10000),
  penalty_points integer not null default 0 check (penalty_points between 0 and 10000),
  assessment_criteria text not null default '' check (char_length(assessment_criteria) <= 180),
  icon text not null default '🎯',
  active boolean not null default true,
  next_due_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assist_has_no_penalty check (type = 'main' or penalty_points = 0)
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  due_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending','approved','rejected','missed')),
  note text not null default '' check (char_length(note) <= 240),
  completion_pct smallint check (completion_pct between 0 and 100),
  awarded_points integer,
  review_note text check (char_length(review_note) <= 240),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (task_id, child_id, due_date)
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  description text not null check (char_length(description) between 1 and 240),
  cost_points integer not null check (cost_points between 1 and 100000),
  available_time text not null check (char_length(available_time) between 1 and 80),
  conditions text not null default '' check (char_length(conditions) <= 180),
  emoji text not null default '🎁',
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete cascade,
  cost_points integer not null check (cost_points > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','fulfilled')),
  review_note text check (char_length(review_note) <= 240),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  source_type text not null check (source_type in ('initial','manual','task','penalty','redemption','reversal')),
  description text not null check (char_length(description) between 1 and 160),
  task_submission_id uuid references public.task_submissions(id) on delete set null,
  redemption_id uuid references public.reward_redemptions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email text,
  role text not null check (role in ('admin','child')),
  display_name text not null check (char_length(display_name) between 1 and 30),
  child_id uuid references public.children(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_members_family on public.family_members(family_id);
create index if not exists idx_children_family on public.children(family_id);
create index if not exists idx_tasks_child on public.tasks(child_id, active);
create index if not exists idx_tasks_due on public.tasks(family_id, next_due_at) where active and type = 'main';
create index if not exists idx_submissions_child on public.task_submissions(child_id, submitted_at desc);
create index if not exists idx_rewards_family on public.rewards(family_id, active);
create index if not exists idx_redemptions_child on public.reward_redemptions(child_id, created_at desc);
create index if not exists idx_ledger_child on public.point_ledger(child_id, created_at desc);

-- 安全辅助函数使用 security definer，避免 family_members 自身策略递归。
create or replace function public.is_family_member(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.family_members m where m.family_id = p_family_id and m.user_id = auth.uid()) $$;

create or replace function public.is_family_admin(p_family_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.family_members m where m.family_id = p_family_id and m.user_id = auth.uid() and m.role = 'admin') $$;

create or replace function public.is_linked_child(p_child_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.children c where c.id = p_child_id and c.user_id = auth.uid()) $$;

revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.is_family_admin(uuid) from public;
revoke all on function public.is_linked_child(uuid) from public;
grant execute on function public.is_family_member(uuid), public.is_family_admin(uuid), public.is_linked_child(uuid) to authenticated;

-- 注册触发器：有有效邀请码则加入对应家庭，否则自动创建新家庭。
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.family_invitations%rowtype;
  v_family_id uuid;
  v_display text;
  v_token uuid;
begin
  v_display := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), '家庭管理员'), 30);
  begin
    v_token := nullif(new.raw_user_meta_data ->> 'invite_token', '')::uuid;
  exception when others then
    v_token := null;
  end;

  if v_token is not null then
    select * into v_invite from public.family_invitations
    where token = v_token and accepted_at is null and expires_at > now()
      and (email is null or lower(email) = lower(new.email))
    for update;
  end if;

  if found then
    insert into public.family_members(family_id, user_id, role, display_name)
    values(v_invite.family_id, new.id, v_invite.role, coalesce(nullif(v_invite.display_name,''), v_display));
    if v_invite.role = 'child' and v_invite.child_id is not null then
      update public.children set user_id = new.id where id = v_invite.child_id and family_id = v_invite.family_id and user_id is null;
    end if;
    update public.family_invitations set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
  else
    insert into public.families(name, created_by) values(v_display || '的家庭', new.id) returning id into v_family_id;
    insert into public.family_members(family_id, user_id, role, display_name) values(v_family_id, new.id, 'admin', v_display);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 创建/更新任务时自动设置下个结算时间。
create or replace function public.set_task_due_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  if new.type = 'assist' then new.penalty_points := 0; new.next_due_at := null;
  elsif new.next_due_at is null then
    if new.cycle = 'weekly' then new.next_due_at := date_trunc('week', now()) + interval '7 days' - interval '1 second';
    else new.next_due_at := date_trunc('day', now()) + interval '1 day' - interval '1 second'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists before_task_write on public.tasks;
create trigger before_task_write before insert or update on public.tasks for each row execute function public.set_task_due_at();

create or replace function public.touch_reward_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists before_reward_write on public.rewards;
create trigger before_reward_write before update on public.rewards for each row execute function public.touch_reward_updated_at();

-- 已有账号通过邀请链接登录时加入家庭。只有空白的个人家庭可以自动迁移，
-- 已有儿童或其他成员的家庭不会被隐式拆散。
create or replace function public.accept_family_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_inv public.family_invitations%rowtype; v_old_member public.family_members%rowtype; v_member_count integer; v_child_count integer;
begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  select * into v_inv from public.family_invitations where token=p_token for update;
  if v_inv.id is null then raise exception '邀请链接不存在'; end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by=auth.uid() then return v_inv.family_id; end if;
    raise exception '邀请链接已被使用';
  end if;
  if v_inv.expires_at <= now() then raise exception '邀请链接已过期'; end if;
  if v_inv.email is not null and lower(v_inv.email) <> lower(coalesce(auth.jwt()->>'email','')) then raise exception '该邀请绑定了其他邮箱'; end if;

  select * into v_old_member from public.family_members where user_id=auth.uid();
  if v_old_member.id is not null and v_old_member.family_id <> v_inv.family_id then
    select count(*) into v_member_count from public.family_members where family_id=v_old_member.family_id;
    select count(*) into v_child_count from public.children where family_id=v_old_member.family_id;
    if v_old_member.role <> 'admin' or v_member_count <> 1 or v_child_count <> 0 then
      raise exception '当前账号已有使用中的家庭，无法自动迁移';
    end if;
    delete from public.families where id=v_old_member.family_id and created_by=auth.uid();
  end if;

  insert into public.family_members(family_id,user_id,role,display_name)
  values(v_inv.family_id,auth.uid(),v_inv.role,v_inv.display_name)
  on conflict (user_id) do nothing;
  if v_inv.role='child' and v_inv.child_id is not null then
    update public.children set user_id=auth.uid() where id=v_inv.child_id and family_id=v_inv.family_id and user_id is null;
  end if;
  update public.family_invitations set accepted_at=now(),accepted_by=auth.uid() where id=v_inv.id;
  return v_inv.family_id;
end;
$$;

-- 开户：余额与第一笔流水在同一事务中生成。
create or replace function public.create_child_account(p_name text, p_avatar text, p_age integer, p_initial_balance integer default 0)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_family uuid; v_child uuid;
begin
  select family_id into v_family from public.family_members where user_id = auth.uid() and role = 'admin';
  if v_family is null then raise exception '仅家庭管理员可以开户'; end if;
  if p_initial_balance < 0 or p_initial_balance > 100000 then raise exception '初始积分不合法'; end if;
  insert into public.children(family_id,name,avatar,age,balance,level)
  values(v_family, trim(p_name), coalesce(nullif(p_avatar,''),'⭐'), p_age, p_initial_balance, greatest(1, floor(p_initial_balance / 100.0)::int + 1)) returning id into v_child;
  if p_initial_balance > 0 then
    insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,created_by)
    values(v_family,v_child,p_initial_balance,p_initial_balance,'initial','开户初始积分',auth.uid());
  end if;
  return v_child;
end;
$$;

create or replace function public.adjust_child_points(p_child_id uuid, p_amount integer, p_description text)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_child public.children%rowtype; v_new_balance integer;
begin
  select * into v_child from public.children where id = p_child_id for update;
  if not public.is_family_admin(v_child.family_id) then raise exception '无管理员权限'; end if;
  if p_amount = 0 or abs(p_amount) > 100000 then raise exception '积分数值不合法'; end if;
  v_new_balance := v_child.balance + p_amount;
  if v_new_balance < 0 then raise exception '积分余额不足'; end if;
  update public.children set balance = v_new_balance, level = greatest(1, floor(v_new_balance / 100.0)::int + 1) where id = p_child_id;
  insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,created_by)
  values(v_child.family_id,p_child_id,p_amount,v_new_balance,'manual',left(trim(p_description),160),auth.uid());
  return v_new_balance;
end;
$$;

create or replace function public.review_task_submission(p_submission_id uuid, p_completion_pct integer, p_review_note text default null, p_approve boolean default true)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_sub public.task_submissions%rowtype; v_task public.tasks%rowtype; v_child public.children%rowtype; v_points integer := 0; v_balance integer;
begin
  select * into v_sub from public.task_submissions where id = p_submission_id for update;
  if v_sub.id is null or not public.is_family_admin(v_sub.family_id) then raise exception '无审核权限'; end if;
  if v_sub.status <> 'pending' then raise exception '该任务已处理'; end if;
  if p_completion_pct < 0 or p_completion_pct > 100 then raise exception '完成度应为 0 到 100'; end if;
  select * into v_task from public.tasks where id = v_sub.task_id;
  if v_task.family_id <> v_sub.family_id or v_task.child_id <> v_sub.child_id then raise exception '任务与儿童账户不匹配'; end if;
  if p_approve then
    select * into v_child from public.children where id = v_sub.child_id for update;
    v_points := round(v_task.reward_points * p_completion_pct / 100.0);
    v_balance := v_child.balance + v_points;
    update public.children set balance = v_balance, level = greatest(1, floor(v_balance / 100.0)::int + 1) where id = v_child.id;
    update public.task_submissions set status='approved',completion_pct=p_completion_pct,awarded_points=v_points,review_note=p_review_note,reviewed_at=now(),reviewed_by=auth.uid() where id=p_submission_id;
    if v_points > 0 then
      insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,task_submission_id,created_by)
      values(v_sub.family_id,v_sub.child_id,v_points,v_balance,'task','完成：'||v_task.name,p_submission_id,auth.uid());
    end if;
  else
    update public.task_submissions set status='rejected',completion_pct=0,awarded_points=0,review_note=p_review_note,reviewed_at=now(),reviewed_by=auth.uid() where id=p_submission_id;
  end if;
  return v_points;
end;
$$;

create or replace function public.review_reward_redemption(p_redemption_id uuid, p_approve boolean, p_review_note text default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_red public.reward_redemptions%rowtype; v_reward public.rewards%rowtype; v_child public.children%rowtype; v_balance integer;
begin
  select * into v_red from public.reward_redemptions where id = p_redemption_id for update;
  if v_red.id is null or not public.is_family_admin(v_red.family_id) then raise exception '无审核权限'; end if;
  if v_red.status <> 'pending' then raise exception '该兑换已处理'; end if;
  select * into v_reward from public.rewards where id = v_red.reward_id and family_id = v_red.family_id;
  if v_reward.id is null or not exists(select 1 from public.children where id=v_red.child_id and family_id=v_red.family_id) then raise exception '奖励与儿童账户不匹配'; end if;
  if p_approve then
    select * into v_child from public.children where id = v_red.child_id for update;
    v_balance := v_child.balance - v_reward.cost_points;
    if v_balance < 0 then raise exception '积分余额不足'; end if;
    update public.children set balance=v_balance,level=greatest(1,floor(v_balance/100.0)::int+1) where id=v_child.id;
    update public.reward_redemptions set status='approved',cost_points=v_reward.cost_points,review_note=p_review_note,reviewed_at=now(),reviewed_by=auth.uid() where id=p_redemption_id;
    insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,redemption_id,created_by)
    values(v_red.family_id,v_red.child_id,-v_reward.cost_points,v_balance,'redemption','兑换：'||v_reward.name,p_redemption_id,auth.uid());
  else
    update public.reward_redemptions set status='rejected',review_note=p_review_note,reviewed_at=now(),reviewed_by=auth.uid() where id=p_redemption_id;
    select balance into v_balance from public.children where id=v_red.child_id;
  end if;
  return v_balance;
end;
$$;

-- 幂等的逾期主线扣分函数。页面加载时调用；也可由 Supabase Cron 定时调用。
create or replace function public.settle_overdue_main_tasks(p_family_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_task public.tasks%rowtype; v_child public.children%rowtype; v_balance integer; v_count integer := 0; v_due_date date;
begin
  if not public.is_family_member(p_family_id) then raise exception '无家庭访问权限'; end if;
  for v_task in select * from public.tasks where family_id=p_family_id and type='main' and active and next_due_at < now() for update loop
    v_due_date := v_task.next_due_at::date;
    if not exists(select 1 from public.task_submissions where task_id=v_task.id and due_date=v_due_date and status='approved') then
      if not exists(select 1 from public.task_submissions where task_id=v_task.id and due_date=v_due_date and status='missed') then
        select * into v_child from public.children where id=v_task.child_id for update;
        v_balance := greatest(0, v_child.balance - v_task.penalty_points);
        insert into public.task_submissions(family_id,task_id,child_id,due_date,status,note,completion_pct,awarded_points,reviewed_at)
        values(v_task.family_id,v_task.id,v_task.child_id,v_due_date,'missed','周期内未完成',0,-least(v_task.penalty_points,v_child.balance),now());
        if v_balance <> v_child.balance then
          update public.children set balance=v_balance,level=greatest(1,floor(v_balance/100.0)::int+1) where id=v_child.id;
          insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,created_by)
          values(v_task.family_id,v_task.child_id,v_balance-v_child.balance,v_balance,'penalty','未完成：'||v_task.name,null);
        end if;
        v_count := v_count + 1;
      end if;
    end if;
    update public.tasks set next_due_at = case when cycle='weekly' then next_due_at + interval '7 days' else next_due_at + interval '1 day' end where id=v_task.id;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.create_child_account(text,text,integer,integer) from public;
revoke all on function public.adjust_child_points(uuid,integer,text) from public;
revoke all on function public.review_task_submission(uuid,integer,text,boolean) from public;
revoke all on function public.review_reward_redemption(uuid,boolean,text) from public;
revoke all on function public.settle_overdue_main_tasks(uuid) from public;
revoke all on function public.accept_family_invitation(uuid) from public;
grant execute on function public.create_child_account(text,text,integer,integer), public.adjust_child_points(uuid,integer,text), public.review_task_submission(uuid,integer,text,boolean), public.review_reward_redemption(uuid,boolean,text), public.settle_overdue_main_tasks(uuid), public.accept_family_invitation(uuid) to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.point_ledger enable row level security;
alter table public.family_invitations enable row level security;

create policy families_select on public.families for select to authenticated using (public.is_family_member(id));
create policy families_update on public.families for update to authenticated using (public.is_family_admin(id)) with check (public.is_family_admin(id));

create policy members_select on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy members_update on public.family_members for update to authenticated using (public.is_family_admin(family_id)) with check (public.is_family_admin(family_id));
create policy members_delete on public.family_members for delete to authenticated using (public.is_family_admin(family_id) and user_id <> auth.uid());

create policy children_select on public.children for select to authenticated using (public.is_family_admin(family_id) or user_id = auth.uid());
create policy children_update on public.children for update to authenticated using (public.is_family_admin(family_id)) with check (public.is_family_admin(family_id));
create policy children_delete on public.children for delete to authenticated using (public.is_family_admin(family_id));

create policy tasks_select on public.tasks for select to authenticated using (public.is_family_admin(family_id) or public.is_linked_child(child_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (public.is_family_admin(family_id) and exists(select 1 from public.children c where c.id=tasks.child_id and c.family_id=tasks.family_id));
create policy tasks_update on public.tasks for update to authenticated using (public.is_family_admin(family_id)) with check (public.is_family_admin(family_id) and exists(select 1 from public.children c where c.id=tasks.child_id and c.family_id=tasks.family_id));
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_family_admin(family_id));

create policy submissions_select on public.task_submissions for select to authenticated using (public.is_family_admin(family_id) or public.is_linked_child(child_id));
create policy submissions_insert on public.task_submissions for insert to authenticated with check (public.is_linked_child(child_id) and exists(select 1 from public.tasks t where t.id=task_submissions.task_id and t.child_id=task_submissions.child_id and t.family_id=task_submissions.family_id and t.active));

create policy rewards_select on public.rewards for select to authenticated using (public.is_family_member(family_id));
create policy rewards_insert on public.rewards for insert to authenticated with check (public.is_family_admin(family_id));
create policy rewards_update on public.rewards for update to authenticated using (public.is_family_admin(family_id)) with check (public.is_family_admin(family_id));
create policy rewards_delete on public.rewards for delete to authenticated using (public.is_family_admin(family_id));

create policy redemptions_select on public.reward_redemptions for select to authenticated using (public.is_family_admin(family_id) or public.is_linked_child(child_id));
create policy redemptions_insert on public.reward_redemptions for insert to authenticated with check (public.is_linked_child(child_id) and status='pending' and exists(select 1 from public.rewards r where r.id=reward_redemptions.reward_id and r.family_id=reward_redemptions.family_id and r.active and r.cost_points=reward_redemptions.cost_points));

create policy ledger_select on public.point_ledger for select to authenticated using (public.is_family_admin(family_id) or public.is_linked_child(child_id));

create policy invitations_select on public.family_invitations for select to authenticated using (public.is_family_admin(family_id));
create policy invitations_insert on public.family_invitations for insert to authenticated with check (public.is_family_admin(family_id) and created_by=auth.uid());
create policy invitations_update on public.family_invitations for update to authenticated using (public.is_family_admin(family_id)) with check (public.is_family_admin(family_id));
create policy invitations_delete on public.family_invitations for delete to authenticated using (public.is_family_admin(family_id));

-- 仅暴露真正需要的表权限；余额和流水写入由 RPC 完成。
grant select on public.families to authenticated;
grant update (name) on public.families to authenticated;
grant select, update, delete on public.family_members to authenticated;
grant select, delete on public.children to authenticated;
grant update (name, avatar, cover_image, age, user_id) on public.children to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.task_submissions to authenticated;
grant select, insert, update, delete on public.rewards to authenticated;
grant select, insert on public.reward_redemptions to authenticated;
grant select on public.point_ledger to authenticated;
grant select, insert, update, delete on public.family_invitations to authenticated;

-- 可选：让数据变更支持 Supabase Realtime。重复执行时若已存在会报提示，可忽略。
do $$ begin
  alter publication supabase_realtime add table public.tasks, public.task_submissions, public.rewards, public.reward_redemptions;
exception when duplicate_object then null; end $$;

-- 私有头像存储桶。对象路径必须为：家庭ID/文件名。
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('child-avatars','child-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

create policy avatar_select on storage.objects for select to authenticated
using (bucket_id='child-avatars' and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy avatar_insert on storage.objects for insert to authenticated
with check (bucket_id='child-avatars' and public.is_family_admin(((storage.foldername(name))[1])::uuid));
create policy avatar_update on storage.objects for update to authenticated
using (bucket_id='child-avatars' and public.is_family_admin(((storage.foldername(name))[1])::uuid))
with check (bucket_id='child-avatars' and public.is_family_admin(((storage.foldername(name))[1])::uuid));
create policy avatar_delete on storage.objects for delete to authenticated
using (bucket_id='child-avatars' and public.is_family_admin(((storage.foldername(name))[1])::uuid));
