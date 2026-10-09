-- dunocoin 已有项目升级：首页任务奖励、积分兑换与删除流水隐藏

alter table public.point_ledger
  add column if not exists reference_ledger_id uuid references public.point_ledger(id) on delete restrict;

alter table public.point_ledger
  add column if not exists correction_kind text check (correction_kind in ('edit','void'));

alter table public.point_ledger drop constraint if exists point_ledger_amount_check;
alter table public.point_ledger
  add constraint point_ledger_amount_check check (amount <> 0 or source_type = 'reversal');

create unique index if not exists idx_ledger_single_correction
  on public.point_ledger(reference_ledger_id)
  where reference_ledger_id is not null;

update public.point_ledger
set correction_kind = case when description like '撤销：%' then 'void' else 'edit' end
where source_type='reversal' and reference_ledger_id is not null and correction_kind is null;

create or replace function public.correct_manual_ledger(p_ledger_id uuid, p_new_amount integer, p_new_description text, p_void boolean default false)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_ledger public.point_ledger%rowtype; v_child public.children%rowtype; v_delta integer; v_new_balance integer; v_description text;
begin
  select * into v_ledger from public.point_ledger where id = p_ledger_id for update;
  if v_ledger.id is null then raise exception '流水不存在'; end if;
  if not public.is_family_admin(v_ledger.family_id) then raise exception '无管理员权限'; end if;
  if v_ledger.source_type <> 'manual' then raise exception '只有手动积分流水可以调整'; end if;
  if exists(select 1 from public.point_ledger where reference_ledger_id = v_ledger.id) then raise exception '这笔流水已经更正过了'; end if;
  if not p_void and (p_new_amount = 0 or abs(p_new_amount) > 100000) then raise exception '修正积分数值不合法'; end if;
  v_description := trim(coalesce(p_new_description, ''));
  if not p_void and (char_length(v_description) < 1 or char_length(v_description) > 120) then raise exception '修正说明长度不合法'; end if;
  select * into v_child from public.children where id = v_ledger.child_id and family_id = v_ledger.family_id for update;
  v_delta := (case when p_void then 0 else p_new_amount end) - v_ledger.amount;
  v_new_balance := v_child.balance + v_delta;
  if v_new_balance < 0 then raise exception '更正后积分余额不能小于 0'; end if;
  update public.children set balance = v_new_balance, level = greatest(1, floor(v_new_balance / 100.0)::int + 1) where id = v_child.id;
  insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,created_by,reference_ledger_id,correction_kind)
  values(v_ledger.family_id,v_ledger.child_id,v_delta,v_new_balance,'reversal',
    case when p_void then left('撤销：'||v_ledger.description,160) else left('更正为 '||(case when p_new_amount >= 0 then '+' else '' end)||p_new_amount||'：'||v_description,160) end,
    auth.uid(),v_ledger.id,case when p_void then 'void' else 'edit' end);
  return v_new_balance;
end;
$$;

create or replace function public.grant_task_reward(p_task_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_task public.tasks%rowtype; v_child public.children%rowtype; v_submission public.task_submissions%rowtype; v_balance integer; v_due_date date;
begin
  select * into v_task from public.tasks where id = p_task_id and active for update;
  if v_task.id is null then raise exception '任务不存在或已停用'; end if;
  if v_task.reward_points <= 0 then raise exception '该任务没有可发放的奖励积分'; end if;
  if not public.is_family_admin(v_task.family_id) then raise exception '无管理员权限'; end if;
  select * into v_child from public.children where id = v_task.child_id and family_id = v_task.family_id for update;
  v_due_date := (now() at time zone 'Europe/Berlin')::date;
  select * into v_submission from public.task_submissions where task_id=v_task.id and child_id=v_child.id and due_date=v_due_date for update;
  if v_submission.status = 'approved' then raise exception '这个任务今天已经发放过奖励'; end if;
  if v_submission.id is null then
    insert into public.task_submissions(family_id,task_id,child_id,due_date,status,note,completion_pct,awarded_points,review_note,reviewed_at,reviewed_by)
    values(v_task.family_id,v_task.id,v_child.id,v_due_date,'approved','家长直接发放任务奖励',100,v_task.reward_points,'快捷发放',now(),auth.uid())
    returning * into v_submission;
  else
    update public.task_submissions set status='approved',completion_pct=100,awarded_points=v_task.reward_points,review_note='家长快捷发放',reviewed_at=now(),reviewed_by=auth.uid()
    where id=v_submission.id returning * into v_submission;
  end if;
  v_balance := v_child.balance + v_task.reward_points;
  update public.children set balance=v_balance,level=greatest(1,floor(v_balance/100.0)::int+1) where id=v_child.id;
  insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,task_submission_id,created_by)
  values(v_task.family_id,v_child.id,v_task.reward_points,v_balance,'task','任务奖励：'||v_task.name,v_submission.id,auth.uid());
  return v_balance;
end;
$$;

create or replace function public.admin_redeem_reward(p_child_id uuid, p_reward_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_reward public.rewards%rowtype; v_child public.children%rowtype; v_redemption_id uuid; v_balance integer;
begin
  select * into v_reward from public.rewards where id=p_reward_id and active;
  if v_reward.id is null then raise exception '奖励不存在或已停用'; end if;
  if not public.is_family_admin(v_reward.family_id) then raise exception '无管理员权限'; end if;
  select * into v_child from public.children where id=p_child_id and family_id=v_reward.family_id for update;
  if v_child.id is null then raise exception '儿童账户不存在'; end if;
  v_balance := v_child.balance - v_reward.cost_points;
  if v_balance < 0 then raise exception '积分余额不足'; end if;
  insert into public.reward_redemptions(family_id,reward_id,child_id,cost_points,status,review_note,reviewed_at,reviewed_by)
  values(v_reward.family_id,v_reward.id,v_child.id,v_reward.cost_points,'approved','管理员直接完成兑换',now(),auth.uid())
  returning id into v_redemption_id;
  update public.children set balance=v_balance,level=greatest(1,floor(v_balance/100.0)::int+1) where id=v_child.id;
  insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,redemption_id,created_by)
  values(v_reward.family_id,v_child.id,-v_reward.cost_points,v_balance,'redemption','积分兑换：'||v_reward.name,v_redemption_id,auth.uid());
  return v_balance;
end;
$$;

revoke all on function public.correct_manual_ledger(uuid,integer,text,boolean) from public;
revoke all on function public.grant_task_reward(uuid) from public;
revoke all on function public.admin_redeem_reward(uuid,uuid) from public;
grant execute on function public.correct_manual_ledger(uuid,integer,text,boolean), public.grant_task_reward(uuid), public.admin_redeem_reward(uuid,uuid) to authenticated;
