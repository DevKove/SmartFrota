# Relatório de auditoria técnica — SmartFrota

**Data da verificação:** 23/10/2026  
**Repositório:** https://github.com/DevKove/SmartFrota  
**Branch:** main  
**Escopo:** frontend, service worker, Edge Function ativa e metadados do banco Supabase.  
**Status:** auditoria parcial baseada em evidências. A API versão 18 passou no smoke test real de autenticação sem sessão; testes E2E autenticados completos ainda estão pendentes.

## 1. Resumo executivo

**Recomendação atual: NÃO DECLARAR PRONTO PARA LANÇAMENTO COMERCIAL.** Não foram executados testes completos de ponta a ponta em navegador autenticado, testes com usuários de cada perfil nem restauração de backup. Isso não significa que todos os módulos estejam defeituosos; significa que ainda faltam evidências para aprová-los.

Foram identificados e corrigidos dois problemas funcionais: (1) itens do menu eram forçados a permanecer visíveis independentemente do perfil; (2) a API usava campos deleted_at/updated_at que faltavam em várias tabelas e não reconhecia três recursos consultados pela área de secretaria. A navegação agora usa as permissões retornadas pela API e a API foi atualizada para compatibilidade com o esquema e consulta dos recursos adicionais. O backend continua sendo a autoridade final de autorização.

Não foram feitas alterações destrutivas no banco de produção, não foram criadas contas de teste, não foram processadas cobranças e não foram alteradas políticas RLS.

## 2. Arquitetura observada

