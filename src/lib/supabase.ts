import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Limpa erros comuns de cópia: espaços, aspas, barra no fim ou o sufixo /rest/v1.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/^["']|["']$/g, '')
const url = rawUrl?.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, '')

export const isConfigured = Boolean(url && anonKey)

// Só a chave pública (anon) fica no navegador. A segurança real está nas políticas RLS do banco.
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
