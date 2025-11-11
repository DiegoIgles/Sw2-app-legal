import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import { router } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";

type SummaryOut = {
  id?: string | null;
  filename: string;
  summary: string;
  key_points: string[];
  confidence_note?: string | null;
  saved: boolean;
  image_path?: string | null;
  image_url?: string | null;
};

// Usa tu endpoint con save=true
const IA_ENDPOINT = "http://192.168.100.252:3003/legal/summarize?save=true";

function isSupportedImage(mime?: string) {
  return mime?.startsWith("image/");
}

export default function ResumirIAScreen() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SummaryOut | null>(null);

  // Abrir galería
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Autoriza acceso a la galería.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a) return;
    if (!isSupportedImage(a.mimeType)) {
      Alert.alert("Formato no soportado", "Selecciona JPG o PNG.");
      return;
    }
    setAsset(a);
    setResult(null);
  }, []);

  // Tomar foto con cámara
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Autoriza acceso a la cámara.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a) return;
    // En cámara, mimeType puede venir vacío en algunos dispositivos → asumimos JPEG
    const mime = a.mimeType || "image/jpeg";
    if (!isSupportedImage(mime)) {
      Alert.alert("Formato no soportado", "La cámara debe producir JPG/PNG.");
      return;
    }
    setAsset({ ...a, mimeType: mime });
    setResult(null);
  }, []);

  // Enviar al backend
  const submitToIA = useCallback(async () => {
    if (!asset?.uri) {
      Alert.alert("Falta imagen", "Primero selecciona o toma una imagen.");
      return;
    }
    try {
      setSubmitting(true);
      setResult(null);

      const name =
        asset.fileName ||
        `doc_${Date.now()}.${(asset.mimeType || "image/jpeg").split("/")[1]}`;
      const type = asset.mimeType || "image/jpeg";

      const formData = new FormData();
      formData.append("file" as any, {
        uri: asset.uri,
        name,
        type,
      } as any);

      const res = await fetch(IA_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }, // RN setea boundary de multipart
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }

      const data: SummaryOut = await res.json();
      setResult(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo resumir el documento.");
    } finally {
      setSubmitting(false);
    }
  }, [asset]);

  const openImageUrl = useCallback(async () => {
    if (!result?.image_url) return;
    const supported = await Linking.canOpenURL(result.image_url);
    if (!supported) {
      Alert.alert("No se pudo abrir el enlace de la imagen.");
      return;
    }
    await Linking.openURL(result.image_url);
  }, [result]);

  return (
    <View style={styles.screen}>
      <Navbar />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={styles.title}>Resumir con IA</Text>
        <Text style={styles.hint}>
          Toma una foto o elige una imagen (JPG/PNG) de un documento legal. Se enviará al
          servicio para generar un resumen y se guardará en Supabase.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1) Imagen del documento</Text>

          {asset?.uri ? (
            <View style={{ marginTop: 10 }}>
              <Image
                source={{ uri: asset.uri }}
                style={styles.preview}
                resizeMode="cover"
                accessible
                accessibilityLabel="Vista previa de la imagen seleccionada"
              />
              <Text style={styles.meta}>
                {asset.fileName || "imagen"} · {asset.mimeType || "image"}
              </Text>
            </View>
          ) : (
            <Text style={styles.hintSmall}>No hay imagen seleccionada.</Text>
          )}

          <View style={styles.row}>
  <TouchableOpacity style={[styles.btnDark, styles.btnDark]} onPress={pickImage}>
    <Text style={styles.btnText}>Elegir imagen</Text>
  </TouchableOpacity>

  <TouchableOpacity style={[styles.btnDark, styles.btnDark]} onPress={takePhoto}>
    <Text style={styles.btnText}>Tomar foto</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.btnPrimary, styles.btnPrimary, !asset && { opacity: 0.6 }]}
    onPress={submitToIA}
    disabled={!asset || submitting}
  >
    {submitting ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.btnText}>Resumir con IA</Text>
    )}
  </TouchableOpacity>
