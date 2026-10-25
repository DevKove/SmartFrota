import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');
const api = readFileSync('supabase/functions/frotagov-api/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261023201201_align_api_resource_columns.sql', 'utf8');
const workOrderMigration = readFileSync('supabase/migrations/20261025170500_generate_work_order_numbers.sql', 'utf8');
const workOrderCleanupMigration = readFileSync('supabase/migrations/20261025171000_remove_duplicate_work_order_number_trigger.sql', 'utf8');
const vehicleSecretariaMigration = readFileSync('supabase/migrations/20261025172000_enforce_vehicle_secretaria_match.sql', 'utf8');
const vehicleHistoryMigration = readFileSync('supabase/migrations/20261025172500_prevent_vehicle_secretaria_change_with_history.sql', 'utf8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => match[1]);


const manifest = readFileSync('manifest.webmanifest', 'utf8');
const pwaManifest = JSON.parse(manifest);
const pwaIcons = pwaManifest.icons ?? [];
if (pwaIcons.length !== 2 ||
    !pwaIcons.some(icon => icon.src === '/SmartFrota/icons/logo-192.png?v=9' && icon.sizes === '192x192' && icon.type === 'image/png') ||
    !pwaIcons.some(icon => icon.src === '/SmartFrota/icons/logo-512.png?v=9' && icon.sizes === '512x512' && icon.type === 'image/png')) {
  throw new Error('Manifest PWA deve declarar o logo.jpg oficial nos tamanhos 192x192 e 512x512.');
}
if (!html.includes('manifest.webmanifest?v=12') || !html.includes('icons/logo.jpg?v=9') || !html.includes('service-worker.js?v=28')) {
  throw new Error('Referências de manifesto e favicon precisam apontar para os recursos atuais do SmartFrota.');
}
if (/src="https:\/\/images\.openai\.com\//.test(html)) {
  throw new Error('A identidade visual não deve depender de uma imagem de logo hospedada fora do repositório.');
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

if (!worker.includes("const CACHE_VERSION = 'v28';") || !worker.includes("icons/logo-192.png?v=9") || !worker.includes("icons/logo-512.png?v=9")) {
  throw new Error('A versão do cache PWA precisa ser atualizada após as mudanças recentes da interface.');
}
if (!html.includes('minlength="10"') ||
    (!html.includes('password.length<10') && !html.includes('password.length < 10')) ||
    html.includes('minlength="14"') || html.includes('password.length < 14') || html.includes('14 caracteres')) {
  throw new Error('Validação de senha do frontend deve exigir 10 caracteres, alinhada à API.');
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
if (/return fail\([^;]*error\.message/.test(api)) {
  throw new Error('A API não deve expor mensagens internas do banco ou do provedor de autenticação aos usuários.');
}
if (!api.includes('if (key === "work_orders") {') ||
    !api.includes('payload.requested_by = profile.id;') ||
    !api.includes('delete payload.created_by;')) {
  throw new Error('A criação de O.S. deve definir o solicitante autenticado e não enviar created_by inexistente.');
}
if (!html.includes("['low','Baixa']") ||
    !html.includes("['urgent','Urgente']") ||
    !html.includes("['requested','Solicitada']") ||
    !html.includes("['awaiting_approval','Aguardando aprovação']") ||
    !html.includes("['waiting_parts','Aguardando peças']")) {
  throw new Error('O formulário de O.S. deve usar valores de prioridade e status aceitos pelo banco, com rótulos em português.');
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
  'Não foi possível salvar o registro. Confira os campos obrigatórios e os vínculos selecionados.',
  'Não foi possível atualizar o registro. Confira os campos obrigatórios e os vínculos selecionados.',
  'const effectiveVehicleId = Object.prototype.hasOwnProperty.call(payload, "vehicle_id")',
  'const effectiveSecretariaId = Object.prototype.hasOwnProperty.call(payload, "secretaria_id")',
  'if (String(vehicle.secretaria_id) !== String(effectiveSecretariaId)) return fail(400, "secretaria_vehicle_mismatch", "A secretaria do registro deve ser a mesma do veículo.");'
]) {
  if (!api.includes(required)) throw new Error(`Verificação obrigatória ausente na API: ${required}`);
}
for (const required of [
  "DROP TRIGGER IF EXISTS trg_assign_work_order_number ON public.work_orders",
  "DROP FUNCTION IF EXISTS public.assign_work_order_number()",
  "CREATE OR REPLACE FUNCTION public.generate_work_order_number()",
]) {
  if (!workOrderCleanupMigration.includes(required)) throw new Error(`Migração de correção de gatilho duplicado de O.S. incompleta: ${required}`);
}

for (const required of [
  "CREATE OR REPLACE FUNCTION public.prevent_vehicle_secretaria_change_with_history()",
  "trg_prevent_vehicle_secretaria_change_with_history",
  "public.financial_transactions WHERE vehicle_id = OLD.id",
  "public.vehicle_documents WHERE vehicle_id = OLD.id",
]) {
  if (!vehicleHistoryMigration.includes(required)) throw new Error(`Migração de proteção do histórico do veículo incompleta: ${required}`);
}
for (const required of [
  "CREATE OR REPLACE FUNCTION public.enforce_vehicle_secretaria_match()",
  "trg_work_orders_vehicle_secretaria_match",
  "trg_fuel_records_vehicle_secretaria_match",
  "trg_inspections_vehicle_secretaria_match",
  "trg_incidents_vehicle_secretaria_match",
  "trg_maintenance_plans_vehicle_secretaria_match",
  "NEW.secretaria_id IS DISTINCT FROM v_secretaria_id",
]) {
  if (!vehicleSecretariaMigration.includes(required)) throw new Error(`Migração de integridade veículo/secretaria incompleta: ${required}`);
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

if (!Array.isArray(pwaManifest.screenshots) || !pwaManifest.screenshots.some(s => s.form_factor === 'wide' && s.sizes === '1440x1000') || !pwaManifest.screenshots.some(s => !s.form_factor && s.sizes === '390x844')) throw new Error('O manifesto precisa declarar screenshots desktop wide e mobile.');

console.log(`Validação concluída: ${inlineScripts.length} scripts inline, service-worker.js, autorização da API e migração de compatibilidade.`);