- **Frontend:** aplicação estática em index.html, HTML/CSS/JavaScript sem package.json na raiz.
- **Hospedagem do frontend:** GitHub Pages, base /SmartFrota/.
- **PWA:** manifest.webmanifest e service-worker.js.
- **API:** Supabase Edge Function frotagov-api, versão ativa 18, verify_jwt=false; a função valida o token Bearer manualmente com Supabase Auth antes de acessar rotas protegidas.
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
| Recuperação de sessão e logout | Logout agora chama revogação local de sessão no Supabase; sem teste E2E e sem confirmação de efeito no runtime | APROVADO — implementação estática/deploy; E2E NÃO VERIFICADO |
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
15. O código-fonte da função e as migrações foram sincronizados no GitHub. A versão 18 está ativa e seu código corresponde ao arquivo versionado. O smoke test executado pelo GitHub Actions confirmou que `GET /v1/vehicles` sem sessão retorna HTTP 401 e `missing_bearer_token`; os logs do Supabase registraram seis requisições à versão 18 entre 20:41 e 20:42 UTC, todas HTTP 401 esperado para chamadas sem sessão.
17. Adicionado `scripts/smoke-api.mjs` e incorporado ao workflow `Validate SmartFrota`. O run 25 passou, incluindo a etapa `Smoke test Supabase Edge Function authentication`.
18. Na revisão final de identidade, os nomes de arquivos exportados foram alterados para `SmartFrota` e o workflow do GitHub Pages foi renomeado. Os identificadores técnicos antigos da API e das chaves de sessão/cache foram preservados para não quebrar a integração publicada nem sessões/preferências locais já existentes. A validação e o smoke test passaram novamente no run 31 (https://github.com/DevKove/SmartFrota/actions/runs/40021316183). A publicação do frontend com os nomes de exportação atualizados foi concluída com sucesso no workflow Pages run 109 (https://github.com/DevKove/SmartFrota/actions/runs/40021316230).
16. Revalidação estática anterior: 23 de 23 verificações passaram; os três blocos JavaScript inline e o service worker não apresentaram erros de sintaxe; as 11 tabelas esperadas têm deleted_at. Os runs 22–25 passaram após a correção de logout e a adição do smoke test. Isso não substitui testes E2E.

**Limitação importante:** a tentativa de clonar o repositório pelo ambiente de execução não funcionou por indisponibilidade de DNS/rede, portanto o script não foi executado localmente neste ambiente. Entretanto, o GitHub Actions foi consultado: o run 25 concluiu com sucesso e executou tanto `node scripts/validate-inline-js.mjs` quanto `node scripts/smoke-api.mjs`. O log registra: `Smoke test aprovado: Edge Function respondeu e negou corretamente uma consulta sem sessão.` (https://github.com/DevKove/SmartFrota/actions/runs/40021131934). Os logs Supabase confirmam seis requisições HTTP 401 esperadas na versão 18. Isso não substitui testes E2E autenticados nem valida CRUD/autorização por secretaria.

## 5. Defeito encontrado e correção aplicada

### SF-API-001 — Recursos operacionais falhavam por incompatibilidade de esquema e rotas ausentes

- **Severidade:** P1 (fluxos essenciais de consulta/gestão falhavam em módulos operacionais).
- **Evidência:** logs da versão 15 registraram HTTP 500 em contratos, inspeções, ordens de serviço, abastecimentos, ocorrências, planos de manutenção e orçamento. A consulta ao esquema confirmou ausência de deleted_at em budget_sheets, contracts, fuel_records, incidents, inspections, inventory_products, maintenance_plans, work_orders, financial_transactions e inventory_movements; também faltavam updated_at em fuel_records, inspections, financial_transactions e inventory_movements, além de created_at em inventory_movements.
- **Correção:** migração aditiva aplicada; a verificação posterior confirmou os campos esperados sem apagar registros. A Edge Function foi implantada inicialmente como versão 16 e depois atualizada para versão 17, incluindo limpeza compensatória na criação de usuários; a versão 16 passou a reconhecer financial_transactions, inventory_movements e vehicle_documents como recursos somente de leitura, com autorização e escopo por secretaria/veículos.
- **Evidência de implantação:** migração registrada como 20261023201201 / align_api_resource_columns; versão ativa da função confirmada como 18.
- **Status:** correção de esquema aplicada. Os logs históricos da versão 15 mostraram 176 respostas 200, 21 respostas 500 e 9 respostas 404. A versão 18 foi exercitada pelo smoke test do GitHub Actions e retornou HTTP 401 com `missing_bearer_token` para chamada sem sessão, como esperado; os logs do Supabase confirmam seis requisições sem sessão. A resposta protegida autenticada e o CRUD ainda não foram testados.

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

### SF-AUTH-001 — Logout sem revogação da sessão no servidor
- **Severidade:** P2.
- **Correção aplicada:** a rota `/v1/auth/logout` agora chama `admin.auth.admin.signOut(token, "local")`, para revogar a sessão atual sem encerrar sessões em outros dispositivos. A Edge Function versão 18 foi publicada e o código ativo corresponde ao arquivo versionado no GitHub.
- **Limite:** o access token JWT atual pode continuar válido até expirar; a revogação impede a continuidade da sessão via refresh token. O smoke test da API passou, mas não exercitou o endpoint de logout com token válido; a revogação precisa de teste E2E autenticado.

### P2 — Índices e desempenho
Os 37 avisos de FKs sem índice e 28 índices não utilizados exigem revisão individual. **Não remover nem criar índices em lote com base apenas no advisor**: os índices aparentemente não utilizados podem ser necessários após período maior ou para consultas raras; medir planos de execução e carga primeiro.

### Defesa em profundidade — RLS sem policies
As 28 tabelas públicas têm RLS habilitado e nenhuma policy. A consulta de grants não encontrou permissões de tabela para anon/authenticated, e a aplicação opera por Edge Function com chave privilegiada no servidor. Não adicionar policies genéricas nem abrir acesso direto: primeiro confirmar e documentar a arquitetura API-only e manter a chave secreta exclusivamente no ambiente da função.

### Autorização entre secretarias
O código contém checagens de escopo na Edge Function, mas a tentativa de acesso cruzado entre usuários/secretarias ainda não foi executada com contas de teste. Deve ser testada antes do uso com dados reais.

## 7. Próximas etapas obrigatórias

1. GitHub Actions run 25 passou, incluindo validação estática e smoke test ao vivo: https://github.com/DevKove/SmartFrota/actions/runs/40021131934.
2. Com o smoke test da versão 18 aprovado, validar com sessão real as listas operacionais e as três rotas adicionais.
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

O trabalho executado corrigiu a visibilidade do menu, aplicou a migração de compatibilidade, implantou a API versão 18 com rotas adicionais, limpeza compensatória de cadastro e revogação local de sessão no logout. O smoke test real da API passou. A auditoria **não está concluída**: login válido, logout com token, CRUD completo, isolamento entre secretarias, navegação visual, PWA offline e restauração de backup ainda não têm evidência E2E. Até esses pontos serem verificados e as pendências relevantes serem tratadas, a recomendação é não declarar o sistema pronto para lançamento comercial.


---

# Atualização da auditoria — 24/10/2026

Esta seção substitui os status anteriores quando houver diferença. O histórico abaixo foi preservado para rastreabilidade.

## Estado atual verificado

- **Edge Function ativa:** `frotagov-api`, versão **27**, projeto Supabase SmartFrota. O código implantado contém as verificações de escopo por recurso para edição e exclusão.
- **GitHub Actions — validação:** [run 40098352009](https://github.com/DevKove/SmartFrota/actions/runs/40098352009) concluído com sucesso. As etapas de validação JavaScript e smoke test da autenticação passaram.
- **GitHub Pages:** [run 40098342839](https://github.com/DevKove/SmartFrota/actions/runs/40098342839) concluiu a publicação do frontend com sucesso.
- **Compatibilidade do esquema:** a inspeção read-only dos metadados confirmou que os 15 recursos configurados na API existem e que todos os campos permitidos pela configuração estão presentes nas tabelas correspondentes.
- **Erros HTTP 5xx históricos:** houve respostas 500 para consultas operacionais em 23/10, antes da migração `align_api_resource_columns`. A consulta aos logs desde 23/10 às 20:12 UTC até 24/10 às 13:30 UTC não encontrou respostas 500, 502, 503 ou 504 da Edge Function. Isso é evidência operacional limitada, não prova de que todos os fluxos autenticados funcionem.
- **Acesso direto ao banco:** 29 tabelas públicas estão com RLS habilitado e sem policies; a consulta de privilégios não encontrou permissões de tabela para `anon` ou `authenticated`. Isso é coerente com a arquitetura API-only, desde que a chave privilegiada permaneça exclusivamente no servidor. O aviso do advisor sobre RLS sem policies é informativo neste desenho; não abrir acesso direto nem adicionar policies genéricas.
- **Advisor de segurança:** permanece 1 alerta de proteção contra senhas comprometidas desabilitada. A configuração não foi alterada porque não há ferramenta disponível nesta sessão para ajustar essa opção de Auth com segurança.
- **Advisor de desempenho:** 38 chaves estrangeiras sem índice de cobertura e 27 índices marcados como não utilizados. São recomendações para revisão individual com planos de execução; não foram aplicadas alterações em lote.

## Correções adicionais feitas nesta rodada

| ID | Defeito | Correção | Evidência | Estado |
|---|---|---|---|---|
| SF-API-003 | Ao editar/excluir uma secretaria, a verificação genérica procurava `secretaria_id`, embora o registro de secretaria seja autorizado pelo próprio `id`. | A validação de escopo recebe agora a chave do recurso em PATCH e DELETE. | [Commit 6babc9e](https://github.com/DevKove/SmartFrota/commit/6babc9e552e15fe2281a5c8a799ff9b6b6db549e); Edge Function v27 | Corrigido no código e implantado; E2E autenticado pendente |
| SF-AUTH-002 | Frontend permitia digitar senha com 10 caracteres, mas a API exige 14; o usuário só descobria a divergência ao enviar. | Cadastro e troca de senha agora exigem 14 caracteres, alinhados à API. | [Commit 8d0a4d4](https://github.com/DevKove/SmartFrota/commit/8d0a4d4bf24d26c3a56cf4fde88f5484f1631e52) | Publicado; E2E pendente |
| SF-UI-002 | A tabela administrativa apresentava códigos de função em vez das permissões realmente concedidas, e a classificação de conta pendente considerava somente funções. | A tabela mostra `permission_codes` com rótulos legíveis e considera permissões ou funções ao distinguir contas inativas de cadastros pendentes. | [Commit 7d9dd05](https://github.com/DevKove/SmartFrota/commit/7d9dd05d91474ee9cc049ce1861eef1aabb9d701) | Publicado; E2E pendente |
| SF-UI-003 | Formulários operacionais incluíam um campo obrigatório “Responsável pelo cadastro” que a API não persistia. | Removido o campo fictício; o vínculo à secretaria continua sendo solicitado nos módulos que precisam dele. | [Commit 699acabc](https://github.com/DevKove/SmartFrota/commit/699acabc930b68d6461fd45040c933c65c49e990) | Publicado; E2E pendente |

O script `scripts/validate-inline-js.mjs` agora inclui verificações de regressão para a política de senha, exibição de permissões, campo não persistido e checagem de escopo em edição e exclusão. O workflow de validação mais recente passou: [run 40098352009](https://github.com/DevKove/SmartFrota/actions/runs/40098352009).

## Inventário funcional identificado

**15 páginas/áreas de interface:** Visão geral, Veículos, Secretarias, Condutores, Fornecedores/Prestadores, Ordens de serviço, Planos de manutenção, Abastecimentos, Inspeções e checklists, Ocorrências e sinistros, Almoxarifado/Peças, Contratos, Orçamento por secretaria, Relatórios e Usuários e perfis.

**3 recursos de API somente para consulta adicionais:** transações financeiras, movimentações de estoque e documentos de veículos.

O inventário foi identificado por inspeção de código e configuração; não significa que todas as telas ou operações foram exercitadas por uma pessoa no navegador.

## Matriz de estado atual

| ID | Módulo | Funcionalidade | Resultado observado | Status |
|---|---|---|---|---|
| TECH-01 | Frontend | Compilação dos blocos JavaScript inline | Workflow passou | APROVADO — sintaxe |
| TECH-02 | PWA | Compilação do service worker | Workflow passou | APROVADO — sintaxe |
| TECH-03 | API/Auth | Consulta de recurso sem Bearer token | Smoke test ao vivo validou 401 `missing_bearer_token` | APROVADO — rota protegida sem sessão |
| TECH-04 | API/esquema | Correspondência de 15 recursos e campos permitidos com as tabelas | Nenhuma coluna ausente na comparação de metadados | APROVADO — inspeção de esquema |
| TECH-05 | Operação | Respostas HTTP 5xx após a migração de compatibilidade | Nenhuma encontrada no intervalo de logs consultado | APROVADO — somente intervalo consultado |
| GUI-01 | Login | Entrar com credenciais válidas e inválidas | Não executado por interface gráfica nesta sessão | BLOQUEADO |
| GUI-02 | Sessão | Persistência, troca de senha e logout com sessão válida | Código revisado; sem interação visual autenticada | BLOQUEADO |
| GUI-03 | CRUD | Criar, reabrir, editar e excluir registros de teste em cada módulo | Não executado pela interface | BLOQUEADO |
| GUI-04 | Autorização | Acesso cruzado entre usuários de secretarias diferentes | Não executado com contas de teste independentes | BLOQUEADO |
| GUI-05 | Usuários | Aprovar/reprovar cadastros, editar permissões e desativar conta | Código revisado; sem interação visual | BLOQUEADO |
| GUI-06 | Relatórios | Exportar CSV e conferir conteúdo no arquivo | Não executado pela interface | NÃO TESTADO |
| GUI-07 | PWA | Instalação, uso offline e sincronização após reconexão | Não executado em navegador/dispositivo | NÃO TESTADO |
| SEC-01 | Supabase Auth | Proteção contra senhas comprometidas | Advisor indica opção desabilitada; não foi alterada nesta sessão | REPROVADO — configuração pendente |
| PERF-01 | Banco | Índices de chaves estrangeiras | 38 avisos; precisa revisão com planos de execução | INCONCLUSIVO — otimização pendente |
| PERF-02 | Banco | Índices marcados como não utilizados | 27 avisos; não removidos sem medição | INCONCLUSIVO — otimização pendente |

**Contagem dos testes de interface gráfica:** 0 executados, 0 aprovados, 0 reprovados, 5 bloqueados e 2 não testados na matriz acima. O percentual de aprovação de testes funcionais de interface não pode ser calculado, pois não houve testes GUI aprovados ou reprovados. Os testes técnicos estão listados separadamente e não devem ser confundidos com testes funcionais completos.

## Limitação que impede declarar conclusão total

Nesta sessão não há ferramenta de controle visual de navegador/computador disponível para interagir com a interface publicada, e não foram fornecidas credenciais de contas de teste. A tentativa de acesso externo pelo ambiente de execução também falhou por indisponibilidade de DNS. Por isso, não é possível afirmar honestamente que login real, persistência CRUD, impressão, relatórios, responsividade, PWA offline ou isolamento entre secretarias foram aprovados. Nenhum teste funcional foi simulado ou contabilizado como executado.

## Parecer final atualizado

**Estado: PARCIALMENTE VALIDADO — NÃO APROVADO PARA ENCERRAMENTO FUNCIONAL.**

As correções adicionais foram versionadas; a função Supabase v27 está ativa; o frontend foi publicado; a validação automatizada e o smoke test passaram; os metadados de esquema correspondem aos recursos da API; e não foram observadas respostas HTTP 5xx no período de logs consultado após a migração de compatibilidade. Permanecem pendentes os testes pela interface autenticada, a prova prática de isolamento por secretaria e a configuração de proteção contra senhas comprometidas. O sistema não deve ser declarado 100% concluído até que esses cenários sejam executados e documentados com evidências reais.
