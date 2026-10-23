# Relatório de auditoria técnica — SmartFrota

**Data da verificação:** 23/10/2026  
**Repositório:** https://github.com/DevKove/SmartFrota  
**Branch:** main  
**Escopo:** frontend, service worker, Edge Function ativa e metadados do banco Supabase.  
**Status:** auditoria parcial baseada em evidências; testes E2E completos ainda bloqueados. Correções aditivas de esquema e API foram aplicadas, mas a execução real dos endpoints após a implantação ainda precisa ser confirmada.

## 1. Resumo executivo

**Recomendação atual: NÃO DECLARAR PRONTO PARA LANÇAMENTO COMERCIAL.** Não foram executados testes completos de ponta a ponta em navegador autenticado, testes com usuários de cada perfil nem restauração de backup. Isso não significa que todos os módulos estejam defeituosos; significa que ainda faltam evidências para aprová-los.

Foram identificados e corrigidos dois problemas funcionais: (1) itens do menu eram forçados a permanecer visíveis independentemente do perfil; (2) a API usava campos deleted_at/updated_at que faltavam em várias tabelas e não reconhecia três recursos consultados pela área de secretaria. A navegação agora usa as permissões retornadas pela API e a API foi atualizada para compatibilidade com o esquema e consulta dos recursos adicionais. O backend continua sendo a autoridade final de autorização.

Não foram feitas alterações destrutivas no banco de produção, não foram criadas contas de teste, não foram processadas cobranças e não foram alteradas políticas RLS.

## 2. Arquitetura observada

- **Frontend:** aplicação estática em index.html, HTML/CSS/JavaScript sem package.json na raiz.
- **Hospedagem do frontend:** GitHub Pages, base /SmartFrota/.
- **PWA:** manifest.webmanifest e service-worker.js.
- **API:** Supabase Edge Function frotagov-api, versão ativa 17, verify_jwt=false; a função valida o token Bearer manualmente com Supabase Auth antes de acessar rotas protegidas.
- **Banco:** PostgreSQL 17 no projeto Supabase SmartFrota (jyfphgnysvsrqdlbogoh).
- **Autenticação:** Supabase Auth; o frontend mantém a sessão em sessionStorage.
- **Recursos API identificados:** vehicles, secretarias, drivers, users, suppliers, work_orders, maintenance_plans, fuel_records, inspections, incidents, inventory_products, contracts, budget_sheets, financial_transactions, inventory_movements e vehicle_documents; os três últimos recursos estão disponíveis somente para consulta na área de secretaria.
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
| Build, CI e publicação final | GitHub Actions `Validate SmartFrota`, run 20, job `validate` e passo `Validate frontend JavaScript` concluídos com sucesso; build completo e publicação visual não foram testados | APROVADO — CI configurado; E2E/publicação NÃO VERIFICADOS |
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
11. Logs da versão 15 registraram HTTP 500 em consultas a recursos operacionais. A inspeção do esquema confirmou ausência de deleted_at em dez tabelas e de updated_at em algumas delas.
12. Aplicada migração aditiva 20261023201201_align_api_resource_columns. A consulta posterior confirmou deleted_at/updated_at/created_at nos recursos que a API espera; não foram apagados registros.
13. Edge Function atualizada para versão 16; foram adicionadas rotas de consulta somente leitura para financial_transactions, inventory_movements e vehicle_documents, com checagem de permissão e filtro por secretaria/veículos autorizados.
14. Após identificar caminhos que poderiam deixar uma conta parcialmente criada se a atribuição de perfil ou secretaria falhasse, foi implementada limpeza compensatória da conta Auth, perfil, perfis e vínculos antes de retornar erro. A função foi implantada como versão 17.
15. O código-fonte da função e as migrações foram sincronizados no GitHub. Não havia requisições registradas para a versão 16 ou 17 no momento das verificações; o teste runtime pós-deploy continua pendente.
16. Revalidação estática final: 23 de 23 verificações passaram; os três blocos JavaScript inline e o service worker não apresentaram erros de sintaxe; as 11 tabelas esperadas têm deleted_at; a função ativa versão 17 corresponde ao código versionado no GitHub. Isso não substitui testes E2E.

