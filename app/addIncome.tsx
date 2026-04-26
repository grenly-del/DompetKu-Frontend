import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import AddCategoryModal from "../components/categories/AddCategoryModal";
import { categoryService, Category } from "../services/category.service";
import { pickCategoryIcon } from "../services/category-presets";
import { transactionService } from "../services/transaction.service";

// Income categories now loaded from API

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function formatDate(d: Date): string {
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── DatePickerModal ────────────────────────────────────────────
function DatePickerModal({
  visible,
  currentDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth());
  const [day, setDay] = useState(currentDate.getDate());

  useEffect(() => {
    if (visible) {
      setYear(currentDate.getFullYear());
      setMonth(currentDate.getMonth());
      setDay(currentDate.getDate());
    }
  }, [visible, currentDate]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setDay(1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setDay(1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dpStyles.overlay}>
        <Pressable style={dpStyles.backdrop} onPress={onClose} />
        <View style={dpStyles.card}>
          {/* Month navigation */}
          <View style={dpStyles.navRow}>
            <Pressable onPress={prevMonth} style={dpStyles.navBtn}>
              <Feather name="chevron-left" size={20} color="#0C8C76" />
            </Pressable>
            <Text style={dpStyles.monthLabel}>
              {monthNames[month]} {year}
            </Text>
            <Pressable onPress={nextMonth} style={dpStyles.navBtn}>
              <Feather name="chevron-right" size={20} color="#0C8C76" />
            </Pressable>
          </View>

          {/* Day names header */}
          <View style={dpStyles.weekRow}>
            {dayNames.map((dn) => (
              <View key={dn} style={dpStyles.weekCell}>
                <Text style={dpStyles.weekText}>{dn}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={dpStyles.daysGrid}>
            {cells.map((c, i) => {
              if (c === null) return <View key={`e${i}`} style={dpStyles.dayCell} />;
              const isSelected = c === day;
              const isToday =
                c === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();
              return (
                <Pressable
                  key={c}
                  style={[
                    dpStyles.dayCell,
                    isSelected && dpStyles.dayCellSelected,
                    isToday && !isSelected && dpStyles.dayCellToday,
                  ]}
                  onPress={() => setDay(c)}
                >
                  <Text
                    style={[
                      dpStyles.dayText,
                      isSelected && dpStyles.dayTextSelected,
                      isToday && !isSelected && dpStyles.dayTextToday,
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={dpStyles.actions}>
            <Pressable style={dpStyles.cancelBtn} onPress={onClose}>
              <Text style={dpStyles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              style={dpStyles.confirmBtn}
              onPress={() => { onSelect(new Date(year, month, day)); onClose(); }}
            >
              <LinearGradient
                colors={["#0C8C76", "#12B897"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={dpStyles.confirmGradient}
              >
                <Text style={dpStyles.confirmText}>Pilih Tanggal</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AddIncomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getAll('INCOME');
      setCategories(res.categories);
    } catch (err) {
      console.error("Failed to load income categories:", err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded, headerAnim, formAnim]);

  if (!fontsLoaded) return <View style={styles.loading} />;

  const isValid = name.trim() && amount.trim() && selectedCategory;

  const handleAddCategory = async (newCategory: { name: string; type: "income" | "expense" }) => {
    try {
      const icon = pickCategoryIcon("income", categories.length);
      const res = await categoryService.create({
        name: newCategory.name,
        type: "INCOME",
        icon,
      });

      setCategories((prev) => [res.category, ...prev]);
      setSelectedCategory(res.category.id);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal menambahkan kategori");
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert("Data belum lengkap", "Isi nama, jumlah, dan pilih kategori.");
      return;
    }
    setIsSubmitting(true);
    try {
      await transactionService.create({
        name: name.trim(),
        amount: Number(amount),
        type: 'INCOME',
        date: date.toISOString(),
        note: note.trim() || undefined,
        categoryId: selectedCategory,
      });
      setSubmitted(true);
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.1, tension: 300, friction: 10, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        setSubmitted(false);
        successScale.setValue(0);
        setName(""); setAmount(""); setSelectedCategory(""); setNote(""); setDate(new Date());
      }, 2000);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal menyimpan pemasukan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <Animated.View style={{
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}>
            <LinearGradient
              colors={["#0C8C76", "#0FA88E", "#12B897"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.headerOrb} />
              <View style={styles.topRow}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                  <Feather name="arrow-left" size={18} color="#FFF" />
                </Pressable>
                <View style={styles.titleWrap}>
                  <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name="cash-plus" size={28} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Tambah Pemasukan</Text>
                    <Text style={styles.headerSub}>Catat pemasukan Anda</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formCard, {
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>NAMA PEMASUKAN</Text>
              <View style={styles.inputShell}>
                <Feather name="edit-3" size={17} color="#64748B" style={styles.inputIcon} />
                <TextInput value={name} onChangeText={setName} placeholder="Contoh: Gaji, Freelance..." placeholderTextColor="#94A3B8" style={styles.input} />
              </View>
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>JUMLAH</Text>
              <View style={styles.inputShell}>
                <View style={styles.rpBadge}><Text style={styles.rpText}>Rp</Text></View>
                <TextInput value={formatCurrency(amount)} onChangeText={(v) => setAmount(v.replace(/\D/g, ""))} placeholder="0" placeholderTextColor="#94A3B8" keyboardType="numeric" style={[styles.input, { paddingLeft: 56 }]} />
              </View>
            </View>

            {/* Category */}
            <View style={styles.field}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.label}>SUMBER PEMASUKAN</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.inlineAddButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Feather name="plus" size={14} color="#0C8C76" />
                  <Text style={styles.inlineAddText}>Tambah</Text>
                </Pressable>
              </View>
              <View style={styles.catGrid}>
                {categories.map((cat) => {
                  const sel = selectedCategory === cat.id;
                  const catColor = "#0C8C76";
                  const catBg = "rgba(12,140,118,0.12)";
                  return (
                    <Pressable key={cat.id} style={styles.catItem} onPress={() => setSelectedCategory(cat.id)}>
                      <View style={[styles.catIcon, { backgroundColor: sel ? catColor : catBg, borderWidth: sel ? 2 : 0, borderColor: sel ? catColor : "transparent" }]}>
                        <MaterialCommunityIcons name={cat.icon as any} size={22} color={sel ? "#FFF" : catColor} />
                      </View>
                      <Text style={[styles.catLabel, sel && { color: catColor, fontFamily: "Poppins_600SemiBold" }]} numberOfLines={1}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
                <Pressable style={styles.catItem} onPress={() => setShowCategoryModal(true)}>
                  <View style={styles.catAddIcon}>
                    <Feather name="plus" size={20} color="#0C8C76" />
                  </View>
                  <Text style={styles.catAddLabel}>Kategori Baru</Text>
                </Pressable>
              </View>
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>TANGGAL</Text>
              <Pressable
                style={styles.inputShell}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateIconWrap}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#0C8C76" />
                </View>
                <Text style={[styles.input, { paddingTop: 17 }]}>{formatDate(date)}</Text>
                <View style={styles.dateChevron}>
                  <Feather name="chevron-down" size={16} color="#64748B" />
                </View>
              </Pressable>
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <MaterialCommunityIcons name="note-text-outline" size={14} color="#64748B" />
                <Text style={styles.label}>CATATAN</Text>
                <Text style={styles.optional}>(opsional)</Text>
              </View>
              <View style={[styles.inputShell, { minHeight: 80 }]}>
                <TextInput value={note} onChangeText={setNote} placeholder="Tambahkan catatan..." placeholderTextColor="#94A3B8" multiline numberOfLines={3} style={[styles.input, { paddingLeft: 16, paddingTop: 14, textAlignVertical: "top" }]} />
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && !submitted && !isSubmitting && { opacity: 0.9 },
                (!isValid || isSubmitting) && !submitted && { opacity: 0.55 },
              ]}
              onPress={handleSubmit}
              disabled={submitted || !isValid || isSubmitting}
            >
              <LinearGradient colors={submitted ? ["#0C8C76", "#0C8C76"] : ["#0C8C76", "#12B897"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
                {submitted ? (
                  <Animated.View style={[styles.submitInner, { transform: [{ scale: successScale }] }]}>
                    <MaterialCommunityIcons name="check-circle" size={22} color="#FFF" />
                    <Text style={styles.submitText}>Berhasil Ditambahkan!</Text>
                  </Animated.View>
                ) : isSubmitting ? (
                  <View style={styles.submitInner}>
                    <MaterialCommunityIcons name="progress-clock" size={18} color="#F2C94C" />
                    <Text style={styles.submitText}>Menyimpan...</Text>
                  </View>
                ) : (
                  <View style={styles.submitInner}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#F2C94C" />
                    <Text style={styles.submitText}>Tambah Pemasukan</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onAdd={handleAddCategory}
        initialType="income"
        lockType
        title="Tambah kategori pemasukan"
        subtitle="Buat sumber pemasukan baru lalu langsung pilih di transaksi ini."
        submitLabel="Tambah kategori"
      />

      <DatePickerModal
        visible={showDatePicker}
        currentDate={date}
        onClose={() => setShowDatePicker(false)}
        onSelect={setDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingVertical: 22, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.10)" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  iconWrap: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSub: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.75)" },

  formCard: { marginTop: 16, borderRadius: 28, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  field: { marginBottom: 20 },
  label: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#64748B", letterSpacing: 0.8, marginBottom: 10 },
  fieldHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  optional: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  inlineAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(12,140,118,0.08)",
    borderWidth: 1,
    borderColor: "rgba(12,140,118,0.16)",
  },
  inlineAddText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#0C8C76" },

  inputShell: { minHeight: 56, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 16, top: 18 },
  input: { minHeight: 56, paddingLeft: 46, paddingRight: 18, fontSize: 15, fontFamily: "Poppins_400Regular", color: "#102A43" },
  rpBadge: { position: "absolute", left: 14, top: 16, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(12,140,118,0.12)" },
  rpText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0C8C76" },

  catGrid: { flexDirection: "row", flexWrap: "wrap" },
  catItem: { width: "25%", alignItems: "center", paddingVertical: 10, gap: 6 },
  catIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 10, fontFamily: "Poppins_500Medium", color: "#64748B", textAlign: "center" },
  catAddIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,140,118,0.06)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(12,140,118,0.24)",
  },
  catAddLabel: { fontSize: 10, fontFamily: "Poppins_600SemiBold", color: "#0C8C76", textAlign: "center" },

  dateIconWrap: {
    position: "absolute",
    left: 14,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(12,140,118,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateChevron: {
    position: "absolute",
    right: 16,
    top: 18,
  },

  submitBtn: { marginTop: 6, borderRadius: 20, overflow: "hidden" },
  submitGrad: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  submitText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});

// ─── DatePicker Modal Styles ────────────────────────────────────
const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(12, 140, 118, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#94A3B8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  dayCellSelected: {
    backgroundColor: "#0C8C76",
  },
  dayCellToday: {
    backgroundColor: "rgba(12, 140, 118, 0.08)",
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#102A43",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  dayTextToday: {
    color: "#0C8C76",
    fontFamily: "Poppins_600SemiBold",
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmGradient: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
});
