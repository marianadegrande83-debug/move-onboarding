import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Logo, Spinner } from '../components/ui'

export default function AuthCallback() {
  const { session, profile, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)
  const params = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&'))
  const errorDesc = params.get('error_description')

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [])

  if (session && profile) return <Navigate to="/" replace />
  if (session && !loading && !profile) return <Navigate to="/acesso-negado" replace />

  if (errorDesc || timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-5 rounded-3xl bg-white p-8">
          <Logo />
          <h1 className="text-2xl font-extrabold">Esse link não funcionou</h1>
          <p className="leading-relaxed text-cinza">
            Ele pode ter expirado, já ter sido usado ou ter sido aberto em outro navegador. Peça um novo link e abra no mesmo navegador.
          </p>
          <Link to="/entrar" className="inline-flex min-h-12 items-center justify-center rounded-full bg-roxo px-6 font-bold text-white">
            Pedir novo link
          </Link>
        </div>
      </div>
    )
  }

  return <Spinner label="Validando seu acesso" />
}
