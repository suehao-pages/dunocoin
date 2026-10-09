-- dunocoin 已有项目升级：儿童资料编辑与首页封面图
-- 在 Supabase Dashboard > SQL Editor 中执行一次。

alter table public.children
  add column if not exists cover_image text;

grant update (name, avatar, cover_image, age, user_id)
  on public.children to authenticated;

-- 头像仍限制 2MB；同一私有桶中的首页封面允许最大 5MB。
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'child-avatars';
