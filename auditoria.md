# Relatório de auditoria técnica — SmartFrota

**Data da verificação:** 23/10/2026  
**Repositório:** https://github.com/DevKove/SmartFrota  
**Branch:** main  
**Escopo:** frontend, service worker, Edge Function ativa e metadados do banco Supabase.  
**Status:** auditoria parcial baseada em evidências; testes E2E completos ainda bloqueados.

## 1. Resumo executivo

**Recomendação atual: NÃO DECLARAR PRONTO PARA LANÇAMENTO COMERCIAL.** Não foram executados testes completos de ponta a ponta em navegador autenticado, testes com usuários de cada perfil nem restauração de backup. Isso não significa que todos os módulos estejam defeituosos; significa que ainda faltam evidências para aprová-los.

Foi identificada e corrigida uma falha de experiência/permissões da interface: itens do menu eram forçados a permanecer visíveis independentemente do perfil. Agora a navegação usa as permissões retornadas pela API e o perfil de administrador principal; a navegação também valida a permissão antes de abrir a página. O backend continua sendo a autoridade final de autorização.

Não foram feitas alterações destrutivas no banco de produção, não foram criadas contas de teste, não foram processadas cobranças e não foram alteradas políticas RLS.

## 2. Arquitetura observada

- **Frontend:** aplicação estática em index.html, HTML/CSS/JavaScript sem package.json na raiz.
- **Hospedagem do frontend:** GitHub Pages, base /SmartFrota/.
- **PWA:** manifest.webmanifest e service-worker.js.
- **API:** Supabase Edge Function frotagov-api, versão ativa 15, verify_jwt=false; a função valida o token Bearer manualmente com Supabase Auth antes de acessar rotas protegidas.
- **Banco:** PostgreSQL 17 no projeto Supabase SmartFrota (jyfphgnysvsrqdlbogoh).
- **Autenticação:** Supabase Auth; o frontend mantém a sessão em sessionStorage.
- **Recursos API identificados:** vehicles, secretarias, drivers, users, suppliers, work_orders, maintenance_plans, fuel_records, inspections, incidents, inventory_products, contracts e budget_sheets; rotas adicionais de autenticação, resumo do painel e consulta de perfis.
- **Modelagem observada:** 28 tabelas públicas, 7 perfis e 44 permissões. A consulta de metadados indicou 2 perfis de usuário cadastrados e ativos; nenhum dado identificável foi incluído neste relatório.
- **Migrações registradas no Supabase:** 001_initial_schema, 002_operations, 003_auth, 004_sync_changes, 005_api_only_access e três migrações posteriores de vínculo de administrador e escopo por secretaria.

## 3. Matriz inicial de rastreabilidade

