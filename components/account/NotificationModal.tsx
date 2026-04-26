import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  defaultNotificationSettings,
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "../../services/notification.service";

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  onSettingsChange?: (settings: NotificationSettings) => void;
};

const { height: SH } = Dimensions.get("window");

type NotifSetting = {
  id: keyof NotificationSettings;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  desc: string;
  color: string;
  bgColor: string;
};

const settings: NotifSetting[] = [
  { id: "daily", icon: "calendar-check-outline", label: "Pengingat Harian", desc: "Catat pengeluaran setiap hari", color: "#0C8C76", bgColor: "rgba(12,140,118,0.12)" },
  { id: "budget", icon: "alert-circle-outline", label: "Peringatan Budget", desc: "Notifikasi saat budget hampir habis", color: "#E05252", bgColor: "rgba(224,82,82,0.10)" },
  { id: "weekly", icon: "chart-bar", label: "Laporan Mingguan", desc: "Ringkasan pengeluaran minggu ini", color: "#12406A", bgColor: "rgba(18,64,106,0.12)" },
  { id: "tips", icon: "lightbulb-outline", label: "Tips Keuangan", desc: "Saran hemat dan investasi", color: "#F2C94C", bgColor: "rgba(242,201,76,0.14)" },
  { id: "promo", icon: "gift-outline", label: "Promo & Penawaran", desc: "Info penawaran khusus", color: "#3D52A0", bgColor: "rgba(61,82,160,0.12)" },
];

export default function NotificationModal({ visible, onClose, userId, onSettingsChange }: Props) {
  const [toggles, setToggles] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(false);
  const slide = React.useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      let active = true;
      setIsLoading(true);
      loadNotificationSettings(userId)
        .then((settings) => {
          if (active) {
            setToggles(settings);
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });

      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();

      return () => {
        active = false;
      };
    } else {
      slide.setValue(SH);
    }
  }, [userId, visible, slide]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const toggle = (id: keyof NotificationSettings) => {
    setToggles((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      void saveNotificationSettings(userId, next);
      onSettingsChange?.(next);
      return next;
    });
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
                <MaterialCommunityIcons name="bell-outline" size={24} color="#0C8C76" />
              </View>
              <View>
                <Text style={s.title}>Notifikasi</Text>
                <Text style={s.subtitle}>Atur pengingat dan notifikasi</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          {isLoading ? (
            <Text style={s.loadingText}>Memuat pengaturan...</Text>
          ) : (
            settings.map((item, idx) => (
            <View key={item.id}>
              <View style={s.settingRow}>
                <View style={[s.settingIcon, { backgroundColor: item.bgColor }]}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={s.settingText}>
                  <Text style={s.settingLabel}>{item.label}</Text>
                  <Text style={s.settingDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={toggles[item.id]}
                  onValueChange={() => toggle(item.id)}
                  trackColor={{ false: "#D9E2EC", true: "rgba(12,140,118,0.35)" }}
                  thumbColor={toggles[item.id] ? "#0C8C76" : "#F1F5F9"}
                />
              </View>
              {idx < settings.length - 1 && <View style={s.divider} />}
            </View>
            ))
          )}

          <View style={s.infoCard}>
            <Feather name="info" size={16} color="#12406A" />
            <Text style={s.infoText}>Notifikasi akan dikirim sesuai pengaturan yang kamu pilih.</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: {
    maxHeight: SH * 0.85, backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingBottom: 28,
    shadowColor: "#0F172A", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(12,140,118,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  settingRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  settingIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  settingDesc: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 58 },
  loadingText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#64748B", paddingVertical: 18, textAlign: "center" },

  infoCard: {
    marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 16, backgroundColor: "rgba(18,64,106,0.06)",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#64748B" },
});
