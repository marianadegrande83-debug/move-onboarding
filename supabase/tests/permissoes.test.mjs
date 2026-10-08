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
  revoke all on schema public from public; grant usage on schema auth to anon, authenticated;
`)
await db.exec(fs.readFileSync(new URL('../migrations/0001_auth_permissoes.sql', import.meta.url), 'utf8'))
await db.exec(fs.readFileSync(new URL('../migrations/0003_permissoes_tabelas.sql', import.meta.url), 'utf8'))
await db.exec(`grant execute on all functions in schema auth to authenticated;`)
await db.exec(fs.readFileSync(new URL('../migrations/0004_cadastro_clientes.sql', import.meta.url), 'utf8'))
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

// ---------------- Módulo 3: cadastro de clientes ----------------
const payload = {
  name: 'Clínica Teste', contact_name: 'Ana Souza', contact_email: '  Ana@Clinica.com ',
  whatsapp: '(71) 99999-0000', plan_id: 'power_move', services: ['move_content'],
  has_traffic: true, monthly_fee: '3000', setup_fee: '500', notes: 'fechado em reunião',
  start_date: '2026-11-01', social_media_id: sm,
}
const cid = (await as(mariana, `select public.create_client($1::jsonb) as id`, [JSON.stringify(payload)])).rows[0].id
cid ? ok('admin cadastra cliente completo numa operação só') : fail('create_client')

const svc = (await db.query(`select product_id from public.company_services where company_id=$1 order by 1`, [cid])).rows.map(r => r.product_id)
JSON.stringify(svc) === '["move_content","power_move"]' ? ok('plano entra junto com os serviços') : fail('serviços: ' + svc)

const inv = (await db.query(`select email from public.client_invites where company_id=$1`, [cid])).rows
inv.length === 1 && inv[0].email === 'ana@clinica.com' ? ok('convite criado com e-mail normalizado') : fail('convite')

const wa = (await db.query(`select whatsapp from public.companies where id=$1`, [cid])).rows[0].whatsapp
wa === '71999990000' ? ok('WhatsApp salvo só com números') : fail('whatsapp ' + wa)

try { await as(sm, `select public.create_client($1::jsonb)`, [JSON.stringify({ ...payload, contact_email: 'x@y.com' })]); fail('social media cadastrou cliente') } catch { ok('social media não cadastra clientes') }
try { await as(clienteA, `select public.create_client($1::jsonb)`, [JSON.stringify({ ...payload, contact_email: 'z@y.com' })]); fail('cliente cadastrou cliente') } catch { ok('cliente não cadastra clientes') }
try { await as(mariana, `select public.create_client($1::jsonb)`, [JSON.stringify({ ...payload, contact_email: 'invalido' })]); fail('aceitou e-mail inválido') } catch { ok('e-mail inválido é recusado') }

const smCommercial = (await as(sm, `select count(*)::int n from public.company_commercial`)).rows[0].n
const smSeesCompany = (await as(sm, `select count(*)::int n from public.companies where id=$1`, [cid])).rows[0].n
smSeesCompany === 1 && smCommercial === 0 ? ok('social media vê o cliente, mas não os valores') : fail(`sm empresa=${smSeesCompany} valores=${smCommercial}`)

const ana = await newUser('ana@clinica.com')
const anaCompanies = (await as(ana, `select name from public.companies`)).rows.map(r => r.name)
JSON.stringify(anaCompanies) === '["Clínica Teste"]' ? ok('cliente convidado entra vinculado só à própria empresa') : fail('ana viu ' + anaCompanies)
const anaSvc = (await as(ana, `select count(*)::int n from public.company_services`)).rows[0].n
const anaCom = (await as(ana, `select count(*)::int n from public.company_commercial`)).rows[0].n
anaSvc === 2 && anaCom === 0 ? ok('cliente vê os serviços contratados, mas não os valores') : fail(`ana servicos=${anaSvc} valores=${anaCom}`)
const anaOther = (await as(ana, `select count(*)::int n from public.company_services where company_id<>$1`, [cid])).rows[0].n
anaOther === 0 ? ok('cliente não vê serviços de outras empresas') : fail('vazamento de serviços')

const brunaCom = (await as(bruna, `select monthly_fee::text from public.company_commercial where company_id=$1`, [cid])).rows
brunaCom.length === 1 && brunaCom[0].monthly_fee === '3000.00' ? ok('coordenação vê os dados comerciais') : fail('bruna comercial')
