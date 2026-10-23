import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function readKey(name: string, legacyName: string, preferredPrefix: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy?.trim()) return legacy.trim();
  const raw = Deno.env.get(name);
  if (!raw?.trim()) return "";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const values = Object.values(parsed as Record<string, unknown>)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      return values.find(value => value.startsWith(preferredPrefix)) ?? (values.length === 1 ? values[0] : "");
    }
  } catch {
    return raw.trim();
  }
  return "";
}
const SERVICE = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY", "sb_secret_");
const ANON = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY", "sb_publishable_");
if (!SUPABASE_URL || !SERVICE || !ANON) {
  console.error("frotagov-api configuration incomplete", {
    supabase_url_present: Boolean(SUPABASE_URL),
    secret_key_present: Boolean(SERVICE),
    publishable_key_present: Boolean(ANON),
  });
}
const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);
const resourceConfig: Record<string, { table: string; permission: string; fields: string[]; readOnly?: boolean }> = {
  vehicles: { table: "vehicles", permission: "vehicles", fields: ["secretaria_id","fleet_number","asset_code","plate","renavam","chassis","make","model","model_year","manufacture_year","vehicle_type","category","fuel_type","tank_capacity_l","current_odometer_km","current_engine_hours","status","notes"] },
  secretarias: { table: "secretarias", permission: "secretarias", fields: ["nome","sigla","descricao","parent_id","responsavel_nome","responsavel_cargo","telefone_institucional","email_institucional","centro_custo","codigo_orcamentario","status"] },
  drivers: { table: "drivers", permission: "drivers", fields: ["user_id","secretaria_id","full_name","employee_number","license_number","license_category","license_expires_on","phone","status","cpf","birth_date","address","license_issued_on","license_first_issued_on","photo_storage_key","license_photo_storage_key","emergency_contact","notes"] },
  suppliers: { table: "suppliers", permission: "suppliers", fields: ["secretaria_id","legal_name","trade_name","tax_identifier","email","phone","address","status"] },
  work_orders: { table: "work_orders", permission: "work_orders", fields: ["order_number","vehicle_id","secretaria_id","requested_by","assigned_to","title","description","priority","status","odometer_km","estimated_cost","actual_cost","approved_by","approved_at","completed_at","version"] },
  fuel_records: { table: "fuel_records", permission: "fuel", fields: ["secretaria_id","vehicle_id","driver_id","occurred_at","fuel_type","liters","unit_price","total_amount","odometer_km","supplier_id","receipt_reference"] },
  inspections: { table: "inspections", permission: "inspections", fields: ["secretaria_id","vehicle_id","driver_id","inspected_at","odometer_km","result","notes","version"] },
  incidents: { table: "incidents", permission: "incidents", fields: ["secretaria_id","vehicle_id","driver_id","occurred_at","incident_type","severity","description","status"] },
  inventory_products: { table: "inventory_products", permission: "inventory", fields: ["secretaria_id","sku","name","description","unit","minimum_quantity","active"] },
  maintenance_plans: { table: "maintenance_plans", permission: "maintenance", fields: ["secretaria_id","vehicle_id","title","description","interval_days","interval_km","next_due_on","next_due_odometer_km","active"] },
  contracts: { table: "contracts", permission: "contracts", fields: ["supplier_id","secretaria_id","contract_number","title","starts_on","ends_on","total_value","status","storage_key"] },
  budget_sheets: { table: "budget_sheets", permission: "finance", fields: ["secretaria_id","code","description","fiscal_year","initial_amount","status"] },
  financial_transactions: { table: "financial_transactions", permission: "finance", fields: ["secretaria_id","vehicle_id","work_order_id","budget_sheet_id","transaction_type","amount","description","reference","occurred_on","idempotency_key","status","approved_by","approved_at"], readOnly: true },
  inventory_movements: { table: "inventory_movements", permission: "inventory", fields: ["product_id","movement_type","quantity","unit_cost","work_order_id","reference","idempotency_key","occurred_at","reason","secretaria_id"], readOnly: true },
  vehicle_documents: { table: "vehicle_documents", permission: "vehicles", fields: ["vehicle_id","document_type","document_number","issued_on","expires_on","storage_key","mime_type","size_bytes"], readOnly: true },
};
type Profile = { id: string; email: string; display_name: string; is_active: boolean; must_change_password: boolean; roles: string[]; permissions: string[]; secretaria_ids: string[]; isAdmin: boolean };
async function getProfile(token: string): Promise<Profile | null> {
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return null;
  const id = authData.user.id;
  const { data: user, error } = await admin.from("users").select("id,email,display_name,is_active,must_change_password,deleted_at").eq("id", id).maybeSingle();
  if (error || !user || !user.is_active || user.deleted_at) return null;
  const [{ data: roleRows }, { data: permissionRows }, { data: scopeRows }] = await Promise.all([
    admin.from("user_roles").select("roles(code)").eq("user_id", id),
    admin.from("permissions").select("code,role_permissions!inner(role_id,roles!inner(code))").in("role_permissions.role_id", (await admin.from("user_roles").select("role_id").eq("user_id", id)).data?.map(x => x.role_id) ?? []),
    admin.from("user_secretarias").select("secretaria_id").eq("user_id", id).lte("valid_from", new Date().toISOString()).or("valid_until.is.null,valid_until.gt." + new Date().toISOString()),
  ]);
  const roles = (roleRows ?? []).map((x: any) => x.roles?.code).filter(Boolean);
  const permissions = (permissionRows ?? []).map((x: any) => x.code).filter(Boolean);
  return { id, email: user.email, display_name: user.display_name, is_active: user.is_active, must_change_password: user.must_change_password, roles, permissions, secretaria_ids: (scopeRows ?? []).map((x: any) => x.secretaria_id), isAdmin: roles.includes("system_admin") };
}
function bearer(req: Request) { return req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? ""; }
function allowed(profile: Profile, permission: string) { return profile.isAdmin || profile.permissions.includes(permission); }
function inScope(profile: Profile, record: any) { return profile.isAdmin || (Boolean(record?.secretaria_id) && profile.secretaria_ids.includes(record.secretaria_id)); }

