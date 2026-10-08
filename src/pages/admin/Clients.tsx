import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { STAGES, STAGE_LABEL, type Company, type OnboardingStage, type Product, type Profile } from '../../lib/types'
import { Card, EmptyState, Pill, Spinner } from '../../components/ui'
import { dateBR } from '../../lib/format'

interface Invite { company_id: string; accepted_at: string | null }

export default function Clients() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'admin' || profile?.role === 'coordenacao'
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<OnboardingStage | 'todas'>('todas')

  useEffect(() => {
    Promise.all([
      supabase!.from('companies').select('id, name, contact_name, contact_email, stage, plan_id, social_media_id, traffic_id, has_traffic, start_date, created_at, updated_at').order('created_at', { ascending: false }),
      supabase!.from('products').select('*'),
      supabase!.from('profiles').select('id, email, full_name, role, active').neq('role', 'cliente'),
      supabase!.from('client_invites').select('company_id, accepted_at'),
    ]).then(([c, p, t, i]) => {
      setCompanies((c.data as Company[]) ?? [])
      setProducts((p.data as Product[]) ?? [])
      setTeam((t.data as Profile[]) ?? [])
      setInvites((i.data as Invite[]) ?? [])
    })
  }, [])

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (companies ?? []).filter(
      (c) =>
        (stage === 'todas' || c.stage === stage) &&
        (!term || c.name.toLowerCase().includes(term) || c.contact_name.toLowerCase().includes(term) || c.contact_email.includes(term)),
    )
  }, [companies, q, stage])

  const planName = (id?: string | null) => products.find((p) => p.id === id)?.name ?? 'Sem plano recorrente'
  const personName = (id: string | null) => team.find((t) => t.id === id)?.full_name ?? '—'
  const inviteState = (id: string) => {
    const inv = invites.find((i) => i.company_id === id)
    if (!inv) return null
    return inv.accepted_at ? <Pill tone="ok">Já acessou</Pill> : <Pill tone="atencao">Convite pendente</Pill>
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza">Clientes</span>
          <h1 className="text-4xl font-extrabold tracking-tight">Carteira MOVE</h1>
        </div>
        {isManager && (
          <Link to="/admin/clientes/novo" className="inline-flex h-12 items-center gap-2 rounded-full bg-roxo px-6 font-bold text-white hover:bg-[#4A0C75]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            Novo cliente
          </Link>
        )}
      </header>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <label className="flex h-12 min-w-[240px] flex-1 items-center gap-2 rounded-full border border-linha bg-white px-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E5A66" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <span className="sr-only">Buscar cliente</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por empresa, responsável ou e-mail" className="w-full bg-transparent outline-none" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <span className="sr-only">Filtrar por etapa</span>
            <select value={stage} onChange={(e) => setStage(e.target.value as OnboardingStage | 'todas')} className="h-12 rounded-full border border-linha bg-white px-4 font-semibold outline-none">
              <option value="todas">Todas as etapas</option>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {companies === null ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState
            title={companies.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
            text={companies.length === 0 ? (isManager ? 'Cadastre o primeiro cliente quando uma proposta for aceita.' : 'Quando um cliente for atribuído a você, ele aparece aqui.') : 'Tente outro termo ou outra etapa.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-cinza">
                  <th className="px-3 py-2.5 font-bold">Empresa</th>
                  <th className="px-3 py-2.5 font-bold">Plano</th>
                  <th className="px-3 py-2.5 font-bold">Etapa</th>
                  <th className="px-3 py-2.5 font-bold">Social media</th>
                  <th className="px-3 py-2.5 font-bold">Início previsto</th>
                  {isManager && <th className="px-3 py-2.5 font-bold">Portal</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-linha hover:bg-offwhite">
                    <td className="px-3 py-3.5">
                      <Link to={`/admin/clientes/${c.id}`} className="block font-bold text-preto hover:text-roxo">{c.name}</Link>
                      <span className="text-xs text-cinza">{c.contact_name}</span>
                    </td>
                    <td className="px-3 py-3.5">{planName(c.plan_id)}{c.has_traffic && <span className="ml-2 text-xs font-bold text-roxo">+ tráfego</span>}</td>
                    <td className="px-3 py-3.5 font-semibold">{STAGE_LABEL[c.stage]}</td>
                    <td className="px-3 py-3.5">{personName(c.social_media_id)}</td>
                    <td className="px-3 py-3.5">{dateBR(c.start_date)}</td>
                    {isManager && <td className="px-3 py-3.5">{inviteState(c.id)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
