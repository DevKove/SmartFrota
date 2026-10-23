# AUDITORIA TÉCNICA COMPLETA --- SAAS DE GESTÃO DE CONDOMÍNIOS

> **Objetivo:** executar uma auditoria técnica, funcional, de segurança,
> qualidade, desempenho e prontidão comercial, cobrindo 100% das
> funcionalidades existentes e de tudo o que o sistema promete entregar.
> Use este documento como instrução principal para a IA de
> desenvolvimento (Cursor AI) trabalhar diretamente no repositório.

## 1. Missão e regras obrigatórias

Atue como uma equipe sênior multidisciplinar composta por QA/engenharia
de testes, arquitetura de software, desenvolvimento frontend e backend,
banco de dados, DevOps, segurança da informação, acessibilidade e
produto.

Faça uma verificação **sistemática, profunda e baseada em evidências**
de todo o sistema. Não se limite a revisar o código visualmente,
executar a página inicial ou testar alguns fluxos. Descubra o que existe
no repositório, mapeie cada funcionalidade e teste cada uma delas de
ponta a ponta.

### Regras de execução

1.  **Não presuma que algo funciona porque existe na interface ou porque
    o código parece correto.** Execute testes reais sempre que o
    ambiente permitir.
2.  Primeiro inspecione arquitetura, documentação, rotas, páginas,
    componentes, formulários, serviços, APIs, banco de dados,
    permissões, integrações, tarefas agendadas, configurações e scripts.
3.  Crie um inventário completo de funcionalidades a partir do código e
    compare-o com a documentação, menus, telas, botões, links e
    promessas do produto.
4.  Teste cada funcionalidade encontrada, inclusive casos de sucesso,
    falha, limites, validações, permissões, estados vazios,
    carregamento, duplicidade, edição, exclusão e persistência após
    recarregar a página.
5.  Não marque testes como aprovados sem evidência verificável. Registre
    comando executado, cenário, resultado esperado, resultado real e
    evidência/log quando possível.
6.  Não esconda falhas, não desative testes para obter aprovação e não
    use mocks como substitutos de testes de integração quando a
    integração real estiver disponível.
7.  Não invente resultados. Se algo não puder ser executado por falta de
    credenciais, serviço, ambiente ou acesso, classifique como
    **BLOQUEADO / NÃO VERIFICADO**, explique o motivo e indique como
    desbloquear.
8.  Não altere dados de produção, não envie mensagens reais, não
    processe cobranças reais, não apague dados reais nem execute testes
    destrutivos sem autorização explícita. Use ambiente isolado e dados
    fictícios.
9.  Antes de alterar código, identifique a causa-raiz e registre a
    falha. Faça correções seguras, pequenas e coerentes com a
    arquitetura atual.
10. Após cada correção, crie ou atualize testes de regressão e execute
    novamente os testes relacionados e a suíte completa.
11. Preserve funcionalidades existentes, contratos de API, dados e
    compatibilidade. Não faça refatorações amplas desnecessárias durante
    a auditoria.
12. Não exponha segredos, tokens, senhas, dados pessoais ou conteúdo
    sensível nos relatórios.
13. **Não declare o sistema "100% livre de falhas"**: o objetivo é
    alcançar cobertura documentada e alta confiança, explicitar limites
    e bloquear o lançamento se houver defeitos críticos ou verificações
    essenciais pendentes.
14. Trabalhe por etapas. Ao encontrar falhas, priorize e corrija o que
    puder com segurança; não pare a auditoria na primeira falha.
15. Não considere apenas os módulos listados abaixo: descubra e teste
    **todas as funcionalidades reais do projeto**, incluindo as não
    documentadas.

## 2. Fase inicial --- descoberta e mapa do sistema

Antes dos testes, produza um mapa técnico contendo:

-   Stack, frameworks, versões, estrutura de pastas e comandos
    disponíveis.
-   Aplicações frontend/backend, serviços, APIs, banco de dados,
    armazenamento de arquivos e filas/tarefas.
