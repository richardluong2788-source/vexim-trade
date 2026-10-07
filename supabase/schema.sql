-- ============================================================================
--  VEXIM TRADE – CRM PHÒNG SALE XUẤT KHẨU
--  Chạy toàn bộ file này trong Supabase → SQL Editor (New query → Run)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. NHÀ CUNG CẤP
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text,
  email           text,
  phone           text,
  zalo            text,
  address         text,
  province        text,
  products        text,
  tax_id          text,
  payment_terms   text,
  lead_time_days  integer,
  rating          integer check (rating between 1 and 5),
  notes           text,
  status          text not null default 'active' check (status in ('active','paused')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists suppliers_name_idx on public.suppliers (name);

-- ---------------------------------------------------------------------------
-- 2. BUYER  (mỗi buyer = một đơn trong pipeline)
-- ---------------------------------------------------------------------------
create table if not exists public.buyers (
  id                        uuid primary key default gen_random_uuid(),
  company                   text not null,
  contact_name              text,
  email                     text,
  cc_emails                 text,
  phone                     text,
  country                   text,
  website                   text,
  product                   text,
  spec                      text,
  quantity                  text,
  target_price              text,
  incoterm                  text,
  port                      text,
  expected_ship_date        date,
  deal_value                numeric(14,2),
  -- NULL = chưa chọn nhà cung cấp (bình thường ở giai đoạn đầu)
  supplier_id               uuid references public.suppliers(id) on delete set null,
  -- Ẩn danh buyer trong email gửi NCC (mặc định: ẩn)
  hide_buyer_from_supplier  boolean not null default true,
  stage                     text not null default 'lead' check (stage in
                              ('lead','contacted','quoted','negotiation',
                               'confirmed','production','shipping','completed','lost')),
  owner                     text,
  source                    text,
  priority                  text not null default 'normal' check (priority in ('low','normal','high')),
  next_action               text,
  next_action_date          date,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists buyers_stage_idx    on public.buyers (stage);
create index if not exists buyers_supplier_idx on public.buyers (supplier_id);
create index if not exists buyers_owner_idx    on public.buyers (owner);
create index if not exists buyers_updated_idx  on public.buyers (updated_at desc);

-- ---------------------------------------------------------------------------
-- 3. LỊCH SỬ HOẠT ĐỘNG
-- ---------------------------------------------------------------------------
create table if not exists public.buyer_activities (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.buyers(id) on delete cascade,
  type        text not null check (type in
                ('created','updated','stage_change','supplier_change','note','email')),
  from_stage  text,
  to_stage    text,
  message     text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists activities_buyer_idx on public.buyer_activities (buyer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. NHẬT KÝ EMAIL
-- ---------------------------------------------------------------------------
create table if not exists public.email_logs (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.buyers(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  stage       text not null,
  direction   text not null check (direction in ('buyer','supplier','both')),
  subject     text not null,
  recipients  text[] not null default '{}',
  body_html   text not null,
  status      text not null check (status in ('sent','failed','simulated')),
  provider    text not null default 'resend',
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists email_logs_buyer_idx  on public.email_logs (buyer_id, created_at desc);
create index if not exists email_logs_stage_idx  on public.email_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. TỰ ĐỘNG CẬP NHẬT updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists buyers_touch on public.buyers;
create trigger buyers_touch before update on public.buyers
  for each row execute function public.touch_updated_at();

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. QUYỀN (app dùng service role key ở server-side)
--    Nếu bạn bật RLS, chạy thêm phần dưới và thay policy cho phù hợp.
-- ---------------------------------------------------------------------------
-- alter table public.suppliers        enable row level security;
-- alter table public.buyers           enable row level security;
-- alter table public.buyer_activities enable row level security;
-- alter table public.email_logs       enable row level security;
--
-- create policy "service role full access" on public.buyers
--   for all to service_role using (true) with check (true);
-- (lặp lại cho suppliers, buyer_activities, email_logs)
