// utils/notifications.ts
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Alert } from "react-native";

// Si usas Dev Build, pon tu projectId (app.json -> extra.eas.projectId)
const PROJECT_ID =
  (Constants?.expoConfig as any)?.extra?.eas?.projectId || undefined;

export async function ensureNotificationPermissions(): Promise<boolean> {
  let perm = await Notifications.getPermissionsAsync();
  if (perm.status !== "granted") {
    perm = await Notifications.requestPermissionsAsync();
  }
  if (perm.status !== "granted") {
    Alert.alert("Permiso denegado", "No se podrán mostrar notificaciones.");
    return false;
  }
  return true;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // ✅ SIEMPRE pedimos permiso (necesario para locales en Android 13+)
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;

  // ⛔ En Expo Go no hay token remoto, pero con permisos ya funcionan las locales
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    console.log("[Push] Expo Go: sin token remoto; locales habilitadas.");
    return null;
  }

  // En Dev Build / Production sí obtenemos token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: PROJECT_ID as any,
  });
  return token.data ?? null;
}

export async function showLocalNoteNotification(payload: {
  id_expediente: number;
  id_nota: number;
  contenido: string;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Nueva nota en expediente #${payload.id_expediente}`,
      body: (payload.contenido || "").slice(0, 120),
      data: { type: "nota:creada", ...payload },
    },
    trigger: null,
  });
}
