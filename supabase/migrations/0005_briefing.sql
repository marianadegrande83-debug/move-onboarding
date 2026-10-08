-- =====================================================================
-- MOVE ONBOARDING · Módulo 4 · Briefing estratégico + notificações
-- Rodar uma vez, depois do 0004.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Briefing (um por empresa). As respostas ficam num JSON por campo.
-- ---------------------------------------------------------------------
create table public.briefings (
  company_id    uuid primary key references public.companies (id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  current_step  int not null default 1 check (current_step between 1 and 9),
  status        text not null default 'em_andamento' check (status in ('em_andamento', 'concluido')),
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  updated_by    uuid default auth.uid(),
  updated_at    timestamptz not null default now()
);

create trigger briefings_touch before update on public.briefings
  for each row execute function public.touch_updated_at();

-- Auditoria só quando o briefing começa ou muda de situação (não a cada salvamento automático)
create or replace function public.audit_briefing()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.audit_log (company_id, actor_id, action, entity, entity_id, details)
    values (new.company_id, auth.uid(), lower(tg_op), 'briefings', new.company_id::text,
            jsonb_build_object('status', new.status));
  end if;
  return null;
end;
$$;

create trigger audit_briefings after insert or update on public.briefings
  for each row execute function public.audit_briefing();

-- ---------------------------------------------------------------------
-- Notificações internas
-- ---------------------------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  company_id  uuid references public.companies (id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_member(cid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m join public.profiles p on p.id = m.user_id
    where m.company_id = cid and m.user_id = auth.uid() and p.active
  )
$$;

-- Converte texto em uuid sem quebrar (usado nas regras de arquivos)
create or replace function public.safe_uuid(t text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Envio do briefing pelo cliente
-- ---------------------------------------------------------------------
create or replace function public.submit_briefing(cid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  company_name text;
begin
  if not (public.is_member(cid) or public.is_manager()) then
    raise exception 'Sem permissão para enviar este briefing';
  end if;

  update public.briefings
     set status = 'concluido', submitted_at = now(), updated_by = auth.uid()
   where company_id = cid and status = 'em_andamento';
  if not found then
    raise exception 'Briefing não encontrado ou já enviado';
  end if;

  -- Avança a jornada: briefing concluído → contrato
  update public.companies set stage = 'contrato' where id = cid and stage = 'briefing'
  returning name into company_name;
  if company_name is null then
    select name into company_name from public.companies where id = cid;
  end if;

  -- Automação 2: notificar a administração (Mariana)
  insert into public.notifications (user_id, company_id, title, body, link)
  select p.id, cid, 'Briefing concluído',
         company_name || ' enviou o Briefing Estratégico.',
         '/admin/clientes/' || cid || '/briefing'
  from public.profiles p
  where p.role = 'admin' and p.active;
end;
$$;

-- ---------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------
alter table public.briefings     enable row level security;
alter table public.notifications enable row level security;

-- Leitura: quem acessa a empresa (equipe atribuída, gestão e o próprio cliente)
create policy briefings_select on public.briefings
  for select to authenticated using (public.can_access_company(company_id));

-- Cliente cria e edita enquanto não enviou; não consegue marcar como concluído direto
create policy briefings_client_insert on public.briefings
  for insert to authenticated
  with check (public.is_member(company_id) and status = 'em_andamento' and submitted_at is null);
create policy briefings_client_update on public.briefings
  for update to authenticated
  using (public.is_member(company_id) and status = 'em_andamento')
  with check (public.is_member(company_id) and status = 'em_andamento' and submitted_at is null);

-- Gestão pode tudo (inclusive reabrir para edição)
create policy briefings_manage on public.briefings
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Notificações: cada um vê e marca como lida só as suas
create policy notifications_own_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.briefings     to authenticated;
grant select, update         on public.notifications to authenticated;

revoke execute on function public.submit_briefing(uuid) from public, anon;
grant execute on function public.submit_briefing(uuid) to authenticated;
grant execute on function public.is_member(uuid)        to authenticated;
grant execute on function public.safe_uuid(text)        to authenticated;
