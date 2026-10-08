const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : brl.format(Number(v))

export const dateBR = (iso: string | null | undefined) => {
  if (!iso) return '—'
  // Datas puras (AAAA-MM-DD) não podem sofrer ajuste de fuso
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export const dateTimeBR = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export const phoneBR = (digits: string | null | undefined) => {
  if (!digits) return '—'
  const d = digits.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return digits
}

export const whatsappLink = (digits: string, text: string) => {
  const d = digits.replace(/\D/g, '')
  const full = d.length >= 12 && d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export const inviteMessage = (contactName: string, company: string, email: string) => {
  const first = contactName.trim().split(/\s+/)[0]
  const url = `${window.location.origin}/entrar`
  return [
    `Olá, ${first}! Que alegria ter a ${company} com a MOVE.`,
    ``,
    `Seu portal de onboarding já está liberado: ${url}`,
    ``,
    `Para entrar, use o e-mail ${email}. Você recebe um link de acesso na hora, sem precisar de senha.`,
    ``,
    `O primeiro passo é preencher o Briefing Estratégico. É com ele que começamos a construir a sua estratégia.`,
  ].join('\n')
}
