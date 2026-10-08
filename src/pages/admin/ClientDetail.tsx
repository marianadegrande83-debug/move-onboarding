import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { STAGE_LABEL, type Company, type OnboardingStage, type Product, type Profile } from '../../lib/types'
import { Card, EmptyState, Pill, Spinner } from '../../components/ui'
import { dateBR, dateTimeBR, inviteMessage, money, phoneBR, whatsappLink } from '../../lib/format'

interface Commercial { monthly_fee: number | null; setup_fee: number | null; notes: string | null }
interface Invite { email: string; accepted_at: string | null; created_at: string }
interface AuditRow { id: number; action: string; entity: string; actor_id: string | null; details: Record<string, unknown>; created_at: string }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-linha py-3 first:border-t-0 sm:flex-row sm:gap-4">
      <dt className="w-44 flex-none text-sm text-cinza">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { profile } = useAuth()
  const isManager = profile?.role === 'admin' || profile?.role === 'coordenacao'

  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [services, setServices] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [commercial, setCommercial] = useState<Commercial | null>(null)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    const db = supabase!
    Promise.all([
      db.from('companies').select('*').eq('id', id).maybeSingle(),
      db.from('company_services').select('product_id').eq('company_id', id),
      db.from('products').select('*').order('sort'),
      db.from('profiles').select('id, email, full_name, role, active').neq('role', 'cliente'),
      db.from('company_commercial').select('monthly_fee, setup_fee, notes').eq('company_id', id).maybeSingle(),
      db.from('client_invites').select('email, accepted_at, created_at').eq('company_id', id).maybeSingle(),
      db.from('audit_log').select('id, action, entity, actor_id, details, created_at').eq('company_id', id).order('created_at', { ascending: false }).limit(50),
    ]).then(([c, s, p, t, com, inv, a]) => {
      setCompany((c.data as Company) ?? null)
      setServices((s.data ?? []).map((r: { product_id: string }) => r.product_id))
      setProducts((p.data as Product[]) ?? [])
      setTeam((t.data as Profile[]) ?? [])
      setCommercial((com.data as Commercial) ?? null)
      setInvite((inv.data as Invite) ?? null)
      setAudit((a.data as AuditRow[]) ?? [])
    })
  }, [id])

  if (company === undefined) return <Spinner />
  if (company === null) return <EmptyState title="Cliente não encontrado" text="Ele pode ter sido removido ou você não tem acesso a ele." />

  const productName = (pid?: string | null) => products.find((p) => p.id === pid)?.name ?? pid ?? '—'
  const personName = (pid: string | null) => (pid ? team.find((t) => t.id === pid)?.full_name ?? 'Equipe MOVE' : '—')
  const message = inviteMessage(company.contact_name, company.name, company.contact_email)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  function describe(a: AuditRow): string {
    const d = a.details as { antes?: Record<string, unknown>; depois?: Record<string, unknown>; product_id?: string }
    if (a.entity === 'companies' && a.action === 'insert') return 'Cliente cadastrado'
    if (a.entity === 'companies' && a.action === 'update') {
      const before = d.antes?.stage as OnboardingStage | undefined
      const after = d.depois?.stage as OnboardingStage | undefined
      return before && after && before !== after ? `Etapa alterada: ${STAGE_LABEL[before]} → ${STAGE_LABEL[after]}` : 'Dados do cliente atualizados'
    }
    if (a.entity === 'client_invites' && a.action === 'insert') return 'Acesso ao portal liberado'
    if (a.entity === 'client_invites' && a.action === 'update') return 'Cliente acessou o portal pela primeira vez'
    if (a.entity === 'company_services') return `${a.action === 'insert' ? 'Serviço incluído' : 'Serviço removido'}: ${productName(d.product_id)}`
    if (a.entity === 'company_commercial') return a.action === 'insert' ? 'Condições comerciais registradas' : 'Condições comerciais atualizadas'
    if (a.entity === 'company_members') return 'Usuário do cliente vinculado'
    return `${a.entity} · ${a.action}`
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <Link to="/admin/clientes" className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza hover:text-roxo">← Clientes</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{company.name}</h1>
          <Pill tone={company.stage === 'ativo' ? 'ok' : 'neutro'}>{STAGE_LABEL[company.stage]}</Pill>
        </div>
        <p className="text-cinza">{productName(company.plan_id) === '—' ? 'Sem plano recorrente' : productName(company.plan_id)}{company.has_traffic ? ' · com tráfego pago' : ''}</p>
      </header>

      {params.get('novo') && (
        <div role="status" className="rounded-2xl bg-ok-suave px-5 py-4 font-semibold text-ok">
          Cliente cadastrado. O acesso ao portal já está liberado. Agora envie o convite abaixo.
        </div>
      )}

      {isManager && (
        <Card className="flex flex-col gap-4 border-2 border-roxo-claro">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Convite para o portal</h2>
            {invite?.accepted_at ? <Pill tone="ok">Acessou em {dateBR(invite.accepted_at)}</Pill> : <Pill tone="atencao">Aguardando primeiro acesso</Pill>}
          </div>
          <p className="text-sm text-cinza">
            O cliente entra com <strong className="text-preto">{company.contact_email}</strong> e recebe o link de acesso por e-mail. Envie a mensagem abaixo pelo canal que preferir.
          </p>
          <pre className="whitespace-pre-wrap rounded-2xl bg-offwhite p-4 font-sans text-sm leading-relaxed">{message}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex h-11 items-center rounded-full bg-preto px-5 font-bold text-white">
              {copied ? 'Mensagem copiada ✓' : 'Copiar mensagem'}
            </button>
            {company.whatsapp && (
              <a href={whatsappLink(company.whatsapp, message)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full bg-roxo px-5 font-bold text-white hover:bg-[#4A0C75]">
                Abrir no WhatsApp
              </a>
            )}
            <a
              href={`mailto:${company.contact_email}?subject=${encodeURIComponent('Seu portal MOVE está liberado')}&body=${encodeURIComponent(message)}`}
              className="inline-flex h-11 items-center rounded-full border-2 border-linha px-5 font-bold hover:border-roxo"
            >
              Abrir no e-mail
            </a>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[1_1_420px]">
          <h2 className="mb-2 text-xl font-extrabold">Dados do cliente</h2>
          <dl>
            <Row label="Responsável">{company.contact_name}</Row>
            <Row label="E-mail">{company.contact_email}</Row>
            <Row label="WhatsApp">{phoneBR(company.whatsapp)}</Row>
            <Row label="Início previsto">{dateBR(company.start_date)}</Row>
            <Row label="Social media">{personName(company.social_media_id)}</Row>
            {company.has_traffic && <Row label="Tráfego pago">{personName(company.traffic_id)}</Row>}
            <Row label="Cadastrado em">{company.created_at ? dateBR(company.created_at) : '—'}</Row>
          </dl>
        </Card>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">Contratado</h2>
            {services.length === 0 ? (
              <p className="text-sm text-cinza">Nenhum serviço registrado.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <li key={s} className="rounded-full bg-roxo-suave px-3.5 py-1.5 text-sm font-bold text-roxo">{productName(s)}</li>
                ))}
              </ul>
            )}
          </Card>

          {isManager && (
            <Card className="flex flex-col gap-1">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-extrabold">Comercial</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-cinza">Interno</span>
              </div>
              <dl>
                <Row label="Valor mensal">{money(commercial?.monthly_fee)}</Row>
                <Row label="Taxa de implantação">{money(commercial?.setup_fee)}</Row>
                <Row label="Observações"><span className="whitespace-pre-line font-normal">{commercial?.notes || '—'}</span></Row>
              </dl>
            </Card>
          )}
        </div>
      </div>

      {isManager && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Histórico</h2>
          {audit.length === 0 ? (
            <p className="text-sm text-cinza">Sem registros ainda.</p>
          ) : (
            <ol className="flex flex-col">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-linha py-3 first:border-t-0">
                  <span className="font-semibold">{describe(a)}</span>
                  <span className="text-sm text-cinza">
                    {a.actor_id ? `${team.find((t) => t.id === a.actor_id)?.full_name ?? 'Cliente'} · ` : ''}
                    {dateTimeBR(a.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </>
  )
}
