import { Logo } from '../components/ui'

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-lg flex-col gap-4 rounded-3xl bg-white p-8">
        <Logo />
        <h1 className="text-2xl font-extrabold">Falta conectar o Supabase</h1>
        <p className="leading-relaxed text-cinza">
          Configure as variáveis <code className="rounded bg-offwhite px-1">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-offwhite px-1">VITE_SUPABASE_ANON_KEY</code> na Vercel (ou no arquivo <code>.env.local</code>) e publique de novo.
        </p>
      </div>
    </div>
  )
}
