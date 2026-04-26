import React, { useEffect } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const { height: SH } = Dimensions.get("window");

type FaqItem = { q: string; a: string };

const faqData: FaqItem[] = [
  { q: "Bagaimana cara menambah transaksi?", a: "Tap tombol \"+\" di halaman utama, lalu pilih Pemasukan atau Pengeluaran. Isi detail transaksi dan tap Simpan." },
  { q: "Apakah data saya aman?", a: "Ya, semua data tersimpan secara lokal di perangkat kamu dan tidak dikirim ke server manapun." },
  { q: "Bagaimana cara membuat budget?", a: "Buka menu Budget Plan dari halaman utama, lalu tentukan limit anggaran untuk setiap kategori." },
  { q: "Bisakah saya export data?", a: "Ya! Buka Akun → Export Data, pilih format file (CSV/PDF/Excel) dan rentang waktu yang diinginkan." },
  { q: "Bagaimana cara menghapus transaksi?", a: "Geser transaksi ke kiri di halaman Riwayat, lalu tap tombol hapus yang muncul." },
  { q: "Apakah bisa menambah kategori baru?", a: "Tentu! Buka menu Kategori dan tap tombol \"Tambah\" untuk membuat kategori pemasukan atau pengeluaran baru." },
];

function FaqCard({ item, index }: { item: FaqItem; index: number }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Pressable style={[s.faqCard, expanded && s.faqCardExpanded]} onPress={() => setExpanded(!expanded)}>
      <View style={s.faqHeader}>
        <View style={s.faqNumBadge}>
          <Text style={s.faqNum}>{index + 1}</Text>
        </View>
        <Text style={s.faqQuestion}>{item.q}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
      </View>
      {expanded && (
        <View style={s.faqBody}>
          <Text style={s.faqAnswer}>{item.a}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HelpFaqModal({ visible, onClose }: Props) {
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

          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="help-circle-outline" size={24} color="#64748B" />
              </View>
              <View>
                <Text style={s.title}>Bantuan & FAQ</Text>
                <Text style={s.subtitle}>Pertanyaan yang sering ditanyakan</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.scrollArea}>
            {faqData.map((item, idx) => (
              <FaqCard key={idx} item={item} index={idx} />
            ))}

            <View style={s.contactCard}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#12406A" />
              <View style={s.contactText}>
                <Text style={s.contactTitle}>Masih butuh bantuan?</Text>
                <Text style={s.contactDesc}>Hubungi support@dompetkuapp.com</Text>
              </View>
            </View>
          </ScrollView>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(100,116,139,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  scrollArea: { maxHeight: SH * 0.6 },

  faqCard: { marginBottom: 10, borderRadius: 18, backgroundColor: "#F8FAFC", padding: 16, borderWidth: 1, borderColor: "transparent" },
  faqCardExpanded: { backgroundColor: "rgba(18,64,106,0.04)", borderColor: "rgba(18,64,106,0.1)" },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  faqNumBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(18,64,106,0.1)", alignItems: "center", justifyContent: "center" },
  faqNum: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#12406A" },
  faqQuestion: { flex: 1, fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  faqBody: { marginTop: 12, marginLeft: 40 },
  faqAnswer: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", lineHeight: 21 },

  contactCard: {
    marginTop: 10, flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 18, backgroundColor: "rgba(18,64,106,0.06)",
  },
  contactText: { flex: 1 },
  contactTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  contactDesc: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 2 },
});