-   Rotas públicas e privadas, telas, modais, formulários, ações,
    botões, menus, links e estados de interface.
-   Modelos/tabelas, relacionamentos, restrições, índices, migrações e
    regras de negócio.
-   Perfis de usuário, papéis, permissões e limites entre
    organizações/condomínios/contas.
-   Integrações externas, webhooks, e-mail, WhatsApp, pagamentos, mapas,
    armazenamento ou outros serviços, se existirem.
-   Variáveis de ambiente necessárias, sem revelar seus valores
    secretos.
-   Testes existentes, cobertura, lint, typecheck, build, scripts e
    pipelines.
-   Funcionalidades prometidas na documentação, landing page, planos
    comerciais e interface.
-   Funcionalidades incompletas, botões sem ação, telas simuladas, dados
    estáticos, TODOs, código morto e integrações com comportamento
    provisório.

Monte uma **Matriz de Rastreabilidade** ligando cada promessa/requisito
a uma tela, componente, endpoint, regra de negócio e teste
automatizado/manual. Todo item identificado deve ter um estado:
`APROVADO`, `REPROVADO`, `BLOQUEADO`, `NÃO IMPLEMENTADO` ou
`NÃO VERIFICADO`.

## 3. Testes funcionais --- testar tudo de ponta a ponta

Para cada módulo existente, testar criação, consulta, listagem, filtros,
pesquisa, ordenação, paginação, edição, exclusão/arquivamento,
validação, permissões, mensagens de erro/sucesso, persistência e
comportamento em falhas.

### 3.1 Autenticação e acesso

-   Cadastro, convite, login, logout, recuperação e redefinição de
    senha.
-   Validação de e-mail e telefone, se aplicável.
-   Sessão expirada, renovação, múltiplas abas e acesso direto a rotas
    protegidas.
-   Tentativas inválidas, bloqueio/rate limit quando aplicável e
    mensagens sem revelar dados sensíveis.
-   Autenticação multifator, SSO ou outros mecanismos, se existirem.
-   Acesso de usuário não autenticado e tentativa de acessar dados de
    outra conta/organização.
-   Fluxos de primeiro acesso e configuração inicial.

### 3.2 Usuários, perfis e permissões

-   Criar, visualizar, editar, ativar, desativar e remover usuários.
-   Validar campos obrigatórios, formatos, duplicidade de
    e-mail/CPF/telefone e regras definidas pelo produto.
-   Testar cada perfil/role em cada ação relevante: visualizar, criar,
    editar, excluir, exportar, configurar e administrar.
-   Confirmar que ocultar um botão não substitui a validação de
    permissão no backend.
-   Verificar isolamento de dados entre condomínios, clientes,
    organizações e contas.

### 3.3 Condomínios, unidades e moradores

Execute testes completos com dados fictícios: - Cadastrar condomínio e
validar todos os campos, regras e relacionamentos. - Cadastrar unidade,
bloco/torre, endereço e demais informações suportadas. - Cadastrar
morador/proprietário/inquilino, conforme os tipos existentes. - Vincular
e desvincular morador a unidade; testar titularidade, dependentes e
múltiplos moradores se suportados. - Validar CPF, e-mail, telefone,
campos obrigatórios, formatos, duplicidades e mensagens. - Editar dados
e confirmar que alterações são refletidas em todas as telas e
relacionamentos corretos. - Excluir, desativar ou arquivar conforme as
regras; confirmar integridade referencial e tratamento de histórico. -
Pesquisar por nome, documento, unidade, bloco e demais filtros
existentes. - Importar/exportar cadastros se houver essa função; testar
arquivos válidos, inválidos, duplicados, vazios e grandes. - Recarregar
a página, sair e entrar novamente e confirmar persistência no banco. -
Verificar se um morador de um condomínio não aparece para usuários de
outro condomínio sem autorização. - Testar listas vazias, grandes
volumes, paginação e estados de carregamento/erro.

### 3.4 Gestão condominial e demais módulos

