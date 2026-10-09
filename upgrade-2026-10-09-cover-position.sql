-- dunocoin 已有项目升级：首页封面裁切位置
-- 已执行过 child-cover 升级的项目，只需再执行本文件一次。

alter table public.children
  add column if not exists cover_position_x smallint not null default 50,
  add column if not exists cover_position_y smallint not null default 50;

do $$ begin
  alter table public.children add constraint children_cover_position_x_check check (cover_position_x between 0 and 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.children add constraint children_cover_position_y_check check (cover_position_y between 0 and 100);
exception when duplicate_object then null; end $$;

grant update (cover_position_x, cover_position_y)
  on public.children to authenticated;
