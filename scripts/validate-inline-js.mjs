import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');
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
]) {
  if (!html.includes(required)) throw new Error(`Verificação obrigatória ausente: ${required}`);
}

console.log(`Validação concluída: ${inlineScripts.length} scripts inline e service-worker.js sem erros de sintaxe.`);
