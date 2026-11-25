-- Gridline role model:
-- admin: company-wide data and administration through trusted setup tools
-- supervisor: read company operations and manage work, assets, and inspections
-- dispatcher: manage work orders and schedules; view crew and service locations
-- technician: view assigned work and submit field updates for those assignments

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'companies','profiles','technicians','customers','assets','work_orders',
        'schedules','job_updates','attachments','signatures','notifications',
        'inspection_templates','inspection_results'
      ])
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

drop policy if exists "company members can view work order files" on storage.objects;
drop policy if exists "company members can upload work order files" on storage.objects;
drop policy if exists "company members can update work order files" on storage.objects;
drop policy if exists "company members can delete work order files" on storage.objects;

create policy "company members can read their company" on public.companies
for select to authenticated using (id = public.current_company_id());

create policy "members can read company profiles" on public.profiles
for select to authenticated using (id = auth.uid() or company_id = public.current_company_id());
revoke update on public.profiles from authenticated;
grant update (name, email, updated_at) on public.profiles to authenticated;
create policy "admins update company profile details" on public.profiles
for update to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
) with check (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
);

create policy "staff and technician can read crew" on public.technicians
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or profile_id = auth.uid())
);
create policy "admins manage crew" on public.technicians
for all to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
) with check (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
);

create policy "company operations can read customers" on public.customers
for select to authenticated using (company_id = public.current_company_id());
create policy "admins manage customers" on public.customers
for all to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
) with check (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
);

create policy "company operations can read assets" on public.assets
for select to authenticated using (company_id = public.current_company_id());
create policy "admins manage assets" on public.assets
for all to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
) with check (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
);

create policy "operations and assigned technicians read work" on public.work_orders
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or technician_id = public.current_technician_id())
);
create policy "dispatch roles create work" on public.work_orders
for insert to authenticated with check (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor','dispatcher')
);
create policy "operations and assigned technicians update work" on public.work_orders
for update to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or technician_id = public.current_technician_id())
) with check (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or technician_id = public.current_technician_id())
);
create policy "admin and supervisors delete work" on public.work_orders
for delete to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
);

create policy "operations and assigned technicians read schedules" on public.schedules
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or technician_id = public.current_technician_id())
);
create policy "dispatch roles manage schedules" on public.schedules
for insert to authenticated with check (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor','dispatcher')
);
create policy "dispatch roles update schedules" on public.schedules
for update to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor','dispatcher')
) with check (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor','dispatcher')
);
create policy "admin and supervisors delete schedules" on public.schedules
for delete to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
);

create policy "operations and assigned technicians read job updates" on public.job_updates
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or (user_id = auth.uid() and exists (
    select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id()
  )))
);
create policy "assigned technicians submit job updates" on public.job_updates
for insert to authenticated with check (
  company_id = public.current_company_id() and user_id = auth.uid()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id())
);

create policy "operations and assigned technicians read attachments" on public.attachments
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or exists (
    select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id()
  ))
);
create policy "assigned technicians upload attachments" on public.attachments
for insert to authenticated with check (
  company_id = public.current_company_id() and uploaded_by = auth.uid()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id())
);
create policy "admin and supervisors manage attachments" on public.attachments
for all to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
) with check (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
);

create policy "operations and assigned technicians read signatures" on public.signatures
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or exists (
    select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id()
  ))
);
create policy "assigned technicians submit signatures" on public.signatures
for insert to authenticated with check (
  company_id = public.current_company_id()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id())
);

create policy "company members read inspection templates" on public.inspection_templates
for select to authenticated using (company_id = public.current_company_id());
create policy "admins manage inspection templates" on public.inspection_templates
for all to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
) with check (
  company_id = public.current_company_id() and public.current_company_role() = 'admin'
);

create policy "operations and assigned technicians read inspection results" on public.inspection_results
for select to authenticated using (
  company_id = public.current_company_id()
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or exists (
    select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id()
  ))
);
create policy "assigned technicians submit inspection results" on public.inspection_results
for insert to authenticated with check (
  company_id = public.current_company_id() and technician_id = public.current_technician_id()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.technician_id = public.current_technician_id())
);
create policy "admin and supervisors manage inspection results" on public.inspection_results
for update to authenticated using (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
) with check (
  company_id = public.current_company_id() and public.current_company_role() in ('admin','supervisor')
);

create policy "users read own notifications" on public.notifications
for select to authenticated using (company_id = public.current_company_id() and user_id = auth.uid());
create policy "users update own notifications" on public.notifications
for update to authenticated using (user_id = auth.uid() and company_id = public.current_company_id())
with check (user_id = auth.uid() and company_id = public.current_company_id());
create policy "users create own notifications" on public.notifications
for insert to authenticated with check (company_id = public.current_company_id() and user_id = auth.uid());

create policy "company operations access assigned files" on storage.objects
for select to authenticated using (
  bucket_id = 'work-order-attachments'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or exists (
    select 1 from public.work_orders w where w.id::text = (storage.foldername(name))[2] and w.technician_id = public.current_technician_id()
  ))
);
create policy "assigned technicians and operations upload files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'work-order-attachments'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (public.current_company_role() in ('admin','supervisor','dispatcher') or exists (
    select 1 from public.work_orders w where w.id::text = (storage.foldername(name))[2] and w.technician_id = public.current_technician_id()
  ))
);
create policy "admin and supervisors update files" on storage.objects
for update to authenticated using (
  bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_company_role() in ('admin','supervisor')
) with check (
  bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_company_role() in ('admin','supervisor')
);
create policy "admin and supervisors delete files" on storage.objects
for delete to authenticated using (
  bucket_id = 'work-order-attachments' and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_company_role() in ('admin','supervisor')
);
