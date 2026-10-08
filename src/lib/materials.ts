import { supabase } from './supabase'
import type { FileRef } from './briefing'

export type MaterialStatus = 'pendente' | 'recebido' | 'validado'

export interface Material {
  company_id: string
  item_key: string
  kind: 'arquivo' | 'acesso'
  title: string
  required: boolean
  sort: number
  status: MaterialStatus
  files: FileRef[]
  client_note: string | null
  team_note: string | null
  validated_at: string | null
  updated_at: string
}

export const MOVE_WHATSAPP = '5571981468672'
export const MOVE_WHATSAPP_LABEL = '(71) 98146-8672'

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido · em análise',
  validado: 'Validado',
}

/** Orientações mostradas ao cliente em cada item. */
export const MATERIAL_HELP: Record<string, { text: string; steps?: string[] }> = {
  logotipo: { text: 'Envie o logotipo em boa qualidade: PNG com fundo transparente, PDF, SVG ou AI. Se tiver versões (colorida, branca, preta), envie todas.' },
  manual_marca: { text: 'O manual ou guia da marca, com cores, fontes e regras de uso. Se não tiver, tudo bem.' },
  fotos: { text: 'Fotos da equipe, do espaço, de produtos e bastidores. Quanto mais variedade, melhor: pelo menos 10 imagens em boa resolução.' },
  videos: { text: 'Vídeos que já existem e podem ser reaproveitados. Arquivos grandes: cole o link (Google Drive, WeTransfer) no campo de observação.' },
  apresentacoes: { text: 'Apresentação institucional, catálogo, cardápio, tabela de serviços ou qualquer material que explique o negócio.' },
  outros: { text: 'Qualquer outro documento que ajude a MOVE a conhecer melhor a sua marca.' },
  instagram: {
    text: 'O acesso é dado por convite, pela Meta. Nunca envie a sua senha.',
    steps: [
      'Se a conta já está num Gerenciador de Negócios (business.facebook.com): Configurações do negócio → Usuários → Parceiros → Adicionar → informe o ID do Gerenciador da MOVE, que enviamos no grupo de WhatsApp.',
      'Se ainda não tem Gerenciador de Negócios: marque "Preciso de ajuda" na observação que a equipe faz isso com você numa chamada rápida.',
      'Depois de enviar o convite, clique em "Já concedi o acesso".',
    ],
  },
  facebook: {
    text: 'Mesmo processo do Instagram: a página do Facebook é compartilhada com a MOVE como parceira, sem senha.',
    steps: [
      'No Gerenciador de Negócios: Configurações do negócio → Contas → Páginas → selecione a página → Atribuir parceiros.',
      'Sem Gerenciador de Negócios: escreva na observação e a equipe te orienta.',
    ],
  },
  business_manager: {
    text: 'Para o tráfego pago, a MOVE precisa ser parceira no seu Gerenciador de Negócios.',
    steps: [
      'business.facebook.com → Configurações do negócio → Usuários → Parceiros → Adicionar.',
      'Informe o ID do Gerenciador da MOVE e libere acesso à conta de anúncios, à página, ao Instagram e ao pixel/conjunto de dados.',
    ],
  },
  anuncios_meta: {
    text: 'Libere a conta de anúncios para a MOVE e confira se há uma forma de pagamento cadastrada nela. A verba de anúncios é paga direto à Meta.',
    steps: ['Configurações do negócio → Contas → Contas de anúncios → selecione a conta → Atribuir parceiros → acesso total ou de gerenciamento de campanhas.'],
  },
  google_ads: {
    text: 'Convide a MOVE para a sua conta do Google Ads, sem compartilhar senha.',
    steps: ['ads.google.com → Administrador → Acesso e segurança → botão + → informe o e-mail que a MOVE indicar → nível de acesso Padrão ou Administrador.'],
  },
}

export async function loadMaterials(companyId: string) {
  // Garante que o checklist do cliente existe (conforme o que foi contratado)
  await supabase!.rpc('ensure_materials', { cid: companyId })
  const { data } = await supabase!.from('company_materials').select('*').eq('company_id', companyId).order('sort')
  return (data as Material[]) ?? []
}

export function materialProgress(items: Material[]) {
  const req = items.filter((i) => i.required)
  return {
    required: req.length,
    validated: req.filter((i) => i.status === 'validado').length,
    sent: req.filter((i) => i.status !== 'pendente').length,
    pending: req.filter((i) => i.status === 'pendente').length,
  }
}

