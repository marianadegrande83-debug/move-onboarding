import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { STAGES, type Company, type OnboardingStage } from '../../lib/types'
import { Card, EmptyState, Spinner } from '../../components/ui'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase!
      .from('companies')
      .select('id, name, contact_name, contact_email, stage, has_traffic, social_media_id, traffic_id, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError('Não foi possível carregar os clientes.')
        setCompanies((data as Company[]) ?? [])
      })
  }, [])

  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const count = (s: OnboardingStage) => companies?.filter((c) => c.stage === s).length ?? 0
  const inOnboarding = companies?.filter((c) => c.stage !== 'ativo').length ?? 0
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  const kpis = [
    { label: 'Em onboarding', value: inOnboarding, tone: 'dark' as const },
    { label: 'Aguardando briefing', value: count('briefing') },
    { label: 'Em contrato', value: count('contrato') },
    { label: 'Materiais e acessos', value: count('materiais') },
    { label: 'Estratégia em desenvolvimento', value: count('estrategia') },
    { label: 'Aguardando aprovação', value: count('aprovacao') },
    { label: 'Transição Trello', value: count('transicao') },
    { label: 'Clientes ativos', value: count('ativo'), tone: 'accent' as const },
  ]

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza">{today}</span>
        <h1 className="text-4xl font-extrabold tracking-tight">{greeting()}{firstName ? `, ${firstName}` : ''}.</h1>
      </header>

      {error && <p role="alert" className="rounded-2xl bg-alerta-suave px-4 py-3 font-semibold text-alerta">{error}</p>}

      {companies === null ? (
        <Spinner />
      ) : (
        <>
          <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`flex min-h-32 flex-col gap-2.5 rounded-[20px] p-[18px] ${
                  k.tone === 'dark' ? 'bg-preto text-offwhite' : k.tone === 'accent' ? 'bg-roxo text-white' : 'bg-white'
                }`}
              >
                <span className={`text-[13px] font-semibold leading-snug ${k.tone ? 'text-[#E9E4F0]' : 'text-cinza'}`}>{k.label}</span>
                <span className="text-[40px] font-extrabold leading-none tracking-tight">{k.value}</span>
              </div>
            ))}
          </section>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-extrabold">Jornada do onboarding</h2>
              <span className="text-sm text-cinza">clientes por etapa</span>
            </div>
            {companies.length === 0 ? (
              <EmptyState
                title="Nenhum cliente cadastrado ainda"
                text="O cadastro de clientes chega no módulo 3. Assim que o primeiro cliente entrar, ele aparece aqui na etapa certa."
              />
            ) : (
              <div className="overflow-x-auto pb-1.5">
                <div className="grid min-w-[960px] grid-cols-7 gap-2.5">
                  {STAGES.map((s, i) => {
                    const list = companies.filter((c) => c.stage === s.key)
                    return (
                      <div key={s.key} className="flex min-h-52 flex-col gap-2.5 rounded-2xl bg-offwhite p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cinza">{String(i + 1).padStart(2, '0')}</span>
                          <span className="rounded-full bg-preto px-2.5 py-0.5 text-xs font-extrabold text-offwhite">{list.length}</span>
                        </div>
                        <span className="font-extrabold leading-tight">{s.label}</span>
                        <span className="text-xs text-cinza">{s.owner}</span>
                        {list.slice(0, 4).map((c) => (
                          <div key={c.id} className="rounded-xl border border-linha bg-white px-2.5 py-2 text-sm font-semibold">{c.name}</div>
                        ))}
                        {list.length > 4 && <span className="text-xs font-bold text-cinza">+{list.length - 4}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  )
}
