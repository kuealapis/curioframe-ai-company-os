do $$
declare
  t record;
  owner_id constant uuid := '4d9af43d-3158-4022-8a25-624392baeb5a';
begin
  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Configured CurioFrame owner does not exist; refusing to apply owner-only policies.';
  end if;
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public' and rowsecurity = true
  loop
    execute format('drop policy if exists %I on public.%I', 'curioframe_owner_only_guard', t.tablename);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)',
      'curioframe_owner_only_guard', t.tablename, owner_id::text, owner_id::text
    );
  end loop;
end $$;
