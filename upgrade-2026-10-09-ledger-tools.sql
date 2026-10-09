-- dunocoin 已有项目升级：积分时间窗口与安全流水更正
-- 原流水不删除；修改/撤销通过追加冲正记录完成。

alter table public.point_ledger
  add column if not exists reference_ledger_id uuid references public.point_ledger(id) on delete restrict;

alter table public.point_ledger drop constraint if exists point_ledger_amount_check;
alter table public.point_ledger
  add constraint point_ledger_amount_check check (amount <> 0 or source_type = 'reversal');

create unique index if not exists idx_ledger_single_correction
  on public.point_ledger(reference_ledger_id)
  where reference_ledger_id is not null;

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
  insert into public.point_ledger(family_id,child_id,amount,balance_after,source_type,description,created_by,reference_ledger_id)
  values(v_ledger.family_id,v_ledger.child_id,v_delta,v_new_balance,'reversal',
    case when p_void then left('撤销：'||v_ledger.description,160) else left('更正为 '||(case when p_new_amount >= 0 then '+' else '' end)||p_new_amount||'：'||v_description,160) end,
    auth.uid(),v_ledger.id);
  return v_new_balance;
end;
$$;

revoke all on function public.correct_manual_ledger(uuid,integer,text,boolean) from public;
grant execute on function public.correct_manual_ledger(uuid,integer,text,boolean) to authenticated;
