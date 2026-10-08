import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { ROLE_LABEL, TEAM_ROLES, type AppRole, type Profile } from '../../lib/types'
import { Card, Pill, Spinner } from '../../components/ui'

interface AllowRow { email: string; role: AppRole; full_name: string }

export default function Team() {
  const { profile: me } = useAuth()
  const [allow, setAllow] = useState<AllowRow[] | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', role: 'social_media' as AppRole })
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'erro'; text: string } | null>(null)

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase!.from('team_allowlist').select('email, role, full_name').order('full_name'),
      supabase!.from('profiles').select('id, email, full_name, role, active').neq('role', 'cliente'),
    ])
    setAllow((a.data as AllowRow[]) ?? [])
    setProfiles((p.data as Profile[]) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (!form.full_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({ tone: 'erro', text: 'Preencha nome e um e-mail válido.' })
      return
    }
    const { error } = await supabase!.from('team_allowlist').insert({ email, role: form.role, full_name: form.full_name.trim() })
    if (error) {
      setFeedback({ tone: 'erro', text: error.code === '23505' ? 'Esse e-mail já está na equipe.' : 'Não foi possível adicionar.' })
      return
    }
    setFeedback({ tone: 'ok', text: `${form.full_name.trim()} já pode entrar com o e-mail ${email}.` })
    setForm({ full_name: '', email: '', role: 'social_media' })
    load()
  }

  async function toggleActive(p: Profile) {
    if (p.id === me?.id) return
    await supabase!.from('profiles').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  if (allow === null) return <Spinner />

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza">Administração</span>
        <h1 className="text-4xl font-extrabold tracking-tight">Equipe e permissões</h1>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Quem tem acesso</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-cinza">
                <th className="px-3 py-2.5 font-bold">Nome</th>
                <th className="px-3 py-2.5 font-bold">E-mail</th>
                <th className="px-3 py-2.5 font-bold">Perfil</th>
                <th className="px-3 py-2.5 font-bold">Situação</th>
                <th className="px-3 py-2.5 font-bold"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {allow.map((a) => {
                const p = profiles.find((x) => x.email === a.email)
                return (
                  <tr key={a.email} className="border-t border-linha">
                    <td className="px-3 py-3.5 font-bold">{a.full_name}</td>
                    <td className="px-3 py-3.5">{a.email}</td>
                    <td className="px-3 py-3.5">{ROLE_LABEL[a.role]}</td>
                    <td className="px-3 py-3.5">
                      {!p ? <Pill tone="neutro">Ainda não entrou</Pill> : p.active ? <Pill tone="ok">Ativo</Pill> : <Pill tone="alerta">Desativado</Pill>}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {p && p.id !== me?.id && (
                        <button type="button" onClick={() => toggleActive(p)} className="min-h-11 rounded-full px-4 font-bold text-roxo hover:bg-roxo-suave">
                          {p.active ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Adicionar pessoa da equipe</h2>
        <form onSubmit={add} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Nome
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-12 rounded-xl border-[1.5px] border-[#D4D4D4] px-3 font-normal outline-none focus:border-roxo" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            E-mail
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-xl border-[1.5px] border-[#D4D4D4] px-3 font-normal outline-none focus:border-roxo" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Perfil
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })} className="h-12 rounded-xl border-[1.5px] border-[#D4D4D4] bg-white px-3 font-normal outline-none focus:border-roxo">
              {TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <button type="submit" className="h-12 rounded-full bg-roxo px-6 font-bold text-white hover:bg-[#4A0C75]">Adicionar</button>
        </form>
        {feedback && (
          <p role="status" className={`text-sm font-semibold ${feedback.tone === 'ok' ? 'text-ok' : 'text-alerta'}`}>{feedback.text}</p>
        )}
        <p className="text-sm text-cinza">
          Social media só enxerga os clientes atribuídos a ela. Tráfego só enxerga clientes com gestão de tráfego atribuídos a ele.
        </p>
      </Card>
    </>
  )
}
