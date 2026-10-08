import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Company } from '../../lib/types'
import { Card, EmptyState, Spinner } from '../../components/ui'
import { FieldInput } from '../../components/briefing/FieldInput'
import { BriefingAnswers } from '../../components/briefing/BriefingAnswers'
import { STEPS, isRequired, progress, stepErrors, visibleFields, type Answers, type BriefingContext } from '../../lib/briefing'
import { dateTimeBR, phoneBR } from '../../lib/format'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const REVIEW = STEPS.length + 1

export default function Briefing() {
  const { companyId } = useParams()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [services, setServices] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<'em_andamento' | 'concluido'>('em_andamento')
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [save, setSave] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const topRef = useRef<HTMLDivElement>(null)

  // Carregar
  useEffect(() => {
    if (!companyId) return
    const db = supabase!
    Promise.all([
      db.from('companies').select('*').eq('id', companyId).maybeSingle(),
      db.from('company_services').select('product_id').eq('company_id', companyId),
      db.from('briefings').select('answers, current_step, status, submitted_at').eq('company_id', companyId).maybeSingle(),
    ]).then(([c, s, b]) => {
      const comp = (c.data as Company) ?? null
      setCompany(comp)
      setServices(new Set((s.data ?? []).map((r: { product_id: string }) => r.product_id)))
      if (b.data) {
        setAnswers(b.data.answers ?? {})
        setStep(Math.min(Math.max(1, b.data.current_step), REVIEW))
        setStatus(b.data.status)
        setSubmittedAt(b.data.submitted_at)
      } else if (comp) {
        // Primeiro acesso: já traz o que a MOVE cadastrou
        setAnswers({
          email: comp.contact_email,
          whatsapp: phoneBR(comp.whatsapp) === '—' ? '' : phoneBR(comp.whatsapp),
          responsavel_relacionamento: comp.contact_name,
          email_contrato: comp.contact_email,
        })
      }
    })
  }, [companyId])

  const ctx: BriefingContext = useMemo(() => ({ services, hasTraffic: !!company?.has_traffic, answers }), [services, company, answers])
  const pct = progress(ctx)

  // Salvamento automático
  const persist = useCallback(
    async (a: Answers, st: number) => {
      if (!companyId) return
      setSave('saving')
      const { error } = await supabase!.from('briefings').upsert({ company_id: companyId, answers: a, current_step: st }, { onConflict: 'company_id' })
      if (error) {
        console.error('[briefing] erro ao salvar', error)
        setSave('error')
      } else {
        dirty.current = false
        setSave('saved')
        setSavedAt(new Date())
      }
    },
    [companyId],
  )

  useEffect(() => {
    if (!dirty.current || status === 'concluido') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => persist(answers, step), 1200)
    return () => window.clearTimeout(timer.current)
  }, [answers, step, persist, status])

  // Não perder alterações ao fechar a aba
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const setValue = (id: string, v: unknown) => {
    dirty.current = true
    setAnswers((a) => ({ ...a, [id]: v }))
    setErrors((e) => {
      if (!e[id]) return e
      const n = { ...e }
      delete n[id]
      return n
    })
  }

  async function fillFromCep(cep: string) {
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
      const d = await r.json()
      if (d.erro) return
      dirty.current = true
      setAnswers((a) => ({
        ...a,
        logradouro: a.logradouro || d.logradouro || '',
        bairro: a.bairro || d.bairro || '',
        cidade: a.cidade || d.localidade || '',
        uf: a.uf || d.uf || '',
      }))
    } catch {
      /* sem internet ou CEP fora do ar: o cliente preenche à mão */
    }
  }

  function goTo(n: number) {
    dirty.current = true
    setStep(n)
    setErrors({})
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function next() {
    const errs = stepErrors(STEPS[step - 1], ctx)
    if (Object.keys(errs).length) {
      setErrors(errs)
      const first = document.getElementById(`f-${Object.keys(errs)[0]}`) ?? document.querySelector('[aria-invalid="true"]')
      ;(first as HTMLElement | null)?.focus()
      return
    }
    goTo(step + 1)
  }

  const pending = STEPS.map((s) => ({ step: s, errs: Object.keys(stepErrors(s, ctx)).length }))
  const allValid = pending.every((p) => p.errs === 0)

  async function submit() {
    if (!companyId || !allValid) return
    setSubmitError(null)
    setSubmitting(true)
    window.clearTimeout(timer.current)
    await persist(answers, REVIEW)
    const { error } = await supabase!.rpc('submit_briefing', { cid: companyId })
    setSubmitting(false)
    if (error) {
      setSubmitError('Não foi possível enviar agora. Suas respostas estão salvas; tente de novo em instantes.')
      return
    }
    setStatus('concluido')
    setSubmittedAt(new Date().toISOString())
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (company === undefined) return <Spinner />
  if (company === null) return <EmptyState title="Briefing não encontrado" text="Volte ao início do portal e tente de novo." />

  // ----------------------------- Enviado -----------------------------
  if (status === 'concluido') {
    return (
      <div ref={topRef} className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-[28px] bg-preto p-6 text-offwhite md:p-10">
          <span className="self-start rounded-full bg-grafite px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-roxo-claro">Briefing enviado</span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Obrigada! Recebemos tudo.</h1>
          <p className="max-w-2xl leading-relaxed text-[#D6D0DE]">
            {submittedAt && <>Enviado em {dateTimeBR(submittedAt)}. </>}A equipe MOVE já foi avisada. O próximo passo é o contrato, que você assina pelo gov.br.
            Precisa mudar alguma resposta? Fale com a gente que liberamos a edição.
          </p>
          <Link to="/portal" className="mt-2 inline-flex min-h-12 items-center self-start rounded-full bg-white px-6 font-bold text-preto">Voltar ao início</Link>
        </section>
        <BriefingAnswers ctx={ctx} />
      </div>
    )
  }

  // ----------------------------- Preenchimento -----------------------------
  const current = STEPS[step - 1]
  const saveLabel =
    save === 'saving' ? 'Salvando…' : save === 'error' ? 'Não foi possível salvar. Verifique sua internet.' : savedAt ? `Salvo às ${savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Salvamento automático'

  return (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-[28px] bg-preto p-6 text-offwhite md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-roxo-claro">Briefing Estratégico · {company.name}</span>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{step === REVIEW ? 'Revisão e envio' : `${step}. ${current.title}`}</h1>
          </div>
          <span role="status" className={`text-sm ${save === 'error' ? 'font-bold text-[#FF9B8F]' : 'text-[#BDB6C9]'}`}>{saveLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#2E2836]" role="progressbar" aria-label="Progresso do briefing" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-roxo-claro transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-12 text-right font-extrabold">{pct}%</span>
        </div>
        <nav aria-label="Etapas do briefing" className="-mx-1 overflow-x-auto">
          <ol className="flex min-w-max gap-1.5 px-1">
            {STEPS.map((s) => {
              const on = s.n === step
              const ok = pending[s.n - 1].errs === 0
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    onClick={() => goTo(s.n)}
                    aria-current={on ? 'step' : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold ${on ? 'bg-white text-preto' : 'text-[#D6D0DE] hover:bg-grafite'}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${ok ? 'bg-roxo text-white' : on ? 'bg-preto text-white' : 'bg-[#2E2836]'}`}>{ok ? '✓' : s.n}</span>
                    <span className={on ? 'inline' : 'sr-only'}>{s.title}</span>
                  </button>
                </li>
              )
            })}
            <li>
              <button type="button" onClick={() => goTo(REVIEW)} aria-current={step === REVIEW ? 'step' : undefined} className={`flex min-h-11 items-center rounded-full px-3 text-sm font-bold ${step === REVIEW ? 'bg-white text-preto' : 'text-[#D6D0DE] hover:bg-grafite'}`}>
                Enviar
              </button>
            </li>
          </ol>
        </nav>
      </header>

      {step === REVIEW ? (
        <Card className="flex flex-col gap-5">
          <p className="leading-relaxed text-cinza">Confira se está tudo certo. Depois de enviar, as respostas ficam disponíveis para a equipe MOVE e só podem ser alteradas com a nossa liberação.</p>
          <ul className="flex flex-col">
            {pending.map(({ step: s, errs }) => (
              <li key={s.n} className="flex flex-wrap items-center justify-between gap-3 border-t border-linha py-3 first:border-t-0">
                <span className="font-bold">{s.n}. {s.title}</span>
                {errs === 0 ? (
                  <span className="text-sm font-bold text-ok">Completa ✓</span>
                ) : (
                  <button type="button" onClick={() => goTo(s.n)} className="min-h-10 rounded-full bg-atencao-suave px-4 text-sm font-bold text-atencao">
                    {errs} {errs === 1 ? 'pendência' : 'pendências'} · completar
                  </button>
                )}
              </li>
            ))}
          </ul>
          {submitError && <p role="alert" className="rounded-2xl bg-alerta-suave px-4 py-3 font-semibold text-alerta">{submitError}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => goTo(STEPS.length)} className="min-h-12 rounded-full px-5 font-bold text-cinza hover:bg-offwhite">← Voltar</button>
            <button type="button" onClick={submit} disabled={!allValid || submitting} className="min-h-12 rounded-full bg-roxo px-8 font-extrabold text-white hover:bg-[#4A0C75] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Enviando…' : 'Enviar briefing para a MOVE'}
            </button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-6">
          <p className="text-cinza">{current.intro}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {visibleFields(current, ctx).map((f) => (
              <div key={f.id} className={f.half ? '' : 'sm:col-span-2'}>
                <FieldInput
                  field={f}
                  value={answers[f.id]}
                  error={errors[f.id]}
                  required={isRequired(f, ctx)}
                  companyId={company.id}
                  onChange={(v) => setValue(f.id, v)}
                  onCep={fillFromCep}
                />
              </div>
            ))}
          </div>
          {Object.keys(errors).length > 0 && <p role="alert" className="font-semibold text-alerta">Faltam {Object.keys(errors).length} campo(s) nesta etapa.</p>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-linha pt-5">
            {step > 1 ? (
              <button type="button" onClick={() => goTo(step - 1)} className="min-h-12 rounded-full px-5 font-bold text-cinza hover:bg-offwhite">← Etapa anterior</button>
            ) : <span />}
            <button type="button" onClick={next} className="min-h-12 rounded-full bg-roxo px-8 font-extrabold text-white hover:bg-[#4A0C75]">
              {step === STEPS.length ? 'Revisar e enviar' : 'Próxima etapa →'}
            </button>
          </div>
          <p className="text-center text-xs text-cinza">Pode parar quando quiser: suas respostas ficam salvas e você continua de onde parou.</p>
        </Card>
      )}
    </div>
  )
}
