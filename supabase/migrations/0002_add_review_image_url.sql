-- 新增 reviews.image_url 欄位，用於儲存評論附圖 URL 或 Data URL
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  rating integer not null check (rating >= 1 and rating <= 5),
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.reviews add column if not exists image_url text;

create index if not exists reviews_restaurant_id_idx
  on public.reviews (restaurant_id);
