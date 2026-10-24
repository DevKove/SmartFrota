import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');
const api = readFileSync('supabase/functions/frotagov-api/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261023201201_align_api_resource_columns.sql', 'utf8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => match[1]);


const manifest = readFileSync('manifest.webmanifest', 'utf8');
const pwaManifest = JSON.parse(manifest);
if (pwaManifest.icons?.length !== 1 || pwaManifest.icons[0]?.src !== '/SmartFrota/icons/logo.jpg?v=6' || pwaManifest.icons[0]?.type !== 'image/jpeg') {
  throw new Error('Manifest PWA deve usar logo.jpg como ícone oficial do SmartFrota.');
}
if (!html.includes('manifest.webmanifest?v=6') || !html.includes('icons/logo.jpg?v=6')) {
  throw new Error('Referências de manifesto e favicon precisam apontar para os recursos atuais do SmartFrota.');
}

if (inlineScripts.length === 0) throw new Error('Nenhum script inline foi encontrado em index.html.');

for (const [index, source] of inlineScripts.entries()) {
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`JavaScript inválido no bloco inline #${index + 1}: ${error.message}`);
  }
}

try {
  new Function(worker);
} catch (error) {
  throw new Error(`JavaScript inválido em service-worker.js: ${error.message}`);
}

if (!worker.includes("const CACHE_VERSION = 'v21';")) {
  throw new Error('A versão do cache PWA precisa ser atualizada após as mudanças recentes da interface.');
}
if (/minlength="10"|password\.length<10|newPassword\.length<10|pelo menos 10 caracteres|mín\. 10 caracteres/.test(html)) {
  throw new Error('Validação de senha do frontend está abaixo da política de 14 caracteres da API.');
}
if (html.includes("fields.unshift(['responsavel_nome','Responsável pelo cadastro'")) {
  throw new Error('Formulários operacionais exibem um campo de responsável que a API não persiste.');
}
if (!html.includes("(u.permission_codes||[]).map(permissionLabel).join(', ')")) {
  throw new Error('A listagem administrativa não exibe as permissões efetivamente atribuídas.');
}
if (!html.includes("((u.permission_codes||[]).length||(u.roles||[]).length)?'Inativo':'Pendente de aprovação'")) {
  throw new Error('A classificação de contas pendentes não considera as permissões atribuídas.');
}
if (!html.includes('data-page="audit">📊 &nbsp; Auditoria e extração') ||
    !html.includes('async function renderAudit()') ||
    !html.includes('Exportar filtrados · CSV') ||
    !html.includes("function exportFiltered(format)") ||
    !html.includes("load('/v1/'+key,'audit-'+key)") ||
    !html.includes("auditFrom") || !html.includes("auditTo")) {
  throw new Error('Os relatórios por módulo e a central de auditoria com filtros/exportação estão incompletos.');
}
if (!html.includes('id="dashboardMetrics"') ||
    !html.includes('Resumo operacional') ||
    !html.includes('Visão geral</h1>') ||
    !html.includes('Carregando indicadores…')) {
  throw new Error('A visão geral deve renderizar seus componentes antes de carregar os dados da API.');
}
if (!html.includes('Últimas 10 ordens de serviço') ||
    !html.includes("load('/v1/work_orders','work_orders')") ||
    !html.includes(".slice(0,10)") ||
    !html.includes("statusLabels[String(x.status||'').toLowerCase()]")) {
  throw new Error('A visão geral deve exibir as 10 ordens mais recentes, mantendo todos os status.');
}
if (!html.includes('id="consulta-peca-sidebar-alignment"') ||
    !html.includes('#appView .sidebar .nav>a.nav-external') ||
    !html.includes('min-height:38px') ||
    !html.includes('background:rgba(255,255,255,.17)')) {
  throw new Error('O link Consulta peça não está alinhado ao padrão visual do menu lateral.');
}
if (/\basync\s+async\s+function\b/.test(html)) {
  throw new Error('Declaração async duplicada encontrada.');
}
if (/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/.test(html)) {
  throw new Error('Endpoint local encontrado no frontend publicado.');
}
for (const required of [
  'function renderPasswordChange()',
  '/v1/auth/change-password',
  'frotagov-cache-user-',
  'if(error?.status)throw error',
  'function applyNavigationPermissions()',
  'function canAccessPage(page)',
  'if(!canAccessPage(page))',
]) {
  if (!html.includes(required)) throw new Error(`Verificação obrigatória ausente: ${required}`);
}
if (/style=["'][^"']*display:block!important;visibility:visible!important/.test(html)) {
  throw new Error('Foi encontrado estilo que força item do menu a ficar visível para todos os perfis.');
}
for (const required of [
  'financial_transactions: { table:',
  'inventory_movements: { table:',
  'vehicle_documents: { table:',
  'if (cfg.readOnly && method !== "GET")',
  'key === "vehicle_documents"',
  'if (!token) return fail(401, "missing_bearer_token"',
  'async function rollbackNewUser(userId: string)',
  'await rollbackNewUser(created.user.id)',
  'admin.auth.admin.signOut(token, "local")',
  'path === "/v1/auth/register"',
  'is_active: false, must_change_password: false',
  'pending_approval',
  'function inScope(profile: Profile, record: any, resourceKey?: string)',
  'if (resourceKey === "secretarias") return Boolean(record?.id) && profile.secretaria_ids.includes(record.id)',
  'inScope(profile, current, key)',
]) {
  if (!api.includes(required)) throw new Error(`Verificação obrigatória ausente na API: ${required}`);
}
if ((api.match(/if \(!inScope\(profile, current, key\)\)/g) ?? []).length !== 2) {
  throw new Error('As operações de edição e exclusão devem validar o escopo com o tipo de recurso.');
}
for (const table of [
  'budget_sheets', 'contracts', 'fuel_records', 'incidents', 'inspections',
  'inventory_products', 'maintenance_plans', 'work_orders',
  'financial_transactions', 'inventory_movements',
]) {
  if (!migration.includes('ALTER TABLE public.' + table + ' ADD COLUMN IF NOT EXISTS deleted_at')) {
    throw new Error(`Migração sem deleted_at para: ${table}`);
  }
}

console.log(`Validação concluída: ${inlineScripts.length} scripts inline, service-worker.js, autorização da API e migração de compatibilidade.`);
