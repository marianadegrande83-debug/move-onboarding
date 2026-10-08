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
await db.exec(fs.readFileSync(new URL('../migrations/0005_briefing.sql', import.meta.url), 'utf8'))
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

// ---------------- Módulo 4: briefing ----------------
await as(ana, `insert into public.briefings (company_id, answers, current_step) values ($1, $2, 2)`, [cid, JSON.stringify({ historia: 'rascunho' })])
await as(ana, `update public.briefings set answers = $2, current_step = 3 where company_id = $1`, [cid, JSON.stringify({ historia: 'versão 2' })])
const draft = (await db.query(`select answers->>'historia' h, status from public.briefings where company_id=$1`, [cid])).rows[0]
draft.h === 'versão 2' && draft.status === 'em_andamento' ? ok('cliente salva o rascunho do briefing') : fail('rascunho ' + JSON.stringify(draft))

try { await as(ana, `update public.briefings set status='concluido' where company_id=$1`, [cid]); const st = (await db.query(`select status from public.briefings where company_id=$1`, [cid])).rows[0].status; st === 'em_andamento' ? ok('cliente não marca concluído sem enviar pelo fluxo') : fail('cliente forçou concluído') } catch { ok('cliente não marca concluído sem enviar pelo fluxo') }

try { await as(clienteA, `insert into public.briefings (company_id) values ($1)`, [cid]); fail('outro cliente criou briefing alheio') } catch { ok('outro cliente não mexe no briefing alheio') }
const otherRead = (await as(clienteA, `select count(*)::int n from public.briefings`)).rows[0].n
otherRead === 0 ? ok('outro cliente não lê o briefing alheio') : fail('vazamento de briefing')
const smRead = (await as(sm, `select count(*)::int n from public.briefings where company_id=$1`, [cid])).rows[0].n
smRead === 1 ? ok('social media atribuída lê o briefing') : fail('sm não lê briefing')

await as(ana, `select public.submit_briefing($1)`, [cid])
const after = (await db.query(`select b.status, b.submitted_at is not null sent, c.stage from public.briefings b join public.companies c on c.id=b.company_id where b.company_id=$1`, [cid])).rows[0]
after.status === 'concluido' && after.sent && after.stage === 'contrato' ? ok('envio conclui o briefing e avança para Contrato') : fail('envio ' + JSON.stringify(after))

const notifM = (await as(mariana, `select title from public.notifications`)).rows
notifM.length === 1 && notifM[0].title === 'Briefing concluído' ? ok('Mariana recebe a notificação') : fail('notificação mariana ' + notifM.length)
const notifB = (await as(bruna, `select count(*)::int n from public.notifications`)).rows[0].n
const notifAna = (await as(ana, `select count(*)::int n from public.notifications`)).rows[0].n
notifB === 0 && notifAna === 0 ? ok('notificação é só de quem recebeu') : fail('notificação vazou')

await as(ana, `update public.briefings set answers='{"historia":"depois do envio"}' where company_id=$1`, [cid])
const locked = (await db.query(`select answers->>'historia' h from public.briefings where company_id=$1`, [cid])).rows[0].h
locked === 'versão 2' ? ok('cliente não altera depois de enviar') : fail('alterou após envio')

try { await as(ana, `select public.submit_briefing($1)`, [cid]); fail('enviou duas vezes') } catch { ok('não dá para enviar duas vezes') }

await as(bruna, `update public.briefings set status='em_andamento', submitted_at=null where company_id=$1`, [cid])
await as(ana, `update public.briefings set answers='{"historia":"ajustado"}' where company_id=$1`, [cid])
const reopened = (await db.query(`select answers->>'historia' h from public.briefings where company_id=$1`, [cid])).rows[0].h
reopened === 'ajustado' ? ok('coordenação reabre e o cliente consegue ajustar') : fail('reabrir')

const auditB = (await as(mariana, `select count(*)::int n from public.audit_log where entity='briefings'`)).rows[0].n
auditB === 3 ? ok('auditoria registra início, envio e reabertura (sem poluir com cada salvamento)') : fail('auditoria briefing ' + auditB)
