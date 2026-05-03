import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { categoryService, Category } from "../services/category.service";
import { budgetService, BudgetItem } from "../services/budget.service";

function formatRp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PAGE_SIZE = 5;

// Budget categories loaded from API

type PlanItem = {
  categoryId: string;
  amount: string;
};

export default function PlanBudgetScreen() {
  const router = useRouter();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [totalBudget, setTotalBudget] = useState("");
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<Category[]>([]);
  const [existingBudgets, setExistingBudgets] = useState<BudgetItem[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [mutatingBudgetId, setMutatingBudgetId] = useState<string | null>(null);
  const [budgetPage, setBudgetPage] = useState(1);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  const loadBudgetData = useCallback(async () => {
    setIsLoadingBudgets(true);
    try {
      const [categoryRes, budgetRes] = await Promise.all([
        categoryService.getAll("EXPENSE"),
        budgetService.get(currentMonth, currentYear),
      ]);

      setBudgetCategories(categoryRes.categories);
      setExistingBudgets(budgetRes.budgets);
      setTotalBudget((current) => current || (budgetRes.totalBudget > 0 ? String(budgetRes.totalBudget) : ""));
    } catch (err) {
      console.error("Load budget data error:", err);
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  useEffect(() => {
    setBudgetPage(1);
  }, [existingBudgets.length, currentMonth, currentYear]);

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded, headerAnim, formAnim]);

  if (!fontsLoaded) return <View style={styles.loading} />;

  const toggleCategory = (catId: string) => {
    setPlans((prev) => {
      const exists = prev.find((p) => p.categoryId === catId);
      if (exists) return prev.filter((p) => p.categoryId !== catId);
      return [...prev, { categoryId: catId, amount: "" }];
    });
  };

  const updatePlanAmount = (catId: string, val: string) => {
    setPlans((prev) => prev.map((p) => (p.categoryId === catId ? { ...p, amount: val.replace(/\D/g, "") } : p)));
  };

  const totalPlanned = plans.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const budgetNum = Number(totalBudget) || 0;
  const remaining = budgetNum - totalPlanned;
  const existingTotalBudget = existingBudgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
  const budgetTotalPages = Math.max(1, Math.ceil(existingBudgets.length / PAGE_SIZE));
  const safeBudgetPage = Math.min(budgetPage, budgetTotalPages);
  const budgetStart = (safeBudgetPage - 1) * PAGE_SIZE;
  const paginatedBudgets = existingBudgets.slice(budgetStart, budgetStart + PAGE_SIZE);
  const showBudgetPagination = existingBudgets.length > PAGE_SIZE;

  const handleStartEdit = (budget: BudgetItem) => {
    setEditingBudgetId(budget.id);
    setEditingAmount(String(Number(budget.amount)));
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditingAmount("");
  };

  const handleSaveEdit = async (budget: BudgetItem) => {
    const amount = Number(editingAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert("Jumlah tidak valid", "Masukkan jumlah budget yang benar.");
      return;
    }

    setMutatingBudgetId(budget.id);
    try {
      await budgetService.updateItem(budget.id, amount);
      handleCancelEdit();
      await loadBudgetData();
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal mengupdate planning budget");
    } finally {
      setMutatingBudgetId(null);
    }
  };

  const handleDeleteBudget = (budget: BudgetItem) => {
    Alert.alert(
      "Hapus Planning",
      `Planning untuk kategori "${budget.category?.name || "Tanpa kategori"}" akan dihapus.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setMutatingBudgetId(budget.id);
            try {
              await budgetService.deleteItem(budget.id);
              if (editingBudgetId === budget.id) {
                handleCancelEdit();
              }
              await loadBudgetData();
            } catch (err: any) {
              Alert.alert("Gagal", err?.message || "Gagal menghapus planning budget");
            } finally {
              setMutatingBudgetId(null);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!totalBudget.trim()) {
      Alert.alert("Budget belum diisi", "Masukkan total budget bulanan.");
      return;
    }
    if (plans.length === 0) {
      Alert.alert("Pilih kategori", "Pilih minimal satu kategori untuk dialokasikan.");
      return;
    }
    const allocations = plans
      .filter(p => Number(p.amount) > 0)
      .map(p => ({ categoryId: p.categoryId, amount: Number(p.amount) }));

    if (allocations.length === 0) {
      Alert.alert("Alokasi belum diisi", "Masukkan jumlah alokasi minimal satu kategori.");
      return;
    }

    setIsSubmitting(true);
    try {
      await budgetService.save({
        month: currentMonth,
        year: currentYear,
        allocations,
      });
      setPlans([]);
      await loadBudgetData();
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); }, 2000);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Gagal menyimpan budget");
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
              colors={["#0D2349", "#12406A", "#1A5276"]}
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
                    <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#F2C94C" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Planning Budget</Text>
                    <Text style={styles.headerSub}>Atur anggaran bulanan Anda</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Form Card */}
          <Animated.View style={[styles.formCard, {
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>Daftar Planning</Text>
                  <Text style={styles.listSub}>{monthNames[currentMonth - 1]} {currentYear}</Text>
                </View>
                <View style={styles.totalPlanBadge}>
                  <Text style={styles.totalPlanLabel}>Total</Text>
                  <Text style={styles.totalPlanValue}>Rp {formatRp(String(existingTotalBudget)) || "0"}</Text>
                </View>
              </View>

              {isLoadingBudgets ? (
                <View style={styles.loadingList}>
                  <ActivityIndicator color="#0C8C76" />
                  <Text style={styles.loadingListText}>Memuat planning...</Text>
                </View>
              ) : existingBudgets.length > 0 ? (
                <>
                  <View style={styles.listMeta}>
                    <Text style={styles.listMetaText}>
                      Menampilkan {budgetStart + 1}-{Math.min(budgetStart + PAGE_SIZE, existingBudgets.length)} dari {existingBudgets.length} planning
                    </Text>
                  </View>

                  <View style={styles.budgetList}>
                    {paginatedBudgets.map((budget) => {
                      const isEditing = editingBudgetId === budget.id;
                      const isMutating = mutatingBudgetId === budget.id;
                      const categoryName = budget.category?.name || "Tanpa kategori";
                      const categoryIcon = budget.category?.icon || "wallet-outline";

                      return (
                        <View key={budget.id} style={styles.budgetItem}>
                          <View style={styles.budgetItemTop}>
                            <View style={styles.budgetInfo}>
                              <View style={styles.budgetIcon}>
                                <MaterialCommunityIcons name={categoryIcon as any} size={20} color="#12406A" />
                              </View>
                              <View style={styles.budgetTextWrap}>
                                <Text style={styles.budgetName} numberOfLines={1}>{categoryName}</Text>
                                <Text style={styles.budgetPeriod}>{monthNames[budget.month - 1]} {budget.year}</Text>
                              </View>
                            </View>

                            {!isEditing && (
                              <View style={styles.budgetActions}>
                                <Pressable
                                  style={styles.iconActionBtn}
                                  onPress={() => handleStartEdit(budget)}
                                  disabled={isMutating}
                                >
                                  <Feather name="edit-2" size={15} color="#12406A" />
                                </Pressable>
                                <Pressable
                                  style={[styles.iconActionBtn, styles.deleteActionBtn]}
                                  onPress={() => handleDeleteBudget(budget)}
                                  disabled={isMutating}
                                >
                                  <Feather name="trash-2" size={15} color="#E05252" />
                                </Pressable>
                              </View>
                            )}
                          </View>

                          {isEditing ? (
                            <View style={styles.editBudgetRow}>
                              <View style={styles.editInputWrap}>
                                <View style={styles.rpSmall}><Text style={styles.rpSmallText}>Rp</Text></View>
                                <TextInput
                                  value={formatRp(editingAmount)}
                                  onChangeText={(v) => setEditingAmount(v.replace(/\D/g, ""))}
                                  placeholder="0"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="numeric"
                                  style={styles.editBudgetInput}
                                />
                              </View>
                              <Pressable
                                style={[styles.editActionBtn, styles.saveEditBtn]}
                                onPress={() => handleSaveEdit(budget)}
                                disabled={isMutating}
                              >
                                {isMutating ? (
                                  <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                  <Feather name="check" size={16} color="#FFFFFF" />
                                )}
                              </Pressable>
                              <Pressable
                                style={[styles.editActionBtn, styles.cancelEditBtn]}
                                onPress={handleCancelEdit}
                                disabled={isMutating}
                              >
                                <Feather name="x" size={16} color="#64748B" />
                              </Pressable>
                            </View>
                          ) : (
                            <Text style={styles.budgetAmount}>Rp {formatRp(String(Number(budget.amount)))}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {showBudgetPagination && (
                    <View style={styles.pagination}>
                      <Pressable
                        style={[styles.pageIconBtn, safeBudgetPage === 1 && styles.pageBtnDisabled]}
                        onPress={() => setBudgetPage((page) => Math.max(1, page - 1))}
                        disabled={safeBudgetPage === 1}
                      >
                        <Feather name="chevron-left" size={18} color={safeBudgetPage === 1 ? "#94A3B8" : "#12406A"} />
                      </Pressable>
                      <Text style={styles.pageText}>Halaman {safeBudgetPage} dari {budgetTotalPages}</Text>
                      <Pressable
                        style={[styles.pageIconBtn, safeBudgetPage === budgetTotalPages && styles.pageBtnDisabled]}
                        onPress={() => setBudgetPage((page) => Math.min(budgetTotalPages, page + 1))}
                        disabled={safeBudgetPage === budgetTotalPages}
                      >
                        <Feather name="chevron-right" size={18} color={safeBudgetPage === budgetTotalPages ? "#94A3B8" : "#12406A"} />
                      </Pressable>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyBudgetCard}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={30} color="#94A3B8" />
                  <Text style={styles.emptyBudgetTitle}>Belum ada planning</Text>
                  <Text style={styles.emptyBudgetText}>Tambahkan alokasi kategori di form bawah.</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* Total Budget */}
            <View style={styles.field}>
              <Text style={styles.label}>TOTAL BUDGET BULANAN</Text>
              <View style={styles.inputShell}>
                <View style={styles.rpBadge}><Text style={styles.rpText}>Rp</Text></View>
                <TextInput
                  value={formatRp(totalBudget)}
                  onChangeText={(v) => setTotalBudget(v.replace(/\D/g, ""))}
                  placeholder="5.000.000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, { paddingLeft: 56 }]}
                />
              </View>
            </View>

            {/* Budget overview */}
            {budgetNum > 0 && (
              <View style={styles.overviewRow}>
                <View style={[styles.overviewCard, { backgroundColor: "rgba(12,140,118,0.08)" }]}>
                  <Text style={[styles.overviewLabel, { color: "#0C8C76" }]}>Dialokasi</Text>
                  <Text style={[styles.overviewValue, { color: "#0C8C76" }]}>Rp {formatRp(String(totalPlanned))}</Text>
                </View>
                <View style={[styles.overviewCard, { backgroundColor: remaining >= 0 ? "rgba(18,64,106,0.08)" : "rgba(224,82,82,0.08)" }]}>
                  <Text style={[styles.overviewLabel, { color: remaining >= 0 ? "#12406A" : "#E05252" }]}>Sisa</Text>
                  <Text style={[styles.overviewValue, { color: remaining >= 0 ? "#12406A" : "#E05252" }]}>Rp {formatRp(String(Math.abs(remaining)))}</Text>
                </View>
              </View>
            )}

            {/* Category allocation */}
            <View style={styles.field}>
              <Text style={styles.label}>ALOKASI PER KATEGORI</Text>
              <Text style={styles.hint}>Pilih kategori lalu atur jumlah alokasi</Text>

              {budgetCategories.map((cat) => {
                const plan = plans.find((p) => p.categoryId === cat.id);
                const isSelected = !!plan;
                const catColor = "#12406A";
                const catBg = "rgba(18,64,106,0.12)";
                return (
                  <View key={cat.id}>
                    <Pressable style={styles.catRow} onPress={() => toggleCategory(cat.id)}>
                      <View style={[styles.catIcon, { backgroundColor: isSelected ? catColor : catBg }]}>
                        <MaterialCommunityIcons name={cat.icon as any} size={20} color={isSelected ? "#FFF" : catColor} />
                      </View>
                      <Text style={[styles.catLabel, isSelected && { color: "#102A43", fontFamily: "Poppins_600SemiBold" }]}>{cat.name}</Text>
                      <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                        {isSelected && <Feather name="check" size={14} color="#FFF" />}
                      </View>
                    </Pressable>

                    {isSelected && (
                      <View style={styles.allocInputWrap}>
                        <View style={styles.rpSmall}><Text style={styles.rpSmallText}>Rp</Text></View>
                        <TextInput
                          value={formatRp(plan?.amount || "")}
                          onChangeText={(v) => updatePlanAmount(cat.id, v)}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.allocInput}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }, (!totalBudget.trim() || plans.length === 0 || isSubmitting) && { opacity: 0.55 }]}
              onPress={handleSubmit}
              disabled={submitted || isSubmitting}
            >
              <LinearGradient colors={submitted ? ["#0C8C76", "#0C8C76"] : ["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
                <View style={styles.submitInner}>
                  {isSubmitting ? (
                    <>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.submitText}>Menyimpan...</Text>
                    </>
                  ) : submitted ? (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={22} color="#FFF" />
                      <Text style={styles.submitText}>Budget Tersimpan!</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save-outline" size={18} color="#F2C94C" />
                      <Text style={styles.submitText}>Simpan Budget</Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingVertical: 22, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  iconWrap: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSub: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.72)" },

  formCard: { marginTop: 16, borderRadius: 28, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  listSection: { gap: 14 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#102A43" },
  listSub: { marginTop: 2, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  totalPlanBadge: { alignItems: "flex-end", borderRadius: 16, backgroundColor: "rgba(12,140,118,0.10)", paddingHorizontal: 12, paddingVertical: 9 },
  totalPlanLabel: { fontSize: 10, fontFamily: "Poppins_500Medium", color: "#0C8C76" },
  totalPlanValue: { marginTop: 1, fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0C8C76" },
  listMeta: { marginTop: -4 },
  listMetaText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },
  loadingList: { borderRadius: 18, backgroundColor: "#F8FAFC", paddingVertical: 24, alignItems: "center", gap: 8 },
  loadingListText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  budgetList: { gap: 10 },
  budgetItem: { borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12 },
  budgetItemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  budgetInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  budgetIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(18,64,106,0.10)", alignItems: "center", justifyContent: "center" },
  budgetTextWrap: { flex: 1 },
  budgetName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#102A43" },
  budgetPeriod: { marginTop: 1, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  budgetActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconActionBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  deleteActionBtn: { backgroundColor: "rgba(224,82,82,0.08)", borderColor: "rgba(224,82,82,0.14)" },
  budgetAmount: { marginTop: 10, fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0C8C76", textAlign: "right" },
  editBudgetRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  editInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9E2EC" },
  editBudgetInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, fontSize: 14, fontFamily: "Poppins_500Medium", color: "#102A43" },
  editActionBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveEditBtn: { backgroundColor: "#0C8C76" },
  cancelEditBtn: { backgroundColor: "#F1F5F9" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  pageIconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9E2EC", alignItems: "center", justifyContent: "center" },
  pageBtnDisabled: { backgroundColor: "#F8FAFC" },
  pageText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  emptyBudgetCard: { borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 18, paddingVertical: 24, alignItems: "center" },
  emptyBudgetTitle: { marginTop: 10, fontSize: 14, fontFamily: "Poppins_700Bold", color: "#102A43" },
  emptyBudgetText: { marginTop: 4, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center" },
  sectionDivider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#64748B", letterSpacing: 0.8, marginBottom: 10 },
  hint: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginBottom: 14, marginTop: -4 },

  inputShell: { minHeight: 56, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC", justifyContent: "center" },
  input: { minHeight: 56, paddingLeft: 46, paddingRight: 18, fontSize: 15, fontFamily: "Poppins_400Regular", color: "#102A43" },
  rpBadge: { position: "absolute", left: 14, top: 16, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(12,140,118,0.12)" },
  rpText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0C8C76" },

  overviewRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  overviewCard: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 18 },
  overviewLabel: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  overviewValue: { fontSize: 15, fontFamily: "Poppins_700Bold", marginTop: 4 },

  catRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  catIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  catLabel: { flex: 1, fontSize: 15, fontFamily: "Poppins_500Medium", color: "#64748B" },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#D9E2EC", alignItems: "center", justifyContent: "center" },
  checkCircleActive: { backgroundColor: "#0C8C76", borderColor: "#0C8C76" },

  allocInputWrap: { marginLeft: 58, marginBottom: 8, flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC" },
  rpSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRightWidth: 1, borderRightColor: "#D9E2EC" },
  rpSmallText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#0C8C76" },
  allocInput: { flex: 1, minHeight: 44, paddingHorizontal: 12, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#102A43" },

  submitBtn: { marginTop: 6, borderRadius: 20, overflow: "hidden" },
  submitGrad: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  submitText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
