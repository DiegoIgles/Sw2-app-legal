// services/documento.service.ts
import { getToken } from "./auth.service";

/** ========= Config ========= */
const DOCS_DEBUG = true;           // pon en false para silenciar logs
const REQ_TIMEOUT_MS = 15000;

/** ========= BASE y ENDPOINTS (IP fija) ========= */
export const DOCS_BASE_URL = "http://192.168.100.252:8081";

export const DOCS_ENDPOINTS = {
  misDocumentos: `${DOCS_BASE_URL}/mis-documentos`,

  // Descarga pública SIN token: el último segmento es el doc_id
  descargar: (docId: string) => `${DOCS_BASE_URL}/documentos/${docId}`,

  // (opcionales/futuro)
  documento: (id: string) => `${DOCS_BASE_URL}/documentos/${id}`,
  eliminar: (docId: string) => `${DOCS_BASE_URL}/documentos/${docId}`,
  subir: `${DOCS_BASE_URL}/documentos/upload`,
} as const;

/** ========= Tipos ========= */
export interface Documento {
  _id: string;
  doc_id: string;
  filename: string;
  size: number;
  id_cliente: number;
  id_expediente: number;
  created_at: string; // ISO
}

/** ========= Helpers de logging ========= */
function log(...a: any[]) { if (DOCS_DEBUG) console.log(...a); }
function group(label: string) {
  if (DOCS_DEBUG && typeof console.groupCollapsed === "function") console.groupCollapsed(label);
  else log(label);
}
function groupEnd() { if (DOCS_DEBUG && typeof console.groupEnd === "function") console.groupEnd(); }
function time(label: string) { if (DOCS_DEBUG && typeof console.time === "function") console.time(label); }
function timeEnd(label: string) { if (DOCS_DEBUG && typeof console.timeEnd === "function") console.timeEnd(label); }

/** ========= Utils ========= */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeout = REQ_TIMEOUT_MS
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try { return { json: JSON.parse(text), raw: text }; }
  catch { return { json: null as any, raw: text }; }
}

function sanitizeFilename(name: string, fallback = "archivo.pdf") {
  const s = (name || fallback).replace(/[\/\\:*?"<>|]+/g, "_").trim();
  return s.length ? s : fallback;
}

/** ========= Servicios ========= */
/**
 * GET /mis-documentos (con Bearer)
 * Retorna la lista de documentos del cliente autenticado.
 * Lanza "UNAUTHORIZED_401" si el token es inválido/expirado.
 */
export async function fetchMisDocumentos(): Promise<Documento[]> {
  const url = DOCS_ENDPOINTS.misDocumentos;

  group(`[DOCS] GET ${url}`);

  const token = await getToken();
  if (!token) {
    groupEnd();
    throw new Error("No hay token. Inicia sesión nuevamente.");
  }

  time("[FETCH] mis-documentos");
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    timeEnd("[FETCH] mis-documentos");
  } catch (err: any) {
    timeEnd("[FETCH] mis-documentos");
    log("[NETWORK ERROR]", err?.message ?? String(err));
    groupEnd();
    throw new Error(`No se pudo conectar a ${DOCS_BASE_URL}: ${err?.message ?? err}`);
  }

  log("[RESPONSE] status", res.status, res.statusText);
  const headersObj: Record<string, string> = {};
  res.headers.forEach((v, k) => (headersObj[k] = v));
  log("[RESPONSE] headers", headersObj);

  const { json, raw } = await parseJsonSafe(res);

  if (res.status === 401) {
    log("[AUTH] 401 - token inválido/expirado");
    groupEnd();
    throw new Error("UNAUTHORIZED_401");
  }

  if (!res.ok) {
    log("[RESPONSE] body (raw)", raw);
    const msg =
      (Array.isArray(json?.message) ? json.message.join(", ") : json?.message) ||
      `HTTP ${res.status}`;
    groupEnd();
    throw new Error(`Error al cargar documentos: ${msg}`);
  }

  log("[RESPONSE] body (json)", json);
  groupEnd();
  return (json ?? []) as Documento[];
}

/**
 * URL pública SIN token para descargar/ver un documento por doc_id.
 * Úsala en móvil con Linking.openURL(url).
 */
export function getPublicDocumentoUrl(docId: string) {
  return DOCS_ENDPOINTS.descargar(docId);
}

/**
 * Descarga directa en **web** SIN token (Blob + <a download>).
 * En nativo NO hace nada: deja esta función para uso exclusivo web y
 * usa getPublicDocumentoUrl + Linking.openURL en móvil.
 */
export async function downloadDocumentoNoAuthWeb(docId: string, filename?: string) {
  if (typeof window === "undefined") {
    // Entorno no-web: no ejecutar aquí.
    return;
  }
  const url = DOCS_ENDPOINTS.descargar(docId);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Descarga fallida: ${res.status} ${txt}`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = sanitizeFilename(filename ?? `${docId}.pdf`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
