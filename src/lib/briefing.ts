// Briefing Estratégico Digital · MOVE
// As 8 etapas, as perguntas e as regras de quando cada uma aparece.

export type Answers = Record<string, unknown>

export interface FileRef { path: string; name: string; size: number }

export interface BriefingContext {
  services: Set<string>
  hasTraffic: boolean
  answers: Answers
}

export type FieldType = 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'radio' | 'checkboxes' | 'select' | 'files' | 'cep' | 'document'

export interface Field {
  id: string
  label: string
  type: FieldType
  help?: string
  placeholder?: string
  options?: string[]
  required?: boolean | ((ctx: BriefingContext) => boolean)
  showIf?: (ctx: BriefingContext) => boolean
  half?: boolean
}

export interface Step {
  n: number
  title: string
  intro: string
  fields: Field[]
}

const isPJ = (c: BriefingContext) => c.answers.tipo_pessoa !== 'Pessoa física (CPF)'
const isPF = (c: BriefingContext) => c.answers.tipo_pessoa === 'Pessoa física (CPF)'
const traffic = (c: BriefingContext) => c.hasTraffic
const recording = (c: BriefingContext) => c.services.has('full_move') || c.services.has('move_content')

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export const STEPS: Step[] = [
  {
    n: 1,
    title: 'Dados cadastrais',
    intro: 'Esses dados também serão usados para preparar o seu contrato.',
    fields: [
      { id: 'tipo_pessoa', label: 'O contrato será com', type: 'radio', options: ['Pessoa jurídica (CNPJ)', 'Pessoa física (CPF)'], required: true },
      { id: 'razao_social', label: 'Razão social', type: 'text', required: true, showIf: isPJ, half: true },
      { id: 'nome_fantasia', label: 'Nome fantasia', type: 'text', showIf: isPJ, half: true },
      { id: 'cnpj', label: 'CNPJ', type: 'document', placeholder: '00.000.000/0000-00', required: true, showIf: isPJ, half: true },
      { id: 'nome_completo', label: 'Nome completo', type: 'text', required: true, showIf: isPF, half: true },
      { id: 'cpf', label: 'CPF', type: 'document', placeholder: '000.000.000-00', required: true, showIf: isPF, half: true },
      { id: 'data_nascimento', label: 'Data de nascimento', type: 'date', showIf: isPF, half: true },
      { id: 'representante_nome', label: 'Representante legal (quem assina o contrato)', type: 'text', required: true, showIf: isPJ, half: true },
      { id: 'representante_cpf', label: 'CPF do representante legal', type: 'document', placeholder: '000.000.000-00', required: true, showIf: isPJ, half: true, help: 'A assinatura é feita pelo gov.br, com o CPF de quem assina.' },
      { id: 'email', label: 'E-mail', type: 'email', required: true, half: true },
      { id: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true, half: true },
      { id: 'cep', label: 'CEP', type: 'cep', required: true, half: true, help: 'Preenchemos o endereço automaticamente.' },
      { id: 'logradouro', label: 'Endereço (rua, avenida)', type: 'text', required: true, half: true },
      { id: 'numero', label: 'Número', type: 'text', required: true, half: true },
      { id: 'complemento', label: 'Complemento', type: 'text', half: true },
      { id: 'bairro', label: 'Bairro', type: 'text', required: true, half: true },
      { id: 'cidade', label: 'Cidade', type: 'text', required: true, half: true },
      { id: 'uf', label: 'Estado', type: 'select', options: UFS, required: true, half: true },
      { id: 'responsavel_relacionamento', label: 'Responsável pelo relacionamento com a MOVE', type: 'text', required: true, half: true },
      { id: 'email_contrato', label: 'E-mail para envio do contrato', type: 'email', required: true, half: true },
      { id: 'responsavel_aprovacao', label: 'Quem aprova os conteúdos', type: 'text', required: true, half: true, help: 'Nome e cargo de quem dá o OK final nas publicações.' },
    ],
  },
  {
    n: 2,
    title: 'Conhecendo o negócio',
    intro: 'Conte com as suas palavras. Quanto mais real, melhor a estratégia.',
    fields: [
      { id: 'historia', label: 'Qual é a história da empresa?', type: 'textarea', required: true, help: 'Como começou, por que existe e o que mudou até aqui.' },
      { id: 'produtos_servicos', label: 'Quais produtos e serviços vocês oferecem?', type: 'textarea', required: true },
      { id: 'principais_ofertas', label: 'Quais são as principais ofertas hoje?', type: 'textarea', required: true, help: 'O que mais vende ou o que é mais estratégico vender (com preço médio, se puder).' },
      { id: 'diferenciais', label: 'O que diferencia vocês dos concorrentes?', type: 'textarea', required: true },
      { id: 'area_atuacao', label: 'Área geográfica de atuação', type: 'radio', options: ['Local (minha cidade)', 'Regional', 'Nacional', 'Internacional', '100% online'], required: true },
      { id: 'area_detalhe', label: 'Quais cidades ou regiões?', type: 'text', showIf: (c) => ['Local (minha cidade)', 'Regional'].includes(String(c.answers.area_atuacao)) },
      { id: 'prioridades_comerciais', label: 'O que vocês mais precisam vender nos próximos meses?', type: 'textarea', required: true },
      { id: 'desafios', label: 'Quais são os maiores desafios hoje?', type: 'textarea', required: true },
    ],
  },
  {
    n: 3,
    title: 'Público-alvo',
    intro: 'Pense no cliente que você gostaria de ter mais vezes.',
    fields: [
      { id: 'cliente_ideal', label: 'Quem é o seu cliente ideal?', type: 'textarea', required: true, help: 'Idade, profissão, estilo de vida, onde mora, como consome.' },
      { id: 'necessidades_desejos', label: 'Quais são as necessidades e os desejos dele?', type: 'textarea', required: true },
      { id: 'motivos_compra', label: 'Por que ele compra de vocês?', type: 'textarea', required: true },
      { id: 'objecoes', label: 'Quais são as principais objeções antes de comprar?', type: 'textarea', required: true, help: 'Ex.: preço, tempo, confiança, "vou pensar".' },
      { id: 'publicos_desejados', label: 'Existe algum público novo que vocês querem alcançar?', type: 'textarea' },
    ],
  },
  {
    n: 4,
    title: 'Posicionamento e concorrência',
    intro: 'Como a marca quer ser percebida e com quem ela disputa atenção.',
    fields: [
      { id: 'posicionamento_desejado', label: 'Como vocês querem ser percebidos?', type: 'textarea', required: true, help: 'Complete: "Quero que pensem na minha marca como…"' },
      { id: 'valores', label: 'Quais são os valores da empresa?', type: 'textarea' },
      { id: 'personalidade', label: 'Personalidade da marca', type: 'checkboxes', options: ['Acolhedora', 'Sofisticada', 'Divertida', 'Técnica', 'Inspiradora', 'Ousada', 'Próxima', 'Elegante', 'Direta', 'Educativa'], required: true, help: 'Escolha até 4.' },
      { id: 'concorrentes', label: 'Quem são os principais concorrentes?', type: 'textarea', help: 'Nomes e @ no Instagram, se tiver.' },
      { id: 'marcas_referencia', label: 'Marcas que vocês admiram (de qualquer área)', type: 'textarea', help: 'E o que admiram nelas.' },
      { id: 'estilos_evitar', label: 'Estilos de comunicação que devem ser evitados', type: 'textarea' },
    ],
  },
  {
    n: 5,
    title: 'Marketing e presença digital',
    intro: 'Onde vocês estão hoje e o que já foi testado.',
    fields: [
      { id: 'redes_sociais', label: 'Redes sociais da empresa', type: 'textarea', required: true, help: 'Coloque o @ ou link de cada uma.' },
      { id: 'site', label: 'Site', type: 'text', placeholder: 'www.' },
      { id: 'experiencias_anteriores', label: 'Já trabalharam com marketing ou agência antes? Como foi?', type: 'textarea' },
      { id: 'pontos_positivos', label: 'O que funciona bem na comunicação atual?', type: 'textarea' },
      { id: 'pontos_negativos', label: 'O que não funciona ou incomoda?', type: 'textarea' },
      { id: 'formatos_preferidos', label: 'Formatos de conteúdo preferidos', type: 'checkboxes', options: ['Reels', 'Carrossel', 'Post estático', 'Stories', 'Lives', 'Vídeos longos'] },
      { id: 'assuntos_proibidos', label: 'Assuntos proibidos ou sensíveis', type: 'textarea' },
      { id: 'cases', label: 'Cases, depoimentos ou resultados que podemos usar', type: 'textarea' },
      { id: 'investimento_midia', label: 'Quanto pretendem investir em anúncios por mês?', type: 'select', options: ['Até R$ 1.000', 'De R$ 1.000 a R$ 3.000', 'De R$ 3.000 a R$ 10.000', 'Acima de R$ 10.000', 'Ainda não sei'], required: true, showIf: traffic, help: 'Valor pago diretamente às plataformas (Meta/Google), à parte da MOVE.' },
      { id: 'anuncios_anteriores', label: 'Já anunciaram antes? Como foram os resultados?', type: 'textarea', showIf: traffic },
    ],
  },
  {
    n: 6,
    title: 'Objetivos e resultados',
    intro: 'O que precisa acontecer para esta parceria ser um sucesso.',
    fields: [
      { id: 'objetivos', label: 'Objetivos com o marketing digital', type: 'checkboxes', options: ['Aumentar vendas', 'Gerar contatos/leads', 'Fortalecer autoridade', 'Crescer seguidores', 'Lançar produto ou serviço', 'Fortalecer a marca', 'Fidelizar clientes'], required: true },
      { id: 'resultados_3_meses', label: 'Que resultado vocês esperam nos primeiros 3 meses?', type: 'textarea', required: true },
      { id: 'metas_comerciais', label: 'Existem metas comerciais definidas?', type: 'textarea', help: 'Ex.: faturamento, número de clientes, agendamentos por mês.' },
      { id: 'canais_vendas', label: 'Por onde os clientes compram hoje?', type: 'checkboxes', options: ['WhatsApp', 'Direct do Instagram', 'Loja física', 'Site / e-commerce', 'Indicação', 'Marketplace', 'Outro'], required: true },
      { id: 'calendario', label: 'Calendário de campanhas, datas e eventos importantes', type: 'textarea', help: 'Lançamentos, promoções, datas sazonais, eventos já previstos.' },
    ],
  },
  {
    n: 7,
    title: 'Produção de conteúdo',
    intro: 'Quem aparece, o que já existe e as regras que precisamos respeitar.',
    fields: [
      { id: 'pessoas_gravacao', label: 'Quem pode aparecer nos conteúdos?', type: 'textarea', required: true, help: 'Nome e função de cada pessoa.' },
      { id: 'restricoes_imagem', label: 'Existe alguma restrição de imagem?', type: 'textarea', help: 'Pessoas, ambientes, clientes ou produtos que não podem aparecer.' },
      { id: 'materiais_existentes', label: 'Que materiais vocês já têm?', type: 'textarea', help: 'Fotos, vídeos, apresentações, catálogos.' },
      { id: 'disponibilidade_captacao', label: 'Disponibilidade para gravações', type: 'textarea', required: (c) => recording(c), help: 'Melhores dias e horários.' },
      { id: 'local_gravacao', label: 'Onde as gravações podem acontecer?', type: 'text', showIf: recording, required: true },
      { id: 'responsavel_envio', label: 'Quem vai enviar informações e materiais para a MOVE?', type: 'text', required: true },
      { id: 'orientacoes_legais', label: 'Orientações técnicas ou legais', type: 'textarea', help: 'Ex.: regras de conselho profissional (CRM, CRN, OAB, CRO), termos obrigatórios, o que não pode ser prometido.' },
    ],
  },
  {
    n: 8,
    title: 'Identidade visual e materiais',
    intro: 'Envie o que tiver. Se faltar algo, a gente organiza junto.',
    fields: [
      { id: 'possui_identidade', label: 'Vocês têm identidade visual?', type: 'radio', options: ['Sim, completa (com manual da marca)', 'Sim, só o logotipo', 'Não tenho'], required: true },
      { id: 'arquivo_logotipo', label: 'Logotipo', type: 'files', help: 'De preferência PNG sem fundo, PDF ou SVG.', showIf: (c) => c.answers.possui_identidade !== 'Não tenho' },
      { id: 'arquivo_manual', label: 'Manual da marca', type: 'files', showIf: (c) => c.answers.possui_identidade === 'Sim, completa (com manual da marca)' },
      { id: 'fontes', label: 'Fontes utilizadas', type: 'text', half: true },
      { id: 'paleta', label: 'Paleta de cores', type: 'text', half: true, help: 'Nomes ou códigos (ex.: #5B108F).' },
      { id: 'arquivos_gerais', label: 'Outros arquivos (fotos, vídeos, apresentações)', type: 'files' },
      { id: 'contas_meta', label: 'Situação das contas Meta (Instagram/Facebook)', type: 'radio', options: ['Temos Gerenciador de Negócios (Business Manager)', 'Só os perfis do Instagram/Facebook', 'Não sei'], required: true },
      { id: 'conta_anuncios', label: 'Conta de anúncios', type: 'radio', options: ['Já temos conta de anúncios', 'Não temos', 'Não sei'], required: true, showIf: traffic },
      { id: 'responsavel_acessos', label: 'Quem é responsável pelos acessos às contas?', type: 'text', required: true, help: 'Não envie senhas aqui. Os acessos são liberados por convite, na etapa de Materiais e Acessos.' },
    ],
  },
]

