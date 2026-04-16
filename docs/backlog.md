# Sistema de Escala Médica Hospitalar - TODO

## Banco de Dados (Schema)
- [x] Tabela de médicos (doctors) com todos os campos de disponibilidade
- [x] Tabela de turnos (shifts) com tipos: manhã SUS, manhã convênio, tarde SUS, tarde convênio, noite
- [x] Tabela de escalas mensais (schedules)
- [x] Tabela de entradas de escala (schedule_entries)
- [x] Tabela de regras fixas semanais (weekly_rules)
- [x] Tabela de exceções mensais (monthly_exceptions)
- [x] Tabela de indisponibilidades (unavailabilities)
- [x] Tabela de feriados (holidays)
- [x] Tabela de histórico de alterações (audit_logs)
- [x] Pré-cadastro dos 22 médicos listados

## Backend (tRPC Routers)
- [x] Router de médicos: CRUD completo
- [x] Router de escalas: criar, buscar, atualizar por mês
- [x] Router de entradas de escala: adicionar, remover, mover médico
- [x] Router de regras fixas: CRUD
- [x] Router de exceções: CRUD
- [x] Router de indisponibilidades: CRUD
- [x] Router de feriados: CRUD
- [x] Algoritmo de geração automática de escala
- [x] Motor de rodízio de noites
- [x] Motor de finais de semana e residentes
- [x] Sistema de validação de conflitos
- [x] Cálculo de score de equilíbrio
- [x] Exportação CSV (relatório por médico e detalhado)
- [ ] Exportação PDF formatado (placeholder implementado)
- [x] Relatórios: plantões por médico, noites, finais de semana, cobertura

## Frontend - Layout e Navegação
- [x] Tema visual: azul hospitalar profissional, sidebar lateral
- [x] DashboardLayout com sidebar e navegação principal
- [x] Rotas: Dashboard, Calendário, Médicos, Regras, Exceções, Relatórios, Configurações

## Frontend - Dashboard
- [x] Visão geral do mês atual
- [x] Indicadores de carga por médico em tempo real
- [x] Contador de noites e finais de semana por médico
- [x] Destaque de plantões descobertos (sem cobertura)
- [x] Botões de ação rápida: Gerar Escala, Ver Calendário

## Frontend - Calendário Mensal
- [x] Grade mensal com 5 turnos por dia útil
- [x] Cores diferenciadas: SUS (azul), Convênio (verde), Noite (roxo), FDS (laranja)
- [x] Nomes curtos dos médicos dentro dos blocos
- [x] Clique no plantão abre modal de edição/remoção
- [x] Modal para adicionar plantão manualmente
- [x] Navegação entre meses
- [x] Botão "Gerar Escala Automática"
- [x] Filtros por médico e turno
- [ ] Drag and drop para mover médicos (funcionalidade avançada futura)

## Frontend - Módulo de Médicos
- [x] Lista de médicos com busca e filtros
- [x] Formulário completo de cadastro/edição com abas
- [x] Campos: nome, nome curto, categoria, vínculos, disponibilidades por turno
- [x] Campos: limites de plantões/noites/finais de semana por mês
- [x] Campos: participa do rodízio, cor de identificação, prioridade
- [x] Pré-cadastro de 22 médicos com botão na interface

## Frontend - Módulo de Regras Fixas
- [x] Tela de regras por dia da semana (segunda a sexta)
- [x] Configuração de médicos fixos por turno
- [x] Regras de alternância (1ª/3ª semana vs 2ª/4ª semana)
- [x] Regras de rodízio de noites e noite fixa

## Frontend - Módulo de Finais de Semana
- [x] Tela específica de sábado e domingo
- [x] Regras de plantão 24h convênio
- [x] Configuração de médicos fixos de fim de semana por semana do mês

## Frontend - Módulo de Exceções
- [x] Tela de exceções mensais
- [x] Cadastro de exceções anuais, mensais, pontuais, recorrentes
- [x] Bloqueios por data
- [x] Indisponibilidades específicas por data

## Frontend - Validação e Conflitos
- [x] Detecção de conflitos no calendário (ícone de alerta)
- [x] Validação automática ao adicionar plantão manualmente
- [x] Contador de conflitos no dashboard e calendário

## Frontend - Relatórios e Exportação
- [x] Tela de relatórios com filtros por mês
- [x] Relatório de plantões por médico (tabela)
- [x] Distribuição por turno (gráfico de barras)
- [x] Exportação CSV resumo por médico
- [x] Exportação CSV detalhada (escala completa)
- [x] Cards de resumo: total plantões, noites, score equilíbrio

## Frontend - Configurações
- [x] Gerenciamento de feriados (CRUD)
- [x] Controle de status da escala (rascunho/preliminar/aprovada/bloqueada)

## Testes
- [x] Testes do algoritmo de geração automática (5 testes)
- [x] Testes de validação de conflitos (4 testes)
- [x] Teste de logout (1 teste)
- [x] Total: 10 testes passando

## Entrega
- [x] Checkpoint final
- [x] Verificação de funcionamento completo

- [x] Reformular lógica de FDS: Sábado = 1 SUS 12h + 1 Convênio 24h; Domingo = 1 médico 24h
- [x] Implementar rodízio automático equilibrado de médicos nos FDS
- [x] Atualizar seed de regras de FDS com lista de elegíveis por tipo
- [x] Corrigir residentes (Walesca, Lara, Thaiane, Caio Silva): canDomingo=false, não participam do rodízio de domingo
- [x] Gerar escala de maio 2026 equilibrada com base na carga de abril (rodízio justo, cobertura completa)
- [x] Corrigir FDS: médico convênio sábado 24h não pode ser o mesmo do domingo 24h (dias consecutivos bloqueados)
