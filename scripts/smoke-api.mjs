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


const preflightResponse = await fetch(apiBase + "/v1/vehicles", {
  method: "OPTIONS",
  headers: {
    Origin: "https://devkove.github.io",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "authorization, apikey, content-type",
  },
  ...timeout,
});
const allowOrigin = preflightResponse.headers.get("access-control-allow-origin");
const allowMethods = preflightResponse.headers.get("access-control-allow-methods") ?? "";
const allowHeaders = preflightResponse.headers.get("access-control-allow-headers") ?? "";
if (!preflightResponse.ok || allowOrigin !== "https://devkove.github.io" ||
    !allowMethods.includes("GET") || !allowHeaders.toLowerCase().includes("authorization") ||
    !allowHeaders.toLowerCase().includes("apikey")) {
  throw new Error(`Preflight CORS inválido: HTTP ${preflightResponse.status}; origem ${allowOrigin ?? "ausente"}.`);
}

console.log("Smoke test aprovado: sessão obrigatória, CORS permitido para o Pages e origens não autorizadas bloqueadas.");
