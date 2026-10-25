import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const apiMatch = html.match(/const API='([^']+)'/);
const keyMatch = html.match(/const API_KEY='([^']+)'/);
if (!apiMatch || !keyMatch) throw new Error("Não foi possível localizar a URL da API e a chave pública no frontend.");

const apiBase = apiMatch[1].replace(/\/$/, "");
const apiKey = keyMatch[1];
const headers = { apikey: apiKey };
const timeout = { signal: AbortSignal.timeout(15000) };

const protectedResponse = await fetch(apiBase + "/v1/vehicles", {
  method: "GET",
  headers,
  ...timeout,
});
const protectedBody = await protectedResponse.json().catch(() => null);
if (protectedResponse.status !== 401 || protectedBody?.error?.code !== "missing_bearer_token") {
  throw new Error(`A API não bloqueou a rota protegida sem sessão: HTTP ${protectedResponse.status}; código ${protectedBody?.error?.code ?? "indisponível"}.`);
}

const corsResponse = await fetch(apiBase + "/v1/vehicles", {
  method: "GET",
  headers: { ...headers, Origin: "https://origin-nao-autorizada.example" },
  ...timeout,
});
const corsBody = await corsResponse.json().catch(() => null);
if (corsResponse.status !== 403 || corsBody?.error?.code !== "origin_not_allowed") {
  throw new Error(`A API não rejeitou uma origem web não autorizada: HTTP ${corsResponse.status}; código ${corsBody?.error?.code ?? "indisponível"}.`);
}

console.log("Smoke test aprovado: rotas protegidas exigem sessão e origens web não autorizadas são rejeitadas.");
