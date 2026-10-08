import type { ReactNode } from 'react'

export function Logo({ dark = false }: { dark?: boolean }) {
  // Marca provisória: será trocada pelo logotipo oficial (PNG/SVG do manual) em /public/brand
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-roxo text-xl font-extrabold text-white">M</div>
      <div className="flex flex-col leading-none">
        <span className={`text-lg font-extrabold tracking-[0.08em] ${dark ? 'text-offwhite' : 'text-preto'}`}>MOVE</span>
        <span className={`text-[11px] tracking-[0.22em] ${dark ? 'text-[#BDB6C9]' : 'text-cinza'}`}>ONBOARDING</span>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-cinza">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-roxo-claro border-t-roxo" />
      {label}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-6 ${className}`}>{children}</section>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-linha px-6 py-10 text-center">
      <p className="font-bold">{title}</p>
      <p className="max-w-md text-sm text-cinza">{text}</p>
    </div>
  )
}

export function Pill({ tone, children }: { tone: 'ok' | 'atencao' | 'alerta' | 'neutro'; children: ReactNode }) {
  const map = {
    ok: 'bg-ok-suave text-ok',
    atencao: 'bg-atencao-suave text-atencao',
    alerta: 'bg-alerta-suave text-alerta',
    neutro: 'bg-offwhite text-cinza',
  }
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${map[tone]}`}>{children}</span>
}
