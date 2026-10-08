import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import { isTeam, TEAM_ROLES } from './lib/types'
import { RequireRole } from './components/RequireRole'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import AuthConfirm from './pages/AuthConfirm'
import AccessDenied from './pages/AccessDenied'
import SetupNotice from './pages/SetupNotice'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Team from './pages/admin/Team'
import Clients from './pages/admin/Clients'
import NewClient from './pages/admin/NewClient'
import ClientDetail from './pages/admin/ClientDetail'
import PortalLayout from './layouts/PortalLayout'
import PortalHome from './pages/portal/Home'

function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/entrar" replace />
  if (!profile) return <Navigate to="/acesso-negado" replace />
  return <Navigate to={isTeam(profile.role) ? '/admin' : '/portal'} replace />
}

function App() {
  if (!isConfigured) return <SetupNotice />
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/acesso-negado" element={<AccessDenied />} />

          <Route path="/admin" element={<RequireRole allow={TEAM_ROLES}><AdminLayout /></RequireRole>}>
            <Route index element={<Dashboard />} />
            <Route path="equipe" element={<RequireRole allow={['admin']}><Team /></RequireRole>} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/novo" element={<RequireRole allow={['admin', 'coordenacao']}><NewClient /></RequireRole>} />
            <Route path="clientes/:id" element={<ClientDetail />} />
          </Route>

          <Route path="/portal" element={<RequireRole allow={['cliente']}><PortalLayout /></RequireRole>}>
            <Route index element={<PortalHome />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
