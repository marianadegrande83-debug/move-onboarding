-- Libera o acesso às tabelas para usuários logados.
-- Quem vê o quê continua sendo decidido pelas políticas RLS do 0001;
-- sem estes GRANTs o banco recusa tudo antes mesmo de olhar as políticas.
-- Pode rodar quantas vezes quiser.

grant usage on schema public to authenticated;

grant select, update                 on public.profiles        to authenticated;
grant select, insert, update, delete on public.companies       to authenticated;
grant select, insert, delete         on public.company_members to authenticated;
grant select, insert, update, delete on public.client_invites  to authenticated;
grant select, insert, update, delete on public.team_allowlist  to authenticated;
grant select                         on public.audit_log       to authenticated;

grant execute on function public.my_role()                to authenticated;
grant execute on function public.is_manager()             to authenticated;
grant execute on function public.is_team()                to authenticated;
grant execute on function public.can_access_company(uuid) to authenticated;

-- Visitantes não logados não acessam nada
revoke all on all tables in schema public from anon;
