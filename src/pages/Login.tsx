import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Logo } from '../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { session, profile, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  if (!loading && session && profile) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setStatus('error')
      setMessage('Digite um e-mail válido.')
      return
    }
    setStatus('sending')
    const { error } = await supabase!.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error('[login] falha ao pedir magic link', error)
      // E-mail não autorizado: o banco recusa o cadastro (erro 500 "Database error saving new user").
      // Por segurança, respondemos igual a um e-mail cadastrado, para ninguém descobrir quem é cliente.
      const blocked = error.status === 500 && /database error/i.test(error.message)
      if (!blocked) {
        setStatus('error')
        setMessage(
          error.status === 429
            ? 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
            : `Não foi possível enviar o link agora. Detalhe técnico: ${error.message || 'sem resposta do servidor'}`,
        )
        return
      }
    }
    setStatus('sent')
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-offwhite">
      <section className="relative flex min-h-[340px] flex-[1_1_420px] flex-col justify-between gap-10 overflow-hidden bg-preto p-8 text-offwhite md:p-16">
        <div aria-hidden className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-roxo" />
        <div aria-hidden className="absolute bottom-52 right-32 h-28 w-28 rounded-[32px] border-2 border-roxo-claro" />
        <div className="relative"><Logo dark /></div>
        <div className="relative flex max-w-lg flex-col gap-4">
          <h1 className="text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">Seu espaço com a MOVE.</h1>
          <p className="text-lg leading-relaxed text-[#D6D0DE]">Briefing, contratos, estratégia e arquivos da sua marca em um só lugar.</p>
        </div>
        <span className="relative text-sm text-[#BDB6C9]">sejamove.com.br</span>
      </section>

      <section className="flex flex-[1_1_420px] items-center justify-center p-8 md:p-16">
        <div className="flex w-full max-w-md flex-col gap-6">
          {status === 'sent' ? (
            <div className="flex flex-col gap-4" aria-live="polite">
              <h2 className="text-3xl font-extrabold tracking-tight">Confira seu e-mail</h2>
              <p className="leading-relaxed text-cinza">
                Se <strong className="text-preto">{email.trim().toLowerCase()}</strong> estiver cadastrado na MOVE, você vai receber um link de acesso em instantes.
                Abra o link <strong className="text-preto">neste mesmo navegador</strong>.
              </p>
              <p className="text-sm text-cinza">Não chegou? Veja a caixa de spam ou peça outro link.</p>
              <button type="button" onClick={() => setStatus('idle')} className="min-h-11 self-start font-bold text-roxo underline-offset-4 hover:underline">
                Pedir outro link
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-extrabold tracking-tight">Entrar no portal</h2>
                <p className="leading-relaxed text-cinza">Sem senha. Enviamos um link de acesso para o e-mail cadastrado pela MOVE.</p>
              </div>
              <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
                <label htmlFor="email" className="text-sm font-bold">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaempresa.com.br"
                  aria-invalid={status === 'error'}
                  aria-describedby={status === 'error' ? 'email-erro' : undefined}
                  className="h-14 rounded-2xl border-[1.5px] border-[#D4D4D4] bg-white px-4 text-base outline-none focus:border-roxo"
                />
                {status === 'error' && <p id="email-erro" className="text-sm font-semibold text-alerta">{message}</p>}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="mt-1 h-14 rounded-full bg-roxo text-base font-extrabold text-white transition hover:bg-[#4A0C75] disabled:opacity-60"
                >
                  {status === 'sending' ? 'Enviando…' : 'Enviar link de acesso'}
                </button>
              </form>
              <div className="flex gap-3 rounded-2xl border border-linha bg-white p-4 text-sm leading-relaxed text-cinza">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B108F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
                O link é de uso único e expira em pouco tempo. Expirou? É só pedir outro aqui.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