Descubra todos os módulos presentes e teste cada um. Exemplos, **somente
se existirem no produto**: - Visitantes, portaria, prestadores e
controle de acesso. - Reservas de áreas comuns e calendário. -
Ocorrências, reclamações, solicitações e acompanhamento de status. -
Comunicados, avisos, notificações e confirmações de leitura. -
Encomendas e entregas. - Assembleias, pautas, votações e atas. -
Documentos, anexos, arquivos e permissões de acesso. - Manutenções,
tarefas, fornecedores e ordens de serviço. - Financeiro, despesas,
receitas, rateios, boletos, cobranças, inadimplência e relatórios. -
Relatórios, dashboards, indicadores, filtros e exportações. -
Configurações, personalização, branding e preferências. - Central de
ajuda, suporte, auditoria e histórico de atividades.

Para cada módulo, validar os fluxos completos e as regras de negócio
reais, sem assumir que a lista acima corresponde ao escopo efetivo.

### 3.5 Planos SaaS, assinatura e multi-tenancy

Se o produto oferecer cobrança recorrente ou planos: - Cadastro de
organização/condomínio, período de teste, ativação, upgrade, downgrade,
cancelamento e reativação. - Limites por plano, bloqueios e avisos ao
atingir limites. - Estados de pagamento aprovado, recusado, pendente,
expirado e estornado, usando sandbox. - Webhooks: autenticação,
idempotência, repetição, eventos fora de ordem e falhas temporárias. -
Acesso após cancelamento, inadimplência ou fim do período de teste,
conforme regras documentadas. - Garantir isolamento entre clientes
(multi-tenancy) em consultas, APIs, arquivos, relatórios, jobs e
caches. - Confirmar que uma organização não pode consultar ou alterar
registros de outra manipulando IDs ou parâmetros. - Não realizar
transações financeiras reais durante os testes.

### 3.6 Busca, filtros, relatórios e exportações

-   Busca por termos exatos, parciais, acentos, letras
    maiúsculas/minúsculas e caracteres especiais.
-   Combinação e limpeza de filtros, ordenação, paginação e preservação
    do estado esperado.
-   Conferir totais, somatórios, datas, fuso horário, moeda, percentuais
    e agregações com dados de referência calculados manualmente.
-   Exportações CSV/XLSX/PDF, se existentes: conteúdo, encoding,
    acentuação, colunas, permissões e limites.
-   Evitar exposição de registros de outros clientes em relatórios e
    exportações.
-   Tratar filtros inválidos, intervalos vazios e grandes volumes.

### 3.7 Notificações e integrações

-   Testar integrações em sandbox/staging, com dados fictícios.
-   Verificar configuração ausente, credenciais inválidas, timeout,
    limite de requisições, indisponibilidade e recuperação.
-   Garantir que falhas externas gerem mensagens claras e logs seguros,
    sem duplicar operações.
-   Testar envio de e-mail/SMS/WhatsApp apenas em ambiente controlado ou
    destinatários de teste autorizados.
-   Verificar assinatura de webhooks, idempotência, retries e prevenção
    de replay, quando aplicável.

### 3.8 Interface e experiência do usuário

-   Cada botão, link, menu, modal, dropdown, aba e ação deve fazer o que
    seu rótulo promete.
-   Não permitir links quebrados, botões sem ação, formulários que não
    salvam ou mensagens falsas de sucesso.
-   Validar campos obrigatórios, limites, máscaras, mensagens inline,
    prevenção de duplo envio e estados de carregamento.
-   Verificar estados vazios, erro de rede, carregamento, sucesso e
    permissões insuficientes.
-   Testar responsividade em resoluções móveis, tablet e desktop.
-   Testar navegação por teclado, foco visível, labels, contraste e
    acessibilidade básica.
-   Verificar console do navegador, erros JavaScript, requisições falhas
    e avisos relevantes.
-   Testar atualização/reload, navegação voltar/avançar e acesso direto
    às rotas.

## 4. Testes negativos, limites e integridade de dados

