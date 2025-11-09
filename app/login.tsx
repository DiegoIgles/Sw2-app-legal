import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";
import { login } from "../services/auth.service";

// 👇 nuevos imports
import { registerDeviceOnBackend } from "../services/notifications.service";
import { initRealtime } from "../services/realtime";
import { registerForPushNotificationsAsync } from "../utils/notifications";

// ⚠️ Usa la IP de tu backend (no localhost en dispositivo físico)
const RT_BASE = "http://192.168.100.252:3000";

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 600;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pwdRef = useRef<TextInput>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);

      // 1) Login
      const res: any = await login({ email, password }); // { access_token, cliente: { id_cliente, ... } }
      const idCliente: number | undefined = res?.cliente?.id_cliente;

      // 2) Registrar token de push en backend (si el usuario concede permiso)
      try {
        const expoPushToken = await registerForPushNotificationsAsync();
        if (expoPushToken) {
          await registerDeviceOnBackend(
            expoPushToken,
            Platform.OS === "ios" ? "ios" : "android"
          );
        }
      } catch (e) {
        // No bloquees el login por fallo de push
        console.warn("No se pudo registrar push token:", e);
      }

      // 3) Conectar socket para escuchar 'nota:creada' y disparar notificación local
      if (idCliente) {
        initRealtime({ baseUrl: RT_BASE, id_cliente: idCliente });
      }

      // 4) Navegación como ya lo tenías
      if (Platform.OS === "android") {
        ToastAndroid.show("Sesión iniciada correctamente", ToastAndroid.SHORT);
        setLoading(false);
        router.replace("/mis-documentos");
      } else if (Platform.OS === "ios") {
        setLoading(false);
        Alert.alert("¡Bienvenido!", "Sesión iniciada correctamente", [
          { text: "Ir al dashboard", onPress: () => router.replace("/") },
        ]);
      } else {
        // Web
        setSuccessMsg("Sesión iniciada correctamente");
        setLoading(false);
        setTimeout(() => router.replace("/"), 700);
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert("No se pudo iniciar sesión", e?.message ?? "Error desconocido");
    }
  };

  return (
    <View style={styles.screen}>
      <Navbar />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.card, !isSmall && styles.cardWide]}>
          {successMsg && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          <Text style={styles.title}>Inicia sesión</Text>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                touched.email && !emailValid ? styles.inputError : null,
              ]}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              returnKeyType="next"
              onSubmitEditing={() => pwdRef.current?.focus()}
            />
            {touched.email && !emailValid && (
              <Text style={styles.error}>Ingresa un email válido.</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              ref={pwdRef}
              style={[
                styles.input,
                touched.password && !passwordValid ? styles.inputError : null,
              ]}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {touched.password && !passwordValid && (
              <Text style={styles.error}>Mínimo 6 caracteres.</Text>
            )}
          </View>

          {/* Botón Login */}
          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Ingresando..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Botón Register */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: 420,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardWide: { maxWidth: 460 },
  successBanner: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  successText: {
    color: "#06281E",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  field: { marginBottom: 12 },
  label: { fontSize: 14, color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#ef4444" },
  error: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#111827",
    marginTop: 12,
  },
  secondaryBtnText: { color: "#111827", fontSize: 16, fontWeight: "600" },
});
