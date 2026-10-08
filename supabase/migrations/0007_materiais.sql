-- =====================================================================
-- MOVE ONBOARDING · Módulos 5 e 6 · Central de Materiais e Acessos
-- Rodar uma vez, depois do 0006.
-- =====================================================================

-- Prazo da estratégia (7 dias), iniciado automaticamente
alter table public.companies
  add column strategy_started_at timestamptz,
  add column strategy_due_at     timestamptz;

-- ---------------------------------------------------------------------
-- Checklist de materiais e acessos por cliente
-- ---------------------------------------------------------------------
create table public.company_materials (
  company_id   uuid not null references public.companies (id) on delete cascade,
  item_key     text not null,
  kind         text not null check (kind in ('arquivo', 'acesso')),
  title        text not null,
  required     boolean not null default false,
  sort         int not null default 0,
  status       text not null default 'pendente' check (status in ('pendente', 'recebido', 'validado')),
  files        jsonb not null default '[]'::jsonb,
  client_note  text,
  team_note    text,
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (company_id, item_key)
);

create trigger company_materials_touch before update on public.company_materials
  for each row execute function public.touch_updated_at();

-- Auditoria só quando a situação do item muda
create or replace function public.audit_material()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_log (company_id, actor_id, action, entity, entity_id, details)
    values (new.company_id, auth.uid(), 'update', 'company_materials', new.item_key,
            jsonb_build_object('title', new.title, 'antes', old.status, 'depois', new.status));
  end if;
  return null;
end;
$$;

create trigger audit_materials after update on public.company_materials
  for each row execute function public.audit_material();

-- ---------------------------------------------------------------------
-- Gera o checklist conforme o que foi contratado (pode rodar várias vezes)
-- ---------------------------------------------------------------------
create or replace function public.ensure_materials(cid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  svc text[];
  traffic boolean;
  recording boolean;
begin
  if not public.can_access_company(cid) then
    raise exception 'Sem permissão';
  end if;

  select coalesce(array_agg(product_id), '{}') into svc from public.company_services where company_id = cid;
  select has_traffic into traffic from public.companies where id = cid;
  recording := svc && array['full_move', 'move_content'];

  insert into public.company_materials (company_id, item_key, kind, title, required, sort) values
    (cid, 'logotipo',       'arquivo', 'Logotipo',                          true,      10),
    (cid, 'manual_marca',   'arquivo', 'Manual da marca',                   false,     20),
    (cid, 'fotos',          'arquivo', 'Fotos da equipe e do espaço',       recording, 30),
    (cid, 'videos',         'arquivo', 'Vídeos',                            false,     40),
    (cid, 'apresentacoes',  'arquivo', 'Apresentações e materiais institucionais', false, 50),
    (cid, 'outros',         'arquivo', 'Outros documentos',                 false,     60),
    (cid, 'instagram',      'acesso',  'Acesso ao Instagram',               true,      110),
    (cid, 'facebook',       'acesso',  'Acesso à página do Facebook',       true,      120)
  on conflict do nothing;

  if traffic then
    insert into public.company_materials (company_id, item_key, kind, title, required, sort) values
      (cid, 'business_manager', 'acesso', 'Gerenciador de Negócios (Meta)',   true, 130),
      (cid, 'anuncios_meta',    'acesso', 'Conta de anúncios Meta',           true, 140)
    on conflict do nothing;
  end if;

  if svc && array['power_move', 'full_move', 'move_ads'] then
    insert into public.company_materials (company_id, item_key, kind, title, required, sort) values
      (cid, 'google_ads', 'acesso', 'Conta do Google Ads', 'power_move' = any(svc), 150)
    on conflict do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Ação do cliente: enviar arquivos/observação e marcar como enviado
-- (o cliente nunca consegue marcar como "validado")
-- ---------------------------------------------------------------------
create or replace function public.client_update_material(cid uuid, key text, new_files jsonb, note text, mark_sent boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_member(cid) or public.is_manager()) then
    raise exception 'Sem permissão';
  end if;
  if jsonb_typeof(coalesce(new_files, '[]'::jsonb)) <> 'array' then
    raise exception 'Formato de arquivos inválido';
  end if;

  update public.company_materials
     set files = coalesce(new_files, files),
         client_note = note,
         status = case
                    when status = 'validado' then status
                    when mark_sent then 'recebido'
                    else status
                  end
   where company_id = cid and item_key = key;
  if not found then
    raise exception 'Item não encontrado';
  end if;

  if mark_sent then
    insert into public.notifications (user_id, company_id, title, body, link)
    select p.id, cid, 'Material recebido',
           (select name from public.companies where id = cid) || ' enviou: ' ||
           (select title from public.company_materials where company_id = cid and item_key = key),
           '/admin/clientes/' || cid || '/materiais'
    from public.profiles p where p.role = 'coordenacao' and p.active;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Automação 5: briefing enviado + materiais obrigatórios validados
-- + etapa "Materiais e acessos" → inicia o prazo de 7 dias da estratégia
-- ---------------------------------------------------------------------
create or replace function public.try_start_strategy(cid uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
begin
  select id, name, stage, strategy_started_at into c from public.companies where id = cid;
  if c.stage <> 'materiais' or c.strategy_started_at is not null then
    return false;
  end if;
  if not exists (select 1 from public.briefings where company_id = cid and status = 'concluido') then
    return false;
  end if;
  if not exists (select 1 from public.company_materials where company_id = cid) then
    return false;
  end if;
  if exists (select 1 from public.company_materials where company_id = cid and required and status <> 'validado') then
    return false;
  end if;

  update public.companies
     set stage = 'estrategia', strategy_started_at = now(), strategy_due_at = now() + interval '7 days'
   where id = cid;

  insert into public.notifications (user_id, company_id, title, body, link)
  select p.id, cid, 'Prazo da estratégia iniciado',
         c.name || ': materiais validados. Entrega da estratégia em 7 dias.',
         '/admin/clientes/' || cid
  from public.profiles p where p.role = 'admin' and p.active;
  return true;
end;
$$;

create or replace function public.materials_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.try_start_strategy(new.company_id);
  return null;
end;
$$;

create trigger materials_try_strategy after update of status on public.company_materials
  for each row when (new.status = 'validado') execute function public.materials_changed();

create or replace function public.stage_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.try_start_strategy(new.id);
  return null;
end;
$$;

create trigger companies_try_strategy after update of stage on public.companies
  for each row when (new.stage = 'materiais' and old.stage is distinct from new.stage)
  execute function public.stage_changed();

-- ---------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------
alter table public.company_materials enable row level security;

create policy materials_select on public.company_materials
  for select to authenticated using (public.can_access_company(company_id));
create policy materials_manage on public.company_materials
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

grant select, insert, update, delete on public.company_materials to authenticated;

revoke execute on function public.ensure_materials(uuid) from public, anon;
revoke execute on function public.client_update_material(uuid, text, jsonb, text, boolean) from public, anon;
revoke execute on function public.try_start_strategy(uuid) from public, anon;
grant execute on function public.ensure_materials(uuid) to authenticated;
grant execute on function public.client_update_material(uuid, text, jsonb, text, boolean) to authenticated;
