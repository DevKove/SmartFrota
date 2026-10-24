import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');
const api = readFileSync('supabase/functions/frotagov-api/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261023201201_align_api_resource_columns.sql', 'utf8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => match[1]);

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
