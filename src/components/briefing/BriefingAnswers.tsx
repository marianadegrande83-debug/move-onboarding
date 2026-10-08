import { supabase } from '../../lib/supabase'
import { STEPS, isFilled, visibleFields, type BriefingContext, type FileRef } from '../../lib/briefing'

async function openFile(ref: FileRef) {
  // Link temporário (5 min): arquivos nunca ficam públicos
  const { data } = await supabase!.storage.from('client-files').createSignedUrl(ref.path, 300, { download: ref.name })
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}

function Value({ v }: { v: unknown }) {
  if (!isFilled(v)) return <span className="text-cinza">Não respondido</span>
  if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
    return (
      <ul className="flex flex-col gap-1.5">
        {(v as FileRef[]).map((f) => (
          <li key={f.path}>
            <button type="button" onClick={() => openFile(f)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-roxo-suave px-3 text-sm font-bold text-roxo hover:bg-roxo hover:text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v12M7 11l5 5 5-5M5 20h14" /></svg>
              {f.name}
            </button>
          </li>
        ))}
      </ul>
    )
  }
  if (Array.isArray(v)) return <span>{(v as string[]).join(' · ')}</span>
  return <span className="whitespace-pre-line">{String(v)}</span>
}

export function BriefingAnswers({ ctx }: { ctx: BriefingContext }) {
  return (
    <div className="flex flex-col gap-5">
      {STEPS.map((s) => (
        <section key={s.n} className="break-inside-avoid rounded-3xl bg-white p-6">
          <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-roxo text-sm text-white">{s.n}</span>
            {s.title}
          </h2>
          <dl>
            {visibleFields(s, ctx).map((f) => (
              <div key={f.id} className="grid gap-1 border-t border-linha py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-6">
                <dt className="text-sm font-semibold text-cinza">{f.label}</dt>
                <dd className="leading-relaxed"><Value v={ctx.answers[f.id]} /></dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
