-- Cria perfis para contas que entraram antes do script 0001 existir.
-- Pode rodar quantas vezes quiser: não duplica nada.

-- Equipe
insert into public.profiles (id, email, full_name, role)
select u.id, lower(u.email), t.full_name, t.role
from auth.users u
join public.team_allowlist t on t.email = lower(u.email)
on conflict (id) do nothing;

-- Clientes convidados
insert into public.profiles (id, email, role)
select u.id, lower(u.email), 'cliente'
from auth.users u
where exists (select 1 from public.client_invites i where i.email = lower(u.email))
  and not exists (select 1 from public.team_allowlist t where t.email = lower(u.email))
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id)
select i.company_id, u.id
from auth.users u
join public.client_invites i on i.email = lower(u.email)
on conflict do nothing;

-- Confere o resultado
select email, role, active from public.profiles order by email;
