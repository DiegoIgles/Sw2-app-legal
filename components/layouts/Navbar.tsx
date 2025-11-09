import { router, usePathname, type Href } from "expo-router";
import React, { useState } from "react";
import {
  
  StatusBar,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export function Navbar() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 600;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links: { label: string; href: Href }[] = [
    { label: "Inicio", href: "/" },
    { label: "Inicia sesión", href: "/login" },
  ];

  const go = (href: Href) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Barra principal */}
      <View style={styles.navbar}>
        <Text style={styles.logo}>APP LEGAL</Text>

        {isSmallScreen ? (
          <TouchableOpacity
            onPress={() => setOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
          >
            <Text style={styles.hamburger}>☰</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.linksRow}>
            {links.map((link) => {
              const active = pathname === link.href;
              const viewStyle = active
                ? StyleSheet.compose(styles.linkItem, styles.linkItemActive)
                : styles.linkItem;
              const textStyle = active
                ? StyleSheet.compose(styles.linkText, styles.linkTextActive)
                : styles.linkText;

              return (
                <TouchableOpacity
                  key={link.href as string}
                  style={viewStyle}
                  onPress={() => go(link.href)}
                >
                  <Text style={textStyle}>{link.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 📱 Menú móvil */}
      {isSmallScreen && open && (
        <View style={styles.mobileMenu}>
          {links.map((link) => {
            const active = pathname === link.href;
            const viewStyle = active
              ? StyleSheet.compose(styles.mobileItem, styles.mobileItemActive)
              : styles.mobileItem;
            const textStyle = active
              ? StyleSheet.compose(styles.mobileLinkText, styles.linkTextActive)
              : styles.mobileLinkText;

            return (
              <TouchableOpacity
                key={link.href as string}
                onPress={() => go(link.href)}
                style={viewStyle}
              >
                <Text style={textStyle}>{link.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#111827",
  } as ViewStyle,

  navbar: {
    height: 56,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  } as ViewStyle,

  logo: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  } as TextStyle,

  linksRow: {
    flexDirection: "row",
  } as ViewStyle,

  linkItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  } as ViewStyle,

  linkItemActive: {
    backgroundColor: "#1f2937",
  } as ViewStyle,

  linkText: {
    color: "#e5e7eb", // ← texto blanco/gris claro
    fontSize: 14,
  } as TextStyle,

  linkTextActive: {
    fontWeight: "bold",
  } as TextStyle,

  hamburger: {
    color: "#fff",
    fontSize: 26,
  } as TextStyle,

  mobileMenu: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
  } as ViewStyle,

  mobileItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 14,
    minHeight: 48,
    justifyContent: "center",
  } as ViewStyle,

  mobileItemActive: {
    backgroundColor: "#1f2937",
  } as ViewStyle,

  mobileLinkText: {
    color: "#e5e7eb", // ← texto blanco/gris claro
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
});