// ---------------------------------------------------------------------
// Regras auxiliares
// ---------------------------------------------------------------------
export const visibleFields = (step: Step, ctx: BriefingContext) => step.fields.filter((f) => !f.showIf || f.showIf(ctx))

export const isRequired = (f: Field, ctx: BriefingContext) => (typeof f.required === 'function' ? f.required(ctx) : !!f.required)

export function isFilled(v: unknown) {
  if (v === null || v === undefined) return false
  if (Array.isArray(v)) return v.length > 0
  return String(v).trim() !== ''
}

export function fieldError(f: Field, v: unknown, ctx: BriefingContext): string | null {
  if (isRequired(f, ctx) && !isFilled(v)) return 'Campo obrigatório.'
  if (!isFilled(v)) return null
  const s = String(v)
  if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())) return 'E-mail inválido.'
  if (f.type === 'tel') {
    const d = s.replace(/\D/g, '')
    if (d.length < 10 || d.length > 13) return 'Use DDD + número.'
  }
  if (f.type === 'cep' && s.replace(/\D/g, '').length !== 8) return 'CEP deve ter 8 números.'
  if (f.type === 'document') {
    const d = s.replace(/\D/g, '')
    if (f.id === 'cnpj' ? !validCNPJ(d) : !validCPF(d)) return f.id === 'cnpj' ? 'CNPJ inválido.' : 'CPF inválido.'
  }
  if (f.id === 'personalidade' && Array.isArray(v) && v.length > 4) return 'Escolha no máximo 4.'
  return null
}

export function stepErrors(step: Step, ctx: BriefingContext) {
  const errs: Record<string, string> = {}
  for (const f of visibleFields(step, ctx)) {
    const e = fieldError(f, ctx.answers[f.id], ctx)
    if (e) errs[f.id] = e
  }
  return errs
}

export function progress(ctx: BriefingContext) {
  let total = 0
  let done = 0
  for (const s of STEPS) {
    for (const f of visibleFields(s, ctx)) {
      if (!isRequired(f, ctx)) continue
      total++
      if (isFilled(ctx.answers[f.id])) done++
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

export function validCPF(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function validCNPJ(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * w[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export function maskDocument(v: string, kind: 'cpf' | 'cnpj') {
  const d = v.replace(/\D/g, '').slice(0, kind === 'cpf' ? 11 : 14)
  if (kind === 'cpf') return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
