import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Company } from '../../lib/types'
import { STEPS, type Answers, type FileRef } from '../../lib/briefing'
import type { Material } from '../../lib/materials'
import { fileSize, openFile } from '../../lib/files'
import { Card, EmptyState, Spinner } from '../../components/ui'

interface Group { title: string; origin: string; files: FileRef[] }

function briefingGroups(answers: Answers): Group[] {
  const out: Group[] = []
  for (const s of STEPS) {
    for (const f of s.fields) {
      if (f.type !== 'files') continue
      const files = (answers[f.id] as FileRef[] | undefined) ?? []
      if (files.length) out.push({ title: f.label, origin: 'Briefing', files })
    }
  }
  return out
}

export default function Files() {
  const [data, setData] = useState<{ company: Company; groups: Group[] }[] | null>(null)

  useEffect(() => {
    Promise.all([
      supabase!.from('companies').select('*'),
      supabase!.from('briefings').select('company_id, answers'),
      supabase!.from('company_materials').select('company_id, title, files, sort').order('sort'),
    ]).then(([c, b, m]) => {
      const companies = (c.data as Company[]) ?? []
      setData(
        companies.map((company) => {
          const br = (b.data ?? []).find((x: { company_id: string }) => x.company_id === company.id) as { answers: Answers } | undefined
          const mats = ((m.data ?? []) as Pick<Material, 'company_id' | 'title' | 'files'>[]).filter((x) => x.company_id === company.id && x.files.length)
          return {
            company,
            groups: [...mats.map((x) => ({ title: x.title, origin: 'Materiais', files: x.files })), ...(br ? briefingGroups(br.answers) : [])],
          }
        }),
      )
    })
  }, [])

  if (data === null) return <Spinner />

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cinza">Portal</span>
        <h1 className="text-4xl font-extrabold tracking-tight">Meus arquivos</h1>
        <p className="text-cinza">Tudo o que você enviou para a MOVE. Os arquivos são privados e abrem com um link temporário.</p>
      </header>
      {data.map(({ company, groups }) => (
        <Card key={company.id} className="flex flex-col gap-4">
          {data.length > 1 && <h2 className="text-xl font-extrabold">{company.name}</h2>}
          {groups.length === 0 ? (
            <EmptyState title="Nenhum arquivo enviado ainda" text="Envie logotipo, fotos e outros materiais pela Central de Materiais." />
          ) : (
            groups.map((g) => (
              <section key={g.origin + g.title} className="flex flex-col gap-2 border-t border-linha pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-extrabold">{g.title}</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-cinza">{g.origin}</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {g.files.map((f) => (
                    <li key={f.path}>
                      <button type="button" onClick={() => openFile(f)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-offwhite px-3 text-left text-sm hover:bg-roxo-suave">
                        <span className="min-w-0 truncate font-semibold">{f.name}</span>
                        <span className="flex-none text-cinza">{fileSize(f.size)} · baixar</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <Link to={`/portal/materiais/${company.id}`} className="self-start font-bold text-roxo hover:underline">Enviar mais arquivos →</Link>
        </Card>
      ))}
    </>
  )
}
