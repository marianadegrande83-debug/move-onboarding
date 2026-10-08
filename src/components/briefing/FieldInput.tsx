import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { maskCEP, maskDocument, type Field, type FileRef } from '../../lib/briefing'

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#D4D4D4] bg-white px-3 text-base outline-none focus:border-roxo aria-[invalid=true]:border-alerta'
const MAX_FILE = 50 * 1024 * 1024

interface Props {
  field: Field
  value: unknown
  error?: string
  required: boolean
  companyId: string
  onChange: (v: unknown) => void
  onCep?: (cep: string) => void
}

const safeName = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)
const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export function FieldInput({ field: f, value, error, required, companyId, onChange, onCep }: Props) {
  const id = `f-${f.id}`
  const describedBy = [f.help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const label = (
    <span className="text-sm font-bold">
      {f.label}
      {required ? <span className="text-roxo" aria-hidden> *</span> : <span className="font-normal text-cinza"> (opcional)</span>}
    </span>
  )

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return
    setUploadError(null)
    setUploading(true)
    const current = (Array.isArray(value) ? value : []) as FileRef[]
    const added: FileRef[] = []
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE) {
        setUploadError(`"${file.name}" passa de 50 MB. Envie por link (Drive, WeTransfer) no campo de observações.`)
        continue
      }
      const path = `${companyId}/briefing/${f.id}/${Date.now()}-${safeName(file.name)}`
      const { error: err } = await supabase!.storage.from('client-files').upload(path, file, { upsert: false })
      if (err) {
        setUploadError(`Não foi possível enviar "${file.name}". Tente de novo.`)
        continue
      }
      added.push({ path, name: file.name, size: file.size })
    }
    setUploading(false)
    if (added.length) onChange([...current, ...added])
  }

  async function removeFile(ref: FileRef) {
    await supabase!.storage.from('client-files').remove([ref.path])
    onChange(((value as FileRef[]) ?? []).filter((x) => x.path !== ref.path))
  }

  const help = f.help && <span id={`${id}-help`} className="text-xs text-cinza">{f.help}</span>
  const err = error && <span id={`${id}-err`} className="text-sm font-semibold text-alerta">{error}</span>

  if (f.type === 'radio' || f.type === 'checkboxes') {
    const multi = f.type === 'checkboxes'
    const arr = multi ? ((value as string[]) ?? []) : []
    return (
      <fieldset className="flex flex-col gap-2" aria-describedby={describedBy}>
        <legend className="mb-2">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {f.options!.map((o) => {
            const on = multi ? arr.includes(o) : value === o
            return (
              <label key={o} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition ${on ? 'border-roxo bg-roxo text-white' : 'border-linha bg-white hover:border-roxo-claro'}`}>
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={id}
                  className="sr-only"
                  checked={on}
                  onChange={() => onChange(multi ? (on ? arr.filter((x) => x !== o) : [...arr, o]) : o)}
                />
                {on && <span aria-hidden>✓</span>}
                {o}
              </label>
            )
          })}
        </div>
        {help}
        {err}
      </fieldset>
    )
  }

  if (f.type === 'files') {
    const files = (Array.isArray(value) ? value : []) as FileRef[]
    return (
      <div className="flex flex-col gap-2">
        {label}
        {files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {files.map((x) => (
              <li key={x.path} className="flex items-center justify-between gap-3 rounded-xl bg-offwhite px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{x.name} <span className="font-normal text-cinza">· {kb(x.size)}</span></span>
                <button type="button" onClick={() => removeFile(x)} className="min-h-9 flex-none rounded-full px-3 font-bold text-alerta hover:bg-alerta-suave">Remover</button>
              </li>
            ))}
          </ul>
        )}
        <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-5 text-center ${uploading ? 'border-roxo bg-roxo-suave' : 'border-linha bg-white hover:border-roxo-claro'}`}>
          <input type="file" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = '' }} disabled={uploading} aria-describedby={describedBy} />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B108F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
          <span className="font-bold text-roxo">{uploading ? 'Enviando…' : 'Escolher arquivos'}</span>
          <span className="text-xs text-cinza">Até 50 MB por arquivo</span>
        </label>
        {help}
        {uploadError && <span className="text-sm font-semibold text-alerta">{uploadError}</span>}
        {err}
      </div>
    )
  }

  const str = (value as string) ?? ''
  let control
  if (f.type === 'textarea') {
    control = <textarea id={id} rows={4} className={`${inputCls} py-3 leading-relaxed`} value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} placeholder={f.placeholder} />
  } else if (f.type === 'select') {
    control = (
      <select id={id} className={`${inputCls} h-12`} value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy}>
        <option value="">Selecione</option>
        {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  } else {
    const kind = f.type === 'document' ? (f.id === 'cnpj' ? 'cnpj' : 'cpf') : null
    control = (
      <input
        id={id}
        type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
        inputMode={f.type === 'cep' || kind ? 'numeric' : f.type === 'tel' ? 'tel' : undefined}
        className={`${inputCls} h-12`}
        value={str}
        placeholder={f.placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(e) => {
          let v = e.target.value
          if (kind) v = maskDocument(v, kind)
          if (f.type === 'cep') {
            v = maskCEP(v)
            if (v.replace(/\D/g, '').length === 8) onCep?.(v)
          }
          onChange(v)
        }}
      />
    )
  }

  return (
    <label htmlFor={id} className={`flex flex-col gap-1.5 ${f.half ? '' : 'sm:col-span-2'}`}>
      {label}
      {control}
      {help}
      {err}
    </label>
  )
}
