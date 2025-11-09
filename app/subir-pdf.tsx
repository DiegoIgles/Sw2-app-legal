// app/subir-pdf.tsx
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Navbar } from "../components/layouts/Navbar";
import { DOCS_BASE_URL } from "../services/documento.service";
import { getToken } from "../services/auth.service";

type EstadoExp = "ABIERTO" | "EN_PROCESO" | "CERRADO";
type Expediente = {
  id_expediente: number;
  titulo: string;
  descripcion?: string | null;
  estado: EstadoExp;
  fecha_inicio?: string | null;
  fecha_cierre?: string | null;
};

const EXPEDIENTES_BASE = Platform.select({
  web: "http://localhost:3000",
  default: "http://192.168.100.252:3000", // 👈 cambia a la IP de tu PC si pruebas en dispositivo
});

export default function SubirPdfScreen() {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  // Expedientes del cliente (via token)
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingExps, setLoadingExps] = useState(true);
  const [errorExps, setErrorExps] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<Expediente | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const loadExpedientes = useCallback(async () => {
    try {
      setLoadingExps(true);
      setErrorExps(null);
      const token = await getToken();
      if (!token) {
        Alert.alert("Sesión", "Debes iniciar sesión nuevamente.");
        router.replace("/login");
        return;
      }
      const url = `${EXPEDIENTES_BASE}/expedientes/mis`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.status === 401) {
        Alert.alert("Sesión expirada", "Vuelve a iniciar sesión.", [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data: any[] = await res.json();
      const mapped: Expediente[] = data.map((d) => ({
        id_expediente: d.id_expediente,
        titulo: d.titulo,
        descripcion: d.descripcion ?? null,
        estado: d.estado,
        fecha_inicio: d.fecha_inicio ?? null,
        fecha_cierre: d.fecha_cierre ?? null,
      }));
      setExpedientes(mapped);
      // si hay uno solo, autoseleccionar
      if (mapped.length === 1) setSelectedExp(mapped[0]);
    } catch (e: any) {
      setErrorExps(e?.message ?? "No se pudieron cargar tus expedientes");
    } finally {
      setLoadingExps(false);
    }
  }, []);

  useEffect(() => {
    loadExpedientes();
  }, [loadExpedientes]);

  const pickPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    if (asset.mimeType && asset.mimeType !== "application/pdf") {
      Alert.alert("Archivo inválido", "Debe ser un PDF.");
      return;
    }
    setFile(asset);
  };

  // Convierte asset del picker a parte del FormData
  const buildFilePart = async (asset: DocumentPicker.DocumentPickerAsset) => {
    const name = asset.name || "documento.pdf";
    const type = asset.mimeType || "application/pdf";

    if (Platform.OS === "web") {
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      return new File([blob], name, { type });
    }
    return { uri: asset.uri, name, type } as any;
  };

  const onUpload = async () => {
    if (!selectedExp) {
      Alert.alert("Falta expediente", "Selecciona un expediente.");
      return;
    }
    if (!file) {
      Alert.alert("Falta archivo", "Selecciona un PDF primero.");
      return;
    }

    try {
      setUploading(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Sesión", "Debes iniciar sesión nuevamente.");
        router.replace("/login");
        return;
      }

      const form = new FormData();
      const filePart = await buildFilePart(file);
      form.append("file", filePart);
      form.append("id_expediente", String(selectedExp.id_expediente));

      const res = await fetch(`${DOCS_BASE_URL}/documentos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: form,
      });

      let errorMsg = `HTTP ${res.status}`;
      let payload: any = null;
      try {
        payload = await res.json();
        if (!res.ok) {
          errorMsg =
            (Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message) ||
            errorMsg;
        }
      } catch {
        // no-JSON, dejar status
      }

      if (!res.ok) throw new Error(errorMsg);

      Alert.alert("Éxito", "Documento subido correctamente.");
      router.replace("/mis-documentos");
    } catch (e: any) {
      Alert.alert("No se pudo subir", e?.message ?? "Error desconocido");
    } finally {
      setUploading(false);
    }
  };

  const filtered = busqueda.trim().length
    ? expedientes.filter((e) =>
        `${e.id_expediente} ${e.titulo}`.toLowerCase().includes(busqueda.trim().toLowerCase()),
      )
    : expedientes;

  const renderExpItem = ({ item }: { item: Expediente }) => {
    const active = selectedExp?.id_expediente === item.id_expediente;
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedExp(item);
          setPickerOpen(false);
        }}
        style={[styles.optionItem, active && styles.optionItemActive]}
      >
        <Text style={styles.optionTitle}>
          #{item.id_expediente} — {item.titulo}
        </Text>
        <Text style={styles.optionSub}>{item.estado}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Navbar />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Subir documento (PDF)</Text>

          {/* Expediente (selector) */}
          <View style={styles.field}>
            <Text style={styles.label}>Expediente</Text>

            {loadingExps ? (
              <View style={styles.inlineRow}>
                <ActivityIndicator />
                <Text style={[styles.hint, { marginLeft: 8 }]}>Cargando expedientes...</Text>
              </View>
            ) : errorExps ? (
              <View>
                <Text style={styles.error}>{errorExps}</Text>
                <TouchableOpacity style={styles.btnDisabled} onPress={loadExpedientes}>
                  <Text style={styles.btnDisabled}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : expedientes.length === 0 ? (
              <Text style={styles.hint}>No tienes expedientes aún.</Text>
            ) : (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar expediente"
              >
                <Text style={selectedExp ? styles.selectText : styles.selectPlaceholder}>
                  {selectedExp
                    ? `#${selectedExp.id_expediente} — ${selectedExp.titulo}`
                    : "Selecciona un expediente"}
                </Text>
                <Text style={styles.selectChevron}>▾</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selector de archivo */}
          <View style={styles.field}>
            <Text style={styles.label}>Archivo PDF</Text>
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={pickPDF}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar PDF"
            >
              <Text style={styles.pickBtnText}>{file ? "Cambiar archivo" : "Elegir PDF"}</Text>
            </TouchableOpacity>
            {file && (
              <Text style={styles.fileInfo}>
                {file.name || "documento.pdf"}
                {file.size ? ` • ${(file.size / (1024 * 1024)).toFixed(2)} MB` : ""}
              </Text>
            )}
          </View>

          {/* Acciones */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn]}
              onPress={() => router.back()}
              disabled={uploading}
            >
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (uploading || !selectedExp || !file) && styles.btnDisabled,
              ]}
              onPress={onUpload}
              disabled={uploading || !selectedExp || !file}
            >
              {uploading ? (
                <View style={styles.rowCenter}>
                  <ActivityIndicator />
                  <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Subiendo...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Subir</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal selector expedientes */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona un expediente</Text>

            <TextInput
              placeholder="Buscar por # o título..."
              value={busqueda}
              onChangeText={setBusqueda}
              style={styles.searchInput}
            />

            <FlatList
              data={filtered}
              keyExtractor={(e) => String(e.id_expediente)}
              renderItem={renderExpItem}
              style={{ maxHeight: 320 }}
            />

            <View style={{ marginTop: 12, alignItems: "flex-end" }}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerOpen(false)}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
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
    maxWidth: 460,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  field: { marginBottom: 14 },
  label: { fontSize: 14, color: "#374151", marginBottom: 6 },

  // Select
  selectInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 16, color: "#111827" },
  selectPlaceholder: { fontSize: 16, color: "#9CA3AF" },
  selectChevron: { fontSize: 16, color: "#6B7280" },

  // Archivo
  pickBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  pickBtnText: { color: "#fff", fontWeight: "700" },
  fileInfo: { marginTop: 8, color: "#6b7280", fontSize: 12 },

  // Estados y acciones
  hint: { color: "#6b7280" },
  error: { color: "#ef4444", marginBottom: 8 },
  inlineRow: { flexDirection: "row", alignItems: "center" },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    marginRight: 10,
  },
  secondaryBtnText: { color: "#111827", fontWeight: "600" },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 520,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionItemActive: {
    backgroundColor: "#F3F4F6",
  },
  optionTitle: { fontSize: 15, color: "#111827", fontWeight: "600" },
  optionSub: { fontSize: 12, color: "#6B7280" },

  // Botón cerrar modal
  modalCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  modalCloseText: { color: "#111827", fontWeight: "600" },
});
