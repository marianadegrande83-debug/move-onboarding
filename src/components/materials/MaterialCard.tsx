import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MATERIAL_HELP, STATUS_LABEL, type Material } from '../../lib/materials'
import { fileSize, openFile, removeFile, uploadFiles } from '../../lib/files'
import type { FileRef } from '../../lib/briefing'
import { Pill } from '../ui'

const tone = (s: Material['status']) => (s === 'validado' ? 'ok' : s === 'recebido' ? 'atencao' : 'neutro') as 'ok' | 'atencao' | 'neutro'

/** Item da Central de Materiais visto pelo cliente. */
export function MaterialCard({ item, onChange }: { item: Material; onChange: (m: Material) => void }) {
  const [note, setNote] = useState(item.client_note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const help = MATERIAL_HELP[item.item_key]
  const locked = item.status === 'validado'

  async function save(files: FileRef[], markSent: boolean, noteValue = note) {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase!.rpc('client_update_material', {
      cid: item.company_id, key: item.item_key, new_files: files, note: noteValue.trim() || null, mark_sent: markSent,
    })
    setBusy(false)
    if (err) {
      setError('Não foi possível salvar. Tente de novo.')
      return false
    }
    onChange({ ...item, files, client_note: noteValue.trim() || null, status: markSent && item.status !== 'validado' ? 'recebido' : item.status })
    return true
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    const { added, errors } = await uploadFiles(item.company_id, `materiais/${item.item_key}`, list)
    setBusy(false)
    if (errors.length) setError(errors.join(' '))
    if (added.length) await save([...item.files, ...added], false)
  }

  async function onRemove(ref: FileRef) {
    await removeFile(ref)
    await save(item.files.filter((f) => f.path !== ref.path), false)
  }

  const canSend = item.kind === 'acesso' || item.files.length > 0 || note.trim() !== ''

  return (
    <article className={`flex flex-col gap-4 rounded-3xl bg-white p-5 md:p-6 ${item.required && item.status === 'pendente' ? 'ring-2 ring-roxo-claro' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-extrabold">{item.title}</h3>
          <span className="text-xs font-bold uppercase tracking-wider text-cinza">{item.required ? 'Obrigatório' : 'Opcional'}</span>
        </div>
        <Pill tone={tone(item.status)}>{STATUS_LABEL[item.status]}</Pill>
      </header>

      {help && (
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-cinza">
          <p>{help.text}</p>
          {help.steps && (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5">
              {help.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          )}
        </div>
      )}

      {item.team_note && (
        <p className="rounded-2xl bg-atencao-suave px-4 py-3 text-sm text-atencao"><strong>Recado da MOVE:</strong> {item.team_note}</p>
      )}

      {item.files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {item.files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 rounded-xl bg-offwhite px-3 py-2 text-sm">
              <button type="button" onClick={() => openFile(f)} className="min-w-0 truncate text-left font-semibold hover:text-roxo">
                {f.name} <span className="font-normal text-cinza">· {fileSize(f.size)}</span>
              </button>
              {!locked && (
                <button type="button" onClick={() => onRemove(f)} disabled={busy} className="min-h-9 flex-none rounded-full px-3 font-bold text-alerta hover:bg-alerta-suave">Remover</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!locked && item.kind === 'arquivo' && (
        <label className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-4 text-center ${busy ? 'border-roxo bg-roxo-suave' : 'border-linha hover:border-roxo-claro'}`}>
          <input type="file" multiple className="sr-only" disabled={busy} onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          <span className="font-bold text-roxo">{busy ? 'Enviando…' : 'Escolher arquivos'}</span>
          <span className="text-xs text-cinza">Até 50 MB por arquivo</span>
        </label>
      )}

      {!locked && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Observação <span className="font-normal text-cinza">(opcional)</span></span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (item.client_note ?? '') && save(item.files, false)}
            placeholder={item.kind === 'acesso' ? 'Ex.: convite enviado em nome de…, ou "preciso de ajuda"' : 'Ex.: link do Google Drive com os vídeos'}
            className="rounded-xl border-[1.5px] border-[#D4D4D4] p-3 outline-none focus:border-roxo"
          />
        </label>
      )}

      {error && <p role="alert" className="text-sm font-semibold text-alerta">{error}</p>}

      {!locked && item.status === 'pendente' && (
        <button
          type="button"
          disabled={busy || !canSend}
          onClick={() => save(item.files, true)}
          className="min-h-12 self-start rounded-full bg-roxo px-6 font-bold text-white hover:bg-[#4A0C75] disabled:opacity-50"
        >
          {item.kind === 'acesso' ? 'Já concedi o acesso' : 'Marcar como enviado'}
        </button>
      )}
      {item.status === 'recebido' && <p className="text-sm text-cinza">A equipe MOVE vai conferir e validar. Se precisar de algo, avisamos aqui.</p>}
    </article>
  )
}
