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
  whatsapp?: string | null
  stage: OnboardingStage
  has_traffic: boolean
  social_media_id: string | null
  traffic_id: string | null
  start_date?: string | null
  plan_id?: string | null
  created_at?: string
  updated_at: string
}

export type ProductCategory = 'recorrente' | 'pontual' | 'autoridade'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  base_price: number | null
  is_plan: boolean
  includes_traffic: boolean
  sort: number
  active: boolean
}

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  recorrente: 'Receita recorrente',
  pontual: 'Projetos e serviços pontuais',
  autoridade: 'Experiências e produção de autoridade',
}

export const STAGE_LABEL: Record<OnboardingStage, string> = {
  briefing: 'Briefing',
  contrato: 'Contrato',
  materiais: 'Materiais e acessos',
  estrategia: 'Estratégia',
  aprovacao: 'Aprovação',
  transicao: 'Transição Trello',
  ativo: 'Cliente ativo',
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
