import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { STAGE_LABEL, type Company } from '../../lib/types'
import { STATUS_LABEL, loadMaterials, materialProgress, type Material, type MaterialStatus } from '../../lib/materials'
import { fileSize, openFile } from '../../lib/files'
import { Card, EmptyState, Pill, Spinner } from '../../components/ui'
import { dateBR, dateTimeBR } from '../../lib/format'

const tone = (s: MaterialStatus) => (s === 'validado' ? 'ok' : s === 'recebido' ? 'atencao' : 'neutro') as 'ok' | 'atencao' | 'neutro'

function Row({ item, canEdit, onSaved }: { item: Material; canEdit: boolean; onSaved: () => void }) {
  const { profile } = useAuth()
  const [note, setNote] = useState(item.team_note ?? '')
  const [busy, setBusy] = useState(false)

  async function update(patch: Partial<Material> & { validated_by?: string | null }) {
    setBusy(true)
    await supabase!.from('company_materials').update(patch).eq('company_id', item.company_id).eq('item_key', item.item_key)
    setBusy(false)
    onSaved()
  }

  const setStatus = (s: MaterialStatus) =>
    update({ status: s, validated_at: s === 'validado' ? new Date().toISOString() : null, validated_by: s === 'validado' ? profile!.id : null })

  return (
    <li className="flex flex-col gap-3 border-t border-linha py-4 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-extrabold">{item.title}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-cinza">{item.kind === 'acesso' ? 'Acesso' : 'Arquivo'} · {item.required ? 'Obrigatório' : 'Opcional'}</span>
        </div>
        {canEdit ? (
          <div role="group" aria-label={`Situação de ${item.title}`} className="flex flex-wrap gap-1.5">
            {(['pendente', 'recebido', 'validado'] as MaterialStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                aria-pressed={item.status === s}
                onClick={() => item.status !== s && setStatus(s)}
                className={`min-h-10 rounded-full px-4 text-sm font-bold ${item.status === s ? (s === 'validado' ? 'bg-ok text-white' : s === 'recebido' ? 'bg-atencao text-white' : 'bg-preto text-white') : 'border-2 border-linha hover:border-roxo'}`}
              >
                {s === 'pendente' ? 'Pendente' : s === 'recebido' ? 'Recebido' : 'Validado'}
              </button>
            ))}
          </div>
        ) : (
          <Pill tone={tone(item.status)}>{STATUS_LABEL[item.status]}</Pill>
        )}
      </div>

      {item.files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {item.files.map((f) => (
            <li key={f.path}>
              <button type="button" onClick={() => openFile(f)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-roxo-suave px-3 text-sm font-bold text-roxo hover:bg-roxo hover:text-white">
                {f.name} <span className="font-normal opacity-70">{fileSize(f.size)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {item.client_note && <p className="rounded-xl bg-offwhite px-3 py-2 text-sm"><strong>Cliente:</strong> {item.client_note}</p>}
      {item.validated_at && <p className="text-xs text-cinza">Validado em {dateTimeBR(item.validated_at)}</p>}

      {canEdit && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-cinza">Recado para o cliente (aparece no portal)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (item.team_note ?? '') && update({ team_note: note.trim() || null })}
            placeholder={item.kind === "acesso" ? "Ex.: o convite não chegou, pode reenviar?" : "Ex.: pode enviar uma versão em melhor resolução?"}
            className="h-11 rounded-xl border-[1.5px] border-[#D4D4D4] px-3 text-sm outline-none focus:border-roxo"
          />
        </label>
      )}
    </li>
  )
}

export default function ClientMaterials() {
  const { id } = useParams()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'coordenacao'
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [items, setItems] = useState<Material[] | null>(null)
  const [hasBriefing, setHasBriefing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [c, b] = await Promise.all([
      supabase!.from('companies').select('*').eq('id', id).maybeSingle(),
      supabase!.from('briefings').select('status').eq('company_id', id).maybeSingle(),
    ])
    setCompany((c.data as Company) ?? null)
    setHasBriefing(b.data?.status === 'concluido')
    setItems(await loadMaterials(id))
  }, [id])

  useEffect(() => { load() }, [load])

  if (company === undefined || items === null) return <Spinner />
  if (company === null) return <EmptyState title="Cliente não encontrado" text="Ele pode ter sido removido ou você não tem acesso a ele." />

  const p = materialProgress(items)
  const waiting: string[] = []
  if (!hasBriefing) waiting.push('o briefing ser enviado')
  if (p.validated < p.required) waiting.push(`validar ${p.required - p.validated} ${p.required - p.validated === 1 ? 'item obrigatório' : 'itens obrigatórios'}`)
  if (company.stage !== 'materiais' && !company.strategy_started_at) waiting.push('a etapa do cliente estar em "Materiais e acessos" (depois do contrato)')

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <Link to={`/admin/clientes/${company.id}`} className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza hover:text-roxo">← {company.name}</Link>
        <h1 className="text-4xl font-extrabold tracking-tight">Materiais e acessos</h1>
        <p className="text-cinza">{p.validated} de {p.required} obrigatórios validados · etapa atual: {STAGE_LABEL[company.stage]}</p>
      </header>

      {company.strategy_started_at ? (
        <div role="status" className="rounded-2xl bg-ok-suave px-5 py-4 font-semibold text-ok">
          Prazo da estratégia iniciado em {dateBR(company.strategy_started_at)}. Entrega prevista: {dateBR(company.strategy_due_at)}.
        </div>
      ) : (
        <div className="rounded-2xl bg-roxo-suave px-5 py-4 text-sm text-roxo">
          <strong>O prazo de 7 dias da estratégia começa sozinho</strong> quando tudo estiver pronto. Falta: {waiting.join('; ') || 'nada, deve iniciar em instantes'}.
        </div>
      )}

      {(['arquivo', 'acesso'] as const).map((kind) => (
        <Card key={kind} className="flex flex-col gap-1">
          <h2 className="mb-1 text-xl font-extrabold">{kind === 'arquivo' ? 'Arquivos da marca' : 'Acessos às contas'}</h2>
          <ul>
            {items.filter((i) => i.kind === kind).map((i) => <Row key={i.item_key + i.updated_at} item={i} canEdit={canEdit} onSaved={load} />)}
          </ul>
        </Card>
      ))}
    </>
  )
}