</View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2) Resultado</Text>
          {!result ? (
            <Text style={styles.hintSmall}>Aún no hay resultado.</Text>
          ) : (
            <View>
              <Text style={styles.fileName}>📄 {result.filename}</Text>
              <Text style={styles.summary}>{result.summary}</Text>

              {result.key_points?.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.pointsTitle}>Puntos clave</Text>
                  {result.key_points.map((p, i) => (
                    <Text key={i} style={styles.point}>• {p}</Text>
                  ))}
                </View>
              )}

              {result.confidence_note ? (
                <Text style={styles.confidence}>
                  Nota de confianza: {result.confidence_note}
                </Text>
              ) : null}

              <View style={styles.row}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: result.saved ? "#DCFCE7" : "#FFE4E6" },
                  ]}
                >
                  <Text style={{ color: result.saved ? "#166534" : "#991B1B", fontWeight: "700" }}>
                    {result.saved ? "Guardado en Supabase" : "No guardado"}
                  </Text>
                </View>

                {!!result.image_url && (
                  <TouchableOpacity style={styles.btnLink} onPress={openImageUrl}>
                    <Text style={styles.linkText}>Ver imagen subida</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB +: Tomar foto / Elegir imagen / Resumir con IA */}
      <TouchableOpacity
  style={styles.fab}
  onPress={() => router.push("/mis-documentos")}
  accessibilityRole="button"
  accessibilityLabel="Volver a Mis Documentos"
>
  <Text style={styles.fabIcon}>📄</Text>
</TouchableOpacity>
    </View>
  );
}

function ExpandableFab({
  onPick,
  onTakePhoto,
  onSubmit,
  disabled,
}: {
  onPick: () => void;
  onTakePhoto: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <View style={styles.fabMenu}>
          <TouchableOpacity style={[styles.fabItem, { backgroundColor: "#111827" }]} onPress={onTakePhoto}>
            <Text style={styles.fabItemText}>📷 Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fabItem, { backgroundColor: "#111827" }]} onPress={onPick}>
            <Text style={styles.fabItemText}>🖼️ Elegir imagen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabItem, { backgroundColor: disabled ? "#6B7280" : "#0f766e" }]}
            onPress={onSubmit}
            disabled={disabled}
          > flexDirection: "row"
            <Text style={styles.fabItemText}>🤖 Resumir con IA</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Acciones de IA"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  body: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  hint: { color: "#6b7280", marginBottom: 12 },
  hintSmall: { color: "#9ca3af" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },

  row: { flexDirection: "row",
  alignItems: "stretch",
  flexWrap: "wrap",     // 🔸 permite saltar de línea
  gap: 10,
  marginTop: 12,},
  btnDark: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnPrimary: {
    backgroundColor: "#0f766e",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },

  preview: { width: "100%", height: 220, borderRadius: 10, backgroundColor: "#f3f4f6" },
  meta: { marginTop: 6, color: "#6b7280" },

  fileName: { fontSize: 15, fontWeight: "600", marginTop: 6, marginBottom: 8 },
  summary: { color: "#111827", lineHeight: 20 },
  pointsTitle: { fontWeight: "700", marginBottom: 6 },
  point: { color: "#111827", marginBottom: 4 },
  confidence: { marginTop: 8, fontStyle: "italic", color: "#6b7280" },

  badge: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnLink: { marginTop: 10, marginLeft: 10, paddingVertical: 8, paddingHorizontal: 10 },
  linkText: { color: "#0f766e", fontWeight: "700" },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabIcon: { fontSize: 22, color: "#fff" },
  fabMenu: {
    position: "absolute",
    right: 20,
    bottom: 24 + 56 + 12,
    gap: 10,
    zIndex: 29,
  },
  fabItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  fabItemText: { color: "#fff", fontWeight: "700" },
});
