import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void> | void;
  userLabel: string;
  stats: {
    transactionCount: number;
    categoryCount: number;
    budgetCount: number;
  };
};

const { height: SH } = Dimensions.get("window");

export default function DeleteAccountModal({ visible, onClose, onDelete, userLabel, stats }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const insets = useSafeAreaInsets();
  const slide = React.useRef(new Animated.Value(SH)).current;
  const safeBottomPadding = 28 + Math.max(insets.bottom, 12);
  const sheetMaxHeight = SH - insets.top - Math.max(insets.bottom, 12) - 16;

  useEffect(() => {
    if (visible) {
      setConfirmText("");
      setIsDeleting(false);
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [slide, visible]);

  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const handleDelete = () => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Akun ${userLabel} beserta seluruh datanya akan dihapus permanen.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Permanen",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete();
              Alert.alert("Akun Dihapus", "Akun kamu telah berhasil dihapus.");
              handleClose();
            } catch (err: any) {
              Alert.alert("Gagal", err?.message || "Tidak dapat menghapus akun.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const isConfirmed = confirmText.toLowerCase() === "hapus akun";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            s.sheet,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: safeBottomPadding,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={s.handle} />

          <View style={s.warningCircle}>
            <MaterialCommunityIcons name="alert-outline" size={36} color="#E05252" />
          </View>

          <Text style={s.title}>Hapus Akun</Text>
          <Text style={s.subtitle}>
            Akun <Text style={s.emphasis}>{userLabel}</Text> dan semua datanya akan dihapus permanen.
          </Text>

          <View style={s.dangerCard}>
            <Text style={s.dangerTitle}>Data yang akan dihapus:</Text>
            {[
              `${stats.transactionCount} transaksi`,
              `${stats.categoryCount} kategori aktif`,
              `${stats.budgetCount} data budget`,
              "Profil dan pengaturan akun",
            ].map((item, index) => (
              <View key={index} style={s.dangerItem}>
                <Feather name="x-circle" size={14} color="#E05252" />
                <Text style={s.dangerText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={s.confirmField}>
            <Text style={s.confirmLabel}>
              Ketik <Text style={s.confirmHighlight}>hapus akun</Text> untuk konfirmasi:
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="hapus akun"
              placeholderTextColor="#D9A3A3"
              style={s.confirmInput}
              autoCapitalize="none"
              editable={!isDeleting}
            />
          </View>

          <View style={s.btnRow}>
            <Pressable style={[s.cancelBtn, { flex: 1 }]} onPress={handleClose} disabled={isDeleting}>
              <Text style={s.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              style={[s.deleteBtn, { flex: 1 }, (!isConfirmed || isDeleting) && { opacity: 0.4 }]}
              onPress={handleDelete}
              disabled={!isConfirmed || isDeleting}
            >
              <Feather name="trash-2" size={16} color="#FFF" />
              <Text style={s.deleteText}>{isDeleting ? "Menghapus..." : "Hapus Akun"}</Text>
            </Pressable>
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
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 22 },
  warningCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224,82,82,0.10)",
    borderWidth: 2,
    borderColor: "rgba(224,82,82,0.15)",
  },
  title: { marginTop: 18, fontSize: 22, fontFamily: "Poppins_700Bold", color: "#E05252" },
  subtitle: { marginTop: 8, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#64748B", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  emphasis: { fontFamily: "Poppins_700Bold", color: "#E05252" },
  dangerCard: {
    width: "100%",
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(224,82,82,0.06)",
    borderWidth: 1,
    borderColor: "rgba(224,82,82,0.12)",
  },
  dangerTitle: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#E05252", marginBottom: 10 },
  dangerItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  dangerText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B" },
  confirmField: { width: "100%", marginTop: 20 },
  confirmLabel: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginBottom: 8 },
  confirmHighlight: { fontFamily: "Poppins_700Bold", color: "#E05252" },
  confirmInput: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "rgba(224,82,82,0.25)",
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#E05252",
    textAlign: "center",
  },
  btnRow: { width: "100%", flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#64748B" },
  deleteBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#E05252",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
