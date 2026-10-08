import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES, type Company } from '../../lib/types'
import { Card, EmptyState, Spinner } from '../../components/ui'

export default function PortalHome() {
  const [companies, setCompanies] = useState<Company[] | null>(null)

  useEffect(() => {
    // As políticas do banco garantem que o cliente só recebe a(s) própria(s) empresa(s).
    supabase!
      .from('companies')
      .select('id, name, contact_name, contact_email, stage, has_traffic, social_media_id, traffic_id, updated_at')
      .then(({ data }) => setCompanies((data as Company[]) ?? []))
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
                    <span className="font-bold">Seu progresso</span>
                    <span className="text-3xl font-extrabold">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#2E2836]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-roxo-claro" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-[#D6D0DE]">Etapa atual: {STAGES[idx].label} · {idx + 1} de {STAGES.length}</span>
                </div>
              )}
            </section>

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
              <p className="text-sm text-cinza">Pendências, documentos e próximos passos aparecem aqui conforme os próximos módulos forem liberados.</p>
            </Card>
          </div>
        )
      })}
    </>
  )
}
