-- 高雄夜市美食地圖 schema（含收藏去重硬化）
-- 整檔冪等：可重複執行不會 mutate data / 不會重複 grant
-- 在 Supabase Dashboard → SQL Editor 貼整段，或 `supabase db push` 自動套用

-- 1. restaurants 表（美食店家）
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  location text not null,
  avg_rating numeric(3,2) not null default 0 check (avg_rating >= 0 and avg_rating <= 5),
  created_at timestamptz not null default now()
);

create index if not exists restaurants_avg_rating_created_idx
  on public.restaurants (avg_rating desc, created_at desc);

-- 2. reviews 表（一對多：一家餐廳有多則評論）
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now()
);

create index if not exists reviews_restaurant_id_idx
  on public.reviews (restaurant_id);

-- 3. 收藏去重表：一個 anon_id 對一家餐廳只能收藏一次（DB 端強制）
create table if not exists public.favorites (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  anon_id text not null,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, anon_id)
);

create index if not exists favorites_restaurant_id_idx
  on public.favorites (restaurant_id);

-- 4. 開啟 Realtime（idempotent：判斷表是否已在 publication 內再加）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'restaurants'
  ) then
    execute 'alter publication supabase_realtime add table public.restaurants';
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'reviews'
  ) then
    execute 'alter publication supabase_realtime add table public.reviews';
  end if;
end $$;

-- 5. RLS
alter table public.restaurants enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
-- ⚠️ favorites 故意「不給任何 policy」→ anon 完全摸不到，
--    只有下方 SECURITY DEFINER 函式以 owner (postgres) 身份能寫入

drop policy if exists "anyone can read restaurants" on public.restaurants;
create policy "anyone can read restaurants"
  on public.restaurants for select
  using (true);

drop policy if exists "anyone can read reviews" on public.reviews;
create policy "anyone can read reviews"
  on public.reviews for select
  using (true);

drop policy if exists "anyone can insert reviews" on public.reviews;
create policy "anyone can insert reviews"
  on public.reviews for insert
  with check (true);

-- ⚠️ 不再給 anon 直接 UPDATE 權限 — 收藏一律走下方 RPC

-- 6. RPC：原子地寫去重 row + 更新 avg_rating
-- SECURITY DEFINER → 以 owner (postgres) 身份執行，能寫 favorites（anon 無 policy）
-- set search_path 鎖死 → 防 search_path injection（SECURITY DEFINER 必備）
create or replace function public.add_favorite(
  rid uuid,
  anon text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.favorites (restaurant_id, anon_id)
  values (rid, anon)
  on conflict do nothing;
  
  return found;
end;
$$;

create or replace function public.update_restaurant_rating(
  rid uuid
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_avg numeric;
begin
  select coalesce(avg(rating::numeric), 0)
    into new_avg
    from public.reviews
   where restaurant_id = rid;
  
  update public.restaurants
     set avg_rating = new_avg
   where id = rid;
  
  return new_avg;
end;
$$;

revoke all on function public.add_favorite(uuid, text) from public;
grant execute on function public.add_favorite(uuid, text) to anon, authenticated;

revoke all on function public.update_restaurant_rating(uuid) from public;
grant execute on function public.update_restaurant_rating(uuid) to anon, authenticated;

comment on function public.add_favorite(uuid, text) is
  'Atomically insert dedup row to favorites. Anon-callable via supabase.rpc().';
comment on function public.update_restaurant_rating(uuid) is
  'Recalculate avg_rating for a restaurant based on all reviews. Anon-callable via supabase.rpc().';

-- 7. seed：高雄知名夜市美食
insert into public.restaurants (name, description, location, avg_rating)
values 
  ('阿婆冰淇淋', '六合夜市必吃排隊甜點，手工冰淇淋清涼又濃郁', '六合夜市', 4.7),
  ('木記羊肉爐', '瑞豐夜市人氣湯頭，溫補暖呼呼，冬季首選', '瑞豐夜市', 4.5),
  ('鮮之屋日式炸雞', '自強夜市道地日式香脆炸雞，咬下去多汁超滿足', '自強夜市', 4.8)
on conflict do nothing;

-- 新增評論示範
insert into public.reviews (restaurant_id, content, rating)
select id, '阿婆冰淇淋真的絕了，香草濃到爆表！', 5 from public.restaurants where name = '阿婆冰淇淋' limit 1
union all
select id, '冬天必吃，湯頭超讚，羊肉嫩到不行', 5 from public.restaurants where name = '木記羊肉爐' limit 1
union all
select id, '炸得完美酥脆，咬下去起司牽絲，一定要試', 5 from public.restaurants where name = '鮮之屋日式炸雞' limit 1
on conflict do nothing;
