-- =====================================================================
-- MOVE ONBOARDING · Módulo 3 · Catálogo de produtos e cadastro de clientes
-- Rodar uma vez, depois do 0001 e do 0003.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo de produtos da MOVE
-- ---------------------------------------------------------------------
create table public.products (
  id               text primary key,
  name             text not null,
  category         text not null check (category in ('recorrente', 'pontual', 'autoridade')),
  base_price       numeric(10,2),           -- null = definido em cada proposta
  is_plan          boolean not null default false,  -- plano de gestão mensal
  includes_traffic boolean not null default false,
  sort             int not null default 0,
  active           boolean not null default true
);

insert into public.products (id, name, category, base_price, is_plan, includes_traffic, sort) values
  ('start_move',       'Start MOVE',       'recorrente', 1850, true,  false, 10),
  ('power_move',       'Power MOVE',       'recorrente', 3000, true,  true,  20),
  ('full_move',        'Full MOVE',        'recorrente', 4800, true,  true,  30),
  ('move_ads',         'MOVE ADS',         'recorrente', null, false, true,  40),
  ('move_sprint',      'MOVE SPRINT',      'pontual',    null, false, false, 50),
  ('move_brand',       'MOVE BRAND',       'pontual',    null, false, false, 60),
  ('move_content',     'MOVE CONTENT',     'pontual',    null, false, false, 70),
  ('move_mentoria',    'MOVE MENTORIA',    'pontual',    null, false, false, 80),
  ('business_in_move', 'BUSINESS IN MOVE', 'autoridade', null, false, false, 90),
  ('movecast',         'MOVECAST',         'autoridade', null, false, false, 100);

-- ---------------------------------------------------------------------
-- Novos dados da empresa (visíveis para quem acessa a empresa)
-- ---------------------------------------------------------------------
alter table public.companies
  add column start_date date,
  add column plan_id    text references public.products (id);

-- Serviços contratados (o cliente pode ver)
create table public.company_services (
  company_id uuid not null references public.companies (id) on delete cascade,
  product_id text not null references public.products (id),
  primary key (company_id, product_id)
);

-- Dados comerciais (só administração e coordenação)
create table public.company_commercial (
  company_id   uuid primary key references public.companies (id) on delete cascade,
  monthly_fee  numeric(10,2) check (monthly_fee is null or monthly_fee >= 0),
  setup_fee    numeric(10,2) check (setup_fee is null or setup_fee >= 0),
  notes        text,
  updated_at   timestamptz not null default now()
);

create trigger company_commercial_touch before update on public.company_commercial
  for each row execute function public.touch_updated_at();

-- Registrar também quando o convite é aceito (primeiro acesso do cliente)
drop trigger if exists audit_invites on public.client_invites;
create trigger audit_invites after insert or update or delete on public.client_invites
  for each row execute function public.audit_changes();

create trigger audit_services after insert or delete on public.company_services
  for each row execute function public.audit_changes();
create trigger audit_commercial after insert or update or delete on public.company_commercial
  for each row execute function public.audit_changes();

-- ---------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------
alter table public.products           enable row level security;
alter table public.company_services   enable row level security;
alter table public.company_commercial enable row level security;

create policy products_select on public.products
  for select to authenticated using (true);
create policy products_admin on public.products
  for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy services_select on public.company_services
  for select to authenticated using (public.can_access_company(company_id));
create policy services_manage on public.company_services
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy commercial_manage on public.company_commercial
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

grant select                         on public.products           to authenticated;
grant insert, update, delete         on public.products           to authenticated;
grant select, insert, delete         on public.company_services   to authenticated;
grant select, insert, update, delete on public.company_commercial to authenticated;

-- ---------------------------------------------------------------------
-- Cadastro completo em uma única operação (tudo ou nada)
-- ---------------------------------------------------------------------
create or replace function public.create_client(payload jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
  email_clean text := lower(trim(payload->>'contact_email'));
begin
  if not public.is_manager() then
    raise exception 'Apenas administração e coordenação podem cadastrar clientes';
  end if;
  if coalesce(trim(payload->>'name'), '') = '' or coalesce(trim(payload->>'contact_name'), '') = '' then
    raise exception 'Informe o nome da empresa e do responsável';
  end if;
  if email_clean !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido';
  end if;

  insert into public.companies
    (name, contact_name, contact_email, whatsapp, start_date, plan_id,
     has_traffic, social_media_id, traffic_id)
  values (
    trim(payload->>'name'),
    trim(payload->>'contact_name'),
    email_clean,
    nullif(regexp_replace(coalesce(payload->>'whatsapp', ''), '\D', '', 'g'), ''),
    nullif(payload->>'start_date', '')::date,
    nullif(payload->>'plan_id', ''),
    coalesce((payload->>'has_traffic')::boolean, false),
    nullif(payload->>'social_media_id', '')::uuid,
    nullif(payload->>'traffic_id', '')::uuid
  )
  returning id into new_id;

  insert into public.company_services (company_id, product_id)
  select new_id, s from jsonb_array_elements_text(coalesce(payload->'services', '[]'::jsonb)) s
  on conflict do nothing;

  if payload->>'plan_id' is not null and payload->>'plan_id' <> '' then
    insert into public.company_services (company_id, product_id)
    values (new_id, payload->>'plan_id') on conflict do nothing;
  end if;

  insert into public.company_commercial (company_id, monthly_fee, setup_fee, notes)
  values (
    new_id,
    nullif(payload->>'monthly_fee', '')::numeric,
    nullif(payload->>'setup_fee', '')::numeric,
    nullif(trim(coalesce(payload->>'notes', '')), '')
  );

  -- Libera o acesso do cliente ao portal (convite)
  insert into public.client_invites (email, company_id) values (email_clean, new_id)
  on conflict do nothing;

  -- Se o cliente já tinha conta (ex.: segunda empresa), vincula na hora
  insert into public.company_members (company_id, user_id)
  select new_id, p.id from public.profiles p where p.email = email_clean and p.role = 'cliente'
  on conflict do nothing;

  return new_id;
end;
$$;

revoke execute on function public.create_client(jsonb) from public, anon;
grant execute on function public.create_client(jsonb) to authenticated;
