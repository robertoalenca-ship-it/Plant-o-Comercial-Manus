# Deploy automatico na VPS da HostGator

Este projeto ja esta pronto para subir com Docker e deploy automatico por GitHub Actions.

Arquivos principais:

- workflow: [deploy-vps.yml](</D:/aPLICATIVOS/Plantão comercial/.github/workflows/deploy-vps.yml>)
- script da VPS: [deploy.sh](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/deploy.sh>)
- template Nginx: [nginx-app.conf](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/nginx-app.conf>)
- compose atual: [docker-compose.yml](</D:/aPLICATIVOS/Plantão comercial/docker-compose.yml>)

## 1. Estrategia recomendada

- dominio institucional: `seudominio.com`
- sistema: `app.plantaomedico.store`
- app Node + frontend: Docker Compose na VPS
- banco: MySQL em container interno
- reverse proxy: Nginx no host
- SSL: Let's Encrypt com Certbot
- deploy automatico: GitHub Actions via SSH

## 2. DNS na HostGator

Crie um registro `A`:

- host: `app`
- aponta para: IP publico da VPS

Se quiser manter o site principal separado, nao altere o `A` do `@` agora.

## 3. Preparacao inicial da VPS

Exemplo para Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Confirme:

```bash
docker --version
docker compose version
nginx -v
```

## 4. Clonar o projeto na VPS

Escolha um diretorio fixo, por exemplo:

```bash
mkdir -p /var/www
cd /var/www
git clone <URL_DO_REPOSITORIO> escala-inteligente
cd escala-inteligente
```

## 5. Configurar variaveis

Crie o arquivo `.env.docker`:

```bash
cp .env.docker.vps.example .env.docker
```

Ajuste pelo menos:

```env
APP_PORT=3000
MYSQL_DATABASE=escala_medica
MYSQL_USER=escala_user
MYSQL_PASSWORD=troque-esta-senha
MYSQL_ROOT_PASSWORD=troque-esta-senha-root
JWT_SECRET=troque-esta-chave-super-forte
LOCAL_LOGIN_USERNAME=admin
LOCAL_LOGIN_PASSWORD=troque-esta-senha
LOCAL_SESSION_APP_ID=local-auth
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
VITE_APP_ID=
OWNER_OPEN_ID=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
VITE_SALES_CONTACT_URL=https://plantaomedico.store
```

## 6. Primeiro deploy manual

No primeiro deploy:

```bash
chmod +x deploy/vps/deploy.sh
./deploy/vps/deploy.sh
```

Validacoes:

```bash
curl http://127.0.0.1:3000/healthz
docker compose --env-file .env.docker ps
```

## 7. Configurar Nginx

Copie o template e ajuste o dominio:

```bash
sudo cp deploy/vps/nginx-app.conf /etc/nginx/sites-available/escala-inteligente
sudo nano /etc/nginx/sites-available/escala-inteligente
```

Troque:

- `app.plantaomedico.store` se esse for o subdominio final

Ative o site:

```bash
sudo ln -s /etc/nginx/sites-available/escala-inteligente /etc/nginx/sites-enabled/escala-inteligente
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL com Let's Encrypt

Depois que o DNS estiver propagado:

```bash
sudo certbot --nginx -d app.plantaomedico.store
```

Teste renovacao:

```bash
sudo certbot renew --dry-run
```

## 9. Configurar deploy automatico no GitHub

Adicione estes secrets no repositorio:

- `VPS_HOST`: IP ou host da VPS
- `VPS_USER`: usuario SSH
- `VPS_SSH_KEY`: chave privada usada pela Action
- `VPS_PORT`: normalmente `22`
- `VPS_APP_DIR`: ex. `/var/www/escala-inteligente`
- `APP_DOMAIN`: `app.plantaomedico.store`
- `VPS_APP_BRANCH`: ex. `main`

O workflow:

- conecta por SSH
- entra em `VPS_APP_DIR`
- faz `git pull --ff-only`
- roda [deploy.sh](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/deploy.sh>)
- valida `GET /healthz`

## 10. Operacao do dia a dia

Ver logs:

```bash
docker compose --env-file .env.docker logs -f app
```

Rebuild manual:

```bash
./deploy/vps/deploy.sh
```

Parar ambiente:

```bash
docker compose --env-file .env.docker down
```

## 11. Observacoes importantes

- O MySQL fica dentro do Docker e nao deve ser exposto publicamente.
- O Nginx aponta para `127.0.0.1:3000`, nao para a internet direta.
- O container ja executa migrations e bootstrap no start via [docker-start.mjs](</D:/aPLICATIVOS/Plantão comercial/scripts/docker-start.mjs:1>).
- Se quiser separar banco da app no futuro, basta trocar `DATABASE_URL` para um MySQL externo e ajustar o compose.

## 12. Checklist de go-live

- DNS `app.plantaomedico.store` apontando para a VPS
- `.env.docker` preenchido com senhas fortes
- primeiro deploy manual executado
- `curl http://127.0.0.1:3000/healthz` respondendo
- Nginx ativo
- SSL emitido
- GitHub secrets configurados
- push na `main` validando deploy automatico
