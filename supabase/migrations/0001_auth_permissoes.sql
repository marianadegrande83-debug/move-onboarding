-- =====================================================================
-- MOVE ONBOARDING · Módulo 1 · Autenticação, perfis e permissões
-- Cole este script inteiro no Supabase: SQL Editor → New query → Run.
-- Ele pode ser executado uma única vez num projeto novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.app_role as enum (
  'admin',          -- Mariana: acesso total
  'coordenacao',    -- Bruna: administra clientes, etapas, materiais e tarefas
  'social_media',   -- vê só os clientes atribuídos a ela/ele
  'trafego',        -- Caio: vê só clientes com gestão de tráfego atribuídos
  'cliente'         -- vê só a própria empresa
);

create type public.onboarding_stage as enum (
  'briefing', 'contrato', 'materiais', 'estrategia', 'aprovacao', 'transicao', 'ativo'
);

-- ---------------------------------------------------------------------
-- Equipe autorizada: só estes e-mails conseguem entrar como equipe
-- ---------------------------------------------------------------------
create table public.team_allowlist (
  email      text primary key check (email = lower(trim(email))),
  role       public.app_role not null check (role <> 'cliente'),
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Perfis (1 por usuário autenticado)
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique check (email = lower(email)),
  full_name  text,
  role       public.app_role not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Empresas (clientes). Dados comerciais ficam em tabela própria no módulo 3.
-- ---------------------------------------------------------------------
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 1),
  contact_name    text not null,
  contact_email   text not null check (contact_email = lower(trim(contact_email))),
  whatsapp        text,
  stage           public.onboarding_stage not null default 'briefing',
  has_traffic     boolean not null default false,
  social_media_id uuid references public.profiles (id) on delete set null,
  traffic_id      uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Usuários do cliente ligados a cada empresa
create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- Convites de cliente: o e-mail precisa estar aqui para conseguir entrar
create table public.client_invites (
  email       text not null check (email = lower(trim(email))),
  company_id  uuid not null references public.companies (id) on delete cascade,
  invited_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (email, company_id)
);

-- ---------------------------------------------------------------------
-- Auditoria (somente inserção; ninguém edita nem apaga)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  company_id  uuid references public.companies (id) on delete set null,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_company_idx on public.audit_log (company_id, created_at desc);

-- ---------------------------------------------------------------------
-- Funções de permissão (usadas pelas políticas RLS)
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.my_role() in ('admin', 'coordenacao'), false)
$$;

create or replace function public.is_team()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.my_role() in ('admin', 'coordenacao', 'social_media', 'trafego'), false)
$$;

create or replace function public.can_access_company(cid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    public.is_manager()
    or exists (
      select 1 from public.companies c
      where c.id = cid
        and (
          (public.my_role() = 'social_media' and c.social_media_id = auth.uid())
          or (public.my_role() = 'trafego' and c.has_traffic and c.traffic_id = auth.uid())
        )
    )
    or exists (
      select 1 from public.company_members m
      join public.profiles p on p.id = m.user_id
      where m.company_id = cid and m.user_id = auth.uid() and p.active
    )
$$;

-- ---------------------------------------------------------------------
-- Criação de perfil no primeiro login.
-- Bloqueia qualquer e-mail que não seja da equipe nem cliente convidado.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  team_row public.team_allowlist%rowtype;
begin
  select * into team_row from public.team_allowlist where email = lower(new.email);

  if found then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, lower(new.email), team_row.full_name, team_row.role);
  elsif exists (select 1 from public.client_invites where email = lower(new.email)) then
    insert into public.profiles (id, email, role)
    values (new.id, lower(new.email), 'cliente');

    insert into public.company_members (company_id, user_id)
    select company_id, new.id from public.client_invites where email = lower(new.email)
    on conflict do nothing;

    update public.client_invites set accepted_at = now()
    where email = lower(new.email) and accepted_at is null;
  else
    raise exception 'E-mail não autorizado no MOVE Onboarding';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (new.id, 'primeiro_acesso', 'profile', new.id::text, jsonb_build_object('email', new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Auditoria automática de alterações
-- ---------------------------------------------------------------------
create or replace function public.audit_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rec jsonb;
  cid uuid;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  cid := case
    when tg_table_name = 'companies' then (rec->>'id')::uuid
    when rec ? 'company_id' then (rec->>'company_id')::uuid
    else null
  end;

  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, details)
  values (
    case when tg_op = 'DELETE' and tg_table_name = 'companies' then null else cid end,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(rec->>'id', rec->>'email', rec->>'user_id'),
    case when tg_op = 'UPDATE'
      then jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new))
      else rec end
  );
  return null;
end;
$$;

create trigger audit_companies after insert or update or delete on public.companies
  for each row execute function public.audit_changes();
create trigger audit_profiles after update or delete on public.profiles
  for each row execute function public.audit_changes();
create trigger audit_members after insert or delete on public.company_members
  for each row execute function public.audit_changes();
create trigger audit_invites after insert or delete on public.client_invites
  for each row execute function public.audit_changes();
create trigger audit_team after insert or update or delete on public.team_allowlist
  for each row execute function public.audit_changes();

-- ---------------------------------------------------------------------
-- Row Level Security: o banco decide quem vê o quê
-- ---------------------------------------------------------------------
alter table public.team_allowlist  enable row level security;
alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.company_members enable row level security;
alter table public.client_invites  enable row level security;
alter table public.audit_log       enable row level security;

-- Equipe autorizada: só admin gerencia; coordenação consulta
create policy team_allowlist_select on public.team_allowlist
  for select to authenticated using (public.is_manager());
create policy team_allowlist_admin on public.team_allowlist
  for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Perfis: cada um vê o seu; equipe vê a equipe; gestão vê todos
create policy profiles_select on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.is_manager()
    or (public.is_team() and role <> 'cliente')
  );
-- Só admin altera perfis (evita que alguém mude o próprio papel)
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Empresas
create policy companies_select on public.companies
  for select to authenticated using (public.can_access_company(id));
create policy companies_insert on public.companies
  for insert to authenticated with check (public.is_manager());
create policy companies_update on public.companies
  for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy companies_delete on public.companies
  for delete to authenticated using (public.my_role() = 'admin');

-- Vínculos cliente ↔ empresa
create policy members_select on public.company_members
  for select to authenticated using (user_id = auth.uid() or public.can_access_company(company_id));
create policy members_manage on public.company_members
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Convites
create policy invites_manage on public.client_invites
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Auditoria: só gestão lê; ninguém escreve direto (só os gatilhos)
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_manager());

-- Nada para visitantes não autenticados
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- Equipe inicial
-- ---------------------------------------------------------------------
insert into public.team_allowlist (email, role, full_name) values
  ('marianadegrande83@gmail.com', 'admin',       'Mariana'),
  ('brunaminellyd@gmail.com',     'coordenacao', 'Bruna');

-- Caio (tráfego): descomente e troque o e-mail quando tiver
-- insert into public.team_allowlist (email, role, full_name)
-- values ('EMAIL_DO_CAIO', 'trafego', 'Caio');
