# Publicacao com Docker

## Subida mais simples

Se quiser subir com os valores padrao do projeto:

```bash
npm run docker:up
```

O sistema sobe com:

- app em `http://localhost:3000`
- MySQL em rede interna do Docker
- migrations aplicadas automaticamente na subida
- base inicial da `Ortopedia` carregada automaticamente em banco vazio
- login padrao `admin` / `sonhen`

## Personalizar variaveis

1. Copie o arquivo de exemplo:

```bash
cp .env.docker.example .env.docker
```

2. Ajuste as senhas e a porta.

3. Suba usando o arquivo:

```bash
npm run docker:up
```

O script escolhe automaticamente:

- `.env.docker`, se existir
- `.env.docker.example`, se voce ainda nao personalizou

## Comandos uteis

Subir:

```bash
npm run docker:down
```

Ver logs:

```bash
npm run docker:logs
```

Resetar containers e volume do banco:

```bash
npm run docker:reset
```

## Validacao

Depois da subida:

- app: `http://localhost:3000`
- healthcheck: `http://localhost:3000/healthz`

## Observacao

O endpoint `/readyz` agora aceita producao com login local. Se voce preencher as variaveis de OAuth, ele tambem valida esse modo.
