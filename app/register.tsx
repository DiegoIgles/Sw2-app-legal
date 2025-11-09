import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar"; // ajusta si tu ruta es distinta
import { register } from "../services/auth.service";

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 600;

  const [idCliente, setIdCliente] = useState<string>("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({
    id: false,
    email: false,
    tel: false,
    pass: false,
  });
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const idValid =
    /^\d+$/.test(idCliente.trim()) && Number(idCliente.trim()) > 0;
  // Teléfono boliviano típico: 8 dígitos. Si quieres permitir más, ajusta el rango.
  const telValid = /^\d{8}$/.test(telefono.trim());
  const passValid = password.length >= 8;

  const canSubmit =
    idValid && emailValid && telValid && passValid && !loading;

  const telRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await register({
        id_cliente: Number(idCliente.trim()),
        email: email.trim(),
        telefono: telefono.trim(),
        password,
      });
      Alert.alert("Registro exitoso", "Ahora puedes iniciar sesión.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e: any) {
      Alert.alert("No se pudo registrar", e?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>Crear cuenta</Text>

          {/* ID Cliente */}
          <View style={styles.field}>
            <Text style={styles.label}>ID Cliente</Text>
            <TextInput
              style={[
                styles.input,
                touched.id && !idValid ? styles.inputError : null,
              ]}
              placeholder="1"
              keyboardType="number-pad"
              value={idCliente}
              onChangeText={(v) => setIdCliente(v.replace(/[^0-9]/g, ""))}
              onBlur={() => setTouched((t) => ({ ...t, id: true }))}
              returnKeyType="next"
              onSubmitEditing={() => telRef.current?.focus()}
            />
            {touched.id && !idValid && (
              <Text style={styles.error}>
                Ingresa un ID de cliente válido (entero &gt; 0).
              </Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                touched.email && !emailValid ? styles.inputError : null,
              ]}
              placeholder="juan@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              returnKeyType="next"
              onSubmitEditing={() => telRef.current?.focus()}
            />
            {touched.email && !emailValid && (
              <Text style={styles.error}>Ingresa un email válido.</Text>
            )}
          </View>

          {/* Teléfono */}
          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              ref={telRef}
              style={[
                styles.input,
                touched.tel && !telValid ? styles.inputError : null,
              ]}
              placeholder="73159598"
              keyboardType="number-pad"
              value={telefono}
              onChangeText={(v) => setTelefono(v.replace(/[^0-9]/g, ""))}
              onBlur={() => setTouched((t) => ({ ...t, tel: true }))}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />
            {touched.tel && !telValid && (
              <Text style={styles.error}>
                Debe tener 8 dígitos (solo números).
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              ref={passRef}
              style={[
                styles.input,
                touched.pass && !passValid ? styles.inputError : null,
              ]}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, pass: true }))}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {touched.pass && !passValid && (
              <Text style={styles.error}>
                La contraseña debe tener al menos 8 caracteres.
              </Text>
            )}
          </View>

          {/* Botón Registrar */}
          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Creando..." : "Registrarme"}
            </Text>
          </TouchableOpacity>

          {/* Ya tengo cuenta */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.secondaryBtnText}>Ya tengo cuenta</Text>
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
