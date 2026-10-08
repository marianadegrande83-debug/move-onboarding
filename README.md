# MOVE Onboarding

Plataforma de onboarding e portal permanente de clientes da MOVE Marketing.
React + TypeScript + Tailwind no navegador, Supabase (Postgres, Auth, Storage) no backend, publicada na Vercel em `onboarding.sejamove.com.br`.

## Módulos

| # | Módulo | Situação |
|---|--------|----------|
| 1 | Autenticação e permissões | **pronto para configurar** |
| 2 | Painel administrativo | base pronta (indicadores reais por etapa) |
| 3 | Cadastro de clientes | próximo |
| 4 | Briefing digital | — |
| 5 | Portal do cliente | base pronta (início com etapas) |
| 6 | Central de materiais | — |
| 7 | Contratos (assinatura gov.br, conferência manual) | — |
| 8 | Gestão da estratégia | — |
| 9 | Automações e Trello | — |

## Como a segurança funciona

- **Login sem senha** por magic link do Supabase (fluxo PKCE: o link é de uso único e só funciona no navegador que pediu).
- **Só entra quem foi autorizado.** A equipe é cadastrada em `team_allowlist`; clientes, em `client_invites`. Qualquer outro e-mail é bloqueado no banco.
- **Row Level Security** em todas as tabelas: cliente só vê a própria empresa; social media só vê clientes atribuídos; tráfego só vê clientes com tráfego atribuídos; ninguém altera o próprio papel.
- **Auditoria** automática de cadastros e alterações em `audit_log`, sem possibilidade de edição.
- As regras foram testadas: `npm run test:db`.

## Configuração (uma vez)

### 1. Banco de dados (Supabase)
1. Supabase → **SQL Editor** → New query.
2. Cole o conteúdo de `supabase/migrations/0001_auth_permissoes.sql` e clique em **Run**.

### 2. Login por e-mail (Supabase)
1. **Authentication → URL Configuration**
   - Site URL: `https://onboarding.sejamove.com.br`
   - Redirect URLs: `https://onboarding.sejamove.com.br/auth/callback` e `http://localhost:5173/auth/callback`
2. **Authentication → Sign In / Providers → Email**: deixe ativo (o magic link já confirma o e-mail).
3. **Authentication → Email**: defina a validade do link (OTP expiry) em `900` segundos (15 min).
4. Recomendado: em **Authentication → Emails → SMTP Settings**, configure um SMTP próprio (ex.: Resend com o domínio sejamove.com.br). O envio padrão do Supabase tem limite baixo de e-mails por hora.
5. Opcional: personalize o template **Magic Link** em português.

### 3. Publicação (Vercel)
1. Vercel → Add New → Project → importe `move-onboarding` do GitHub (framework: Vite).
2. Em **Environment Variables** cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
3. Deploy.
4. **Settings → Domains** → adicione `onboarding.sejamove.com.br` e crie no DNS do sejamove.com.br o registro CNAME que a Vercel indicar.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # preencha as duas variáveis
npm run dev
npm run test:db              # testa as regras de permissão do banco
```

## Identidade visual
Paleta oficial do manual: Roxo Profundo `#5B108F`, Roxo Claro `#D084FF`, Preto `#030303`, Off White `#F1F1F1` (em `src/index.css`).
A fonte Nexa entra em `public/fonts` quando os arquivos licenciados estiverem disponíveis; até lá, Urbanist.
