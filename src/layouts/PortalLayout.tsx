import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Logo } from '../components/ui'
import { MOVE_WHATSAPP } from '../lib/materials'

const MENU: { to: string; label: string; ready?: boolean; external?: string }[] = [
  { to: '/portal', label: 'Início', ready: true },
  { to: '/portal/onboarding', label: 'Meu onboarding' },
  { to: '/portal/contratos', label: 'Meus contratos' },
  { to: '/portal/estrategia', label: 'Minha estratégia' },
  { to: '/portal/arquivos', label: 'Meus arquivos', ready: true },
  { to: '/portal/trello', label: 'Meu Trello' },
  {
    to: '',
    label: 'Falar com a MOVE',
    external: `https://wa.me/${MOVE_WHATSAPP}?text=${encodeURIComponent('Olá, MOVE! Estou no portal de onboarding e preciso de ajuda.')}`,
  },
]

export default function PortalLayout() {
  const { profile, signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-offwhite">
      <header className="border-b border-linha bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-7 gap-y-3 px-4 py-4 md:px-8">
          <Logo />
          <nav aria-label="Menu do portal" className="flex flex-[1_1_520px] flex-wrap gap-1">
            {MENU.map((m) =>
              m.external ? (
                <a key={m.label} href={m.external} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-roxo hover:bg-roxo-suave">
                  {m.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
                </a>
              ) : m.ready ? (
                <NavLink key={m.to} to={m.to} end className={({ isActive }) => `inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold ${isActive ? 'bg-roxo-suave text-roxo' : 'hover:bg-offwhite'}`}>
                  {m.label}
                </NavLink>
              ) : (
                <span key={m.to} title="Disponível nos próximos módulos" className="hidden min-h-11 items-center rounded-full px-3.5 text-sm font-semibold text-[#8F889A] md:inline-flex">
                  {m.label}
                </span>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-cinza sm:inline">{profile?.email}</span>
            <button type="button" onClick={signOut} className="min-h-11 rounded-full px-4 text-sm font-bold text-roxo hover:bg-roxo-suave">Sair</button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