Para cada formulário e endpoint, testar: - Campos obrigatórios vazios,
espaços em branco, formatos inválidos e valores fora do intervalo. -
Textos muito longos, Unicode, acentos, emojis, caracteres especiais e
entradas inesperadas. - E-mails, documentos, telefones e nomes
duplicados, de acordo com regras do negócio. - IDs inexistentes,
malformados ou pertencentes a outro cliente. - Requisições simultâneas,
duplo clique, envio repetido e conflitos de edição. - Falha de rede,
timeout, resposta 4xx/5xx e indisponibilidade do banco/serviço externo
em ambiente de teste. - Tentativas de exclusão de registros
relacionados, confirmando comportamento consistente. - Transações
parcialmente concluídas: nenhuma operação deve deixar dados
inconsistentes. - Ordenação, paginação e filtros em listas vazias, com
um registro e com muitos registros. - Datas de fim/início, virada de
mês/ano, ano bissexto e fusos horários, quando relevantes. -
Arredondamentos, valores zero, negativos e limites numéricos quando
aplicável.

Verifique integridade referencial, restrições no banco, consistência
entre frontend/backend e ausência de duplicidades causadas por retries.

## 5. Segurança e privacidade

Realize testes autorizados, em ambiente próprio, sem exploração
destrutiva: - Autorização por objeto e por função (IDOR/BOLA, escalada
horizontal e vertical de privilégios). - Validação no servidor,
SQL/NoSQL injection, XSS, CSRF quando aplicável, SSRF quando houver
superfície relevante, path traversal e upload inseguro. - Cookies e
sessões: `HttpOnly`, `Secure`, `SameSite` e expiração, conforme
arquitetura. - CORS, headers de segurança, política de conteúdo e
proteção contra clickjacking quando aplicável. - Rate limiting em login,
recuperação de senha e endpoints sensíveis. - Upload/download: tipo real
do arquivo, tamanho máximo, nomes, autorização e acesso a arquivos
privados. - Segredos em código, logs, builds, repositório, sourcemaps e
variáveis de ambiente. - Logs sem senhas, tokens, documentos pessoais ou
dados excessivos. - Dependências vulneráveis, licenças e pacotes
abandonados. - Backup, restauração, retenção, exclusão e exportação de
dados pessoais. - Adequação dos fluxos de dados à LGPD: finalidade,
minimização, controle de acesso, retenção e atendimento aos direitos
aplicáveis. - Proteção de dados entre tenants em endpoints, consultas,
jobs, arquivos, cache e relatórios.

Não copie dados reais para relatórios. Não execute testes de carga ou
segurança agressivos em produção sem autorização e limites definidos.

## 6. Banco de dados, API e backend

-   Testar todos os endpoints descobertos, inclusive os não ligados
    diretamente à interface.
-   Validar códigos HTTP, esquemas de entrada/saída, autenticação,
    autorização e mensagens de erro.
-   Confirmar validação no servidor e restrições no banco, não apenas no
    frontend.
-   Testar migrations em banco descartável, instalação limpa e
    atualização a partir da versão anterior suportada.
-   Verificar índices, consultas ineficientes, N+1, transações, locks e
    integridade referencial.
-   Confirmar paginação no servidor para coleções grandes.
-   Verificar timeouts, retries, idempotência, tratamento de exceções e
    observabilidade.
-   Confirmar que operações falhas não retornam sucesso nem persistem
    dados incompletos.
-   Validar versionamento e compatibilidade de APIs quando aplicável.

## 7. Testes automatizados e qualidade do código

Identifique ferramentas adequadas à stack e execute, quando
disponíveis: - Lint e formatação. - Verificação de tipos. - Testes
unitários. - Testes de integração com banco/serviços de teste. - Testes
de API. - Testes end-to-end no navegador para os principais fluxos e
para cada funcionalidade crítica. - Build de produção. - Auditoria de
dependências e análise estática de segurança. - Testes de migração e
smoke tests pós-build.

