import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Company } from '../../lib/types'
import { loadMaterials, materialProgress, type Material } from '../../lib/materials'
import { MaterialCard } from '../../components/materials/MaterialCard'
import { EmptyState, Spinner } from '../../components/ui'

export default function Materials() {
  const { companyId } = useParams()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [items, setItems] = useState<Material[] | null>(null)

  useEffect(() => {
    if (!companyId) return
    supabase!.from('companies').select('*').eq('id', companyId).maybeSingle().then(({ data }) => setCompany((data as Company) ?? null))
    loadMaterials(companyId).then(setItems)
  }, [companyId])

  if (company === undefined || items === null) return <Spinner />
  if (company === null) return <EmptyState title="Empresa não encontrada" text="Volte ao início do portal e tente de novo." />

  const p = materialProgress(items)
  const pct = p.required ? Math.round((p.sent / p.required) * 100) : 0
  const update = (m: Material) => setItems((list) => list!.map((i) => (i.item_key === m.item_key ? m : i)))
  const files = items.filter((i) => i.kind === 'arquivo')
  const accesses = items.filter((i) => i.kind === 'acesso')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-[28px] bg-preto p-6 text-offwhite md:p-8">
        <Link to="/portal" className="text-xs font-bold uppercase tracking-[0.14em] text-roxo-claro">← Início</Link>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Materiais e acessos</h1>
        <p className="max-w-2xl leading-relaxed text-[#D6D0DE]">
          Envie os arquivos da marca e libere os acessos às contas. Assim que os itens obrigatórios forem validados, começamos a desenvolver a sua estratégia.
        </p>
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#2E2836]" role="progressbar" aria-label="Itens obrigatórios enviados" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-roxo-claro transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-bold">{p.sent} de {p.required} obrigatórios enviados · {p.validated} validados</span>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Arquivos da marca</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {files.map((m) => <MaterialCard key={m.item_key} item={m} onChange={update} />)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold">Acessos às contas</h2>
          <p className="text-sm text-cinza">Todos os acessos são liberados por convite. A MOVE nunca pede a sua senha.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {accesses.map((m) => <MaterialCard key={m.item_key} item={m} onChange={update} />)}
        </div>
      </section>
    </div>
  )
}
