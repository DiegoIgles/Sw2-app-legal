# APP LEGAL — Cliente (React Native + Expo Router)

Aplicación móvil para clientes con **inicio de sesión**, **Mis documentos**, **Subir PDF**, **Mis notas** y **notificaciones locales** al crear notas desde el backend (Socket.IO). Navegación con **expo-router**.

---

## 📦 Requisitos

- Node.js 18+ y npm o yarn.
- **Expo CLI** (`npm i -g expo-cli`) o usa `npx expo`.
- Android Studio (emulador) / Xcode (iOS) o dispositivo físico en **la misma red LAN** que el backend.
- Backend NestJS (puerto **3000**) y microservicio de documentos (puerto **8081**) activos.

---

## 🚀 Instalación

```bash
# 1) Dependencias del proyecto
npm install

# 2) Paquetes requeridos por la app
npx expo install expo-router expo-notifications expo-document-picker react-native-safe-area-context
npm i socket.io-client
```
> **Nota Expo Go (SDK 53+)**: Expo Go **no** soporta *push remotas*. Esta app usa **notificaciones locales** disparadas por el evento Socket.IO `nota:creada`, por lo que **sí verás** notificaciones sin servidores de push.

---

## 🔧 Configuración de endpoints (LAN)

Edita las IPs en los servicios para apuntar a tu red local (no uses `localhost` en el dispositivo).

- `services/documento.service.ts`
  ```ts
  export const DOCS_BASE_URL = "http://TU.IP.LAN:8081";
  ```

- `services/notas.service.ts`
  ```ts
  const API_BASE = "http://TU.IP.LAN:3000";
  ```

- `services/realtime.ts`
  ```ts
  const WS_BASE = "http://TU.IP.LAN:3000";
  ```

Asegúrate de tener **CORS habilitado** en ambos servicios.

---

## ▶️ Ejecución

```bash
# Arrancar el proyecto (modo desarrollo)
npx expo start -c

# Atajos del lanzador:
# a -> Android, i -> iOS, w -> Web
```

Si prefieres compilar nativo:
```bash
npx expo run:android
npx expo run:ios
```

---

## 🗂️ Estructura relevante

```
app/
  _layout.tsx                # handler de notificaciones + Stack sin header
  index.tsx                  # dashboard
  login.tsx
  mis-documentos.tsx         # lista + FAB a mis-notas
  mis-notas.tsx              # lista responsive + FAB a mis-documentos
  subir-pdf.tsx
components/
  layouts/Navbar.tsx
services/
  auth.service.ts            # login / token
  documento.service.ts       # GET mis-documentos, descarga pública
  notas.service.ts           # GET notas/mis
  realtime.ts                # socket.io-client + handlers
utils/
  notifications.ts           # helpers (opcional)
```

---

## ✨ Funcionalidades

- **Login** (`POST /auth-cliente/login`) → guarda token y redirige a **/mis-documentos**.
- **Mis Documentos**:
  - `GET /mis-documentos` (Bearer) desde el MS de documentos.
  - Descarga:
    - **Web**: blob + `<a download>`
    - **Móvil**: `Linking.openURL(getPublicDocumentoUrl(doc_id))`
  - **FAB** → **/mis-notas**.
- **Subir PDF**:
  - `expo-document-picker` (solo `application/pdf`).
  - `POST /documentos` con `file` + `id_expediente` (FormData) + **Bearer**.
  - ⚠️ No fijes `Content-Type` manualmente; deja que `fetch` defina el *boundary*.
- **Mis Notas**:
  - `GET /notas/mis` (Bearer), **lista responsive** (1–2 columnas).
  - Auto-refresh al recibir `nota:creada` por Socket.IO.
  - **FAB** → **/mis-documentos**.
- **Notificaciones locales**:
  - En `_layout.tsx` se configura `expo-notifications` (canal Android + handler).
  - Al recibir `nota:creada`, se muestra una notificación y/o se refresca la vista.

---

## 🔔 Notificaciones (locales)

En `_layout.tsx`:
- Configura `Notifications.setNotificationHandler` para mostrar banners en foreground.
- En Android define el canal por defecto.
- Usa `addNotificationResponseReceivedListener` para navegar cuando el usuario toca la notificación (por ejemplo a `/mis-documentos` o al detalle por `id_expediente`).

> **Expo Go** mostrará un warning sobre *push remotas*; es esperado y no afecta a las notificaciones **locales**.

---

## 🔌 Socket en el cliente (intención)

`services/realtime.ts` debería:
1. Conectarse con `id_cliente` como `query`.
2. Escuchar `nota:creada`.
3. Disparar notificación local o refrescar la lista.

```ts
import { io, Socket } from "socket.io-client";
let socket: Socket | null = null;

export function getSocket() { return socket; }

export async function ensureRealtime(id_cliente: number) {
  if (socket) return socket;
  socket = io("http://TU.IP.LAN:3000", {
    transports: ["websocket"],
    query: { id_cliente },
  });
  socket.on("connect", () => console.log("[WS] conectado", socket?.id));
  socket.on("nota:creada", (payload: any) => {
    console.log("[WS] nota:creada", payload);
    // showLocalNoteNotification(payload); // o refrescar pantalla
  });
  return socket;
}
```

Llama `ensureRealtime(id_cliente)` tras login (cuando ya conoces el `id_cliente`).

---

## 🧪 Endpoints esperados (resumen)

**Backend NestJS (3000):**
- `POST /auth-cliente/login` → `{ access_token, cliente }`
- `GET /expedientes/mis` → expedientes del cliente autenticado
- `GET /notas/mis` → notas del cliente autenticado
- **WS** `nota:creada` → sala `cliente:{id_cliente}`

**MS Documentos (8081):**
- `GET /mis-documentos` (Bearer)
- `POST /documentos` (Bearer) → `file` + `id_expediente`
- `GET /documentos/:docId` (pública) → descarga/visualización

---

## 🛠️ Troubleshooting

- **`Unable to resolve "socket.io-client"`**  
  `npm i socket.io-client`

- **`No se encuentra el módulo "expo-document-picker"`**  
  `npx expo install expo-document-picker`

- **`SafeAreaView has been deprecated`**  
  Usa `react-native-safe-area-context`:
  ```tsx
  import { SafeAreaView } from "react-native-safe-area-context";
  ```

- **Expo Go: “Android Push notifications … removed from Expo Go”**  
  Es informativo. Aquí usamos **notificaciones locales**. Para *push remotas reales* usa EAS + FCM/APNs.

- **No descarga en Android/iOS**  
  En móvil se abre la **URL pública** (`Linking.openURL`). Verifica CORS y la IP LAN.

- **Socket no conecta**  
  - Misma red LAN
  - IP correcta en `realtime.ts`
  - Backend une a la sala `cliente:{id_cliente}`
  - El login retorna/guarda `id_cliente`

---

## ✅ Checklist rápido

- [ ] IPs LAN actualizadas (3000, 8081).
- [ ] Login OK y redirección a **/mis-documentos**.
- [ ] Subida de PDF (token + FormData) funcionando.
- [ ] **Mis notas** responsive y refrescando con socket.
- [ ] **FABs** navegando entre **mis-documentos** ↔ **mis-notas**.
- [ ] Notificación local al crear una nota desde el backend.

---

## 📄 Licencia
Uso académico / interno. Ajusta a tu preferencia (MIT, Apache-2.0, etc.).
