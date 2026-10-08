import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABEL, type Product, type ProductCategory, type Profile } from '../../lib/types'
import { Card, Spinner } from '../../components/ui'
import { money } from '../../lib/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputCls = 'h-12 w-full rounded-xl border-[1.5px] border-[#D4D4D4] bg-white px-3 outline-none focus:border-roxo aria-[invalid=true]:border-alerta'

/** "1.850,00" → "1850.00"; vazio → "" */
function parseMoney(v: string) {
  const clean = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  return clean === '' || isNaN(Number(clean)) ? '' : String(Number(clean))
}

function Field({ label, hint, error, children, full }: { label: string; hint?: string; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-bold">{label}</span>
      {children}
      {error ? <span className="text-sm font-semibold text-alerta">{error}</span> : hint && <span className="text-xs text-cinza">{hint}</span>}
    </label>
  )
}

export default function NewClient() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [team, setTeam] = useState<Profile[]>([])
  const [form, setForm] = useState({
    name: '', contact_name: '', contact_email: '', whatsapp: '',
    plan_id: '', services: [] as string[], has_traffic: false, trafficTouched: false,
    monthly_fee: '', setup_fee: '', start_date: '', notes: '',
    social_media_id: '', traffic_id: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase!.from('products').select('*').eq('active', true).order('sort'),
      supabase!.from('profiles').select('id, email, full_name, role, active').in('role', ['social_media', 'trafego']).eq('active', true),
    ]).then(([p, t]) => {
      setProducts((p.data as Product[]) ?? [])
      setTeam((t.data as Profile[]) ?? [])
    })
  }, [])

  const plans = useMemo(() => (products ?? []).filter((p) => p.is_plan), [products])
  const byCategory = useMemo(() => {
    const map: Record<ProductCategory, Product[]> = { recorrente: [], pontual: [], autoridade: [] }
    ;(products ?? []).filter((p) => !p.is_plan).forEach((p) => map[p.category].push(p))
    return map
  }, [products])

  const selected = useMemo(() => new Set([...form.services, ...(form.plan_id ? [form.plan_id] : [])]), [form.services, form.plan_id])
  const suggestsTraffic = (products ?? []).some((p) => selected.has(p.id) && p.includes_traffic)
  const hasTraffic = form.trafficTouched ? form.has_traffic : suggestsTraffic

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  function choosePlan(id: string) {
    const plan = plans.find((p) => p.id === id)
    setForm((f) => ({
      ...f,
      plan_id: id,
      // Sugere o valor do plano se o campo estiver vazio ou com o valor de outro plano
      monthly_fee:
        plan?.base_price != null && (f.monthly_fee === '' || plans.some((p) => p.base_price != null && parseMoney(f.monthly_fee) === String(p.base_price)))
          ? String(plan.base_price)
          : f.monthly_fee,
    }))
  }

  function toggleService(id: string) {
    setForm((f) => ({ ...f, services: f.services.includes(id) ? f.services.filter((s) => s !== id) : [...f.services, id] }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Informe o nome da empresa.'
    if (form.contact_name.trim().length < 2) e.contact_name = 'Informe o nome do responsável.'
    if (!EMAIL_RE.test(form.contact_email.trim())) e.contact_email = 'E-mail inválido.'
    const wa = form.whatsapp.replace(/\D/g, '')
    if (wa && (wa.length < 10 || wa.length > 13)) e.whatsapp = 'Use DDD + número, ex.: (71) 99999-0000.'
    if (selected.size === 0) e.services = 'Escolha um plano ou pelo menos um serviço.'
    if (form.monthly_fee && parseMoney(form.monthly_fee) === '') e.monthly_fee = 'Valor inválido.'
    if (form.setup_fee && parseMoney(form.setup_fee) === '') e.setup_fee = 'Valor inválido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setServerError(null)
    if (!validate()) return
    setSaving(true)
    const payload = {
      name: form.name, contact_name: form.contact_name, contact_email: form.contact_email,
      whatsapp: form.whatsapp, plan_id: form.plan_id, services: form.services,
      has_traffic: hasTraffic, monthly_fee: parseMoney(form.monthly_fee), setup_fee: parseMoney(form.setup_fee),
      start_date: form.start_date, notes: form.notes,
      social_media_id: form.social_media_id, traffic_id: hasTraffic ? form.traffic_id : '',
    }
    const { data, error } = await supabase!.rpc('create_client', { payload })
    setSaving(false)
    if (error) {
      setServerError(error.message.includes('duplicate') ? 'Esse cliente já parece estar cadastrado.' : error.message)
      return
    }
    navigate(`/admin/clientes/${data}?novo=1`)
  }

  if (products === null) return <Spinner />

  const socialMedia = team.filter((t) => t.role === 'social_media')
  const trafficTeam = team.filter((t) => t.role === 'trafego')

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <Link to="/admin/clientes" className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza hover:text-roxo">← Clientes</Link>
        <h1 className="text-4xl font-extrabold tracking-tight">Novo cliente</h1>
        <p className="text-cinza">Cadastre quando a proposta comercial for aceita. O acesso ao portal é liberado na hora.</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Card className="flex flex-col gap-5">
          <h2 className="text-xl font-extrabold">Empresa e contato</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da empresa" error={errors.name}>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Nome do responsável" error={errors.contact_name}>
              <input className={inputCls} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} aria-invalid={!!errors.contact_name} />
            </Field>
            <Field label="E-mail" hint="É com este e-mail que o cliente entra no portal." error={errors.contact_email}>
              <input type="email" className={inputCls} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} aria-invalid={!!errors.contact_email} />
            </Field>
            <Field label="WhatsApp" hint="Com DDD." error={errors.whatsapp}>
              <input type="tel" inputMode="tel" className={inputCls} placeholder="(71) 99999-0000" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} aria-invalid={!!errors.whatsapp} />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-xl font-extrabold">O que foi contratado</h2>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-bold">Plano de gestão</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...plans, { id: '', name: 'Sem plano recorrente', base_price: null } as Product].map((p) => {
                const on = form.plan_id === p.id
                return (
                  <label key={p.id || 'none'} className={`flex min-h-24 cursor-pointer flex-col justify-between gap-2 rounded-2xl border-2 p-4 ${on ? 'border-roxo bg-roxo-suave' : 'border-linha hover:border-roxo-claro'}`}>
                    <input type="radio" name="plan" className="sr-only" checked={on} onChange={() => choosePlan(p.id)} />
                    <span className="font-extrabold">{p.name}</span>
                    <span className="text-sm text-cinza">{p.base_price != null ? `${money(p.base_price)}/mês` : p.id ? '' : 'Só projetos ou serviços avulsos'}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-bold">Outros serviços contratados</legend>
            {(Object.keys(byCategory) as ProductCategory[]).map((cat) =>
              byCategory[cat].length === 0 ? null : (
                <div key={cat} className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cinza">{CATEGORY_LABEL[cat]}</span>
                  <div className="flex flex-wrap gap-2">
                    {byCategory[cat].map((p) => {
                      const on = form.services.includes(p.id)
                      return (
                        <label key={p.id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-bold ${on ? 'border-roxo bg-roxo text-white' : 'border-linha hover:border-roxo-claro'}`}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleService(p.id)} />
                          {on && <span aria-hidden>✓</span>}
                          {p.name}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
            {errors.services && <span className="text-sm font-semibold text-alerta">{errors.services}</span>}
          </fieldset>

          <label className="flex items-start gap-3 rounded-2xl bg-offwhite p-4">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#5B108F]" checked={hasTraffic} onChange={(e) => setForm((f) => ({ ...f, has_traffic: e.target.checked, trafficTouched: true }))} />
            <span className="flex flex-col">
              <span className="font-bold">Inclui gestão de tráfego pago</span>
              <span className="text-sm text-cinza">
                {suggestsTraffic ? 'Marcado automaticamente porque o plano/serviço escolhido inclui tráfego.' : 'Libera o cliente para o responsável por tráfego.'}
              </span>
            </span>
          </label>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">Condições comerciais</h2>
            <span className="text-xs font-bold uppercase tracking-wider text-cinza">Visível só para administração e coordenação</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor mensal (R$)" error={errors.monthly_fee} hint={form.plan_id ? 'Sugerido pelo plano. Ajuste se a proposta for diferente.' : undefined}>
              <input inputMode="decimal" className={inputCls} placeholder="0,00" value={form.monthly_fee} onChange={(e) => set('monthly_fee', e.target.value)} aria-invalid={!!errors.monthly_fee} />
            </Field>
            <Field label="Taxa de implantação (R$)" hint="Deixe em branco se não houver." error={errors.setup_fee}>
              <input inputMode="decimal" className={inputCls} placeholder="0,00" value={form.setup_fee} onChange={(e) => set('setup_fee', e.target.value)} aria-invalid={!!errors.setup_fee} />
            </Field>
            <Field label="Data prevista de início">
              <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="Observações comerciais" full>
              <textarea rows={3} className="w-full rounded-xl border-[1.5px] border-[#D4D4D4] bg-white p-3 outline-none focus:border-roxo" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="text-xl font-extrabold">Equipe responsável</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Social media" hint={socialMedia.length === 0 ? 'Ninguém com perfil Social media entrou ainda. Dá para definir depois.' : undefined}>
              <select className={inputCls} value={form.social_media_id} onChange={(e) => set('social_media_id', e.target.value)}>
                <option value="">Definir depois</option>
                {socialMedia.map((t) => <option key={t.id} value={t.id}>{t.full_name ?? t.email}</option>)}
              </select>
            </Field>
            {hasTraffic && (
              <Field label="Tráfego pago" hint={trafficTeam.length === 0 ? 'Ninguém com perfil Tráfego entrou ainda. Dá para definir depois.' : undefined}>
                <select className={inputCls} value={form.traffic_id} onChange={(e) => set('traffic_id', e.target.value)}>
                  <option value="">Definir depois</option>
                  {trafficTeam.map((t) => <option key={t.id} value={t.id}>{t.full_name ?? t.email}</option>)}
                </select>
              </Field>
            )}
          </div>
        </Card>

        {serverError && <p role="alert" className="rounded-2xl bg-alerta-suave px-4 py-3 font-semibold text-alerta">{serverError}</p>}
        {Object.keys(errors).length > 0 && <p role="alert" className="font-semibold text-alerta">Revise os campos destacados.</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/admin/clientes" className="inline-flex h-12 items-center rounded-full px-6 font-bold text-cinza hover:bg-white">Cancelar</Link>
          <button type="submit" disabled={saving} className="h-12 rounded-full bg-roxo px-8 font-extrabold text-white hover:bg-[#4A0C75] disabled:opacity-60">
            {saving ? 'Salvando…' : 'Cadastrar e liberar convite'}
          </button>
        </div>
      </form>
    </>
  )
}
