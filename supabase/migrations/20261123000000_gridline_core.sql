create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null default '', email text not null default '',
  role text not null default 'technician' check (role in ('admin','supervisor','dispatcher','technician')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  availability text not null default 'available' check (availability in ('available','assigned','off_shift','on_leave')),
  skills text[] not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, phone text, email text, address text not null, latitude double precision, longitude double precision, created_at timestamptz not null default now()
);
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  asset_tag text not null, asset_type text not null, name text not null, location text not null, district text not null,
  latitude double precision, longitude double precision,
  condition text not null default 'unknown' check (condition in ('good','watch','poor','critical','unknown')),
  attributes jsonb not null default '{}', created_at timestamptz not null default now(), unique (company_id, asset_tag)
);
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(), public_id text not null, company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null, asset_id uuid references public.assets(id) on delete set null,
  technician_id uuid references public.technicians(id) on delete set null, created_by uuid references public.profiles(id) on delete set null,
  title text not null, location text not null, district text not null, asset_tag text,
  priority text not null default 'Medium' check (priority in ('Urgent','High','Medium','Low')),
  status text not null default 'Open' check (status in ('Open','En route','On site','In progress','Needs review','Completed','Cancelled')),
  description text not null default '', sla_due_at timestamptz, scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, public_id)
);
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  technician_id uuid references public.technicians(id) on delete set null,
  start_time timestamptz not null, end_time timestamptz not null, route_order integer, created_at timestamptz not null default now(), check (end_time > start_time)
);
create table if not exists public.job_updates (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade, user_id uuid references public.profiles(id) on delete set null,
  status text, notes text not null default '', checklist jsonb not null default '[]', latitude double precision, longitude double precision, created_at timestamptz not null default now()
);
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade, uploaded_by uuid references public.profiles(id) on delete set null,
  file_path text not null, file_name text not null, media_type text not null, created_at timestamptz not null default now()
);
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  signature_path text not null, signer_name text not null, signed_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, message text not null,
  is_read boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, asset_type text not null, version integer not null default 1,
  checklist jsonb not null default '[]', is_active boolean not null default true, created_at timestamptz not null default now(), unique (company_id, name, version)
);
create table if not exists public.inspection_results (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  template_id uuid references public.inspection_templates(id) on delete set null, asset_id uuid references public.assets(id) on delete set null,
  technician_id uuid references public.technicians(id) on delete set null, result jsonb not null default '{}',
  completed_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists work_orders_company_status_idx on public.work_orders(company_id, status, priority);
create index if not exists work_orders_tech_schedule_idx on public.work_orders(technician_id, scheduled_at);
create index if not exists job_updates_work_order_created_idx on public.job_updates(work_order_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read, created_at desc);

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() $$;
create or replace function public.current_company_role() returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.current_technician_id() returns uuid language sql stable security definer set search_path = public
as $$ select id from public.technicians where profile_id = auth.uid() $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.email, '')) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.technicians enable row level security;
alter table public.customers enable row level security;
alter table public.assets enable row level security;
alter table public.work_orders enable row level security;
alter table public.schedules enable row level security;
alter table public.job_updates enable row level security;
alter table public.attachments enable row level security;
alter table public.signatures enable row level security;
alter table public.notifications enable row level security;
alter table public.inspection_templates enable row level security;
alter table public.inspection_results enable row level security;

create policy "members can read their company" on public.companies for select using (id = public.current_company_id());
create policy "members can read profiles in their company" on public.profiles for select using (company_id = public.current_company_id() or id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['technicians','customers','assets','work_orders','schedules','job_updates','attachments','signatures','inspection_templates','inspection_results'] loop
    if t = 'work_orders' then
      execute 'create policy "members can read their work" on public.work_orders for select using (company_id = public.current_company_id() and (public.current_company_role() in (''admin'',''supervisor'',''dispatcher'') or technician_id = public.current_technician_id()))';
      execute 'create policy "assigned technician can update work status" on public.work_orders for update using (company_id = public.current_company_id() and (public.current_company_role() in (''admin'',''supervisor'',''dispatcher'') or technician_id = public.current_technician_id())) with check (company_id = public.current_company_id() and (public.current_company_role() in (''admin'',''supervisor'',''dispatcher'') or technician_id = public.current_technician_id()))';
    else
      execute format('create policy "company members can read %1$s" on public.%1$I for select using (company_id = public.current_company_id())', t);
    end if;
    execute format('create policy "dispatch can add %1$s" on public.%1$I for insert with check (company_id = public.current_company_id() and public.current_company_role() in (''admin'',''supervisor'',''dispatcher''))', t);
    if t <> 'work_orders' then
      execute format('create policy "dispatch can update %1$s" on public.%1$I for update using (company_id = public.current_company_id() and public.current_company_role() in (''admin'',''supervisor'',''dispatcher'')) with check (company_id = public.current_company_id() and public.current_company_role() in (''admin'',''supervisor'',''dispatcher''))', t);
    end if;
    execute format('create policy "dispatch can delete %1$s" on public.%1$I for delete using (company_id = public.current_company_id() and public.current_company_role() in (''admin'',''supervisor'',''dispatcher''))', t);
  end loop;
end $$;
create policy "assigned technicians can add job updates" on public.job_updates for insert
with check (company_id = public.current_company_id() and user_id = auth.uid() and exists (select 1 from public.work_orders where id = work_order_id and technician_id = public.current_technician_id()));
create policy "assigned technicians can add attachments" on public.attachments for insert
with check (company_id = public.current_company_id() and uploaded_by = auth.uid() and exists (select 1 from public.work_orders where id = work_order_id and technician_id = public.current_technician_id()));
create policy "assigned technicians can add inspection results" on public.inspection_results for insert
with check (company_id = public.current_company_id() and technician_id = public.current_technician_id() and exists (select 1 from public.work_orders where id = work_order_id and technician_id = public.current_technician_id()));
create policy "users can read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users can update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "company members can add notifications" on public.notifications for insert with check (company_id = public.current_company_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-order-attachments', 'work-order-attachments', false, 12582912, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']) on conflict (id) do nothing;
create policy "company members can view work order files" on storage.objects for select using (bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy "company members can upload work order files" on storage.objects for insert with check (bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy "company members can update work order files" on storage.objects for update using (bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text) with check (bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text);
create policy "company members can delete work order files" on storage.objects for delete using (bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text);

do $$ begin
  alter publication supabase_realtime add table public.work_orders;
exception when duplicate_object then null;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.companies, public.profiles, public.technicians, public.customers, public.assets, public.work_orders, public.schedules, public.job_updates, public.attachments, public.signatures, public.notifications, public.inspection_templates, public.inspection_results to authenticated;
revoke update on public.work_orders from authenticated;
grant update (status, started_at, completed_at, updated_at) on public.work_orders to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_company_role() to authenticated;
grant execute on function public.current_technician_id() to authenticated;
