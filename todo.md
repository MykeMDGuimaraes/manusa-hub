# Manusa Hub — TODO

## Schema & Backend
- [x] Tabela `manusa_params` — parâmetros CPL/CTR/orçamento por ICP
- [x] Tabela `manusa_rotinas` — estado on/off e metadados de cada rotina
- [x] Tabela `manusa_acoes` — histórico de ações A1/A2/A3
- [x] DB helpers para params, rotinas e ações
- [x] Router tRPC: params (get/update)
- [x] Router tRPC: rotinas (list, toggle, executar agora)
- [x] Router tRPC: ações (list com filtros)

## Layout & Tema
- [x] Tema escuro global (#0f0f0f) em index.css
- [x] Sidebar fixa com navegação (Dashboard, Gerador, Supervisão, Rotinas)
- [x] Indicador de status Manusa (verde/vermelho) na sidebar
- [x] Layout wrapper com autenticação OAuth

## Páginas
- [x] /dashboard — iframe DiaDash (diadash-niv2azh7.manus.space)
- [x] /gerador — iframe Gerador de Conteúdo (diagensetor-dhzgehtk.manus.space)
- [x] /supervisao — iframe Supervisão Manusa (diasolutions-lgfnqque.manus.space)
- [x] /rotinas — Controle de Rotinas (toggles + Executar agora + log)
- [x] /rotinas — Painel de parâmetros editáveis
- [x] /rotinas — Histórico de ações A1/A2/A3 com filtros

## Integração Manus API
- [x] Toggle on/off chama Manus API para pausar/retomar task
- [x] Botão "Executar agora" cria nova execução via Manus API
- [x] Salvar MANUS_API_KEY como secret

## Testes
- [x] Teste de router params
- [x] Teste de router rotinas
- [x] Teste de router ações

## Bugs
- [x] Gerador de Conteúdo não autentica automaticamente via login principal do portal
- [x] Gerador de Conteúdo falha ao carregar no iframe (erro a investigar)
- [x] Criar página de redirecionamento elegante para o Gerador de Conteúdo (solução temporária)

## Update Ecossistema Themis Bridge v1.0
- [x] Adicionar tabela `olimpo_workflows` com os 7 workflows n8n reais
- [x] Adicionar tabela `olimpo_operadores` com os 4 operadores do Olimpo
- [x] Atualizar router com endpoints de saúde do Olimpo
- [x] Atualizar página de Rotinas com dados reais dos 7 workflows n8n + links externos
- [x] Criar página /olimpo com status dos 4 operadores e 7 workflows
- [x] Adicionar link para n8n, Mike (Supabase) e ClickUp na sidebar
- [x] Atualizar sidebar com item "Saúde do Olimpo"
- [x] Atualizar App.tsx com rota /olimpo

## API Themis (comunicação sem OAuth)
- [x] Tabela `api_keys` no schema (id, name, key_hash, owner, created_at, last_used_at, active)
- [x] Tabela `themis_pautas` no schema (id, externalId, titulo, pilar, icp, faseTeia, ancora, textoAres, modoPublicacao, status, metadados)
- [x] Middleware Express de autenticação por API key (`/api/themis/*`)
- [x] Endpoint POST `/api/themis/pauta` — receber pauta aprovada com payload 4D
- [x] Endpoint POST `/api/themis/recalibracao` — enviar ajustes de score para Manusa
- [x] Endpoint POST `/api/themis/briefing-criativo` — solicitar geração de criativo
- [x] Endpoint GET `/api/themis/status` — consultar status das rotinas e campanhas
- [x] Endpoint POST `/api/themis/acao` — registrar ação A1/A2/A3 no histórico
- [x] Endpoint GET `/api/themis/feedback` — obter último YAML de feedback semanal
- [x] Endpoint GET `/api/themis/pautas` — listar pautas registradas
- [x] Router tRPC: apiKeys (list, create, revoke)
- [x] Router tRPC: themis (pautas)
- [x] Página `/api-keys` no portal para gerenciar keys (criar, revogar, ver última utilização)
- [x] Seção de pautas recebidas do Themis na página /api-keys
- [x] Item "API Keys" adicionado à sidebar de navegação
- [x] Testes Vitest para middleware e endpoints Themis (13 testes)

## Refinamentos futuros (backlog)
- [ ] Adicionar campo `canal` em `themis_pautas` e validar payload 4D completo em `POST /api/themis/pauta`
- [ ] Validar `icp` em `POST /api/themis/recalibracao` contra enum permitido e retornar erro quando nenhum parâmetro for atualizado
- [ ] Expandir `GET /api/themis/status` para incluir dados de campanhas ativas (via Meta Ads API)
- [ ] Persistir feedback semanal em tabela dedicada e fazer `GET /api/themis/feedback` retornar o último YAML real
