// app/_layout.tsx
import { LogBox, Platform } from "react-native";
LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications \(remote notifications\) functionality provided by expo-notifications was removed from Expo Go/,
]);

import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ensureNotificationPermissions } from "../utils/notifications";

// Nuevo handler (evita warning). Dejamos shouldShowAlert por compatibilidad.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // (Opcional) pide permisos al arrancar la app para que las locales funcionen
    ensureNotificationPermissions().catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.type === "nota:creada") {
        router.push("/mis-notas");
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
