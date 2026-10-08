import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dateTimeBR } from '../lib/format'

interface Notification { id: number; title: string; body: string | null; link: string | null; created_at: string }

/** Avisos não lidos da pessoa logada (ex.: briefing concluído). */
export function Notifications() {
  const [items, setItems] = useState<Notification[]>([])

  useEffect(() => {
    supabase!
      .from('notifications')
      .select('id, title, body, link, created_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setItems((data as Notification[]) ?? []))
  }, [])

  async function markRead(id: number) {
    setItems((list) => list.filter((n) => n.id !== id))
    await supabase!.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  }

  if (items.length === 0) return null

  return (
    <section aria-label="Avisos" className="flex flex-col gap-2">
      {items.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-roxo-suave px-4 py-3">
          <span className="h-2.5 w-2.5 flex-none rounded-full bg-roxo" aria-hidden />
          <div className="flex min-w-0 flex-[1_1_240px] flex-col">
            <span className="font-bold text-roxo">{n.title}</span>
            <span className="text-sm text-preto">{n.body} <span className="text-cinza">· {dateTimeBR(n.created_at)}</span></span>
          </div>
          {n.link && (
            <Link to={n.link} onClick={() => markRead(n.id)} className="inline-flex min-h-10 items-center rounded-full bg-roxo px-4 text-sm font-bold text-white">Abrir</Link>
          )}
          <button type="button" onClick={() => markRead(n.id)} className="min-h-10 rounded-full px-3 text-sm font-bold text-roxo hover:bg-white">Marcar como lido</button>
        </div>
      ))}
    </section>
  )
}
