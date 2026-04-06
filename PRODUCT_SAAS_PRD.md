# PRD de Produto SaaS - Escala Medica por Equipe

## 1. Tese do produto

Transformar o app atual em um produto SaaS horizontal de gestao de escalas medicas por equipe, vendido por setor/equipe/unidade, sem se posicionar como sistema hospitalar completo.

O produto resolve um problema simples e valioso:

- substituir planilha + WhatsApp na operacao de escala
- reduzir retrabalho do coordenador
- dar visibilidade, historico e governanca sobre a escala mensal

## 2. Categoria e posicionamento

### Categoria

Gestao inteligente de escalas medicas por equipe

### One-liner

Uma plataforma web para montar, ajustar, aprovar e operar escalas medicas de forma rapida, auditavel e sem depender de planilhas e grupos de mensagem.

### O que o produto nao e

- nao e prontuario
- nao e sistema hospitalar completo
- nao e ERP hospitalar
- nao e plataforma de RH
- nao e marketplace de plantonistas no lancamento

### Unidade de venda

1 escala = 1 equipe/setor/unidade

Exemplos:

- UTI adulto
- pronto atendimento
- cirurgia geral
- residencia clinica
- anestesia
- clinica medica

## 3. ICP

### Cliente ideal

- equipes de 10 a 60 medicos
- coordenador medico ou chefe de servico como comprador inicial
- secretaria da escala ou coordenador operacional como usuario frequente

### Segmentacao correta

O produto deve ser horizontal para qualquer equipe medica.

Especialidade nao deve ser o eixo principal de venda.
Especialidade entra apenas como:

- metadado de cadastro
- template opcional de setup
- recorte futuro de benchmark ou relatorio

## 4. Modelo operacional do produto

### Entidade principal

Equipe de escala

Cada equipe de escala tem:

- nome
- unidade/hospital
- opcionalmente especialidade
- medicos
- regras
- excecoes
- meses gerados
- coordenadores e visualizadores

### Taxonomia oficial de turnos

No produto, a linguagem padrao deve ser:

- Manha
- Tarde
- Noite

Diurno nao deve ser um turno base.
Diurno deve existir apenas como agrupador gerencial = Manha + Tarde.

Plantao 24h nao deve ser turno-base do produto.
Se existir, deve entrar depois como configuracao avancada de jornada ou template operacional especifico.

### Observacao tecnica importante

No codigo atual, o sistema trabalha com:

- manha_sus
- manha_convenio
- tarde_sus
- tarde_convenio
- noite
- plantao_24h

Para lancar mais rapido, a versao comercial nao precisa reescrever o banco agora.
O caminho recomendado e:

1. manter o modelo interno atual no backend
2. apresentar no front uma camada de exibicao universal
3. esconder SUS/Convenio da experiencia padrao do produto
4. expor apenas Manha, Tarde e Noite como turnos comerciais

Assim, o produto passa a vender uma estrutura simples e universal de escala.
Qualquer detalhe herdado da ortopedia fica como legado tecnico interno ate refatoracao futura.

## 5. O que o app ja tem

O produto ja possui um core forte para o lancamento:

- criacao e geracao de escala mensal
- cadastro de medicos
- regras semanais
- regras de fim de semana
- excecoes
- calendario com ajuste manual
- exportacao CSV e PDF
- estrutura de multi-perfil para separar escalas

Isso significa que o problema principal ja esta resolvido no plano funcional.
O que falta agora e camada de produto, governanca e empacotamento comercial.

## 6. O que precisa entrar no MVP vendavel

### P0 - obrigatorio para vender

1. Aprovacao e lock reais da escala
   - ao aprovar, a escala precisa travar alteracoes nao autorizadas
   - mudar status sem bloquear operacao nao gera confianca comercial

2. Historico e auditoria visiveis
   - quem mudou
   - quando mudou
   - o que mudou
   - justificativa da alteracao manual

3. Vinculo correto de usuarios com equipes/perfis
   - usuario novo deve entrar na equipe certa
   - nao pode cair em onboarding de criacao de ambiente indevido

4. Edicao de regras e excecoes existentes
   - criar/apagar apenas nao basta para operacao real

5. Indisponibilidade recorrente
   - recorrencia semanal por medico e turno

6. Onboarding comercial enxuto
   - criar equipe
   - cadastrar medicos
   - escolher modelo de turnos
   - importar ou montar primeira escala

7. Demo generica
   - remover dependencia comercial da base ortopedica
   - criar ambiente exemplo neutro

### P1 - importante para vender melhor

1. Importacao de planilha
2. Solicitacao de troca de plantao com aprovacao
3. Notificacoes operacionais
4. Dashboard de cobertura e conflitos

### P2 - depois de validacao

1. Billing self-serve
2. Marketplace de plantonistas
3. Integracoes hospitalares
4. SSO e camada enterprise

## 7. O que deve ficar fora agora

- folha/pagamento
- ponto e check-in
- prontuario
- credentialing
- BI complexo
- multi-hospital enterprise como foco inicial
- app mobile nativo
- marketplace

## 8. O que faz o produto parecer profissional

### Minimo obrigatorio

