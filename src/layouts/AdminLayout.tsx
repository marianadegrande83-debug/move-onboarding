import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/types'
import { Logo } from '../components/ui'

interface NavItem { to: string; label: string; soon?: boolean; adminOnly?: boolean; prefix?: boolean }

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/clientes', label: 'Clientes', prefix: true },
  { to: '/admin/contratos', label: 'Contratos', soon: true },
  { to: '/admin/materiais', label: 'Materiais e acessos', soon: true },
  { to: '/admin/estrategias', label: 'Estratégias', soon: true },
  { to: '/admin/transicao', label: 'Transição Trello', soon: true },
  { to: '/admin/equipe', label: 'Equipe e permissões', adminOnly: true },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const items = NAV.filter((n) => !n.adminOnly || profile?.role === 'admin')

  return (
    <div className="flex min-h-screen flex-wrap bg-offwhite">
      <aside className="flex max-w-full print:hidden flex-[1_1_248px] flex-col gap-7 bg-preto px-4 py-7 text-offwhite">
        <div className="px-2"><Logo dark /></div>
        <nav aria-label="Menu principal" className="flex flex-col gap-1">
          {items.map((item) =>
            item.soon ? (
              <span key={item.to} className="hidden min-h-11 items-center justify-between gap-2 rounded-xl px-3.5 text-[15px] font-semibold text-[#8F889A] md:flex">
                {item.label}
                <span className="text-[11px] font-bold uppercase tracking-wider">em breve</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={!item.prefix}
                className={({ isActive }) =>
                  `flex min-h-11 items-center rounded-xl px-3.5 text-[15px] font-semibold ${isActive ? 'bg-roxo text-white' : 'text-[#E9E4F0] hover:bg-grafite'}`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-grafite p-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-offwhite font-bold text-preto">
            {(profile?.full_name ?? profile?.email ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-bold">{profile?.full_name ?? profile?.email}</span>
            <span className="text-xs text-[#BDB6C9]">{profile && ROLE_LABEL[profile.role]}</span>
          </div>
          <button type="button" onClick={signOut} aria-label="Sair" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-preto">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3" />
            </svg>
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 px-4 py-8 md:px-11">
        <Outlet />
      </main>
    </div>
  )
}
