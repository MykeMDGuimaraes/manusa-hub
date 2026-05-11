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
