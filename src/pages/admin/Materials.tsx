import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STAGE_LABEL, type Company } from '../../lib/types'
import { materialProgress, type Material } from '../../lib/materials'
import { Card, EmptyState, Pill, Spinner } from '../../components/ui'

/** Visão geral para a coordenação: o que falta de cada cliente em onboarding. */
export default function Materials() {
  const [rows, setRows] = useState<{ company: Company; items: Material[] }[] | null>(null)

  useEffect(() => {
    Promise.all([
      supabase!.from('companies').select('*').neq('stage', 'ativo').order('created_at'),
      supabase!.from('company_materials').select('*'),
    ]).then(([c, m]) => {
      const mats = (m.data as Material[]) ?? []
      setRows(((c.data as Company[]) ?? []).map((company) => ({ company, items: mats.filter((x) => x.company_id === company.id) })))
    })
  }, [])

  if (rows === null) return <Spinner />

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza">Coordenação</span>
        <h1 className="text-4xl font-extrabold tracking-tight">Materiais e acessos</h1>
      </header>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Nenhum cliente em onboarding" text="Quando houver clientes em onboarding, o andamento dos materiais aparece aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-cinza">
                  <th className="px-3 py-2.5 font-bold">Cliente</th>
                  <th className="px-3 py-2.5 font-bold">Etapa</th>
                  <th className="px-3 py-2.5 font-bold">Para validar</th>
                  <th className="px-3 py-2.5 font-bold">Pendentes do cliente</th>
                  <th className="px-3 py-2.5 font-bold">Obrigatórios validados</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ company, items }) => {
                  const p = materialProgress(items)
                  const toReview = items.filter((i) => i.status === 'recebido').length
                  return (
                    <tr key={company.id} className="border-t border-linha hover:bg-offwhite">
                      <td className="px-3 py-3.5">
                        <Link to={`/admin/clientes/${company.id}/materiais`} className="font-bold hover:text-roxo">{company.name}</Link>
                      </td>
                      <td className="px-3 py-3.5">{STAGE_LABEL[company.stage]}</td>
                      <td className="px-3 py-3.5">{toReview > 0 ? <Pill tone="atencao">{toReview} para conferir</Pill> : '—'}</td>
                      <td className="px-3 py-3.5">{items.length === 0 ? <span className="text-cinza">Checklist não aberto</span> : p.pending > 0 ? <Pill tone="alerta">{p.pending} pendente(s)</Pill> : '—'}</td>
                      <td className="px-3 py-3.5">
                        {items.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-linha"><div className="h-full rounded-full bg-roxo" style={{ width: `${p.required ? (p.validated / p.required) * 100 : 0}%` }} /></div>
                            <span className="font-bold">{p.validated}/{p.required}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
