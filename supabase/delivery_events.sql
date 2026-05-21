-- ============================================================
-- DELIVERY EVENTS — Historial de Entregas
-- Ejecuta este SQL en Supabase > SQL Editor
-- ============================================================

-- 1. Crear tabla de eventos de entrega
create table if not exists public.delivery_events (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,  -- 'in_delivery' | 'delivered'
  notes       text,
  changed_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- 2. Índices
create index if not exists idx_delivery_events_order   on public.delivery_events(order_id);
create index if not exists idx_delivery_events_created on public.delivery_events(created_at desc);

-- 3. RLS
alter table public.delivery_events enable row level security;

create policy "delivery_events_select_admin"
  on public.delivery_events for select
  using (public.get_my_role() = 'admin');

create policy "delivery_events_insert_admin"
  on public.delivery_events for insert
  with check (public.get_my_role() = 'admin');

-- 4. Verificar
select * from public.delivery_events order by created_at desc limit 10;
