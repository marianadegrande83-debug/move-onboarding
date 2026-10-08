import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import type { Company } from '../../lib/types'
import { progress, type Answers } from '../../lib/briefing'
import { BriefingAnswers } from '../../components/briefing/BriefingAnswers'
import { EmptyState, Pill, Spinner } from '../../components/ui'
import { dateTimeBR } from '../../lib/format'

interface Row { answers: Answers; status: 'em_andamento' | 'concluido'; submitted_at: string | null; updated_at: string }

export default function ClientBriefing() {
  const { id } = useParams()
  const { profile } = useAuth()
  const isManager = profile?.role === 'admin' || profile?.role === 'coordenacao'
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [services, setServices] = useState<Set<string>>(new Set())
  const [row, setRow] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase!.from('companies').select('*').eq('id', id).maybeSingle(),
      supabase!.from('company_services').select('product_id').eq('company_id', id),
      supabase!.from('briefings').select('answers, status, submitted_at, updated_at').eq('company_id', id).maybeSingle(),
    ]).then(([c, s, b]) => {
      setCompany((c.data as Company) ?? null)
      setServices(new Set((s.data ?? []).map((r: { product_id: string }) => r.product_id)))
      setRow((b.data as Row) ?? null)
    })
  }, [id])

  async function reopen() {
    if (!id) return
    setBusy(true)
    const { error } = await supabase!.from('briefings').update({ status: 'em_andamento', submitted_at: null }).eq('company_id', id)
    setBusy(false)
    if (!error) setRow((r) => (r ? { ...r, status: 'em_andamento', submitted_at: null } : r))
  }

  if (company === undefined) return <Spinner />
  if (company === null) return <EmptyState title="Cliente não encontrado" text="Ele pode ter sido removido ou você não tem acesso a ele." />

  const ctx = { services, hasTraffic: company.has_traffic, answers: row?.answers ?? {} }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-1.5">
          <Link to={`/admin/clientes/${company.id}`} className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza hover:text-roxo">← {company.name}</Link>
          <h1 className="text-4xl font-extrabold tracking-tight">Briefing Estratégico</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-cinza">
            {!row ? (
              <Pill tone="neutro">Não iniciado</Pill>
            ) : row.status === 'concluido' ? (
              <Pill tone="ok">Enviado em {dateTimeBR(row.submitted_at!)}</Pill>
            ) : (
              <>
                <Pill tone="atencao">Em preenchimento · {progress(ctx)}%</Pill>
                <span>Última alteração {dateTimeBR(row.updated_at)}</span>
              </>
            )}
          </div>
        </div>
        {row && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-full border-2 border-linha px-5 font-bold hover:border-roxo">Imprimir / salvar PDF</button>
            {isManager && row.status === 'concluido' && (
              <button type="button" onClick={reopen} disabled={busy} className="min-h-11 rounded-full bg-preto px-5 font-bold text-white disabled:opacity-60">
                {busy ? 'Liberando…' : 'Liberar edição para o cliente'}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="hidden print:block">
        <h1 className="text-2xl font-extrabold">Briefing Estratégico · {company.name}</h1>
        {row?.submitted_at && <p>Enviado em {dateTimeBR(row.submitted_at)}</p>}
      </div>

      {!row ? (
        <EmptyState title="O cliente ainda não começou o briefing" text="Assim que ele abrir o portal e começar a responder, as respostas aparecem aqui em tempo real." />
      ) : (
        <BriefingAnswers ctx={ctx} />
      )}
    </>
  )
}