| Área / requisito | Evidência examinada | Estado |
|---|---|---|
| Sintaxe JavaScript do frontend | Três blocos inline compilados em verificação isolada | APROVADO — sintaxe |
| Sintaxe JavaScript do service worker | Arquivo compilado em verificação isolada | APROVADO — sintaxe |
| Login real com credenciais válidas | Fluxo revisado no código; sem credenciais de teste e sem execução em navegador | BLOQUEADO / NÃO VERIFICADO |
| Login inválido e mensagens de erro | Tratamento estático revisado; não executado contra o endpoint | NÃO VERIFICADO |
| Recuperação de sessão e logout | Código revisado; não houve teste de navegador nem revogação remota validada | NÃO VERIFICADO |
| Troca obrigatória de senha | Validações de frontend e rota /v1/auth/change-password encontradas | APROVADO — inspeção estática; E2E NÃO VERIFICADO |
| Menu por perfil | Falha visual identificada e correção implementada com teste de regressão estático | APROVADO — verificação estática; navegador NÃO VERIFICADO |
| Painel e contagens | Endpoint /v1/dashboard/summary e consultas inspecionados | NÃO VERIFICADO — execução funcional |
| Cadastros de frota, secretarias, condutores e fornecedores | Rotas, filtros e renderização inspecionados | NÃO VERIFICADO — CRUD completo |
| Ordens de serviço, manutenção, abastecimento, inspeções e ocorrências | Rotas e regras de escopo inspecionadas | NÃO VERIFICADO — CRUD completo |
| Almoxarifado, contratos e orçamento | Rotas e permissões inspecionadas | NÃO VERIFICADO — CRUD completo |
| Relatórios e exportações | Renderização de relatórios inspecionada | NÃO VERIFICADO — conteúdo e arquivos exportados |
| Gestão de usuários e perfis | Fluxos de criação/edição/desativação inspecionados | NÃO VERIFICADO — E2E |
| Isolamento por secretaria | Verificações de escopo encontradas na Edge Function; sem tentativas E2E entre contas | NÃO VERIFICADO — segurança funcional |
| Acesso direto ao banco via API pública | Consulta de grants não encontrou privilégios de tabela para anon ou authenticated no schema public; RLS habilitado em 28 tabelas | APROVADO — grants observados; teste externo NÃO VERIFICADO |
| Configuração de senhas comprometidas | Advisor do Supabase reportou proteção contra senhas vazadas desabilitada | REPROVADO — recomendação de segurança pendente |
| Índices e desempenho do banco | Advisors reportaram 37 FKs sem índice de cobertura e 28 índices não utilizados | REPROVADO — análise de otimização pendente |
| Build, CI e publicação final | Não foi possível executar o pipeline localmente; não havia status de check associado ao commit consultado | BLOQUEADO / NÃO VERIFICADO |
| Backup e restauração | Não executados para evitar impacto em dados reais | BLOQUEADO / NÃO VERIFICADO |

## 4. Testes técnicos executados nesta etapa

1. Leitura dos arquivos index.html, service-worker.js, manifest.webmanifest, README.md, privacy.html, terms.html e do script de validação.
2. Compilação isolada dos **3 blocos JavaScript inline** de index.html: sem erros de sintaxe.
3. Compilação isolada de service-worker.js: sem erros de sintaxe.
4. Verificação de ausência de declaração duplicada async async function: aprovada.
5. Verificação de ausência de endpoint local (localhost/127.0.0.1) no HTML: aprovada.
6. Confirmação estática de presença do fluxo de troca de senha e do tratamento que não usa cache para respostas HTTP de erro.
7. Consulta read-only ao banco: 28 tabelas públicas, RLS habilitado e nenhuma policy definida nas 28 tabelas. A consulta de grants não retornou privilégios de tabela para anon ou authenticated no schema público, coerente com a arquitetura API-only. **Não foram criadas policies automaticamente**, pois isso exige desenho de autorização compatível com o uso exclusivo da Edge Function.
8. Advisors de segurança Supabase: 28 ocorrências informativas de RLS sem policies e 1 alerta de proteção contra senhas vazadas desabilitada.
9. Advisors de desempenho Supabase: 37 chaves estrangeiras sem índice de cobertura e 28 índices marcados como não utilizados.
10. Inspeção da Edge Function ativa e das regras de autenticação, permissões, escopo por secretaria, criação/edição/desativação de usuários e operações de CRUD.

**Limitação importante:** a tentativa de clonar o repositório pelo ambiente de execução não funcionou por indisponibilidade de DNS/rede. Por isso, não afirmo que node scripts/validate-inline-js.mjs, o navegador, o build ou o GitHub Actions foram executados com sucesso. A validação isolada acima não substitui o pipeline real.

## 5. Defeito encontrado e correção aplicada

### SF-UI-001 — Itens de menu visíveis para perfis sem permissão

- **Severidade:** P2 (interface e experiência de acesso).
- **Causa:** alguns itens eram explicitamente forçados a ficar visíveis por estilos inline; a interface não aplicava o conjunto de permissões retornado por /v1/auth/me.
- **Correção:** implementado mapa página-permissão; itens sem permissão são ocultados, grupos vazios também são ocultados e a navegação verifica a permissão antes de abrir a página. A tela de usuários tem apresentação somente para consulta quando o perfil não é o administrador principal.
- **Regressão:** o script de validação passou a verificar a existência da lógica de autorização visual e a ausência do estilo que forçava o menu a aparecer.
- **Commit da correção de interface:** https://github.com/DevKove/SmartFrota/commit/9f79cd4d34225241f315bb057ff595f0822f4f9e
- **Commit dos testes estáticos:** https://github.com/DevKove/SmartFrota/commit/8a7e0d7253c8df1c51da7073d63e96d3f2598405
- **Status:** correção commitada; publicação e comportamento visual real ainda precisam de confirmação no navegador. A autorização do backend permanece obrigatória e não é substituída pela ocultação de menus.