// Compensating cleanup prevents orphaned Auth/profile/role rows if account setup fails midway.
async function rollbackNewUser(userId: string) {
  const scopeDelete = await admin.from("user_secretarias").delete().eq("user_id", userId);
  if (scopeDelete.error) console.error("user creation rollback failed", { step: "user_secretarias", code: scopeDelete.error.code });
  const roleDelete = await admin.from("user_roles").delete().eq("user_id", userId);
  if (roleDelete.error) console.error("user creation rollback failed", { step: "user_roles", code: roleDelete.error.code });
  const profileDelete = await admin.from("users").delete().eq("id", userId);
  if (profileDelete.error) console.error("user creation rollback failed", { step: "users", code: profileDelete.error.code });
  const authDelete = await admin.auth.admin.deleteUser(userId);
  if (authDelete.error) console.error("user creation rollback failed", { step: "auth", code: authDelete.error.code });
}
function cleanFields(body: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of fields) if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  return out;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  // A URL pode chegar com o prefixo completo da Edge Function ou já relativa.
  // Extraia a rota da API pelo marcador /v1/ para não cair no fluxo protegido por engano.
  const marker = url.pathname.indexOf("/v1/");
  const rawPath = marker >= 0 ? url.pathname.slice(marker) : url.pathname.replace(/^\/functions\/v1\/frotagov-api(?=\/|$)/, "");
  const path = rawPath.replace(/\/+$/, "") || "/";
  try {
    if (path === "/v1/auth/login" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password || email.length > 254 || password.length > 1024) return fail(400, "validation_error", "Informe e-mail e senha válidos.");
      const client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) return fail(401, "invalid_credentials", "E-mail ou senha inválidos.");
      const profile = await getProfile(data.session.access_token);
      if (!profile) { await client.auth.signOut(); return fail(403, "profile_not_linked", "Conta autenticada sem perfil interno ativo. Solicite ao administrador."); }
      return json({ access_token: data.session.access_token, token_type: "Bearer", expires_at: new Date(data.session.expires_at! * 1000).toISOString(), user: { id: profile.id, email: profile.email, display_name: profile.display_name, must_change_password: profile.must_change_password } });
    }
    const token = bearer(req);
    if (!token) return fail(401, "missing_bearer_token", "Entre novamente para continuar.");
    const profile = await getProfile(token);
    if (!profile) return fail(401, "invalid_token", "Sessão inválida ou expirada. Entre novamente.");
    if (path === "/v1/auth/me" && req.method === "GET") return json({ user: { id: profile.id, email: profile.email, display_name: profile.display_name }, roles: profile.roles, permissions: profile.permissions, secretaria_ids: profile.secretaria_ids, must_change_password: profile.must_change_password });
    if (path === "/v1/auth/logout" && req.method === "POST") return new Response(null, { status: 204, headers: cors });
    if (path === "/v1/auth/change-password" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const current = String(body.current_password ?? ""), next = String(body.new_password ?? "");
      if (next.length < 14 || next.length > 1024 || next === current) return fail(400, "validation_error", "A nova senha deve ter pelo menos 14 caracteres e ser diferente da atual.");
      const verifyClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: verified, error: verifyError } = await verifyClient.auth.signInWithPassword({ email: profile.email, password: current });
      if (verifyError || !verified.session) return fail(400, "current_password_invalid", "A senha atual está incorreta.");
      const { error } = await verifyClient.auth.updateUser({ password: next });
      if (error) return fail(400, "password_update_failed", error.message);
      await admin.from("users").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", profile.id);
      return new Response(null, { status: 204, headers: cors });
    }
    if (path === "/v1/dashboard/summary" && req.method === "GET") {
      if (profile.must_change_password) return fail(403, "password_change_required", "Altere a senha antes de continuar.");
      const scoped = !profile.isAdmin;
      const count = async (table: string, apply?: (q: any) => any) => {
        let q = admin.from(table).select("id", { count: "exact", head: true }).is("deleted_at", null);
        if (scoped) q = q.in("secretaria_id", profile.secretaria_ids);
        if (apply) q = apply(q);
        const { count } = await q;
        return count ?? 0;
      };
      const [total, available, maintenance, orders, notifications] = await Promise.all([
        count("vehicles"),
        count("vehicles", q => q.eq("status", "active")),
        count("vehicles", q => q.eq("status", "maintenance")),
        count("work_orders", q => q.not("status", "in", '("completed","rejected","cancelled")')),
        admin.from("notifications").select("id", { count: "exact", head: true }).eq("state", "unread").or("recipient_user_id.eq." + profile.id + ",recipient_user_id.is.null"),
      ]);
      return json({ data: { vehicles_total: total, vehicles_available: available, vehicles_maintenance: maintenance, open_work_orders: orders, unread_notifications: notifications.count ?? 0, generated_at: new Date().toISOString() } });
    }
    if (path === "/v1/roles" && req.method === "GET") {
      if (!profile.isAdmin) return fail(403, "forbidden", "Somente o administrador pode consultar os perfis.");
      const { data, error } = await admin.from("roles").select("id,code,name,description").order("code");
      if (error) return fail(500, "query_failed", "Falha ao consultar perfis.");
      return json({ data: data ?? [] });
    }
    const match = path.match(/^\/v1\/(vehicles|secretarias|drivers|users|suppliers|work_orders|maintenance_plans|fuel_records|inspections|incidents|inventory_products|contracts|budget_sheets|financial_transactions|inventory_movements|vehicle_documents)(?:\/([^/]+))?$/);
    if (!match) return fail(404, "not_found", "Rota não encontrada.");
    if (profile.must_change_password) return fail(403, "password_change_required", "Altere a senha antes de continuar.");
    const key = match[1], id = match[2], method = req.method;
    if (key === "users") {
      if (!profile.isAdmin && !allowed(profile, "users:read")) return fail(403, "forbidden", "Você não possui permissão para esta operação.");
      if (method === "GET" && !id) {
        let q = admin.from("users").select("id,email,display_name,is_active,must_change_password,last_login_at,created_at").is("deleted_at", null).order("display_name").limit(500);
        if (!profile.isAdmin) q = q.in("id", (await admin.from("user_secretarias").select("user_id").in("secretaria_id", profile.secretaria_ids)).data?.map(x => x.user_id) ?? []);
        const { data, error } = await q;
        if (error) return fail(500, "query_failed", "Falha ao consultar usuários.");
        const rows = await Promise.all((data ?? []).map(async (u: any) => {
          const [{ data: rr }, { data: ss }] = await Promise.all([admin.from("user_roles").select("roles(code)").eq("user_id", u.id), admin.from("user_secretarias").select("secretaria_id").eq("user_id", u.id)]);
          return { ...u, roles: (rr ?? []).map((x: any) => x.roles?.code).filter(Boolean), secretaria_ids: (ss ?? []).map((x: any) => x.secretaria_id) };
        }));
        return json({ data: rows });
      }
      if (method === "POST" && !id) {
        if (!profile.isAdmin && !allowed(profile, "users:create")) return fail(403, "forbidden", "Você não possui permissão para criar usuários.");
        const b = await req.json().catch(() => ({}));
        const email = String(b.email ?? "").trim().toLowerCase(), display_name = String(b.display_name ?? "").trim(), temporary_password = String(b.temporary_password ?? "");
        const role_codes = Array.isArray(b.role_codes) ? b.role_codes : [], secretaria_ids = Array.isArray(b.secretaria_ids) ? b.secretaria_ids : [];
        if (!email.includes("@") || display_name.length < 2 || temporary_password.length < 14 || !role_codes.length) return fail(400, "validation_error", "Informe e-mail, nome, senha temporária com 14 caracteres ou mais e pelo menos um perfil.");
        if (!profile.isAdmin && role_codes.includes("system_admin")) return fail(403, "forbidden_role", "Somente o administrador do sistema pode atribuir esse perfil.");
        if (!profile.isAdmin && secretaria_ids.some((x: string) => !profile.secretaria_ids.includes(x))) return fail(403, "forbidden_scope", "Secretaria fora do seu escopo.");
        const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: temporary_password, email_confirm: true, user_metadata: { display_name } });
        if (createError || !created.user) return fail(400, "user_create_failed", createError?.message ?? "Não foi possível criar a conta.");
        const { error: insertError } = await admin.from("users").insert({ id: created.user.id, email, display_name, password_hash: "SUPABASE_AUTH_ONLY:" + crypto.randomUUID(), is_active: true, must_change_password: true, created_by: profile.id });
        if (insertError) { await rollbackNewUser(created.user.id); return fail(400, "user_profile_create_failed", "Não foi possível criar o perfil da conta; a criação foi desfeita."); }
        const { data: roleRows } = await admin.from("roles").select("id,code").in("code", role_codes);
        if (!roleRows || roleRows.length !== new Set(role_codes).size) { await rollbackNewUser(created.user.id); return fail(400, "invalid_role", "Um ou mais perfis não existem; a criação da conta foi desfeita."); }
        const links = roleRows.map((r: any) => ({ user_id: created.user.id, role_id: r.id }));
        const { error: roleError } = await admin.from("user_roles").insert(links);
        if (roleError) { await rollbackNewUser(created.user.id); return fail(500, "role_assignment_failed", "Não foi possível atribuir o perfil; a criação da conta foi desfeita. Tente novamente."); }
        if (secretaria_ids.length) {
          const { error: scopeError } = await admin.from("user_secretarias").insert(secretaria_ids.map((secretaria_id: string) => ({ user_id: created.user.id, secretaria_id })));
          if (scopeError) { await rollbackNewUser(created.user.id); return fail(500, "scope_assignment_failed", "Não foi possível vincular as secretarias; a criação da conta foi desfeita. Tente novamente."); }
        }
        return json({ data: { id: created.user.id, email, display_name, is_active: true, must_change_password: true, roles: role_codes, secretaria_ids } }, 201);
      }
      if (id && method === "PATCH") {
        if (!profile.isAdmin) return fail(403, "forbidden", "Somente o administrador principal pode editar contas.");
        if (id === profile.id) return fail(400, "self_change_blocked", "Não é permitido alterar o próprio acesso por esta tela.");
        const b = await req.json().catch(() => ({}));
        const changes: Record<string, unknown> = {};
        if (Object.prototype.hasOwnProperty.call(b,"display_name")) {
          const name = String(b.display_name ?? "").trim();
          if (name.length < 2 || name.length > 160) return fail(400,"validation_error","Nome inválido.");
          changes.display_name = name;
        }
        let email = "";
        if (Object.prototype.hasOwnProperty.call(b,"email")) {
          email = String(b.email ?? "").trim().toLowerCase();
          if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return fail(400,"validation_error","E-mail inválido.");
          changes.email = email;
        }
        const password = Object.prototype.hasOwnProperty.call(b,"temporary_password") ? String(b.temporary_password ?? "") : "";
        if (password && password.length < 14) return fail(400,"validation_error","A senha temporária deve ter ao menos 14 caracteres.");
        if (typeof b.is_active === "boolean") changes.is_active = b.is_active;
        const roleCodes = Array.isArray(b.role_codes) ? [...new Set(b.role_codes.map((x:unknown)=>String(x)))] : null;
        const secretariaIds = Array.isArray(b.secretaria_ids) ? [...new Set(b.secretaria_ids.map((x:unknown)=>String(x)))] : null;
        if (roleCodes) {
          if (!roleCodes.length) return fail(400,"invalid_role","O usuário precisa ter ao menos um perfil.");
          const {data:rr,error:re}=await admin.from("roles").select("id,code").in("code",roleCodes);
          if(re || !rr || rr.length!==roleCodes.length) return fail(400,"invalid_role","Um ou mais perfis não existem.");
          if(roleCodes.includes("system_admin")) {
            const {data:admins}=await admin.from("user_roles").select("user_id,roles!inner(code)").eq("roles.code","system_admin");
            const {data:active}=await admin.from("users").select("id").in("id",(admins??[]).map((x:any)=>x.user_id)).eq("is_active",true).is("deleted_at",null);
            if(!active?.some((x:any)=>x.id===id) && !profile.isAdmin) return fail(403,"forbidden_role","Apenas o administrador principal pode conceder este perfil.");
          }
        }
        if (secretariaIds) {
          const {data:ds,error:de}=await admin.from("secretarias").select("id").in("id",secretariaIds).is("deleted_at",null);
          if(de || (ds??[]).length!==secretariaIds.length) return fail(400,"invalid_secretaria","Uma ou mais secretarias não existem.");
        }
        const {data:target}=await admin.from("users").select("id,email").eq("id",id).is("deleted_at",null).maybeSingle();
        if(!target) return fail(404,"not_found","Usuário não encontrado.");
        if(changes.is_active===false) {
          const {data:targetRoles}=await admin.from("user_roles").select("roles(code)").eq("user_id",id);
          if((targetRoles??[]).some((x:any)=>x.roles?.code==="system_admin")) {
            const {data:admins}=await admin.from("user_roles").select("user_id,roles!inner(code)").eq("roles.code","system_admin");
            const {data:active}=await admin.from("users").select("id").in("id",(admins??[]).map((x:any)=>x.user_id)).eq("is_active",true).is("deleted_at",null);
            if((active??[]).length<=1) return fail(409,"last_admin_protection","Não é possível desativar o último administrador principal.");
          }
        }
        const authChanges:Record<string,unknown>={};
        if(email) authChanges.email=email;
        if(password){authChanges.password=password;authChanges.user_metadata={display_name:changes.display_name};changes.must_change_password=true;}
        else if(changes.display_name) authChanges.user_metadata={display_name:changes.display_name};
        if(typeof changes.is_active==="boolean") authChanges.ban_duration=changes.is_active?"none":"876000h";
        if(Object.keys(authChanges).length){const {error}=await admin.auth.admin.updateUserById(id,authChanges as any);if(error)return fail(400,"auth_update_failed","Não foi possível atualizar a autenticação da conta.");}
        if(Object.keys(changes).length){changes.updated_at=new Date().toISOString();const {error}=await admin.from("users").update(changes).eq("id",id);if(error)return fail(400,"user_update_failed","Não foi possível salvar o perfil do usuário.");}
        if(roleCodes){const {data:rr}=await admin.from("roles").select("id,code").in("code",roleCodes);const {error:de}=await admin.from("user_roles").delete().eq("user_id",id);if(de)return fail(500,"role_update_failed","Não foi possível atualizar os perfis.");const {error:ie}=await admin.from("user_roles").insert((rr??[]).map((x:any)=>({user_id:id,role_id:x.id})));if(ie)return fail(500,"role_update_failed","Não foi possível salvar os perfis.");}
        if(secretariaIds){const {error:de}=await admin.from("user_secretarias").delete().eq("user_id",id);if(de)return fail(500,"scope_update_failed","Não foi possível atualizar as secretarias.");if(secretariaIds.length){const {error:ie}=await admin.from("user_secretarias").insert(secretariaIds.map((secretaria_id:string)=>({user_id:id,secretaria_id})));if(ie)return fail(500,"scope_update_failed","Não foi possível salvar as secretarias.");}}
        const {data:u}=await admin.from("users").select("id,email,display_name,is_active,must_change_password,updated_at").eq("id",id).single();
        const {data:rr}=await admin.from("user_roles").select("roles(code)").eq("user_id",id);
        const {data:ss}=await admin.from("user_secretarias").select("secretaria_id").eq("user_id",id);
        return json({data:{...u,roles:(rr??[]).map((x:any)=>x.roles?.code).filter(Boolean),secretaria_ids:(ss??[]).map((x:any)=>x.secretaria_id)}});
      }
      if (id && method === "DELETE") {
        if(!profile.isAdmin) return fail(403,"forbidden","Somente o administrador principal pode desativar contas.");
        if(id===profile.id) return fail(400,"self_change_blocked","Não é permitido desativar a própria conta.");
        const {data:target}=await admin.from("users").select("id").eq("id",id).is("deleted_at",null).maybeSingle();
        if(!target)return fail(404,"not_found","Usuário não encontrado.");
        const {data:targetRoles}=await admin.from("user_roles").select("roles(code)").eq("user_id",id);
        if((targetRoles??[]).some((x:any)=>x.roles?.code==="system_admin")){
          const {data:admins}=await admin.from("user_roles").select("user_id,roles!inner(code)").eq("roles.code","system_admin");
          const {data:active}=await admin.from("users").select("id").in("id",(admins??[]).map((x:any)=>x.user_id)).eq("is_active",true).is("deleted_at",null);
          if((active??[]).length<=1)return fail(409,"last_admin_protection","Não é possível desativar o último administrador principal.");
        }
        const {error:ae}=await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});
        if(ae)return fail(400,"account_disable_failed","Não foi possível bloquear a autenticação.");
        const {error}=await admin.from("users").update({is_active:false,deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
        if(error)return fail(500,"account_disable_failed","A conta foi bloqueada, mas o registro não foi concluído.");
        return new Response(null,{status:204,headers:cors});
      }
      return fail(405, "method_not_allowed", "Operação não permitida.");
    }
    const cfg = resourceConfig[key];
    const permission = cfg.permission;
    if (cfg.readOnly && method !== "GET") return fail(405, "method_not_allowed", "Este recurso está disponível somente para consulta.");
    const action = method === "GET" ? "read" : method === "POST" ? "create" : method === "PATCH" ? "update" : method === "DELETE" ? "delete" : "";
    if (!action || !["GET","POST","PATCH","DELETE"].includes(method)) return fail(405, "method_not_allowed", "Método não permitido.");
    if (!allowed(profile, permission + ":" + action)) return fail(403, "forbidden", "Você não possui permissão para esta operação.");
    if (method === "GET" && !id) {
      let q = admin.from(cfg.table).select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000);
      if (!profile.isAdmin) {
        if (key === "secretarias") q = q.in("id", profile.secretaria_ids);
        else if (key === "vehicle_documents") {
          const { data: scopedVehicles, error: vehicleScopeError } = await admin.from("vehicles").select("id").in("secretaria_id", profile.secretaria_ids).is("deleted_at", null);
          if (vehicleScopeError) return fail(500, "scope_query_failed", "Falha ao verificar o escopo dos veículos.");
          const vehicleIds = (scopedVehicles ?? []).map((v: any) => v.id);
          if (!vehicleIds.length) return json({ data: [] });
          q = q.in("vehicle_id", vehicleIds);
        } else q = q.in("secretaria_id", profile.secretaria_ids);
      }
      const { data, error } = await q;
      if (error) return fail(500, "query_failed", "Falha ao consultar registros.");
      return json({ data: data ?? [] });
    }
    if (method === "POST" && !id) {
      const b = await req.json().catch(() => ({}));
      const payload = cleanFields(b, cfg.fields);
      // Registros operacionais vinculados a veículo herdam a secretaria do veículo;
      // o cliente não pode declarar uma secretaria diferente da proprietária do veículo.
      const vehicleScoped = ["work_orders","fuel_records","inspections","incidents","maintenance_plans"].includes(key);
      if (vehicleScoped && payload.vehicle_id) {
        const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("id,secretaria_id").eq("id", String(payload.vehicle_id)).is("deleted_at", null).maybeSingle();
        if (vehicleError || !vehicle) return fail(400, "invalid_vehicle", "Selecione um veículo válido.");
        if (payload.secretaria_id && String(payload.secretaria_id) !== String(vehicle.secretaria_id)) return fail(400, "secretaria_vehicle_mismatch", "A secretaria do registro deve ser a mesma do veículo.");
        payload.secretaria_id = vehicle.secretaria_id;
      }
      if (key !== "secretarias" && !payload.secretaria_id) return fail(400, "secretaria_required", "Vincule este registro a uma secretaria.");
      if (!profile.isAdmin && (!payload.secretaria_id || !profile.secretaria_ids.includes(String(payload.secretaria_id)))) return fail(403, "forbidden_scope", "Secretaria fora do seu escopo.");
      payload.created_by = profile.id;
      if (key === "vehicles" || key === "secretarias" || key === "drivers") payload.version = 1;
      if (key === "vehicles" || key === "secretarias") payload.updated_by = profile.id;
      const { data, error } = await admin.from(cfg.table).insert(payload).select("*").single();
      if (error) return fail(400, "validation_error", error.message);
      return json({ data }, 201);
    }
    if (id && method === "PATCH") {
      const b = await req.json().catch(() => ({}));
      const { data: current, error: findError } = await admin.from(cfg.table).select("*").eq("id", id).is("deleted_at", null).maybeSingle();
      if (findError || !current) return fail(404, "not_found", "Registro não encontrado.");
      if (!inScope(profile, current)) return fail(403, "forbidden_scope", "Registro fora do seu escopo.");
      if (b.expected_version !== undefined && Number(b.expected_version) !== current.version) return fail(409, "version_conflict", "O registro foi alterado por outra sessão. Atualize e tente novamente.");
      const payload = cleanFields(b, cfg.fields);
      if (!profile.isAdmin && payload.secretaria_id && !profile.secretaria_ids.includes(String(payload.secretaria_id))) return fail(403, "forbidden_scope", "Secretaria fora do seu escopo.");
      if (["work_orders","fuel_records","inspections","incidents","maintenance_plans"].includes(key) && payload.vehicle_id) {
        const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("id,secretaria_id").eq("id", String(payload.vehicle_id)).is("deleted_at", null).maybeSingle();
        if (vehicleError || !vehicle) return fail(400, "invalid_vehicle", "Selecione um veículo válido.");
        if (String(vehicle.secretaria_id) !== String(current.secretaria_id)) return fail(400, "secretaria_vehicle_mismatch", "Não é possível vincular o registro a veículo de outra secretaria.");
        payload.secretaria_id = vehicle.secretaria_id;
      }
      if (!profile.isAdmin && payload.secretaria_id && !profile.secretaria_ids.includes(String(payload.secretaria_id))) return fail(403, "forbidden_scope", "Secretaria fora do seu escopo.");
      payload.updated_at = new Date().toISOString();
      if (current.version !== undefined) payload.version = current.version + 1;
      if (key === "vehicles" || key === "secretarias") payload.updated_by = profile.id;
      const { data, error } = await admin.from(cfg.table).update(payload).eq("id", id).select("*").single();
      if (error) return fail(400, "validation_error", error.message);
      return json({ data });
    }
    if (id && method === "DELETE") {
      const { data: current } = await admin.from(cfg.table).select("*").eq("id", id).is("deleted_at", null).maybeSingle();
      if (!current) return fail(404, "not_found", "Registro não encontrado.");
      if (!inScope(profile, current)) return fail(403, "forbidden_scope", "Registro fora do seu escopo.");
      const version = Number(url.searchParams.get("version"));
      if (Number.isFinite(version) && current.version !== undefined && version !== current.version) return fail(409, "version_conflict", "O registro foi alterado por outra sessão. Atualize e tente novamente.");
      const { error } = await admin.from(cfg.table).update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(current.version !== undefined ? { version: current.version + 1 } : {}) }).eq("id", id);
      if (error) return fail(400, "delete_failed", error.message);
      return new Response(null, { status: 204, headers: cors });
    }
    return fail(404, "not_found", "Rota não encontrada.");
  } catch (e) {
    console.error("frotagov-api", e);
    return fail(500, "internal_error", "Erro interno ao processar a solicitação.");
  }
});