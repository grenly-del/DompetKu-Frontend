import React, { useEffect } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const { height: SH } = Dimensions.get("window");

export default function AboutAppModal({ visible, onClose }: Props) {
  const slide = React.useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={s.handle} />

          {/* App icon */}
          <LinearGradient
            colors={["#0D2349", "#12406A", "#0C8C76"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.appIcon}
          >
            <MaterialCommunityIcons name="wallet-outline" size={36} color="#FFF" />
          </LinearGradient>

          <Text style={s.appName}>DompetKu</Text>
          <Text style={s.version}>Versi 1.0.0</Text>
          <Text style={s.tagline}>Budgeting lebih mudah, hidup lebih teratur</Text>

          {/* Info cards */}
          <View style={s.infoGrid}>
            {[
              { icon: "code-tags" as const, label: "React Native + Expo", desc: "Framework" },
              { icon: "cellphone" as const, label: "Android & iOS", desc: "Platform" },
              { icon: "account-group-outline" as const, label: "Tim Pengembang", desc: "MyBudget Team" },
              { icon: "update" as const, label: "April 2026", desc: "Terakhir Update" },
            ].map((item, idx) => (
              <View key={idx} style={s.infoCard}>
                <MaterialCommunityIcons name={item.icon} size={20} color="#12406A" />
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>

          {/* Links */}
          <View style={s.linkSection}>
            {[
              { icon: "shield-check-outline" as const, label: "Kebijakan Privasi", color: "#0C8C76" },
              { icon: "file-document-outline" as const, label: "Syarat & Ketentuan", color: "#12406A" },
              { icon: "star-outline" as const, label: "Beri Rating", color: "#F2C94C" },
            ].map((item, idx) => (
              <Pressable key={idx} style={s.linkItem} onPress={() => {}}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                <Text style={s.linkLabel}>{item.label}</Text>
                <Feather name="external-link" size={14} color="#94A3B8" />
              </Pressable>
            ))}
          </View>

          <Text style={s.copyright}>© 2026 DompetKu. All rights reserved.</Text>
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
    paddingHorizontal: 22, paddingBottom: 28, alignItems: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 24 },

  appIcon: {
    width: 80, height: 80, borderRadius: 26, alignItems: "center", justifyContent: "center",
    shadowColor: "#0D2349", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  appName: { marginTop: 16, fontSize: 26, fontFamily: "Poppins_700Bold", color: "#102A43" },
  version: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#0C8C76", marginTop: 2 },
  tagline: { marginTop: 6, fontSize: 13, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center" },

  infoGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  infoCard: {
    width: "47.5%", padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  infoLabel: { marginTop: 8, fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  infoDesc: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginTop: 2 },

  linkSection: { width: "100%", marginTop: 22 },
  linkItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  linkLabel: { flex: 1, fontSize: 14, fontFamily: "Poppins_500Medium", color: "#102A43" },

  copyright: { marginTop: 20, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#CBD5E0" },
});
