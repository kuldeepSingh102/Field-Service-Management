-- Self-service onboarding. New accounts can request access to a company;
-- only an approved company admin assigns membership and the requested role.

alter table public.companies
  add column if not exists signup_code text;
update public.companies
set signup_code = encode(gen_random_bytes(12), 'hex')
where signup_code is null;
alter table public.companies
  alter column signup_code set default encode(gen_random_bytes(12), 'hex'),
  alter column signup_code set not null;
create unique index if not exists companies_signup_code_key on public.companies(signup_code);

alter table public.profiles add column if not exists approval_status text;
update public.profiles
set approval_status = case when company_id is not null then 'approved' else 'pending' end
where approval_status is null;
alter table public.profiles alter column approval_status set default 'pending';
alter table public.profiles alter column approval_status set not null;
do $$ begin
  alter table public.profiles add constraint profiles_approval_status_check
    check (approval_status in ('pending','approved','rejected'));
exception when duplicate_object then null;
end $$;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  requester_name text not null default '',
  requester_email text not null,
  requested_role text not null check (requested_role in ('supervisor','technician')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists access_requests_company_status_idx
  on public.access_requests(company_id, status, requested_at desc);
alter table public.access_requests enable row level security;
grant select on public.access_requests to authenticated;
create policy "users read their own access request" on public.access_requests
for select to authenticated using (user_id = auth.uid());
create policy "company admins read access requests" on public.access_requests
for select to authenticated using (
  company_id = public.current_company_id()
  and public.current_company_role() = 'admin'
);

-- Share the company code only through an admin-checked function.
revoke select on public.companies from anon, authenticated;
grant select (id, name, slug, created_at) on public.companies to authenticated;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select company_id from public.profiles
  where id = auth.uid() and approval_status = 'approved'
$$;

create or replace function public.current_company_role()
returns text language sql stable security definer set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and approval_status = 'approved'
$$;

create or replace function public.current_technician_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select t.id
  from public.technicians t
  join public.profiles p on p.id = t.profile_id
  where t.profile_id = auth.uid() and p.approval_status = 'approved'
$$;

create or replace function public.complete_signup_request()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_metadata jsonb;
  v_mode text;
  v_company_name text;
  v_company_code text;
  v_requested_role text;
  v_company_id uuid;
  v_slug text;
  v_name text;
  v_email text;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in before completing signup.'; end if;
  select raw_user_meta_data, email into v_metadata, v_email
  from auth.users where id = v_user_id;
  select * into v_profile from public.profiles where id = v_user_id for update;
  if v_profile.id is null then raise exception 'Profile setup is not ready. Try again in a moment.'; end if;
  if v_profile.approval_status = 'approved' and v_profile.company_id is not null then return 'approved'; end if;

  v_mode := v_metadata ->> 'gridline_signup_mode';
  v_name := coalesce(nullif(trim(v_metadata ->> 'name'), ''), 'New user');

  if v_mode = 'create_company' then
    v_company_name := coalesce(nullif(trim(v_metadata ->> 'gridline_company_name'), ''), 'My Utility');
    v_slug := regexp_replace(lower(v_company_name), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then v_slug := 'utility'; end if;
    v_slug := left(v_slug, 48) || '-' || left(v_user_id::text, 8);
    insert into public.companies(name, slug)
    values (v_company_name, v_slug)
    returning id into v_company_id;
    update public.profiles
    set company_id = v_company_id, role = 'admin', approval_status = 'approved',
        name = v_name, email = coalesce(v_email, email), updated_at = now()
    where id = v_user_id;
    return 'approved';
  elsif v_mode = 'join_company' then
    v_company_code := lower(trim(coalesce(v_metadata ->> 'gridline_signup_code', '')));
    v_requested_role := v_metadata ->> 'gridline_requested_role';
    if v_requested_role not in ('supervisor','technician') then
      raise exception 'Choose Supervisor or Technician as your requested role.';
    end if;
    select id into v_company_id from public.companies where lower(signup_code) = v_company_code;
    if v_company_id is null then raise exception 'That company signup code is not valid.'; end if;
    insert into public.access_requests(user_id, company_id, requester_name, requester_email, requested_role, status, requested_at, reviewed_by, reviewed_at)
    values (v_user_id, v_company_id, v_name, coalesce(v_email, ''), v_requested_role, 'pending', now(), null, null)
    on conflict (user_id) do update
      set company_id = excluded.company_id,
          requester_name = excluded.requester_name,
          requester_email = excluded.requester_email,
          requested_role = excluded.requested_role,
          status = 'pending', requested_at = now(), reviewed_by = null, reviewed_at = null;
    update public.profiles
    set company_id = null, role = 'technician', approval_status = 'pending', name = v_name,
        email = coalesce(v_email, email), updated_at = now()
    where id = v_user_id;
    return 'pending';
  end if;

  raise exception 'Signup details are missing. Return to signup and try again.';
end;
$$;

create or replace function public.get_company_signup_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_signup_code text;
begin
  if v_company_id is null or public.current_company_role() <> 'admin' then
    raise exception 'Only an approved company admin can view the signup code.';
  end if;
  select signup_code into v_signup_code from public.companies where id = v_company_id;
  return v_signup_code;
end;
$$;

create or replace function public.review_company_access_request(p_request_id uuid, p_decision text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_request public.access_requests%rowtype;
begin
  if v_user_id is null or public.current_company_role() <> 'admin' then
    raise exception 'Only an approved company admin can review access requests.';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.'; end if;
  select * into v_request from public.access_requests
  where id = p_request_id and company_id = v_company_id
  for update;
  if v_request.id is null then raise exception 'Access request not found for your company.'; end if;
  if v_request.status <> 'pending' then raise exception 'This access request has already been reviewed.'; end if;

  if p_decision = 'approved' then
    update public.profiles
    set company_id = v_company_id, role = v_request.requested_role,
        approval_status = 'approved', updated_at = now()
    where id = v_request.user_id;
    if v_request.requested_role = 'technician' then
      insert into public.technicians(company_id, profile_id)
      values (v_company_id, v_request.user_id)
      on conflict (profile_id) do update set company_id = excluded.company_id;
    end if;
  else
    update public.profiles
    set company_id = null, approval_status = 'rejected', updated_at = now()
    where id = v_request.user_id;
  end if;
  update public.access_requests
  set status = p_decision, reviewed_by = v_user_id, reviewed_at = now()
  where id = v_request.id;
  return p_decision;
end;
$$;

revoke all on function public.complete_signup_request() from public;
revoke all on function public.get_company_signup_code() from public;
revoke all on function public.review_company_access_request(uuid, text) from public;
grant execute on function public.complete_signup_request() to authenticated;
grant execute on function public.get_company_signup_code() to authenticated;
grant execute on function public.review_company_access_request(uuid, text) to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_company_role() to authenticated;
grant execute on function public.current_technician_id() to authenticated;