Não basta dizer que "os testes passaram": informe comandos, quantidade
de testes, aprovados, reprovados, ignorados e bloqueados. Identifique
lacunas de cobertura. Não reduza critérios de qualidade apenas para
obter build verde.

### Cobertura mínima de processo

-   100% das funcionalidades descobertas devem constar na matriz de
    rastreabilidade.
-   100% dos fluxos críticos de negócio devem ter cenários definidos e
    executados, ou estar claramente bloqueados.
-   Cada defeito corrigido deve ter teste de regressão sempre que
    tecnicamente possível.
-   Cobertura percentual de linhas/branches deve ser medida se a stack
    permitir; cobertura alta não substitui testes de comportamento.
-   Todo requisito sem teste deve ser listado como lacuna, com risco e
    plano de ação.

## 8. Desempenho, compatibilidade e resiliência

-   Medir tempos de carregamento das telas principais e endpoints
    críticos.
-   Procurar consultas lentas, payloads excessivos, renderizações
    repetidas e recursos desnecessários.
-   Testar volume representativo de registros em ambiente controlado.
-   Testar uso concorrente dentro de limites autorizados e observar
    erros, latência e consumo de recursos.
-   Verificar comportamento sob perda de conexão e recuperação.
-   Avaliar compatibilidade com navegadores suportados e dispositivos
    comuns.
-   Confirmar que cache, jobs e tarefas agendadas não misturam dados de
    tenants.
-   Estabelecer métricas e limites observados; não declarar desempenho
    adequado sem medições.

## 9. Recuperação, implantação e operação comercial

-   Verificar instruções de instalação, configuração e implantação a
    partir de ambiente limpo.
-   Validar variáveis de ambiente obrigatórias e falhas de configuração
    com mensagens claras.
-   Confirmar migrações, health checks, logs, monitoramento, alertas e
    tratamento de erros.
-   Verificar estratégia de backup e, se possível, testar restauração em
    ambiente isolado.
-   Confirmar que secrets não estão no repositório e que produção não
    depende de configurações de desenvolvimento.
-   Validar HTTPS, domínio, cookies seguros, CORS e configuração de
    produção, quando aplicável.
-   Conferir tarefas agendadas, filas, retries e idempotência.
-   Documentar rollback e recuperação após implantação malsucedida.
-   Verificar termos, política de privacidade, suporte e demais itens
    comerciais/legais pertinentes, sem substituir aconselhamento
    jurídico.
-   Confirmar que o onboarding de um novo cliente pode ser concluído sem
    intervenção técnica indevida.

## 10. Método de execução

Siga esta ordem:

1.  **Descoberta:** inspecione o repositório e documente stack, módulos
    e comandos.
2.  **Inventário:** catalogue 100% das rotas, telas, formulários, ações,
    endpoints, entidades e integrações identificadas.
3.  **Ambiente seguro:** prepare ambiente local/teste, banco
    descartável, contas e dados fictícios.
4.  **Linha de base:** execute build, lint, typecheck e testes já
    existentes; registre o resultado inicial.
5.  **Plano de testes:** crie casos vinculados a cada item da matriz de
    rastreabilidade.
6.  **Execução funcional:** percorra cada módulo de ponta a ponta,
    incluindo casos positivos e negativos.
7.  **Execução técnica:** realize testes de API, banco, segurança,
    desempenho, acessibilidade e implantação.
8.  **Correções:** priorize por severidade, corrija causas-raiz e crie
    testes de regressão.
9.  **Regressão completa:** reexecute os testes impactados e a suíte
    global.
10. **Validação final:** execute build de produção e smoke tests em
    ambiente semelhante ao de produção.
11. **Relatório:** entregue evidências, limitações, riscos residuais e
    recomendação objetiva de lançamento.

## 11. Classificação de defeitos

-   **P0 --- Bloqueador crítico:** perda/exposição de dados, acesso
    entre clientes, comprometimento de contas, corrupção de dados ou
    falha que torne o produto inseguro.
