-- CurioFrame AI Company OS — initial Supabase schema
-- Apply through Supabase SQL Editor after creating a project.
-- No secrets or service-role keys belong in this repository.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'CurioFrame AI',
  operating_mode text not null default 'approval_based'
    check (operating_mode in ('approval_based','autonomous_within_policy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role_key text not null,
  department text not null,
  responsibilities text not null default '',
  status text not null default 'planned'
    check (status in ('planned','ready','working','paused','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, role_key)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  objective text not null default '',
  assigned_employee_id uuid references public.ai_employees(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued','in_progress','blocked','review','completed','cancelled')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  deliverable_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  employee_id uuid references public.ai_employees(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  source_url text not null,
  publisher text,
  notes text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  asset_type text not null default 'script',
  status text not null default 'draft'
    check (status in ('draft','review','approved','scheduled','published','archived')),
  body text not null default '',
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'IDR',
  description text not null,
  requires_owner_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists tasks_company_status_idx on public.tasks(company_id, status);
create index if not exists task_events_company_created_idx on public.task_events(company_id, created_at desc);
create index if not exists approvals_company_status_idx on public.approvals(company_id, status);
create index if not exists content_assets_company_status_idx on public.content_assets(company_id, status);

alter table public.companies enable row level security;
alter table public.ai_employees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.approvals enable row level security;
alter table public.research_sources enable row level security;
alter table public.content_assets enable row level security;
alter table public.finance_entries enable row level security;

create policy "Owners manage their companies" on public.companies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Company owners manage employees" on public.ai_employees
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners manage tasks" on public.tasks
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners read task events" on public.task_events
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners manage approvals" on public.approvals
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners manage research sources" on public.research_sources
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners manage content assets" on public.content_assets
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Company owners manage finance entries" on public.finance_entries
  for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));


-- Owner-scoped client prospect pipeline (also maintained in supabase/migrations/20261124010000_create_owner_scoped_client_leads.sql)
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
create policy "Company owners manage client leads" on public.client_leads
  for all to authenticated
  using (exists (select 1 from public.companies c where c.id = client_leads.company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = client_leads.company_id and c.owner_id = auth.uid()));
revoke all on public.client_leads from anon;
grant select, insert, update, delete on public.client_leads to authenticated;