- onboarding limpo
- aprovacao da escala
- lock real
- historico de alteracoes
- perfil/equipe separado corretamente
- exportacao confiavel
- linguagem consistente e comercial

### Linguagem do produto

Trocar linguagem excessivamente interna por linguagem de produto:

- "escala ativa"
- "equipe"
- "periodo"
- "aprovado"
- "travado"
- "historico"
- "coordenador"

## 9. Estrategia de monetizacao

### Principio

Cobrar por equipe/setor, nao por hospital inteiro.

### Planos sugeridos

#### Starter

- 1 equipe
- ate 20 medicos
- calendario, regras, excecoes, exportacoes
- R$ 599/mes

#### Pro

- 1 equipe
- ate 40 medicos
- aprovacao, auditoria, suporte prioritario
- R$ 990/mes

#### Growth

- ate 3 equipes
- ate 60 medicos por equipe
- multi-coordenador
- onboarding assistido
- R$ 1.790/mes

### Implantacao

- R$ 2.500 a R$ 6.000 por equipe
- inclui setup, migracao da planilha, treinamento e publicacao da primeira escala

### Modulos extras

- importacao historica
- relatorio customizado
- notificacoes automatizadas
- SLA reforcado
- template operacional personalizado

### Estrategia de cobranca

No inicio:

- contrato simples
- cobranca manual
- PIX, boleto ou faturamento

Nao bloquear o go-to-market esperando billing self-serve.

## 10. Go-to-market

### Pitch simples

Em poucos dias voce sai do Excel e do WhatsApp para operar sua escala medica em um sistema web com regras, aprovacao, historico e exportacao.

### Primeiro comprador

- chefe de servico
- coordenador medico
- secretaria da escala

### Canais iniciais

- networking medico
- WhatsApp direto
- indicacao do hospital atual
- visita curta com demo
- grupos profissionais
- coordenadores de residencia e servicos

### Validacao inicial

Meta:

- 5 clientes pagos
- ativacao em ate 7 dias
- renovacao no segundo mes

### Sinais de validacao

- escala publicada no sistema, nao em planilha
- coordenador usa o calendario semanalmente
- reducao de mensagem paralela no WhatsApp
- cliente pede mais uma equipe, nao mais uma feature aleatoria

## 11. Roadmap de evolucao

### Fase 1 - lancamento comercial

- posicionamento horizontal
- lock + aprovacao
- auditoria
- acesso por equipe
- edicao de regras
- demo generica
- proposta comercial

### Fase 2 - expansao operacional

- importacao de planilha
- trocas com aprovacao
- notificacoes
- relatorios melhores
- templates operacionais

### Fase 3 - expansao de conta

- multiplas equipes por grupo
- governanca de acesso
- SLA
- relatorios gerenciais

### Fase 4 - enterprise

- SSO
- API
- integracoes
- compliance
- controles avancados

Marketplace de plantonistas so deve ser considerado apos base recorrente relevante de clientes ativos e demanda comprovada de cobertura.

## 12. Backlog de produto ligado ao codigo atual

### Ja suportado na base atual

- multi-perfil de escala
- exportacoes
- calendario com ajustes
- regras e excecoes

### Gaps tecnicos priorizados

#### P0-A. Lock real de escala

- hoje o schema ja tem approvedAt e isLocked
- a API ainda so atualiza status
- add/remove manual ainda segue liberado

#### P0-B. Tela de auditoria

- backend ja expoe getAuditLog
- frontend ainda nao tem menu/tela para isso

#### P0-C. Vinculo usuario-equipe

- criacao de usuario gerenciado existe
- listagem de profiles por vinculo existe
- falta ligar um ao outro no fluxo de produto

#### P0-D. Indisponibilidade recorrente

- backend suporta recorrencia fixa
- frontend hoje trata muito do fluxo mensal

#### P0-E. Edicao de regras

- backend possui update
- telas trabalham principalmente com create/delete

#### P0-F. Desespecializacao da base ortopedica

- converter baseline especifico em sistema generico de templates
- manter especialidade apenas como opcao

## 13. Plano de execucao de 30 dias

### Semana 1

- fechar linguagem comercial do produto
- definir onboarding universal
- desenhar demo generica
- detalhar backlog P0

### Semana 2

- implementar lock + aprovacao
- implementar historico de auditoria
- implementar vinculo usuario-equipe

### Semana 3

- implementar recorrencia e edicao
- ajustar UX do calendario e justificativa manual
- limpar referencias comerciais excessivamente especificas

### Semana 4

- preparar demo
- montar proposta comercial
- rodar 3 a 5 demos
- fechar primeiros pilotos pagos

## 14. KPIs de produto

- tempo para publicar escala
- numero de alteracoes manuais por mes
- numero de conflitos apos aprovacao
- taxa de ativacao em 7 dias
- taxa de renovacao no segundo mes
- numero de equipes por cliente

## 15. Decisoes fechadas

- produto horizontal, nao preso a uma especialidade
- venda por equipe/setor/unidade
- foco em 10 a 60 medicos
- turnos base = Manha, Tarde e Noite
- "Diurno" como agrupador, nao como turno-base
- especialidade como template opcional, nao como posicionamento principal
