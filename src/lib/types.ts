export type AppRole = 'admin' | 'coordenacao' | 'social_media' | 'trafego' | 'cliente'

export type OnboardingStage =
  | 'briefing'
  | 'contrato'
  | 'materiais'
  | 'estrategia'
  | 'aprovacao'
  | 'transicao'
  | 'ativo'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  active: boolean
}

export interface Company {
  id: string
  name: string
  contact_name: string
  contact_email: string
  stage: OnboardingStage
  has_traffic: boolean
  social_media_id: string | null
  traffic_id: string | null
  updated_at: string
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administração',
  coordenacao: 'Coordenação de projetos',
  social_media: 'Social media',
  trafego: 'Tráfego pago',
  cliente: 'Cliente',
}

export const TEAM_ROLES: AppRole[] = ['admin', 'coordenacao', 'social_media', 'trafego']

export const STAGES: { key: OnboardingStage; label: string; owner: string }[] = [
  { key: 'briefing', label: 'Briefing', owner: 'Cliente' },
  { key: 'contrato', label: 'Contrato', owner: 'Mariana' },
  { key: 'materiais', label: 'Materiais e acessos', owner: 'Bruna' },
  { key: 'estrategia', label: 'Estratégia', owner: 'Mariana · 7 dias' },
  { key: 'aprovacao', label: 'Aprovação', owner: 'Cliente' },
  { key: 'transicao', label: 'Transição Trello', owner: 'Bruna + Social media' },
  { key: 'ativo', label: 'Cliente ativo', owner: 'Equipe' },
]

export const isTeam = (role?: AppRole | null) => !!role && role !== 'cliente'
