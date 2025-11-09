import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Navbar } from "../components/layouts/Navbar";

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 600;

  return (
    <View style={styles.screen}>
      {/* NAVBAR ARRIBA */}
      <Navbar />

      {/* Layout contenido + sidebar */}
      <View
        style={[
          styles.root,
          isSmallScreen && styles.rootSmall, // en móvil: columna
        ]}
      >
        

        <ScrollView
          contentContainerStyle={[
            styles.container,
            isSmallScreen && styles.containerSmall,
          ]}
        >
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            Esta es la pantalla principal de tu APP LEGAL.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  root: {
    flex: 1,
    flexDirection: "row",
  },
  rootSmall: {
    flexDirection: "column",
  },
  container: {
    flexGrow: 1,
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: "flex-start",
  },
  containerSmall: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
});
