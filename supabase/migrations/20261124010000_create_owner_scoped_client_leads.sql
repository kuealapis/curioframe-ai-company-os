create table if not exists public.client_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_name text not null check (length(trim(client_name)) between 1 and 120),
  business_name text,
  email text,
  contact_method text,
  service_type text,
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  stage text not null default 'lead' check (stage in ('lead','contacted','qualified','proposal_sent','negotiation','won','lost')),
  next_follow_up date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_leads_company_created_idx on public.client_leads(company_id, created_at desc);
create index if not exists client_leads_company_stage_idx on public.client_leads(company_id, stage);
alter table public.client_leads enable row level security;
drop policy if exists "Company owners manage client leads" on public.client_leads;
create policy "Company owners manage client leads" on public.client_leads
for all to authenticated
using (exists (select 1 from public.companies c where c.id = client_leads.company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = client_leads.company_id and c.owner_id = (select auth.uid())));
revoke all on public.client_leads from anon;
grant select, insert, update, delete on public.client_leads to authenticated;
