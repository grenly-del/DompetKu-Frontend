import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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
  profile: {
    username: string;
    email: string;
  } | null;
  stats: {
    transactionCount: number;
    categoryCount: number;
    budgetCount: number;
  };
};

const { height: SH } = Dimensions.get("window");

type ExportFormat = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  ext: string;
  desc: string;
};

type DateRange = {
  id: string;
  label: string;
  desc: string;
};

const formats: ExportFormat[] = [
  { id: "csv", label: "CSV", icon: "file-delimited-outline", ext: ".csv", desc: "Format spreadsheet universal" },
  { id: "pdf", label: "PDF", icon: "file-pdf-box", ext: ".pdf", desc: "Laporan siap cetak" },
  { id: "xlsx", label: "Excel", icon: "microsoft-excel", ext: ".xlsx", desc: "Kompatibel dengan Excel" },
];

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function buildDateRanges(): DateRange[] {
  const now = new Date();
  const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const quarterStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const quarterLabel = `${monthNames[quarterStart.getMonth()]} - ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const yearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const yearLabel = `${monthNames[yearStart.getMonth()]} ${yearStart.getFullYear()} - ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return [
    { id: "month", label: "Bulan Ini", desc: monthLabel },
    { id: "quarter", label: "3 Bulan", desc: quarterLabel },
    { id: "year", label: "1 Tahun", desc: yearLabel },
    { id: "all", label: "Semua Data", desc: "Seluruh riwayat akun aktif" },
  ];
}

export default function ExportDataModal({ visible, onClose, profile, stats }: Props) {
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [selectedRange, setSelectedRange] = useState("month");
  const [exporting, setExporting] = useState(false);
  const slide = React.useRef(new Animated.Value(SH)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const dateRanges = useMemo(() => buildDateRanges(), []);
  const hasExportableData = stats.transactionCount > 0;

  useEffect(() => {
    if (visible) {
      setExporting(false);
      setSelectedFormat("csv");
      setSelectedRange("month");
      progressAnim.setValue(0);
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [progressAnim, slide, visible]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const handleExport = () => {
    if (!hasExportableData) {
      Alert.alert("Belum ada data", "Akun ini belum memiliki transaksi untuk diekspor.");
      return;
    }

    setExporting(true);
    Animated.timing(progressAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start(() => {
      setExporting(false);
      const format = formats.find((item) => item.id === selectedFormat)!;
      const filePrefix = (profile?.username || "dompetku")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const stamp = new Date().toISOString().slice(0, 10);

      Alert.alert(
        "Berhasil",
        `Data akun ${profile?.email || "aktif"} siap diekspor sebagai ${filePrefix || "dompetku"}-${selectedRange}-${stamp}${format.ext}`
      );
      handleClose();
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
                <MaterialCommunityIcons name="cloud-download-outline" size={24} color="#0C8C76" />
              </View>
              <View>
                <Text style={s.title}>Export Data</Text>
                <Text style={s.subtitle}>Unduh laporan keuangan akun aktif</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>{profile?.email || "Akun aktif"}</Text>
            <Text style={s.summaryText}>
              {stats.transactionCount} transaksi • {stats.categoryCount} kategori • {stats.budgetCount} budget
            </Text>
          </View>

          <Text style={s.sectionLabel}>FORMAT FILE</Text>
          <View style={s.formatRow}>
            {formats.map((format) => {
              const active = selectedFormat === format.id;
              return (
                <Pressable
                  key={format.id}
                  style={[s.formatCard, active && s.formatCardActive]}
                  onPress={() => setSelectedFormat(format.id)}
                >
                  <MaterialCommunityIcons name={format.icon} size={28} color={active ? "#0C8C76" : "#64748B"} />
                  <Text style={[s.formatLabel, active && s.formatLabelActive]}>{format.label}</Text>
                  <Text style={s.formatDesc}>{format.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[s.sectionLabel, { marginTop: 20 }]}>RENTANG WAKTU</Text>
          {dateRanges.map((range) => {
            const active = selectedRange === range.id;
            return (
              <Pressable
                key={range.id}
                style={[s.rangeItem, active && s.rangeItemActive]}
                onPress={() => setSelectedRange(range.id)}
              >
                <View style={[s.radioOuter, active && s.radioOuterActive]}>
                  {active && <View style={s.radioInner} />}
                </View>
                <View style={s.rangeText}>
                  <Text style={[s.rangeLabel, active && s.rangeLabelActive]}>{range.label}</Text>
                  <Text style={s.rangeDesc}>{range.desc}</Text>
                </View>
              </Pressable>
            );
          })}

          {exporting ? (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <Animated.View
                  style={[
                    s.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={s.progressText}>Menyiapkan export untuk akun aktif...</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [s.exportBtn, pressed && { opacity: 0.9 }, !hasExportableData && { opacity: 0.5 }]}
              onPress={handleExport}
              disabled={!hasExportableData}
            >
              <LinearGradient colors={["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.exportGrad}>
                <Feather name="download" size={18} color="#FFF" />
                <Text style={s.exportText}>Export Sekarang</Text>
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: {
    maxHeight: SH * 0.88,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(12,140,118,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  summaryCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(12,140,118,0.08)",
    borderWidth: 1,
    borderColor: "rgba(12,140,118,0.14)",
  },
  summaryTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  summaryText: { marginTop: 4, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#64748B" },

  sectionLabel: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 12 },
  formatRow: { flexDirection: "row", gap: 10 },
  formatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "transparent",
  },
  formatCardActive: { borderColor: "#0C8C76", backgroundColor: "rgba(12,140,118,0.06)" },
  formatLabel: { marginTop: 8, fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  formatLabelActive: { color: "#0C8C76" },
  formatDesc: { marginTop: 2, fontSize: 10, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center" },

  rangeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  rangeItemActive: { backgroundColor: "rgba(12,140,118,0.06)", borderWidth: 1, borderColor: "rgba(12,140,118,0.2)" },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#D9E2EC", alignItems: "center", justifyContent: "center" },
  radioOuterActive: { borderColor: "#0C8C76" },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#0C8C76" },
  rangeText: { flex: 1 },
  rangeLabel: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  rangeLabelActive: { color: "#0C8C76" },
  rangeDesc: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },

  progressWrap: { marginTop: 20, alignItems: "center" },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "#E2E8F0", overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: "#0C8C76" },
  progressText: { marginTop: 10, fontSize: 13, fontFamily: "Poppins_500Medium", color: "#64748B" },

  exportBtn: { marginTop: 20, borderRadius: 18, overflow: "hidden" },
  exportGrad: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  exportText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
