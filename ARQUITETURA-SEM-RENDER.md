# SmartFrota — arquitetura sem Render

## O que está configurado

- **Frontend estático:** `index.html`, publicado pelo GitHub Pages via GitHub Actions.
- **API/backend:** Supabase Edge Function `frotagov-api` no projeto `jyfphgnysvsrqdlbogoh`.
- **Autenticação:** o frontend envia e-mail e senha para `POST /v1/auth/login`; a API autentica pelo Supabase Auth e exige um perfil interno ativo associado ao mesmo UID.
- **Autorização:** chamadas autenticadas enviam `Authorization: Bearer <access_token>`; a API valida perfil, permissões e escopo de secretaria.
- **Banco de dados:** PostgreSQL do Supabase. O frontend não acessa tabelas administrativas diretamente.
- **Segredos:** a chave publicável no frontend é destinada ao uso público; a chave secreta/service role deve permanecer apenas nos secrets do Supabase, nunca no HTML ou no GitHub.

## Limites atuais

1. GitHub Pages executa somente arquivos estáticos. O Laravel/PHP original permanece no repositório como base de referência, mas não é executado pelo Pages.
2. A interface inicial cobre login, resumo, consulta de veículos/secretarias/condutores e criação online de veículos e secretarias, conforme os endpoints já existentes na Edge Function.
3. O modo sem conexão, neste estágio, é **somente leitura dos últimos dados em cache no navegador**. Não é SQLite e ainda não faz fila de gravações/sincronização offline. Não considere o requisito offline concluído até implementarmos e testarmos uma camada local e sincronização com resolução de conflitos.
4. O login depende de uma conta Supabase Auth ativa e de um perfil interno correspondente na tabela `public.users`, com vínculo de função/permissões. Não foi criado usuário administrador nem senha padrão.
5. A API atual expõe apenas os recursos implementados nela; telas Laravel não são automaticamente convertidas para a nova interface.

## Publicação

O workflow `.github/workflows/pages.yml` publica **somente** `index.html` (não publica a árvore PHP do Laravel como artefato do site). Em Settings → Pages, selecione **GitHub Actions** como fonte. Depois confira a execução em Actions.

URL esperada do site de projeto: https://devkove.github.io/SmartFrota/

## Verificações necessárias após publicar

- Entrar com uma conta de teste vinculada corretamente no Supabase.
- Confirmar que `/v1/auth/me` retorna o perfil esperado.
- Confirmar que usuário sem permissão recebe 403 e que escopo de secretaria é respeitado.
- Validar CORS e chamadas da origem GitHub Pages no log de invocações da Edge Function.
- Implementar e testar sincronização offline antes de uso operacional.
