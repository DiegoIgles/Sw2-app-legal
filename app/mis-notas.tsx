// app/mis-notas.tsx
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";
import { fetchMisNotas, type Nota } from "../services/notas.service";
import { getSocket } from "../services/realtime"; // si no existe, comenta este import

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function TipoBadge({ tipo }: { tipo?: string | null }) {
  if (!tipo) return null;
  const tone =
    tipo.toUpperCase() === "URGENTE"
      ? styles.badgeUrgente
      : tipo.toUpperCase() === "GENERAL"
      ? styles.badgeGeneral
      : styles.badgeNeutral;
  return (
    <View style={[styles.badge, tone]}>
      <Text style={styles.badgeText}>{tipo}</Text>
    </View>
  );
}

export default function MisNotasScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;               // tablet / desktop web
  const numCols = isWide ? 2 : 1;            // responsive grid
  const titleSize = isWide ? 24 : 22;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchMisNotas();
      setNotas(data);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED_401") {
        Alert.alert("Sesión expirada", "Vuelve a iniciar sesión.", [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
        return;
      }
      setError(e?.message ?? "No se pudo cargar las notas");
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

  // Auto-refresh cuando llega 'nota:creada' por socket
  useEffect(() => {
    const s = getSocket?.();
    if (!s) return;
    const handler = () => load();
    s.on("nota:creada", handler);
    return () => {
      s.off?.("nota:creada", handler);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }: { item: Nota }) => {
    const exp = item.expediente;
    return (
      <View style={[styles.card, isWide && styles.cardWide]}>
        <View style={styles.cardHeader}>
          <Text style={styles.expTitle} numberOfLines={1}>
            Exp #{exp.id_expediente} · {exp.titulo}
          </Text>
          <TipoBadge tipo={item.tipo ?? undefined} />
        </View>

        <Text
          style={styles.contenido}
          numberOfLines={isWide ? 6 : 4} // un poco más de líneas en pantallas anchas
        >
          {item.contenido}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            Registrada: {formatDateTime(item.fecha_registro)}
          </Text>
        </View>
        {/* ⛔ Se quitó el botón "Ver documentos" para cumplir el requerimiento */}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Navbar />
      <View style={styles.body}>
        <Text style={[styles.title, { fontSize: titleSize }]}>Mis notas</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.hint}>Cargando notas...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : notas.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.hint}>No tienes notas aún.</Text>
          </View>
        ) : (
          <FlatList
            data={notas}
            key={numCols} // fuerza relayout si cambia columnas
            numColumns={numCols}
            keyExtractor={(n) => String(n.id_nota)}
            renderItem={renderItem}
            columnWrapperStyle={numCols > 1 ? styles.rowWrap : undefined}
            contentContainerStyle={[
              styles.list,
              numCols > 1 && styles.listWide,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {/* 🟣 FAB: Ir a Mis Documentos */}
        <TouchableOpacity
          onPress={() => router.push("/mis-documentos")}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Ir a mis documentos"
        >
          <Text style={styles.fabIcon}>📂</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  body: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontWeight: "700", marginBottom: 12 },

  center: { marginTop: 24, alignItems: "center" },
  hint: { marginTop: 8, color: "#6b7280" },
  error: { color: "#ef4444", textAlign: "center", marginBottom: 12 },

  list: { paddingBottom: 24 },
  listWide: { paddingHorizontal: 4 },
  rowWrap: { justifyContent: "space-between" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    // margen lateral suave para móvil
    marginHorizontal: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    flex: 1,
  },
  cardWide: {
    // en 2 columnas damos margen alrededor para aire
    marginHorizontal: 6,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  expTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginRight: 8 },
  contenido: { fontSize: 14, color: "#1f2937", marginTop: 4 },

  metaRow: { flexDirection: "row", marginTop: 8 },
  meta: { color: "#6b7280", fontSize: 12 },

  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  badgeUrgente: { backgroundColor: "#DC2626" },
  badgeGeneral: { backgroundColor: "#2563EB" },
  badgeNeutral: { backgroundColor: "#6B7280" },

  // Retry
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
  },
  retryText: { color: "#111827", fontWeight: "600" },

  // FAB (botón flotante)
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
    // Sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    // Elevación Android
    elevation: 6,
  },
  fabIcon: { fontSize: 22, color: "#fff" },
});
