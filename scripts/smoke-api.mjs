import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const apiMatch = html.match(/const API='([^']+)';\s*const API_KEY='([^']+)';/);
if (!apiMatch) throw new Error("Não foi possível localizar a URL da API e a chave pública no frontend.");

const [, apiBase, apiKey] = apiMatch;
const endpoint = apiBase.replace(/\/+$/, "") + "/v1/vehicles";
let lastError;

for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);

    if (response.status === 401 && body?.error?.code === "missing_bearer_token") {
      const registrationResponse = await fetch(apiBase.replace(/\\/+$/, "") + "/v1/auth/register", {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: "", email: "", password: "" }),
        signal: AbortSignal.timeout(15000),
      });
      const registrationBody = await registrationResponse.json().catch(() => null);
      if (registrationResponse.status !== 400 || registrationBody?.error?.code !== "validation_error") {
        throw new Error(`Rota de cadastro não validou a solicitação inválida como esperado: HTTP ${registrationResponse.status}; código ${registrationBody?.error?.code ?? "indisponível"}.`);
      }
      console.log("Smoke test aprovado: API protege rotas internas sem sessão e a rota pública de cadastro valida os dados antes de criar conta.");
      process.exit(0);
    }

    if (response.status >= 500 && attempt < 3) {
      lastError = new Error(`API retornou HTTP ${response.status}; tentativa ${attempt}/3.`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      continue;
    }

    throw new Error(`Resposta inesperada da API: HTTP ${response.status}; código ${body?.error?.code ?? "indisponível"}.`);
  } catch (error) {
    lastError = error;
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      continue;
    }
  }
}

throw new Error(`Smoke test da Edge Function falhou após 3 tentativas: ${lastError?.message ?? "erro desconhecido"}`);
