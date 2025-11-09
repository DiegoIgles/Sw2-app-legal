import { io, Socket } from "socket.io-client";
import { showLocalNoteNotification } from "../utils/notifications";

let socket: Socket | null = null;

export function initRealtime({ baseUrl, id_cliente }: { baseUrl: string; id_cliente: number }) {
  if (socket?.connected) return socket;
  socket = io(baseUrl, {
    transports: ["websocket"],
    query: { id_cliente: String(id_cliente) }, // tu gateway lo usa así
  });

  socket.on("nota:creada", (payload: any) => {
    // foreground: notificación local
    showLocalNoteNotification(payload).catch(() => {});
  });

  return socket;
}

export function getSocket() {
  return socket;
}
