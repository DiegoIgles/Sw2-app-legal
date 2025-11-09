// services/auth.service.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { BASE_URL } from "./env";

/** ===== Tipos ===== */
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  id_cliente: number;
  email: string;
  telefono: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  token?: string;
  jwt?: string;
  user?: any;
  [k: string]: any;
}

/** ===== Config de debug ===== */
const TOKEN_KEY = "auth_token";
const REQ_TIMEOUT_MS = 15000;
const AUTH_DEBUG = true; // cambia a false para silenciar logs

/** ===== Helpers de logging ===== */
function log(...args: any[]) {
  if (AUTH_DEBUG) console.log(...args);
}
function group(label: string) {
  if (AUTH_DEBUG && console.groupCollapsed) console.groupCollapsed(label);
  else log(label);
}
function groupEnd() {
  if (AUTH_DEBUG && console.groupEnd) console.groupEnd();
}
function time(label: string) {
  if (AUTH_DEBUG && console.time) console.time(label);
}
function timeEnd(label: string) {
  if (AUTH_DEBUG && console.timeEnd) console.timeEnd(label);
}
function mask(s?: string) {
  if (!s) return "";
  return "•".repeat(Math.min(8, s.length));
}

/** Fetch con timeout para detectar cuelgues/red rota */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeout = REQ_TIMEOUT_MS
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/** Parseo seguro (loggea raw si no es JSON válido) */
async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), raw: text };
  } catch {
    return { json: null as any, raw: text };
  }
}

/** ===== LOGIN ===== */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  group(`[AUTH] login ${BASE_URL}/auth-cliente/login`);
  log("[ENV]", { platform: Platform.OS, BASE_URL });
  log("[REQUEST] payload", { email: payload.email, password: mask(payload.password) });

  time("[FETCH] login");
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/auth-cliente/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    timeEnd("[FETCH] login");
  } catch (err: any) {
    timeEnd("[FETCH] login");
    log("[NETWORK ERROR]", err?.message ?? String(err));
    groupEnd();
    throw new Error(`No se pudo conectar a ${BASE_URL}: ${err?.message ?? err}`);
  }

  log("[RESPONSE] status", res.status, res.statusText);
  const headersObj: Record<string, string> = {};
  res.headers.forEach((v, k) => (headersObj[k] = v));
  log("[RESPONSE] headers", headersObj);

  const { json, raw } = await parseJsonSafe(res);

  if (!res.ok) {
    log("[RESPONSE] body (raw)", raw);
    const msg =
      (Array.isArray(json?.message) ? json.message.join(", ") : json?.message) ||
      `HTTP ${res.status}`;
    groupEnd();
    throw new Error(`Login fallido: ${msg}`);
  }

  log("[RESPONSE] body (json)", json);
  const data = (json || {}) as LoginResponse;

  const token = data.access_token ?? data.token ?? data.jwt;
  if (token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      log("[TOKEN] guardado correctamente en SecureStore:", TOKEN_KEY);
    } catch (e: any) {
      log("[TOKEN] error al guardar:", e?.message ?? e);
    }
  } else {
    log("[TOKEN] no se encontró token en la respuesta");
  }

  groupEnd();
  return data;
}

/** ===== REGISTER ===== */
export async function register(payload: RegisterPayload): Promise<any> {
  group(`[AUTH] register ${BASE_URL}/auth-cliente/register`);
  log("[ENV]", { platform: Platform.OS, BASE_URL });
  log("[REQUEST] payload", {
    id_cliente: payload.id_cliente,
    email: payload.email,
    telefono: payload.telefono,
    password: mask(payload.password),
  });

  time("[FETCH] register");
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/auth-cliente/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    timeEnd("[FETCH] register");
  } catch (err: any) {
    timeEnd("[FETCH] register");
    log("[NETWORK ERROR]", err?.message ?? String(err));
    groupEnd();
    throw new Error(`No se pudo conectar a ${BASE_URL}: ${err?.message ?? err}`);
  }

  log("[RESPONSE] status", res.status, res.statusText);
  const headersObj: Record<string, string> = {};
  res.headers.forEach((v, k) => (headersObj[k] = v));
  log("[RESPONSE] headers", headersObj);

  const { json, raw } = await parseJsonSafe(res);

  if (!res.ok) {
    log("[RESPONSE] body (raw)", raw);
    const msg =
      (Array.isArray(json?.message) ? json.message.join(", ") : json?.message) ||
      `HTTP ${res.status}`;
    groupEnd();
    throw new Error(`Registro fallido: ${msg}`);
  }

  log("[RESPONSE] body (json)", json ?? raw);
  groupEnd();
  return json ?? raw;
}

/** ===== TOKEN HELPERS (con logs) ===== */
export async function getToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    log("[TOKEN] getToken:", t ? "(presente)" : "(vacío)");
    return t;
  } catch (e: any) {
    log("[TOKEN] getToken error:", e?.message ?? e);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    log("[TOKEN] eliminado de SecureStore");
  } catch (e: any) {
    log("[TOKEN] error al eliminar:", e?.message ?? e);
  }
}
