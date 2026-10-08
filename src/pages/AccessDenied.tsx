import { useAuth } from '../lib/auth'
import { Logo } from '../components/ui'

export default function AccessDenied() {
  const { signOut, session, profile, profileError } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-5 rounded-3xl bg-white p-8">
        <Logo />
        <h1 className="text-2xl font-extrabold">Acesso não liberado</h1>
        <p className="leading-relaxed text-cinza">
          Seu e-mail não tem permissão para esta área ou o acesso foi desativado. Se acha que é um engano, fale com a equipe MOVE.
        </p>
        {session && (
          <div className="rounded-2xl bg-offwhite p-4 text-sm leading-relaxed text-cinza">
            <p>Você entrou como <strong className="text-preto">{session.user.email}</strong>.</p>
            <p>
              Diagnóstico:{' '}
              <code className="break-all text-preto">
                {profileError ?? (profile ? `perfil ${profile.role}` : 'nenhum perfil encontrado para esta conta')}
              </code>
            </p>
          </div>
        )}
        {session && (
          <button type="button" onClick={signOut} className="min-h-12 rounded-full bg-preto px-6 font-bold text-white">
            Sair
          </button>
        )}
      </div>
    </div>
  )
}
