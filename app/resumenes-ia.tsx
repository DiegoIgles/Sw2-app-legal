import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Summary = {
  id: string;
  filename: string;
  summary: string;
  key_points: string[];
  confidence_note?: string | null;
  saved: boolean;
  image_path?: string | null;
  image_url?: string | null;
};

const API_BASE = Platform.select({
  android: "http://192.168.100.252:3003",
  default: "http://192.168.100.252:3003",
})!;

const ENDPOINT = `${API_BASE}/legal/summaries/all?sign_urls=true&url_ttl=900`;

export default function ResumenesIAScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Summary[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Summary[] = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const openImage = async (url?: string | null) => {
    if (!url) {
      Alert.alert("Sin imagen", "No hay URL firmada disponible.");
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("No se puede abrir", "Intenta copiar la URL y abrirla en el navegador.");
      return;
    }
    Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: Summary }) => {
    const isOpen = !!expanded[item.id];
    const shortSummary =
      item.summary?.length > 240 && !isOpen
        ? item.summary.slice(0, 240) + "…"
        : item.summary;

    return (
      <View style={styles.card}>
        <Text style={styles.fileName}>📄 {item.filename}</Text>

        <Text style={styles.summary}>{shortSummary}</Text>
        {item.summary?.length > 240 ? (
          <TouchableOpacity onPress={() => toggleExpanded(item.id)}>
            <Text style={styles.link}>
              {isOpen ? "Ver menos" : "Ver más"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!!item.key_points?.length && (
          <View style={styles.pointsBox}>
            {item.key_points.slice(0, 8).map((p, idx) => (
              <Text key={idx} style={styles.point}>
                • {p}
              </Text>
            ))}
          </View>
        )}

        {item.confidence_note ? (
          <Text style={styles.note}>
            ⚠️ {item.confidence_note}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, !item.image_url && styles.btnDisabled]}
            onPress={() => openImage(item.image_url)}
            disabled={!item.image_url}
          >
            <Text style={styles.btnText}>
              {item.image_url ? "Abrir imagen" : "Sin imagen"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Resúmenes IA</Text>
        <Text style={styles.subtitle}>{API_BASE.replace("http://", "")}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>Cargando resúmenes...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Aún no hay resúmenes almacenados.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB: Resumir con IA */}
      <TouchableOpacity
        onPress={() => router.push("/resumir-ia")}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Resumir con IA"
      >
        <Text style={styles.fabIcon}>🤖</Text>
        <Text style={styles.fabLabel}>Resumir con IA</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6", paddingHorizontal: 16, paddingTop: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#6b7280" },

  list: { paddingBottom: 120 },

  center: { marginTop: 32, alignItems: "center", paddingHorizontal: 16 },
  hint: { marginTop: 8, color: "#6b7280" },
  error: { color: "#ef4444", textAlign: "center", marginBottom: 12 },

  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
  },
  retryText: { color: "#111827", fontWeight: "600" },

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
  fileName: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  summary: { color: "#111827", fontSize: 14, lineHeight: 20 },
  link: { color: "#2563eb", marginTop: 6, fontWeight: "600" },

  pointsBox: { marginTop: 10, backgroundColor: "#f9fafb", borderRadius: 8, padding: 10 },
  point: { color: "#374151", fontSize: 13, marginBottom: 4 },

  note: { marginTop: 8, color: "#92400e", backgroundColor: "#fffbeb",
          paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, fontSize: 12 },

  actionsRow: { flexDirection: "row", marginTop: 12 },
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnDisabled: { backgroundColor: "#9ca3af" },
  btnText: { color: "#fff", fontWeight: "600" },

  // FAB “Resumir con IA”
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
    zIndex: 20,

    // Sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },

    // Elevación Android
    elevation: 6,
  },
  fabIcon: { fontSize: 20, color: "#fff", marginRight: 8 },
  fabLabel: { color: "#fff", fontWeight: "700" },
});
