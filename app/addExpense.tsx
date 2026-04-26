import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../services/api";
import { transactionService } from "../services/transaction.service";

// Categories now loaded from API

// ─── Helpers ────────────────────────────────────────────────────
function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(d: Date): string {
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ExpenseStatsResponse = {
  date: string;
  todayExpense: number;
  monthExpense: number;
};

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
              <Feather name="chevron-left" size={20} color="#12406A" />
            </Pressable>
            <Text style={dpStyles.monthLabel}>
              {monthNames[month]} {year}
            </Text>
            <Pressable onPress={nextMonth} style={dpStyles.navBtn}>
              <Feather name="chevron-right" size={20} color="#12406A" />
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
                colors={["#12406A", "#0C8C76"]}
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

// ─── Main Screen ────────────────────────────────────────────────
export default function AddExpenseScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Form state
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
  const [todayExpense, setTodayExpense] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getAll('EXPENSE');
      setCategories(res.categories);
    } catch (err) {
      console.error("Failed to load expense categories:", err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadExpenseStats = useCallback(async () => {
    if (!user?.id) {
      setTodayExpense(0);
      setMonthExpense(0);
      setIsStatsLoading(false);
      return;
    }

    setIsStatsLoading(true);

    try {
      const stats = await fetchApi<ExpenseStatsResponse>(
        `/summary/expense-stats?date=${formatDateKey(new Date())}`
      );
      setTodayExpense(stats.todayExpense);
      setMonthExpense(stats.monthExpense);
    } catch (err) {
      console.error("Failed to load expense stats:", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadExpenseStats();
    }, [loadExpenseStats])
  );

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(statsAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded, headerAnim, statsAnim, formAnim]);

  if (!fontsLoaded) return <View style={styles.loadingScreen} />;

  const isValid = name.trim() && amount.trim() && selectedCategory;
  const columns = width >= 700 ? 4 : 4;
  const cardWidth = `${100 / columns}%` as const;
  const monthExpenseText = isStatsLoading ? "Memuat..." : `Rp ${formatAmount(monthExpense)}`;
  const todayExpenseText = isStatsLoading ? "Memuat..." : `Rp ${formatAmount(todayExpense)}`;

  const handleAddCategory = async (newCategory: { name: string; type: "income" | "expense" }) => {
    try {
      const icon = pickCategoryIcon("expense", categories.length);
      const res = await categoryService.create({
        name: newCategory.name,
        type: "EXPENSE",
        icon,
      });

      setCategories((prev) => [res.category, ...prev]);
      setSelectedCategory(res.category.id);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal menambahkan kategori");
      throw err;
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val.replace(/\D/g, ""));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert("Data belum lengkap", "Isi nama, jumlah, dan pilih kategori.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await transactionService.create({
        name: name.trim(),
        amount: Number(amount),
        type: 'EXPENSE',
        date: date.toISOString(),
        note: note.trim() || undefined,
        categoryId: selectedCategory,
      });
      await loadExpenseStats();
      setSubmitted(true);
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.1, tension: 300, friction: 10, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
      ]).start();

      // Show budget warning if exceeded
      if (response.budgetWarning) {
        const w = response.budgetWarning;
        setTimeout(() => {
          Alert.alert(
            "⚠️ Melebihi Anggaran!",
            `Pengeluaran untuk "${w.categoryName}" bulan ini sudah melebihi anggaran.\n\n` +
            `📋 Anggaran: Rp ${formatAmount(w.budgetAmount)}\n` +
            `💸 Total terpakai: Rp ${formatAmount(w.totalSpent)}\n` +
            `🔴 Kelebihan: Rp ${formatAmount(w.overAmount)}`,
            [{ text: "Mengerti", style: "default" }]
          );
        }, 500);
      }

      setTimeout(() => {
        setSubmitted(false);
        successScale.setValue(0);
        setName("");
        setAmount("");
        setSelectedCategory("");
        setNote("");
        setDate(new Date());
      }, 2000);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal menyimpan pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      {/* Background glow */}
      <View style={styles.bgLayer}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <Animated.View
            style={{
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}
          >
            <LinearGradient
              colors={["#0D2349", "#12406A", "#0C8C76"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroOrbTop} />
              <View style={styles.heroOrbBottom} />

              <View style={styles.heroTopRow}>
                <Pressable
                  style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
                  onPress={() => router.back()}
                >
                  <Feather name="arrow-left" size={18} color="#FFFFFF" />
                </Pressable>
                <View style={styles.heroTitleWrap}>
                  <View style={styles.headerIconWrap}>
                    <MaterialCommunityIcons name="wallet-plus-outline" size={28} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.heroTitle}>Tambah Pengeluaran</Text>
                    <Text style={styles.heroSubtitle}>Catat pengeluaran harian Anda</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Mini Stats ── */}
          <Animated.View
            style={[styles.statsRow, {
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }]}
          >
            <View style={styles.miniStatCard}>
              <View style={[styles.miniStatIcon, { backgroundColor: "rgba(12, 140, 118, 0.12)" }]}>
                <MaterialCommunityIcons name="trending-up" size={18} color="#0C8C76" />
              </View>
              <View>
                <Text style={styles.miniStatLabel}>Bulan Ini</Text>
                <Text style={styles.miniStatValue}>{monthExpenseText}</Text>
              </View>
            </View>
            <View style={styles.miniStatCard}>
              <View style={[styles.miniStatIcon, { backgroundColor: "rgba(18, 64, 106, 0.12)" }]}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color="#12406A" />
              </View>
              <View>
                <Text style={styles.miniStatLabel}>Hari Ini</Text>
                <Text style={styles.miniStatValue}>{todayExpenseText}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View
            style={[styles.formCard, {
              opacity: formAnim,
              transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            }]}
          >
            {/* Expense Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>NAMA PENGELUARAN</Text>
              <View style={styles.inputShell}>
                <Feather name="edit-3" size={17} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Contoh: Makan siang, Bensin..."
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Amount */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>JUMLAH</Text>
              <View style={styles.inputShell}>
                <View style={styles.rpBadge}>
                  <Text style={styles.rpText}>Rp</Text>
                </View>
                <TextInput
                  value={formatCurrency(amount)}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, { paddingLeft: 56 }]}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.fieldBlock}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>KATEGORI</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.inlineAddButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Feather name="plus" size={14} color="#12406A" />
                  <Text style={styles.inlineAddText}>Tambah</Text>
                </Pressable>
              </View>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const catColor = "#12406A";
                  const catBg = "rgba(18, 64, 106, 0.12)";
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        { width: cardWidth },
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <View
                        style={[
                          styles.categoryIconWrap,
                          {
                            backgroundColor: isSelected ? catColor : catBg,
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: isSelected ? catColor : "transparent",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={cat.icon as any}
                          size={22}
                          color={isSelected ? "#FFFFFF" : catColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected && { color: catColor, fontFamily: "Poppins_600SemiBold" },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[
                    styles.categoryItem,
                    { width: cardWidth },
                  ]}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <View style={styles.categoryAddWrap}>
                    <Feather name="plus" size={20} color="#12406A" />
                  </View>
                  <Text style={styles.categoryAddLabel}>Kategori Baru</Text>
                </Pressable>
              </View>
            </View>

            {/* Date */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>TANGGAL</Text>
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
            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <MaterialCommunityIcons name="note-text-outline" size={14} color="#64748B" />
                <Text style={styles.fieldLabel}>CATATAN</Text>
                <Text style={styles.fieldOptional}>(opsional)</Text>
              </View>
              <View style={[styles.inputShell, { minHeight: 80 }]}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Tambahkan catatan..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { paddingLeft: 16, paddingTop: 14, textAlignVertical: "top" }]}
                />
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !submitted && !isSubmitting && styles.buttonPressed,
                (!isValid || isSubmitting) && !submitted && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitted || !isValid || isSubmitting}
            >
              <LinearGradient
                colors={submitted ? ["#0C8C76", "#0C8C76"] : ["#12406A", "#0C8C76"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {submitted ? (
                  <Animated.View
                    style={[styles.submitInner, { transform: [{ scale: successScale }] }]}
                  >
                    <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
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
                    <Text style={styles.submitText}>Tambah Pengeluaran</Text>
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
        initialType="expense"
        lockType
        title="Tambah kategori pengeluaran"
        subtitle="Buat kategori baru lalu langsung pakai untuk transaksi ini."
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
    backgroundColor: "rgba(18, 64, 106, 0.08)",
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
    backgroundColor: "rgba(18, 64, 106, 0.08)",
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
    color: "#12406A",
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

// ─── Main Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(18, 64, 106, 0.12)",
  },
  glowBottom: {
    position: "absolute",
    right: -120,
    bottom: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(12, 140, 118, 0.10)",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },

  // ── Hero header ──
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 22,
    overflow: "hidden",
  },
  heroOrbTop: {
    position: "absolute",
    top: -110,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  heroOrbBottom: {
    position: "absolute",
    left: -80,
    bottom: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.72)",
    marginTop: -1,
  },

  // ── Mini stats ──
  statsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 14,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  miniStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStatLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
    letterSpacing: 0.2,
  },
  miniStatValue: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
    marginTop: 1,
  },

  // ── Form card ──
  formCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  inlineAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(18, 64, 106, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(18, 64, 106, 0.14)",
  },
  inlineAddText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#12406A",
  },
  fieldOptional: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E2EC",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 16,
    top: 18,
  },
  input: {
    minHeight: 56,
    paddingLeft: 46,
    paddingRight: 18,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#102A43",
  },
  rpBadge: {
    position: "absolute",
    left: 14,
    top: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(12, 140, 118, 0.12)",
  },
  rpText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: "#0C8C76",
  },

  // ── Categories ──
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryItem: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 6,
  },
  categoryIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
    textAlign: "center",
  },
  categoryAddWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18, 64, 106, 0.06)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(18, 64, 106, 0.24)",
  },
  categoryAddLabel: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#12406A",
    textAlign: "center",
  },

  // ── Date ──
  dateIconWrap: {
    position: "absolute",
    left: 14,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(12, 140, 118, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateChevron: {
    position: "absolute",
    right: 16,
    top: 20,
  },

  // ── Submit ──
  submitButton: {
    marginTop: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  submitGradient: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