**Limitação importante:** a tentativa de clonar o repositório pelo ambiente de execução não funcionou por indisponibilidade de DNS/rede, portanto o script não foi executado localmente neste ambiente. Entretanto, o GitHub Actions foi consultado: o workflow `Validate SmartFrota` concluiu com sucesso no run 20, commit `f85c5c10bf4ca22eb42129f0a508b536075f463f` (https://github.com/DevKove/SmartFrota/actions/runs/40017905083). O job `validate` e o passo `Validate frontend JavaScript` passaram. Isso confirma a validação automatizada configurada no workflow, mas não substitui testes E2E no navegador nem valida CRUD/autorização real.

## 5. Defeito encontrado e correção aplicada

### SF-API-001 — Recursos operacionais falhavam por incompatibilidade de esquema e rotas ausentes

- **Severidade:** P1 (fluxos essenciais de consulta/gestão falhavam em módulos operacionais).
- **Evidência:** logs da versão 15 registraram HTTP 500 em contratos, inspeções, ordens de serviço, abastecimentos, ocorrências, planos de manutenção e orçamento. A consulta ao esquema confirmou ausência de deleted_at em budget_sheets, contracts, fuel_records, incidents, inspections, inventory_products, maintenance_plans, work_orders, financial_transactions e inventory_movements; também faltavam updated_at em fuel_records, inspections, financial_transactions e inventory_movements, além de created_at em inventory_movements.
- **Correção:** migração aditiva aplicada; a verificação posterior confirmou os campos esperados sem apagar registros. A Edge Function foi implantada inicialmente como versão 16 e depois atualizada para versão 17, incluindo limpeza compensatória na criação de usuários; a versão 16 passou a reconhecer financial_transactions, inventory_movements e vehicle_documents como recursos somente de leitura, com autorização e escopo por secretaria/veículos.
- **Evidência de implantação:** migração registrada como 20261023201201 / align_api_resource_columns; versão ativa da função confirmada como 17.
- **Status:** esquema e implantação confirmados. Consulta aos logs em 2026-10-23 20:33 UTC mostrou tráfego apenas na versão 15 (176 respostas 200, 21 respostas 500 e 9 respostas 404); não havia requisições registradas para as versões 16/17 após a implantação. Portanto, o runtime da versão 17 continua sem confirmação pós-deploy. Acessar/recarregar a interface e repetir a consulta é o próximo teste necessário.

### SF-UI-001 — Itens de menu visíveis para perfis sem permissão

- **Severidade:** P2 (interface e experiência de acesso).
- **Causa:** alguns itens eram explicitamente forçados a ficar visíveis por estilos inline; a interface não aplicava o conjunto de permissões retornado por /v1/auth/me.
- **Correção:** implementado mapa página-permissão; itens sem permissão são ocultados, grupos vazios também são ocultados e a navegação verifica a permissão antes de abrir a página. A tela de usuários tem apresentação somente para consulta quando o perfil não é o administrador principal.
- **Regressão:** o script de validação passou a verificar a existência da lógica de autorização visual e a ausência do estilo que forçava o menu a aparecer.
- **Commit da correção de interface:** https://github.com/DevKove/SmartFrota/commit/9f79cd4d34225241f315bb057ff595f0822f4f9e
- **Commit dos testes estáticos:** https://github.com/DevKove/SmartFrota/commit/9c324bd4a1f6a8cf74ae35fdf57e7f3dc3622251
- **Commit da migração versionada:** https://github.com/DevKove/SmartFrota/commit/3393eba0aba075f2e2fcb0734bf4ac0411919436
- **Código-fonte da API versionada:** https://github.com/DevKove/SmartFrota/commit/859b7dc89b885e4c7fec293ed7e3f455ea963f73
- **Status:** correção commitada; publicação e comportamento visual real ainda precisam de confirmação no navegador. A autorização do backend permanece obrigatória e não é substituída pela ocultação de menus.

## 6. Pendências técnicas e riscos residuais

### P2 — Proteção contra senhas comprometidas desabilitada
O advisor de Auth recomenda habilitar a proteção contra senhas vazadas. Não alterei configuração de Auth nesta etapa, pois a mudança precisa ser validada com a política de senha e o fluxo de acesso institucional.

### SF-API-002 — Criação de usuários com falha parcial
- **Severidade:** P2 (integridade de cadastro).
- **Causa:** a criação de Auth, perfil, atribuição de perfil e vínculos de secretaria ocorria em etapas; alguns erros intermediários deixavam registros órfãos.
- **Correção:** implementada função de limpeza compensatória que remove vínculos, perfis associados e conta Auth se a configuração da conta falhar. Implantada na Edge Function versão 17.
- **Status:** correção estática e implantação confirmadas; teste de falha induzida bloqueado até haver ambiente de teste isolado.

### P2 — Logout local não demonstra revogação do token no servidor
O frontend limpa a sessão local, enquanto a rota /v1/auth/logout da função retorna 204 sem revogar explicitamente a sessão Supabase. Isso não prova uma exploração ativa, mas deixa a revogação remota não demonstrada caso um token seja copiado. Avaliar e testar uma estratégia segura de revogação sem derrubar sessões de outros dispositivos.

### P2 — Índices e desempenho
Os 37 avisos de FKs sem índice e 28 índices não utilizados exigem revisão individual. **Não remover nem criar índices em lote com base apenas no advisor**: os índices aparentemente não utilizados podem ser necessários após período maior ou para consultas raras; medir planos de execução e carga primeiro.

### Defesa em profundidade — RLS sem policies
As 28 tabelas públicas têm RLS habilitado e nenhuma policy. A consulta de grants não encontrou permissões de tabela para anon/authenticated, e a aplicação opera por Edge Function com chave privilegiada no servidor. Não adicionar policies genéricas nem abrir acesso direto: primeiro confirmar e documentar a arquitetura API-only e manter a chave secreta exclusivamente no ambiente da função.

### Autorização entre secretarias
O código contém checagens de escopo na Edge Function, mas a tentativa de acesso cruzado entre usuários/secretarias ainda não foi executada com contas de teste. Deve ser testada antes do uso com dados reais.

## 7. Próximas etapas obrigatórias

1. **GitHub Actions confirmado:** workflow `Validate SmartFrota`, run 20, commit `f85c5c10bf4ca22eb42129f0a508b536075f463f`, conclusão `success`; job `validate` e passo `Validate frontend JavaScript` passaram. Isso não equivale a E2E.
2. Recarregar o sistema e confirmar que a versão 17 da API retorna os resultados esperados para listas com esquema corrigido e para as três rotas adicionais.
3. Executar os principais fluxos em navegador: login válido/inválido, restauração de sessão, logout, troca de senha, cada perfil e navegação por menu.
4. Criar usuários fictícios em ambiente isolado para validar permissões e isolamento entre secretarias.
5. Testar CRUD positivo/negativo de cada recurso, validações, conflitos de versão, persistência após recarregar e respostas 4xx/5xx.
6. Testar a limpeza compensatória com falhas induzidas no cadastro em ambiente isolado.
7. Revisar revogação de sessões e ativação da proteção contra senhas comprometidas.
8. Revisar os 37 índices de FK com planos de execução e volume representativo; não remover índices sem evidência.
9. Testar exportações, responsividade, acessibilidade, service worker offline e recuperação de conexão.
10. Testar backup/restauração em ambiente isolado e documentar rollback.
11. Atualizar esta matriz com os resultados E2E, logs sanitizados, quantidades reais de testes e evidências.

## 8. Conclusão

O trabalho executado encontrou e corrigiu a visibilidade do menu, aplicou a migração de compatibilidade e implantou a API versão 17 com as rotas adicionais e limpeza compensatória no cadastro de usuários. A auditoria **não está concluída**: autenticação real, CRUD completo, isolamento entre secretarias, runtime pós-deploy, publicação no navegador, recuperação de backup e fluxos operacionais ainda não têm evidência E2E. Até esses pontos serem verificados e as pendências relevantes serem tratadas, a recomendação é não declarar o sistema pronto para lançamento comercial.
