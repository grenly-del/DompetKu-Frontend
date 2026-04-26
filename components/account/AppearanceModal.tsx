import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelectTheme: (theme: string) => void;
};

const { height: SH } = Dimensions.get("window");

type ThemeOption = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  colors: string[];
  desc: string;
};

const themes: ThemeOption[] = [
  { id: "light", label: "Terang", icon: "white-balance-sunny", colors: ["#EEF3F8", "#FFF"], desc: "Tampilan cerah dan bersih" },
  { id: "dark", label: "Gelap", icon: "moon-waning-crescent", colors: ["#0D2349", "#1A2744"], desc: "Nyaman untuk mata di malam hari" },
  { id: "ocean", label: "Lautan", icon: "waves", colors: ["#12406A", "#0C8C76"], desc: "Gradasi biru hijau yang menenangkan" },
  { id: "sunset", label: "Senja", icon: "weather-sunset", colors: ["#E05252", "#F2C94C"], desc: "Warna hangat senja" },
];

type ColorOption = { id: string; color: string; label: string };
const accentColors: ColorOption[] = [
  { id: "green", color: "#0C8C76", label: "Hijau" },
  { id: "blue", color: "#12406A", label: "Biru" },
  { id: "red", color: "#E05252", label: "Merah" },
  { id: "purple", color: "#3D52A0", label: "Ungu" },
  { id: "gold", color: "#D4A03C", label: "Emas" },
  { id: "teal", color: "#0891B2", label: "Tosca" },
];

export default function AppearanceModal({ visible, onClose, currentTheme, onSelectTheme }: Props) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedAccent, setSelectedAccent] = useState("green");
  const slide = React.useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      setSelectedTheme(currentTheme);
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [visible, currentTheme]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const handleApply = () => {
    onSelectTheme(selectedTheme);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={s.handle} />

          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="palette-outline" size={24} color="#3D52A0" />
              </View>
              <View>
                <Text style={s.title}>Tampilan</Text>
                <Text style={s.subtitle}>Personalisasi tema aplikasi</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          {/* Theme options */}
          <Text style={s.sectionLabel}>TEMA</Text>
          <View style={s.themeGrid}>
            {themes.map((t) => {
              const active = selectedTheme === t.id;
              return (
                <Pressable key={t.id} style={[s.themeCard, active && s.themeCardActive]} onPress={() => setSelectedTheme(t.id)}>
                  <View style={[s.themePreview, { backgroundColor: t.colors[0] }]}>
                    <View style={[s.themePreviewInner, { backgroundColor: t.colors[1] }]} />
                    {active && (
                      <View style={s.checkBadge}>
                        <Feather name="check" size={12} color="#FFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[s.themeName, active && s.themeNameActive]}>{t.label}</Text>
                  <Text style={s.themeDesc}>{t.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Accent colors */}
          <Text style={[s.sectionLabel, { marginTop: 22 }]}>WARNA AKSEN</Text>
          <View style={s.colorRow}>
            {accentColors.map((c) => {
              const active = selectedAccent === c.id;
              return (
                <Pressable key={c.id} style={s.colorItem} onPress={() => setSelectedAccent(c.id)}>
                  <View style={[s.colorCircle, { backgroundColor: c.color }, active && s.colorCircleActive]}>
                    {active && <Feather name="check" size={16} color="#FFF" />}
                  </View>
                  <Text style={[s.colorLabel, active && { color: c.color }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={({ pressed }) => [s.applyBtn, pressed && { opacity: 0.9 }]} onPress={handleApply}>
            <View style={s.applyInner}>
              <Feather name="check" size={18} color="#FFF" />
              <Text style={s.applyText}>Terapkan</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: {
    maxHeight: SH * 0.88, backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingBottom: 28,
    shadowColor: "#0F172A", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(61,82,160,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  sectionLabel: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 12 },

  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  themeCard: {
    width: "47%", padding: 12, borderRadius: 20, backgroundColor: "#F8FAFC",
    borderWidth: 2, borderColor: "transparent",
  },
  themeCardActive: { borderColor: "#0C8C76", backgroundColor: "rgba(12,140,118,0.06)" },
  themePreview: { height: 56, borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  themePreviewInner: { position: "absolute", bottom: 0, right: 0, width: "60%", height: "60%", borderTopLeftRadius: 10 },
  checkBadge: {
    position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#0C8C76", alignItems: "center", justifyContent: "center",
  },
  themeName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  themeNameActive: { color: "#0C8C76" },
  themeDesc: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginTop: 2 },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  colorItem: { alignItems: "center", gap: 6 },
  colorCircle: {
    width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center",
  },
  colorCircleActive: { borderWidth: 3, borderColor: "rgba(255,255,255,0.8)", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  colorLabel: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#64748B" },

  applyBtn: { marginTop: 24, borderRadius: 18, overflow: "hidden", backgroundColor: "#0C8C76" },
  applyInner: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  applyText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
