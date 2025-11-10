// app/plazos.tsx
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";
import {
    eliminarPlazo,
    fetchMisExpedientes,
    fetchPlazosByExpediente,
    marcarPlazoCumplido,
    type ExpedienteMini,
    type Plazo,
} from "../services/plazos.service";

// ---- helpers fecha ----
const MS_DAY = 24 * 60 * 60 * 1000;
function parseServerDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00`);
  return new Date(d);
}
function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
function daysUntil(due: Date): number {
  const diff = endOfDay(due).getTime() - Date.now();
  return Math.ceil(diff / MS_DAY);
}
function fmt(d: string) {
  try {
    return parseServerDate(d).toLocaleDateString("es-BO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

type Filtro = "pendientes" | "vencidos" | "cumplidos" | "todos";

export default function PlazosScreen() {
  // selector expedientes
  const [expedientes, setExpedientes] = useState<ExpedienteMini[]>([]);
  const [loadingExps, setLoadingExps] = useState(true);
  const [errorExps, setErrorExps] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<ExpedienteMini | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // plazos
  const [items, setItems] = useState<Plazo[]>([]);
  const [loadingPlazos, setLoadingPlazos] = useState(false);
  const [errorPlazos, setErrorPlazos] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const abortRef = useRef<AbortController | null>(null);

  // 👉 handler FAB: ir a Mis documentos
  const handleGoDocs = () => router.push("/mis-documentos");

  const loadExpedientes = useCallback(async () => {
    try {
      setLoadingExps(true);
      setErrorExps(null);
      const list = await fetchMisExpedientes();
      setExpedientes(list);
      if (list.length === 1) setSelectedExp(list[0]); // auto-selección si hay uno
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED_401") {
        Alert.alert("Sesión", "Debes iniciar sesión nuevamente.");
        router.replace("/login");
        return;
      }
      setErrorExps(e?.message ?? "No se pudieron cargar tus expedientes");
    } finally {
      setLoadingExps(false);
    }
  }, []);

  const loadPlazos = useCallback(async (id_expediente: number) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      setLoadingPlazos(true);
      setErrorPlazos(null);
      const data = await fetchPlazosByExpediente(id_expediente);
      data.sort(
        (a, b) =>
          parseServerDate(a.fecha_vencimiento).getTime() -
          parseServerDate(b.fecha_vencimiento).getTime()
      );
      setItems(data);
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED_401") {
        Alert.alert("Sesión", "Debes iniciar sesión nuevamente.");
        router.replace("/login");
        return;
      }
      setErrorPlazos(e?.message ?? "Error al cargar plazos");
    } finally {
      setLoadingPlazos(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExpedientes();
  }, [loadExpedientes]);

  useEffect(() => {
    if (selectedExp?.id_expediente) {
      loadPlazos(selectedExp.id_expediente);
    } else {
      setItems([]);
    }
  }, [selectedExp, loadPlazos]);

  const onRefresh = useCallback(() => {
    if (!selectedExp) return;
    setRefreshing(true);
    loadPlazos(selectedExp.id_expediente);
  }, [selectedExp, loadPlazos]);

  const dataFiltrada = useMemo(() => {
    const now = new Date();
    return items.filter((p) => {
      const due = parseServerDate(p.fecha_vencimiento);
      const vencido = !p.cumplido && endOfDay(due) < now;
      if (filtro === "todos") return true;
      if (filtro === "cumplidos") return p.cumplido;
      if (filtro === "vencidos") return vencido;
      return !p.cumplido && !vencido;
    });
  }, [items, filtro]);

  const onMarcar = async (plazo: Plazo) => {
    if (plazo.cumplido) return;
    try {
      const actualizado = await marcarPlazoCumplido(plazo.id_plazo);
      setItems((prev) => prev.map((p) => (p.id_plazo === plazo.id_plazo ? actualizado : p)));
    } catch (e: any) {
      const msg =
        e?.message === "UNAUTHORIZED_401"
          ? "No autorizado. Inicia sesión."
          : e?.message ?? "No se pudo marcar como cumplido";
      Alert.alert("Error", msg);
    }
  };

  const onEliminar = (plazo: Plazo) => {
    Alert.alert(
      "Eliminar plazo",
      `¿Deseas eliminar "${plazo.descripcion}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarPlazo(plazo.id_plazo);
              setItems((prev) => prev.filter((p) => p.id_plazo !== plazo.id_plazo));
            } catch (e: any) {
              const msg =
                e?.message === "UNAUTHORIZED_401"
                  ? "No autorizado. Inicia sesión."
                  : e?.message ?? "No se pudo eliminar";
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  // filtrar expedientes en modal
  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return expedientes;
    return expedientes.filter((e) =>
      `${e.id_expediente} ${e.titulo}`.toLowerCase().includes(q)
    );
  }, [expedientes, busqueda]);

  const renderExpItem = ({ item }: { item: ExpedienteMini }) => {
    const active = selectedExp?.id_expediente === item.id_expediente;
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedExp(item);
          setPickerOpen(false);
        }}
        style={[styles.optionItem, active && styles.optionItemActive]}
      >
        <Text style={styles.optionTitle}>#{item.id_expediente} — {item.titulo}</Text>
        <Text style={styles.optionSub}>{item.estado}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Navbar />
      <View style={styles.container}>
        {/* Selector de expediente */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expediente</Text>

          {loadingExps ? (
            <View style={styles.inlineRow}>
              <ActivityIndicator />
              <Text style={[styles.hint, { marginLeft: 8 }]}>Cargando expedientes...</Text>
            </View>
          ) : errorExps ? (
            <View>
              <Text style={styles.error}>{errorExps}</Text>
              <TouchableOpacity style={styles.btnDanger} onPress={loadExpedientes}>
                <Text style={styles.btnDanger}>Reintentar</Text>
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

        {/* Lista de plazos */}
        {selectedExp ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Plazos de #{selectedExp.id_expediente}</Text>
              <View style={styles.filters}>
                {(["pendientes", "vencidos", "cumplidos", "todos"] as Filtro[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFiltro(f)}
                    style={[styles.chip, filtro === f && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, filtro === f && styles.chipTextActive]}>
                      {f[0].toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loadingPlazos ? (
              <View style={styles.inlineRow}>
                <ActivityIndicator />
                <Text style={[styles.hint, { marginLeft: 8 }]}>Cargando plazos…</Text>
              </View>
            ) : errorPlazos ? (
              <View>
                <Text style={styles.error}>{errorPlazos}</Text>
                <TouchableOpacity style={styles.btnDanger} onPress={() => loadPlazos(selectedExp.id_expediente)}>
                  <Text style={styles.btnDanger}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={dataFiltrada}
                keyExtractor={(it) => String(it.id_plazo)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={dataFiltrada.length === 0 ? styles.emptyContainer : undefined}
                ListEmptyComponent={<Text style={styles.hint}>No hay plazos para mostrar.</Text>}
                renderItem={({ item }) => (
                  <PlazoItem item={item} onMarcar={onMarcar} onEliminar={onEliminar} />
                )}
              />
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>Selecciona un expediente para ver sus plazos.</Text>
          </View>
        )}
      </View>

      {/* FAB → Mis documentos */}
      <TouchableOpacity
        onPress={handleGoDocs}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Ir a mis documentos"
      >
        <Text style={styles.fabIcon}>📂</Text>
      </TouchableOpacity>

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

function PlazoItem({
  item,
  onMarcar,
  onEliminar,
}: {
  item: Plazo;
  onMarcar: (p: Plazo) => void;
  onEliminar: (p: Plazo) => void;
}) {
  const due = parseServerDate(item.fecha_vencimiento);
  const left = daysUntil(due);
  const vencido = !item.cumplido && left < 0;

  let pillText = "";
  let pillStyle = styles.pillNeutral;
  if (item.cumplido) {
    pillText = "Cumplido";
    pillStyle = styles.pillOk;
  } else if (vencido) {
    pillText = "Vencido";
    pillStyle = styles.pillDanger;
  } else {
    pillText = left === 0 ? "Vence hoy" : `Faltan ${left} días`;
    pillStyle = styles.pillWarn;
  }

  return (
    <View style={styles.plazoCard}>
      <View style={styles.plazoHeader}>
        <Text style={styles.plazoTitle}>{item.descripcion}</Text>
        <View style={[styles.pill, pillStyle]}>
          <Text style={styles.pillText}>{pillText}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Vence:</Text>
        <Text style={styles.value}>{fmt(item.fecha_vencimiento)}</Text>
      </View>

      {item.cumplido && item.fecha_cumplimiento && (
        <View style={styles.row}>
          <Text style={styles.label}>Cumplido:</Text>
          <Text style={styles.value}>{fmt(item.fecha_cumplimiento)}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, item.cumplido && styles.btnDisabled]}
          onPress={() => onMarcar(item)}
          disabled={item.cumplido}
        >
          <Text style={styles.btnText}>{item.cumplido ? "Ya cumplido" : "Marcar cumplido"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => onEliminar(item)}>
          <Text style={styles.btnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- estilos ----
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  container: { flex: 1, padding: 16, gap: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  hint: { color: "#6b7280" },
  error: { color: "#ef4444", marginBottom: 8 },
  inlineRow: { flexDirection: "row", alignItems: "center" },

  // selector
  selectInput: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  selectText: { fontSize: 16, color: "#111827" },
  selectPlaceholder: { fontSize: 16, color: "#9CA3AF" },
  selectChevron: { fontSize: 16, color: "#6B7280" },

  // header lista
  headerRow: { gap: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 9999, backgroundColor: "#f9fafb",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#111827", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  // lista vacía
  emptyContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center" },

  // item plazo
  plazoCard: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1, borderColor: "#E5E7EB",
    gap: 6,
  },
  plazoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plazoTitle: { color: "#111827", fontSize: 16, fontWeight: "700", flex: 1, paddingRight: 12 },

  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  label: { color: "#6b7280" },
  value: { color: "#111827", fontWeight: "600" },

  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  btnDanger: { backgroundColor: "#7f1d1d" },

  // pill
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  pillOk: { backgroundColor: "#166534" },
  pillWarn: { backgroundColor: "#4b5563" },
  pillDanger: { backgroundColor: "#991b1b" },
  pillNeutral: { backgroundColor: "#374151" },

  // FAB hacia Mis documentos
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
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 22,
    color: "#fff",
  },

  // modal
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  modalCard: { backgroundColor: "#fff", width: "100%", maxWidth: 520, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  searchInput: {
    borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  optionItemActive: { backgroundColor: "#F3F4F6" },
  optionTitle: { fontSize: 15, color: "#111827", fontWeight: "600" },
  optionSub: { fontSize: 12, color: "#6B7280" },
  modalCloseBtn: {
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: "#111827",
    alignItems: "center", alignSelf: "flex-end",
  },
  modalCloseText: { color: "#111827", fontWeight: "600" },
});
