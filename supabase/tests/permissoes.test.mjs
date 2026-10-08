import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const ok = (m) => console.log('✔', m)
const fail = (m) => { console.log('✘', m); process.exitCode = 1 }

// Stub do ambiente Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
`)
await db.exec(fs.readFileSync(new URL('../migrations/0001_auth_permissoes.sql', import.meta.url), 'utf8'))
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;
  grant execute on all functions in schema public, auth to authenticated;`)
ok('migração executou sem erros')

const newUser = async (email) => (await db.query(`insert into auth.users(email) values($1) returning id`, [email])).rows[0].id
const as = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('test.uid', '${uid}', false);`)
  try { return await db.query(sql, params) } finally { await db.exec(`reset role; select set_config('test.uid','',false);`) }
}

const mariana = await newUser('MarianaDeGrande83@gmail.com')
const bruna = await newUser('brunaminellyd@gmail.com')
const roles = (await db.query(`select email, role from public.profiles order by email`)).rows
roles.length === 2 && roles.find(r => r.role === 'admin') ? ok('equipe ganhou perfil correto (e-mail sem diferenciar maiúsculas)') : fail('perfis da equipe')

try { await newUser('intruso@exemplo.com'); fail('e-mail desconhecido entrou') } catch { ok('e-mail não autorizado é bloqueado') }

// Bruna cadastra duas empresas e convida um cliente para cada
const a = (await as(bruna, `insert into public.companies(name, contact_name, contact_email) values('Empresa A','Fulano','a@cliente.com') returning id`)).rows[0].id
const b = (await as(bruna, `insert into public.companies(name, contact_name, contact_email) values('Empresa B','Beltrano','b@cliente.com') returning id`)).rows[0].id
await as(bruna, `insert into public.client_invites(email, company_id) values('a@cliente.com',$1),('b@cliente.com',$2)`, [a, b])
ok('coordenação cadastra empresas e convites')

const clienteA = await newUser('a@cliente.com')
const seenA = (await as(clienteA, `select name from public.companies`)).rows.map(r => r.name)
JSON.stringify(seenA) === '["Empresa A"]' ? ok('cliente A só enxerga a Empresa A') : fail('isolamento: ' + seenA)

const profilesA = (await as(clienteA, `select email from public.profiles`)).rows
profilesA.length === 1 ? ok('cliente não vê dados da equipe') : fail('cliente viu perfis: ' + profilesA.length)

try { await as(clienteA, `update public.profiles set role='admin' where id=$1`, [clienteA]); const r = (await db.query(`select role from public.profiles where id=$1`, [clienteA])).rows[0].role; r === 'cliente' ? ok('cliente não consegue virar admin') : fail('escalada de papel') } catch { ok('cliente não consegue virar admin') }

try { await as(clienteA, `insert into public.companies(name, contact_name, contact_email) values('X','x','x@x.com')`); fail('cliente criou empresa') } catch { ok('cliente não cria empresas') }

const auditCliente = (await as(clienteA, `select count(*)::int n from public.audit_log`)).rows[0].n
auditCliente === 0 ? ok('cliente não lê auditoria interna') : fail('cliente leu auditoria')

// Social media só vê empresa atribuída
await db.exec(`insert into public.team_allowlist values ('sm@move.com','social_media','Social')`)
const sm = await newUser('sm@move.com')
await as(mariana, `update public.companies set social_media_id=$1 where id=$2`, [sm, b])
const seenSm = (await as(sm, `select name from public.companies`)).rows.map(r => r.name)
JSON.stringify(seenSm) === '["Empresa B"]' ? ok('social media só vê clientes atribuídos') : fail('social media viu: ' + seenSm)

const audit = (await as(mariana, `select count(*)::int n from public.audit_log`)).rows[0].n
audit > 5 ? ok(`auditoria registrou ${audit} eventos`) : fail('auditoria vazia')

try { await as(mariana, `delete from public.audit_log`); const n = (await db.query(`select count(*)::int n from public.audit_log`)).rows[0].n; n === audit ? ok('auditoria não pode ser apagada') : fail('auditoria apagada') } catch { ok('auditoria não pode ser apagada') }
