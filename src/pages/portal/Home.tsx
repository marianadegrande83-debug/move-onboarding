import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STAGES, type Company } from '../../lib/types'
import { progress, type Answers } from '../../lib/briefing'
import { Card, EmptyState, Spinner } from '../../components/ui'

interface BriefingRow { company_id: string; answers: Answers; status: 'em_andamento' | 'concluido' }

function BriefingCard({ company, briefing, services }: { company: Company; briefing?: BriefingRow; services: Set<string> }) {
  const sent = briefing?.status === 'concluido'
  const pct = briefing ? progress({ services, hasTraffic: company.has_traffic, answers: briefing.answers }) : 0
  const to = `/portal/briefing/${company.id}`
  return (
    <Card className={`flex flex-wrap items-center gap-5 ${sent ? '' : 'border-2 border-roxo'}`}>
      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-roxo-suave text-roxo">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 4H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2" /><rect x="9" y="2.5" width="6" height="3.5" rx="1" /><path d="M9 12h6M9 16h4" />
        </svg>
      </div>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h2 className="text-xl font-extrabold">Briefing Estratégico</h2>
        <p className="text-sm text-cinza">
          {sent ? 'Enviado. A equipe MOVE já está com as suas respostas.' : briefing ? `Você já preencheu ${pct}%. Continue de onde parou.` : '8 etapas para conhecermos o seu negócio a fundo. Você pode parar e continuar depois.'}
        </p>
        {!sent && briefing && (
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do briefing">
            <div className="h-full rounded-full bg-roxo" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <Link to={to} className={`inline-flex min-h-12 items-center rounded-full px-6 font-bold ${sent ? 'border-2 border-linha hover:border-roxo' : 'bg-roxo text-white hover:bg-[#4A0C75]'}`}>
        {sent ? 'Ver respostas' : briefing ? 'Continuar briefing' : 'Começar briefing'}
      </Link>
    </Card>
  )
}

export default function PortalHome() {
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [briefings, setBriefings] = useState<BriefingRow[]>([])
  const [services, setServices] = useState<{ company_id: string; product_id: string }[]>([])

  useEffect(() => {
    // As políticas do banco garantem que o cliente só recebe a(s) própria(s) empresa(s).
    Promise.all([
      supabase!.from('companies').select('*'),
      supabase!.from('briefings').select('company_id, answers, status'),
      supabase!.from('company_services').select('company_id, product_id'),
    ]).then(([c, b, s]) => {
      setCompanies((c.data as Company[]) ?? [])
      setBriefings((b.data as BriefingRow[]) ?? [])
      setServices(s.data ?? [])
    })
  }, [])

  if (companies === null) return <Spinner />
  if (companies.length === 0) {
    return <EmptyState title="Nenhuma empresa vinculada" text="Seu acesso ainda não foi ligado a uma empresa. Fale com a equipe MOVE." />
  }

  return (
    <>
      {companies.map((c) => {
        const idx = STAGES.findIndex((s) => s.key === c.stage)
        const active = c.stage === 'ativo'
        const pct = Math.round((idx / (STAGES.length - 1)) * 100)
        const svc = new Set(services.filter((s) => s.company_id === c.id).map((s) => s.product_id))
        return (
          <div key={c.id} className="flex flex-col gap-6">
            <section className="flex flex-wrap items-center justify-between gap-7 rounded-[28px] bg-preto p-6 text-offwhite md:p-11">
              <div className="flex flex-[1_1_420px] flex-col gap-3">
                <span className="self-start rounded-full bg-grafite px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-roxo-claro">
                  {active ? 'Cliente ativo' : 'Em onboarding'}
                </span>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-[44px]">
                  Olá, {c.contact_name.split(' ')[0]}! {active ? 'Que bom ter você com a gente.' : 'Estamos construindo a sua estratégia.'}
                </h1>
                <p className="max-w-xl text-[17px] leading-relaxed text-[#D6D0DE]">{c.name}</p>
              </div>
              {!active && (
                <div className="flex max-w-sm flex-[1_1_280px] flex-col gap-3 rounded-[20px] bg-grafite p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">Sua jornada</span>
                    <span className="text-3xl font-extrabold">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#2E2836]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do onboarding">
                    <div className="h-full rounded-full bg-roxo-claro" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-[#D6D0DE]">Etapa atual: {STAGES[idx].label} · {idx + 1} de {STAGES.length}</span>
                </div>
              )}
            </section>

            <BriefingCard company={c} briefing={briefings.find((b) => b.company_id === c.id)} services={svc} />

            <Card className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold">Meu onboarding</h2>
              <div className="overflow-x-auto">
                <ol className="grid min-w-[860px] grid-cols-7 gap-2">
                  {STAGES.map((s, i) => {
                    const state = i < idx ? 'done' : i === idx ? 'now' : 'next'
                    return (
                      <li key={s.key} className="flex flex-col gap-2.5">
                        <div className={`h-1.5 rounded-full ${state === 'next' ? 'bg-linha' : 'bg-roxo'}`} />
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-extrabold ${state === 'done' ? 'bg-roxo text-white' : state === 'now' ? 'bg-preto text-white' : 'bg-linha text-cinza'}`}>
                            {state === 'done' ? '✓' : i + 1}
                          </span>
                          <span className="text-sm font-extrabold leading-tight">{s.label}</span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </Card>
          </div>
        )
      })}
    </>
  )
}