-   **P1 --- Crítico para o negócio:** fluxo essencial quebrado,
    cadastro/salvamento inconsistente, autenticação ou cobrança
    essencial indisponível.
-   **P2 --- Importante:** funcionalidade relevante degradada, erro
    frequente ou alternativa manual inadequada.
-   **P3 --- Moderado/baixo:** problema cosmético, inconveniência ou
    melhoria sem impacto relevante no fluxo central.

Para cada defeito, registrar: ID, severidade, módulo, pré-condições,
passos para reproduzir, resultado esperado, resultado real, evidência,
causa-raiz, correção aplicada, teste de regressão e estado.

## 12. Relatório final obrigatório

Entregue um relatório claro, objetivo e baseado em evidências com:

1.  **Resumo executivo:** situação geral e recomendação `APTO`,
    `APTO COM RESSALVAS` ou `NÃO APTO` para lançamento comercial.
2.  **Inventário do sistema:** módulos, rotas, entidades, APIs,
    integrações e funcionalidades identificadas.
3.  **Matriz de rastreabilidade:** requisito/funcionalidade, local no
    sistema, teste, resultado, evidência e pendência.
4.  **Estatísticas:** total de testes planejados, executados, aprovados,
    reprovados, bloqueados e não executados.
5.  **Cobertura:** funcionalidades mapeadas versus testadas; cobertura
    automatizada disponível e lacunas conhecidas.
6.  **Defeitos:** lista priorizada com severidade, impacto, causa-raiz,
    correção e regressão.
7.  **Segurança e privacidade:** verificações realizadas, resultados e
    riscos residuais.
8.  **Dados e integridade:** resultados dos testes de cadastro, edição,
    exclusão, relacionamentos e persistência.
9.  **Desempenho e compatibilidade:** medições reais, condições de teste
    e limites.
10. **Implantação/operação:** build, configuração, migrações, backups,
    monitoramento e rollback.
11. **Bloqueios:** o que não pôde ser verificado, por quê e como
    resolver.
12. **Plano de ação:** tarefas restantes por prioridade, esforço
    aproximado e critérios de aceite.
13. **Evidências:** comandos, logs sanitizados, relatórios de teste e
    capturas relevantes, sem segredos ou dados pessoais.

### Critérios para recomendar lançamento

**Não recomendar lançamento comercial** se existir qualquer P0/P1
aberto, falha em fluxo crítico, risco conhecido de vazamento entre
clientes, perda/corrupção de dados, vulnerabilidade crítica, falha de
autenticação/autorização ou teste essencial bloqueado sem avaliação e
aceitação formal do risco.

Para recomendar lançamento, confirme pelo menos: - Build de produção
aprovado. - Fluxos críticos de ponta a ponta aprovados. - Cadastro,
edição, consulta e persistência de entidades essenciais aprovados. -
Permissões e isolamento entre clientes validados. - Ausência de P0/P1
aberto. - Backups e procedimento de restauração verificados, quando
aplicáveis. - Configuração de produção e segredos revisados. - Testes de
regressão aprovados. - Pendências, limitações e riscos residuais
explicitamente documentados.

## 13. Instrução final à IA de desenvolvimento

Comece agora pela inspeção do repositório e pela elaboração do
inventário completo. **Não entregue apenas um plano genérico:** execute
os testes que forem possíveis no ambiente disponível, registre
evidências, corrija os defeitos com segurança e repita os testes. Para
cada etapa, informe o que foi examinado, o que foi executado, os
resultados e o que ainda está pendente.

Não invente módulos nem presuma que exemplos deste documento existem no
produto. Use o código, a interface e a documentação reais para
determinar o escopo. Se o sistema não tiver uma funcionalidade,
registre-a como "não implementada" apenas se ela for prometida ou
requisito do produto; caso contrário, marque-a como "fora do escopo
identificado".

O objetivo é reduzir riscos antes da disponibilização comercial por meio
de testes abrangentes, rastreáveis e repetíveis --- sem prometer
ausência absoluta de falhas.