## 6. Pendências técnicas e riscos residuais

### P2 — Proteção contra senhas comprometidas desabilitada
O advisor de Auth recomenda habilitar a proteção contra senhas vazadas. Não alterei configuração de Auth nesta etapa, pois a mudança precisa ser validada com a política de senha e o fluxo de acesso institucional.

### P2 — Criação de usuários pode deixar estado parcial em falhas intermediárias
Na Edge Function, o fluxo cria a conta de Auth e o perfil antes de concluir a atribuição de perfis e vínculos com secretarias. Se uma operação posterior falhar, alguns caminhos retornam erro sem compensar todas as gravações anteriores. Recomenda-se tornar o fluxo compensatório/transacional e testar falhas simuladas em ambiente isolado antes de alterar a função de produção.

### P2 — Logout local não demonstra revogação do token no servidor
O frontend limpa a sessão local, enquanto a rota /v1/auth/logout da função retorna 204 sem revogar explicitamente a sessão Supabase. Isso não prova uma exploração ativa, mas deixa a revogação remota não demonstrada caso um token seja copiado. Avaliar e testar uma estratégia segura de revogação sem derrubar sessões de outros dispositivos.

### P2 — Índices e desempenho
Os 37 avisos de FKs sem índice e 28 índices não utilizados exigem revisão individual. **Não remover nem criar índices em lote com base apenas no advisor**: os índices aparentemente não utilizados podem ser necessários após período maior ou para consultas raras; medir planos de execução e carga primeiro.

### Defesa em profundidade — RLS sem policies
As 28 tabelas públicas têm RLS habilitado e nenhuma policy. A consulta de grants não encontrou permissões de tabela para anon/authenticated, e a aplicação opera por Edge Function com chave privilegiada no servidor. Não adicionar policies genéricas nem abrir acesso direto: primeiro confirmar e documentar a arquitetura API-only e manter a chave secreta exclusivamente no ambiente da função.

### Autorização entre secretarias
O código contém checagens de escopo na Edge Function, mas a tentativa de acesso cruzado entre usuários/secretarias ainda não foi executada com contas de teste. Deve ser testada antes do uso com dados reais.

## 7. Próximas etapas obrigatórias

1. Confirmar no GitHub Actions o resultado da validação após os commits.
2. Executar os principais fluxos em navegador: login válido/inválido, restauração de sessão, logout, troca de senha, cada perfil e navegação por menu.
3. Criar usuários fictícios em ambiente isolado para validar permissões e isolamento entre secretarias.
4. Testar CRUD positivo/negativo de cada recurso, validações, conflitos de versão, persistência após recarregar e respostas 4xx/5xx.
5. Corrigir e testar o tratamento de falhas parciais na criação de usuários.
6. Revisar revogação de sessões e ativação da proteção contra senhas comprometidas.
7. Revisar os 37 índices de FK com planos de execução e volume representativo; não remover índices sem evidência.
8. Testar exportações, responsividade, acessibilidade, service worker offline e recuperação de conexão.
9. Testar backup/restauração em ambiente isolado e documentar rollback.
10. Atualizar esta matriz com os resultados E2E, logs sanitizados, quantidades reais de testes e evidências.

## 8. Conclusão

O trabalho executado até aqui encontrou e corrigiu um defeito de visibilidade do menu e confirmou a sintaxe dos scripts e alguns controles estáticos. A auditoria **não está concluída**: autenticação real, CRUD completo, isolamento entre secretarias, publicação no navegador, recuperação de backup e fluxos operacionais ainda não têm evidência E2E. Até esses pontos serem verificados e as pendências relevantes serem tratadas, a recomendação é não declarar o sistema pronto para lançamento comercial.
