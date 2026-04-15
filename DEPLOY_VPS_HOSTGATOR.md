# Deploy automatico na VPS da HostGator

Este projeto ja esta pronto para subir com Docker. Na HostGator VPS, o caminho mais estavel e usar deploy automatico na propria VPS via `cron`, sem depender de SSH do GitHub Actions.

Arquivos principais:

- workflow opcional: [deploy-vps.yml](</D:/aPLICATIVOS/Plantão comercial/.github/workflows/deploy-vps.yml>)
- script de deploy: [deploy.sh](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/deploy.sh>)
- auto deploy por cron: [auto-deploy.sh](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/auto-deploy.sh>)
- template Nginx: [nginx-app.conf](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/nginx-app.conf>)
- compose atual: [docker-compose.yml](</D:/aPLICATIVOS/Plantão comercial/docker-compose.yml>)

## 1. Estrategia recomendada

- dominio institucional: `plantaomedico.store`
- sistema: `app.plantaomedico.store`
- app Node + frontend: Docker Compose na VPS
- banco: MySQL em container interno
- reverse proxy: Apache/cPanel apontando para `127.0.0.1:3005`
- SSL: AutoSSL do cPanel
- deploy automatico: `cron` local na VPS

## 2. DNS na HostGator

Crie um registro `A`:

- host: `app`
- aponta para: `129.121.55.97`

## 3. Projeto na VPS

Diretorio usado:

```bash
/var/www/escala-inteligente
```

Depois do clone:

```bash
cd /var/www/escala-inteligente
chmod +x deploy/vps/deploy.sh deploy/vps/auto-deploy.sh
```

## 4. Configurar variaveis

Crie o arquivo `.env.docker`:

```bash
cp .env.docker.vps.example .env.docker
```

Ajuste pelo menos:

```env
APP_PORT=3005
MYSQL_DATABASE=escala_medica
MYSQL_USER=escala_user
MYSQL_PASSWORD=troque-esta-senha
MYSQL_ROOT_PASSWORD=troque-esta-senha-root
JWT_SECRET=troque-esta-chave-super-forte
LOCAL_LOGIN_USERNAME=admin
LOCAL_LOGIN_PASSWORD=troque-esta-senha
LOCAL_SESSION_APP_ID=local-auth
VITE_SALES_CONTACT_URL=https://plantaomedico.store
```

## 5. Deploy manual

Primeiro deploy:

```bash
cd /var/www/escala-inteligente
./deploy/vps/deploy.sh
```

Validacao:

```bash
curl http://127.0.0.1:3005/healthz
docker compose --env-file .env.docker ps
```

## 6. Dominio e SSL

No seu servidor atual:

- `app.plantaomedico.store` ja aponta para a VPS
- Apache/cPanel ja esta fazendo proxy para `127.0.0.1:3005`
- o SSL do subdominio ja foi emitido pelo AutoSSL

## 7. Deploy automatico por cron

Teste manual do auto deploy:

```bash
cd /var/www/escala-inteligente
APP_DIR=/var/www/escala-inteligente APP_BRANCH=main ./deploy/vps/auto-deploy.sh
```

Se estiver tudo certo, adicione no cron do `root`:

```bash
crontab -e
```

Linha recomendada:

```bash
*/5 * * * * APP_DIR=/var/www/escala-inteligente APP_BRANCH=main /var/www/escala-inteligente/deploy/vps/auto-deploy.sh >> /var/log/escala-auto-deploy.log 2>&1
```

Esse fluxo:

- busca `origin/main`
- detecta commit novo
- atualiza o checkout local
- roda [deploy.sh](</D:/aPLICATIVOS/Plantão comercial/deploy/vps/deploy.sh>)
- grava o commit implantado em `.last_deployed_commit`

## 8. Operacao do dia a dia

Ver logs da app:

```bash
docker compose --env-file .env.docker logs -f app
```

Ver log do auto deploy:

```bash
tail -f /var/log/escala-auto-deploy.log
```

Rodar deploy manual:

```bash
cd /var/www/escala-inteligente
./deploy/vps/deploy.sh
```

Parar ambiente:

```bash
docker compose --env-file .env.docker down
```

## 9. Observacoes importantes

- O MySQL fica dentro do Docker e nao deve ser exposto publicamente.
- O Apache/cPanel aponta para `127.0.0.1:3005`.
- O container ja executa migrations e bootstrap no start via [docker-start.mjs](</D:/aPLICATIVOS/Plantão comercial/scripts/docker-start.mjs:1>).
- O workflow do GitHub Actions pode continuar no repositorio, mas na HostGator o cron local e mais confiavel.

## 10. Checklist final

- DNS `app.plantaomedico.store` apontando para a VPS
- `.env.docker` preenchido com senhas fortes
- deploy manual funcionando
- `curl http://127.0.0.1:3005/healthz` respondendo
- Apache proxy funcionando
- SSL emitido
- `APP_DIR=/var/www/escala-inteligente APP_BRANCH=main ./deploy/vps/auto-deploy.sh` funcionando
- cron ativo
