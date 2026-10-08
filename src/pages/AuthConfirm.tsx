import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Logo, Spinner } from '../components/ui'

/**
 * Link de acesso que funciona em qualquer navegador/aparelho:
 * o e-mail aponta para /auth/confirm?token_hash=...&type=...
 */
export default function AuthConfirm() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = (params.get('type') || 'email') as EmailOtpType
    if (!token_hash) {
      setError(true)
      return
    }
    supabase!.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) {
        console.error('[auth] link inválido', error)
        setError(true)
      } else {
        navigate('/', { replace: true })
      }
    })
  }, [navigate])

  if (!error) return <Spinner label="Validando seu acesso" />

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-5 rounded-3xl bg-white p-8">
        <Logo />
        <h1 className="text-2xl font-extrabold">Esse link não funcionou</h1>
        <p className="leading-relaxed text-cinza">
          Ele pode ter expirado ou já ter sido usado. Peça um novo link: ele funciona em qualquer navegador, inclusive no celular.
        </p>
        <Link to="/entrar" className="inline-flex min-h-12 items-center justify-center rounded-full bg-roxo px-6 font-bold text-white">
          Pedir novo link
        </Link>
      </div>
    </div>
  )
}
