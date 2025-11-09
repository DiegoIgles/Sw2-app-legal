// services/notas.service.ts
import { getToken } from "./auth.service";

const API_BASE = "http://192.168.100.252:3000"; // usa la IP de tu backend

export interface ClienteMini {
  id_cliente: number;
  nombre_completo: string;
  contacto_email: string | null;
  contacto_tel: string | null;
  fecha_creacion: string; // ISO
}

export interface ExpedienteMini {
  id_expediente: number;
  titulo: string;
  descripcion: string | null;
  estado: "ABIERTO" | "EN_PROCESO" | "CERRADO";
  fecha_inicio: string | null;  // YYYY-MM-DD
  fecha_cierre: string | null;  // YYYY-MM-DD
  cliente: ClienteMini;
  fecha_creacion: string; // ISO
  fecha_actualizacion: string; // ISO
}

export interface Nota {
  id_nota: number;
  contenido: string;
  tipo: string | null;
  expediente: ExpedienteMini;
  fecha_registro: string; // ISO
}

export async function fetchMisNotas(opts?: {
  limit?: number;
  offset?: number;
  tipo?: string;
  q?: string;
}): Promise<Nota[]> {
  const token = await getToken();
  if (!token) throw new Error("UNAUTHORIZED_401");

  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.tipo) params.set("tipo", opts.tipo);
  if (opts?.q) params.set("q", opts.q);

  const url = `${API_BASE}/notas/mis${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  // 401 → para que la pantalla pueda redirigir
  if (res.status === 401) throw new Error("UNAUTHORIZED_401");

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (Array.isArray(j?.message) ? j.message.join(", ") : j?.message) || msg;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as Nota[];
}
