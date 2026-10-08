import { supabase } from './supabase'
import type { FileRef } from './briefing'

export const BUCKET = 'client-files'
export const MAX_FILE = 50 * 1024 * 1024

export const safeName = (n: string) =>
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)

export const fileSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Envia arquivos para a pasta da empresa. Retorna os enviados e as mensagens de erro. */
export async function uploadFiles(companyId: string, folder: string, list: FileList | File[]) {
  const added: FileRef[] = []
  const errors: string[] = []
  for (const file of Array.from(list)) {
    if (file.size > MAX_FILE) {
      errors.push(`"${file.name}" passa de 50 MB. Envie por link (Drive, WeTransfer) na observação.`)
      continue
    }
    const path = `${companyId}/${folder}/${Date.now()}-${safeName(file.name)}`
    const { error } = await supabase!.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) errors.push(`Não foi possível enviar "${file.name}". Tente de novo.`)
    else added.push({ path, name: file.name, size: file.size })
  }
  return { added, errors }
}

/** Abre o arquivo com link temporário (5 min): nada fica público. */
export async function openFile(ref: FileRef) {
  const { data } = await supabase!.storage.from(BUCKET).createSignedUrl(ref.path, 300, { download: ref.name })
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}

export async function removeFile(ref: FileRef) {
  await supabase!.storage.from(BUCKET).remove([ref.path])
}
