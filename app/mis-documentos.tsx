// app/mis-documentos.tsx
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";
import {
    downloadDocumentoNoAuthWeb,
    fetchMisDocumentos,
    getPublicDocumentoUrl,
    type Documento,
} from "../services/documento.service";

function formatBytes(bytes: number) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MisDocumentosScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Speed Dial
  const [fabOpen, setFabOpen] = useState(false);
  const toggleFab = () => setFabOpen((v) => !v);
  const closeFab = () => setFabOpen(false);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchMisDocumentos();
      setDocs(data);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED_401") {
        Alert.alert("Sesión expirada", "Vuelve a iniciar sesión.", [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
        return;
      }
      setError(e?.message ?? "Error al cargar documentos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDownload = async (doc: Documento) => {
    try {
      setDownloadingId(doc._id);
      if (Platform.OS === "web") {
        await downloadDocumentoNoAuthWeb(doc.doc_id, doc.filename);
      } else {
        const url = getPublicDocumentoUrl(doc.doc_id);
        const supported = await Linking.canOpenURL(url);
        if (!supported) throw new Error("No se puede abrir el navegador.");
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert("No se pudo descargar", e?.message ?? "Error desconocido");
    } finally {
      setDownloadingId(null);
    }
  };

  // 👉 Navegar a la vista de subida de PDF
  const handleGoUpload = () => {
    closeFab();
    router.push("/subir-pdf");
  };

  // 👉 Acciones del Speed Dial
  const handleGoPlazos = () => {
    closeFab();
    router.push("/plazos");
  };

  const handleGoNotas = () => {
    closeFab();
    router.push("/mis-notas");
  };

  const handleGoIA = () => {
    closeFab();
    // Ajusta a la ruta real de tu asistente IA
    router.push("/resumenes-ia");
  };

  const renderItem = ({ item }: { item: Documento }) => {
    const isDownloading = downloadingId === item._id;

    return (
      <View style={styles.card}>
        <Text style={styles.fileName}>📄 {item.filename}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Tamaño: {formatBytes(item.size)}</Text>
          <Text style={[styles.meta, styles.metaSpacer]}>
            Expediente: #{item.id_expediente}
          </Text>
        </View>
        <Text style={styles.meta}>Creado: {formatDate(item.created_at)}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isDownloading && styles.actionBtnDisabled]}
            onPress={() => handleDownload(item)}
            disabled={isDownloading}
          >
            <Text style={styles.actionText}>
              {isDownloading ? "Descargando..." : "Descargar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Constantes de layout para el Speed Dial
  const GAP = 12;
  const SIZE_MAIN = 56;
  const BASE_BOTTOM = 24;
  const actionBottom = (index: number) =>
    BASE_BOTTOM + (SIZE_MAIN + GAP) * (index + 1);

  return (
    <View style={styles.screen}>
      <Navbar />
      <View style={styles.body}>
        {/* Encabezado con botón Subir */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mis documentos</Text>
          <TouchableOpacity
            onPress={handleGoUpload}
            style={styles.uploadBtn}
            accessibilityRole="button"
            accessibilityLabel="Subir documento PDF"
          >
            <Text style={styles.uploadBtnText}>＋ Subir documento</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.hint}>Cargando documentos...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : docs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.hint}>No tienes documentos aún.</Text>
            <TouchableOpacity
              onPress={handleGoUpload}
              style={[styles.uploadBtn, { marginTop: 12 }]}
            >
              <Text style={styles.uploadBtnText}>＋ Subir documento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(d) => d._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {/* Backdrop para cerrar el speed dial */}
        {fabOpen && <Pressable style={styles.backdrop} onPress={closeFab} />}

        {/* Acciones del Speed Dial (se muestran cuando está abierto) */}
        {fabOpen && (
          <>
            <TouchableOpacity
              onPress={handleGoIA}
              style={[styles.miniFab, { bottom: actionBottom(2) }]}
              accessibilityRole="button"
              accessibilityLabel="Ir a IA"
            >
              <Text style={styles.fabIcon}>🤖</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGoPlazos}
              style={[styles.miniFab, { bottom: actionBottom(1) }]}
              accessibilityRole="button"
              accessibilityLabel="Ir a plazos"
            >
              <Text style={styles.fabIcon}>⏳</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGoNotas}
              style={[styles.miniFab, { bottom: actionBottom(0) }]}
              accessibilityRole="button"
              accessibilityLabel="Ir a mis notas"
            >
              <Text style={styles.fabIcon}>📝</Text>
            </TouchableOpacity>
          </>
        )}

        {/* FAB principal (＋) */}
        <TouchableOpacity
          onPress={toggleFab}
          style={styles.fabMain}
          accessibilityRole="button"
          accessibilityLabel={fabOpen ? "Cerrar menú de acciones" : "Abrir menú de acciones"}
        >
          <Text style={[styles.fabMainIcon, fabOpen && styles.fabMainIconOpen]}>
            ＋
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  body: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },

  // Botón subir
  uploadBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  uploadBtnText: { color: "#fff", fontWeight: "700" },

  center: { marginTop: 24, alignItems: "center" },
  hint: { marginTop: 8, color: "#6b7280" },
  error: { color: "#ef4444", textAlign: "center", marginBottom: 12 },

  list: { paddingBottom: 24 },

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
  fileName: { fontSize: 16, fontWeight: "600", marginBottom: 6 },

  metaRow: { flexDirection: "row", marginBottom: 4 },
  meta: { color: "#6b7280", fontSize: 13 },
  metaSpacer: { marginLeft: 12 },

  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionText: { color: "#fff", fontWeight: "600" },

  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
  },
  retryText: { color: "#111827", fontWeight: "600" },

  // Backdrop para cerrar el speed dial
  backdrop: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.12)",
    zIndex: 15,
  },

  // FAB principal
  fabMain: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,

    // Sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },

    // Elevación Android
    elevation: 6,
  },
  fabMainIcon: {
    fontSize: 28,
    color: "#fff",
  },
  fabMainIconOpen: {
    transform: [{ rotate: "45deg" }], // Se ve como "×"
  },

  // Mini FABs (acciones del Speed Dial)
  miniFab: {
    position: "absolute",
    right: 24,
    // bottom dinámico desde el render
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,

    // Sombras
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 20,
    color: "#fff",
  },
});
