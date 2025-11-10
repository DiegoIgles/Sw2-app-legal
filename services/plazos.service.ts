// services/plazos.service.ts
import { getToken } from "./auth.service";

const API_BASE = "http://192.168.100.252:3000"; // ← tu backend NestJS

// ---------- Tipos ----------
export type EstadoExp = "ABIERTO" | "EN_PROCESO" | "CERRADO";

export interface ExpedienteMini {
  id_expediente: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoExp;
  fecha_inicio: string | null;   // YYYY-MM-DD
  fecha_cierre: string | null;   // YYYY-MM-DD
  fecha_creacion: string;        // ISO
  fecha_actualizacion: string;   // ISO
}

export interface Plazo {
  id_plazo: number;
  descripcion: string;
  // Puede venir "YYYY-MM-DD" (date) o ISO (timestamp)
  fecha_vencimiento: string;
  cumplido: boolean;
  fecha_cumplimiento: string | null;
  fecha_creacion: string;      // ISO
  fecha_actualizacion: string; // ISO
  // expediente?: number | { id_expediente: number }
}

// ---------- Auxiliar de errores ----------
async function ensureOk(res: Response) {
  if (res.status === 401) throw new Error("UNAUTHORIZED_401");
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (Array.isArray(j?.message) ? j.message.join(", ") : j?.message) || msg;
    } catch {}
    throw new Error(msg);
  }
}

// ---------- Expedientes (para el selector) ----------
export async function fetchMisExpedientes(opts?: {
  q?: string;            // búsqueda por # o título
  estado?: EstadoExp;    // filtrar por estado
  limit?: number;
  offset?: number;
}): Promise<ExpedienteMini[]> {
  const token = await getToken();
  if (!token) throw new Error("UNAUTHORIZED_401");

  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.estado) params.set("estado", opts.estado);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));

  const url = `${API_BASE}/expedientes/mis${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  await ensureOk(res);
  const data = (await res.json()) as any[];

  // Normaliza por si hay nulls/undefined
  return data.map((d) => ({
    id_expediente: d.id_expediente,
    titulo: d.titulo,
    descripcion: d.descripcion ?? null,
    estado: d.estado,
    fecha_inicio: d.fecha_inicio ?? null,
    fecha_cierre: d.fecha_cierre ?? null,
    fecha_creacion: d.fecha_creacion,
    fecha_actualizacion: d.fecha_actualizacion,
  })) as ExpedienteMini[];
}

// ---------- Plazos ----------
export async function fetchPlazosByExpediente(id_expediente: number): Promise<Plazo[]> {
  const token = await getToken();
  if (!token) throw new Error("UNAUTHORIZED_401");

  const url = `${API_BASE}/expedientes/${id_expediente}/plazos`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  await ensureOk(res);
  return (await res.json()) as Plazo[];
}

export async function marcarPlazoCumplido(id_plazo: number): Promise<Plazo> {
  const token = await getToken();
  if (!token) throw new Error("UNAUTHORIZED_401");

  const res = await fetch(`${API_BASE}/plazos/${id_plazo}/cumplir`, {
    method: "PATCH",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  await ensureOk(res);
  return (await res.json()) as Plazo;
}

export async function eliminarPlazo(id_plazo: number): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("UNAUTHORIZED_401");

  const res = await fetch(`${API_BASE}/plazos/${id_plazo}`, {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  await ensureOk(res);
}
