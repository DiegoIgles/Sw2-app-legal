import { getToken } from "./auth.service";

const API_BASE = "http://192.168.100.252:3000"; // ⚠️ usa la IP de tu PC en móvil

export async function registerDeviceOnBackend(expoPushToken: string, platform: "android"|"ios") {
  const jwt = await getToken();
  if (!jwt) throw new Error("UNAUTHORIZED_401");

  const res = await fetch(`${API_BASE}/notificaciones/device`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ expoPushToken, platform }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
