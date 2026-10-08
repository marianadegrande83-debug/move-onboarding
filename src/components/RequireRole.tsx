import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { AppRole } from '../lib/types'
import { Spinner } from './ui'

/**
 * Proteção de rota no navegador. É só conforto de navegação:
 * quem garante o isolamento dos dados são as políticas RLS no banco.
 */
export function RequireRole({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (!profile || !allow.includes(profile.role)) return <Navigate to="/acesso-negado" replace />
  return <>{children}</>
}
