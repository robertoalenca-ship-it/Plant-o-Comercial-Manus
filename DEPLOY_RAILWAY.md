# Deploy na Railway

## 1. Criar a aplicacao

- Conecte o repositorio na Railway.
- Use o diretorio raiz do projeto.
- Configure:
  - Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm build`
  - Start command: `corepack pnpm start`

## 2. Variaveis de ambiente

Defina estas variaveis na Railway:

- `DATABASE_URL`
- `JWT_SECRET`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID`
- `OWNER_OPEN_ID`
- `PORT=3000`

Variaveis opcionais:

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `VITE_SALES_CONTACT_URL`

## 3. Banco e migracao

- Crie um MySQL gerenciado na Railway ou use um MySQL externo.
- Aponte `DATABASE_URL` para esse banco.
- Rode a migracao:
  - `corepack pnpm db:migrate:prod`

Se quiser subir a base inicial atual deste projeto, rode uma vez:

- `corepack pnpm run sync:abril-maio-2026`

## 4. Saude da aplicacao

Depois do deploy, teste:

- `GET /healthz`
- `GET /readyz`

`/healthz` confirma que o processo esta no ar.

`/readyz` confirma:

- conexao com banco
- variaveis obrigatorias
- modo de autenticacao

## 5. Checklist de go-live

- Confirmar login OAuth em producao
- Confirmar que o usuario dono entrou como `admin`
- Validar leitura de:
  - medicos
  - regras
  - calendario
  - relatorios
- Validar escrita de:
  - gerar escala
  - editar plantao
  - mudar status
- Configurar dominio proprio
- Confirmar HTTPS ativo
- Testar backup/restauracao do banco

## 6. Observacoes

- Em producao, o fallback de login local nao existe.
- As leituras agora exigem usuario autenticado.
- As mutacoes de operacao exigem perfil `admin` ou `coordinator`.
- Variaveis `VITE_*` alimentam a camada publica/front-end e precisam estar disponiveis no build.
