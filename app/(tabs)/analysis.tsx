import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { useAuth } from "../../contexts/AuthContext";
import { useMonthlySummary } from "../../hooks/useMonthlySummary";
import { useYearlyTrend } from "../../hooks/useYearlyTrend";
import { transactionService, Transaction } from "../../services/transaction.service";

type PeriodMode = "day" | "week" | "month" | "year";

type PeriodRange = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  label: string;
  unitLabel: string;
};

type CategoryTotal = {
  id: string;
  name: string;
  icon: string;
  amount: number;
  percent: number;
};

type FinanceComparisonData = {
  incomeTotal: number;
  expenseTotal: number;
  incomeCount: number;
  expenseCount: number;
  balance: number;
  expenseCategories: CategoryTotal[];
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const categoryColors = ["#0C8C76", "#12406A", "#F2C94C", "#3D52A0", "#E05252", "#D4A017", "#64748B"];

const emptyComparison: FinanceComparisonData = {
  incomeTotal: 0,
  expenseTotal: 0,
  incomeCount: 0,
  expenseCount: 0,
  balance: 0,
  expenseCategories: [],
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

function toPercentWidth(value: number): `${number}%` {
  const safeValue = Math.max(0, Math.min(100, value));
  return `${safeValue}%`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return startOfDay(parsed);
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  return addDays(start, -diffToMonday);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDateLong(date: Date): string {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date: Date): string {
  return `${date.getDate()} ${shortMonths[date.getMonth()]} ${date.getFullYear()}`;
}

function formatRangeLabel(start: Date, end: Date): string {
  if (toDateKey(start) === toDateKey(end)) {
    return formatDateLong(start);
  }

  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

function buildPeriodRange(mode: PeriodMode, anchorDateKey: string): PeriodRange {
  const anchor = parseDateKey(anchorDateKey) ?? startOfDay(new Date());
  let start = startOfDay(anchor);
  let end = endOfDay(anchor);
  let label = formatDateLong(anchor);
  let unitLabel = "Harian";

  if (mode === "week") {
    start = startOfWeek(anchor);
    end = endOfDay(addDays(start, 6));
    label = formatRangeLabel(start, end);
    unitLabel = "Mingguan";
  }

  if (mode === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    label = `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}`;
    unitLabel = "Bulanan";
  }

  if (mode === "year") {
    start = new Date(anchor.getFullYear(), 0, 1);
    end = endOfDay(new Date(anchor.getFullYear(), 11, 31));
    label = `Tahun ${anchor.getFullYear()}`;
    unitLabel = "Tahunan";
  }

  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    label,
    unitLabel,
  };
}

async function fetchTransactionsByRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const transactions: Transaction[] = [];

  do {
    const response = await transactionService.getAll({ startDate, endDate, page, limit });
    transactions.push(...response.transactions);
    totalPages = response.pagination.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return transactions;
}

function summarizeFinanceComparison(transactions: Transaction[]): FinanceComparisonData {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const categoryMap = new Map<string, CategoryTotal>();

  transactions.forEach((tx) => {
    const amount = Number(tx.amount);

    if (tx.type === "INCOME") {
      incomeTotal += amount;
      incomeCount += 1;
      return;
    }

    expenseTotal += amount;
    expenseCount += 1;

    const category = tx.category;
    const categoryId = category?.id ?? "unknown";
    const existing = categoryMap.get(categoryId);
    categoryMap.set(categoryId, {
      id: categoryId,
      name: category?.name ?? "Tanpa kategori",
      icon: category?.icon ?? "help-circle-outline",
      amount: (existing?.amount ?? 0) + amount,
      percent: 0,
    });
  });

  const expenseCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((category) => ({
      ...category,
      percent: expenseTotal > 0 ? Math.round((category.amount / expenseTotal) * 100) : 0,
    }));

  return {
    incomeTotal,
    expenseTotal,
    incomeCount,
    expenseCount,
    balance: incomeTotal - expenseTotal,
    expenseCategories,
  };
}

export default function AnalysisTab() {
  const { user } = useAuth();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const userId = user?.id ?? null;
  const { summary } = useMonthlySummary(userId, month, year);
  const { trend } = useYearlyTrend(userId, year);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => toDateKey(new Date()));
  const [comparisonData, setComparisonData] = useState<FinanceComparisonData>(emptyComparison);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  const periodRange = useMemo(
    () => buildPeriodRange(periodMode, anchorDate),
    [anchorDate, periodMode]
  );

  const shiftAnchorDate = useCallback((direction: -1 | 1) => {
    const current = parseDateKey(anchorDate) ?? new Date();
    let next = current;

    if (periodMode === "day") {
      next = addDays(current, direction);
    } else if (periodMode === "week") {
      next = addDays(current, direction * 7);
    } else if (periodMode === "month") {
      const nextMonth = current.getMonth() + direction;
      const nextYear = current.getFullYear() + Math.floor(nextMonth / 12);
      const normalizedMonth = ((nextMonth % 12) + 12) % 12;
      const day = Math.min(current.getDate(), daysInMonth(nextYear, normalizedMonth));
      next = new Date(nextYear, normalizedMonth, day);
    } else if (periodMode === "year") {
      next = new Date(current.getFullYear() + direction, current.getMonth(), current.getDate());
    }

    setAnchorDate(toDateKey(next));
  }, [anchorDate, periodMode]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!userId) {
        setComparisonData(emptyComparison);
        setComparisonError(null);
        setIsComparisonLoading(false);
        return () => {
          active = false;
        };
      }

      setComparisonError(null);
      setIsComparisonLoading(true);

      fetchTransactionsByRange(periodRange.startKey, periodRange.endKey)
        .then((transactions) => {
          if (!active) {
            return;
          }

          setComparisonData(summarizeFinanceComparison(transactions));
        })
        .catch((err: any) => {
          if (!active) {
            return;
          }

          setComparisonError(err?.message || "Gagal memuat perbandingan pemasukan dan pengeluaran");
          setComparisonData(emptyComparison);
        })
        .finally(() => {
          if (active) {
            setIsComparisonLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [periodRange, userId])
  );

  if (!fontsLoaded) return <View style={styles.loading} />;

  const totalIncome = summary?.totalIncome || 0;
  const totalExpense = summary?.totalExpense || 0;
  const savings = summary?.savings || 0;
  const categorySpending = (summary?.expenseByCategory || []).map((cat, i) => ({
    label: cat.categoryName,
    amount: cat.amount,
    color: categoryColors[i % categoryColors.length],
    percent: cat.percent,
  }));
  const trendData = (trend?.summaries || []).map((s) => ({
    month: shortMonths[s.month - 1],
    income: Number(s.totalIncome) / 1000,
    expense: Number(s.totalExpense) / 1000,
  }));
  const maxBar = Math.max(...trendData.flatMap((m) => [m.income, m.expense]), 1);
  const maxCompareValue = Math.max(comparisonData.incomeTotal, comparisonData.expenseTotal, 1);
  const incomeWidth = toPercentWidth(comparisonData.incomeTotal > 0 ? Math.max(6, (comparisonData.incomeTotal / maxCompareValue) * 100) : 0);
  const expenseWidth = toPercentWidth(comparisonData.expenseTotal > 0 ? Math.max(6, (comparisonData.expenseTotal / maxCompareValue) * 100) : 0);
  const balanceColor = comparisonData.balance >= 0 ? "#0C8C76" : "#E05252";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerOrb} />
          <Text style={styles.headerTitle}>Analisis Keuangan</Text>
          <Text style={styles.headerSub}>Bandingkan pemasukan dan pengeluaran per hari, minggu, bulan, atau tahun</Text>

          <View style={styles.periodRow}>
            {(["day", "week", "month", "year"] as const).map((mode) => {
              const active = periodMode === mode;
              const label = mode === "day" ? "Hari" : mode === "week" ? "Minggu" : mode === "month" ? "Bulan" : "Tahun";
              return (
                <Pressable
                  key={mode}
                  style={[styles.periodPill, active && styles.periodPillActive]}
                  onPress={() => setPeriodMode(mode)}
                >
                  <Text style={[styles.periodText, active && styles.periodTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <View style={[styles.ovIconWrap, { backgroundColor: "rgba(12,140,118,0.12)" }]}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#0C8C76" />
            </View>
            <Text style={styles.ovValue}>Rp {formatRp(totalIncome)}</Text>
            <Text style={styles.ovLabel}>Total Pemasukan Bulan Ini</Text>
          </View>
          <View style={styles.overviewCard}>
            <View style={[styles.ovIconWrap, { backgroundColor: "rgba(18,64,106,0.12)" }]}>
              <MaterialCommunityIcons name="trending-down" size={20} color="#12406A" />
            </View>
            <Text style={styles.ovValue}>Rp {formatRp(totalExpense)}</Text>
            <Text style={styles.ovLabel}>Total Pengeluaran Bulan Ini</Text>
          </View>
        </View>

        <View style={styles.comparisonCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.chartTitle}>Pemasukan vs Pengeluaran</Text>
              <Text style={styles.cardSubtitle}>{periodRange.unitLabel} - {periodRange.label}</Text>
            </View>
            {isComparisonLoading && <ActivityIndicator size="small" color="#0C8C76" />}
          </View>

          <View style={styles.periodNavigator}>
            <Pressable style={styles.navButton} onPress={() => shiftAnchorDate(-1)}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#12406A" />
            </Pressable>
            <View style={styles.periodLabelWrap}>
              <Text style={styles.periodLabel}>{periodRange.label}</Text>
              <Text style={styles.periodHint}>Perbandingan {periodRange.unitLabel.toLowerCase()}</Text>
            </View>
            <Pressable style={styles.navButton} onPress={() => shiftAnchorDate(1)}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#12406A" />
            </Pressable>
          </View>

          {comparisonError ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#E05252" />
              <Text style={styles.errorText}>{comparisonError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.comparisonTotalRow}>
                <View style={styles.totalBlock}>
                  <Text style={styles.totalLabel}>Selisih Periode</Text>
                  <Text style={[styles.totalValue, { color: balanceColor }]}>Rp {formatRp(comparisonData.balance)}</Text>
                  <Text style={styles.totalMeta}>
                    {comparisonData.incomeCount + comparisonData.expenseCount} transaksi
                  </Text>
                </View>
                <View style={styles.balanceBadge}>
                  <Text style={styles.balanceBadgeLabel}>{comparisonData.balance >= 0 ? "Surplus" : "Defisit"}</Text>
                  <MaterialCommunityIcons
                    name={comparisonData.balance >= 0 ? "arrow-up-bold" : "arrow-down-bold"}
                    size={16}
                    color={balanceColor}
                  />
                </View>
              </View>

              <View style={styles.compareBars}>
                <View style={styles.compareBarRow}>
                  <View style={styles.compareBarLabelWrap}>
                    <Text style={styles.compareBarLabel}>Pemasukan</Text>
                    <Text style={styles.compareBarMeta}>{comparisonData.incomeCount} trx</Text>
                  </View>
                  <View style={styles.compareBarTrack}>
                    <View style={[styles.compareBarFill, styles.incomeFill, { width: incomeWidth }]} />
                  </View>
                  <Text style={styles.compareBarAmount}>Rp {formatRp(comparisonData.incomeTotal)}</Text>
                </View>
                <View style={styles.compareBarRow}>
                  <View style={styles.compareBarLabelWrap}>
                    <Text style={styles.compareBarLabel}>Pengeluaran</Text>
                    <Text style={styles.compareBarMeta}>{comparisonData.expenseCount} trx</Text>
                  </View>
                  <View style={styles.compareBarTrack}>
                    <View style={[styles.compareBarFill, styles.expenseFill, { width: expenseWidth }]} />
                  </View>
                  <Text style={styles.compareBarAmount}>Rp {formatRp(comparisonData.expenseTotal)}</Text>
                </View>
              </View>

              <View style={styles.differenceBox}>
                <View style={styles.differenceIcon}>
                  <MaterialCommunityIcons name="scale-balance" size={18} color={balanceColor} />
                </View>
                <View style={styles.differenceTextWrap}>
                  <Text style={styles.differenceLabel}>Selisih</Text>
                  <Text style={[styles.differenceValue, { color: balanceColor }]}>
                    Rp {formatRp(comparisonData.balance)}
                  </Text>
                  <Text style={styles.differenceNote}>Pemasukan dikurangi pengeluaran</Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Pemasukan</Text>
                  <Text style={styles.metricValue}>Rp {formatRp(comparisonData.incomeTotal)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Pengeluaran</Text>
                  <Text style={styles.metricValue}>Rp {formatRp(comparisonData.expenseTotal)}</Text>
                </View>
              </View>

              <View style={styles.categoryCompareWrap}>
                <Text style={styles.sectionSmallTitle}>Kategori Pengeluaran</Text>
                {comparisonData.expenseCategories.slice(0, 4).map((category) => (
                  <View key={category.id} style={styles.compareCategoryRow}>
                    <View style={styles.compareCategoryIcon}>
                      <MaterialCommunityIcons name={category.icon as any} size={16} color="#0C8C76" />
                    </View>
                    <Text style={styles.compareCategoryName}>{category.name}</Text>
                    <Text style={styles.compareCategoryAmount}>Rp {formatRp(category.amount)}</Text>
                  </View>
                ))}
                {comparisonData.expenseCategories.length === 0 && (
                  <Text style={styles.emptyInlineText}>Belum ada pengeluaran pada periode ini</Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Tren Bulanan</Text>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#0C8C76" }]} />
              <Text style={styles.legendText}>Pemasukan</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#12406A" }]} />
              <Text style={styles.legendText}>Pengeluaran</Text>
            </View>
          </View>

          <View style={styles.barsRow}>
            {trendData.length > 0 ? trendData.map((m) => (
              <View key={m.month} style={styles.barGroup}>
                <View style={styles.barPair}>
                  <View
                    style={[styles.bar, styles.barIncome, {
                      height: Math.max(8, (m.income / maxBar) * 100),
                    }]}
                  />
                  <View
                    style={[styles.bar, styles.barExpense, {
                      height: Math.max(8, (m.expense / maxBar) * 100),
                    }]}
                  />
                </View>
                <Text style={styles.barLabel}>{m.month}</Text>
              </View>
            )) : (
              <Text style={styles.emptyChartText}>Belum ada data tren</Text>
            )}
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.chartTitle}>Pengeluaran per Kategori</Text>
          {categorySpending.map((cat) => (
            <View key={cat.label} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.catLabel}>{cat.label}</Text>
              <View style={styles.catBarBg}>
                <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
              </View>
              <Text style={styles.catAmount}>Rp {formatRp(cat.amount)}</Text>
            </View>
          ))}
          {categorySpending.length === 0 && (
            <Text style={styles.emptyInlineText}>Belum ada pengeluaran bulan ini</Text>
          )}
        </View>

        <View style={styles.insightCard}>
          <LinearGradient
            colors={["#0C8C76", "#0FA88E"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.insightGradient}
          >
            <MaterialCommunityIcons name="piggy-bank-outline" size={32} color="#FFFFFF" />
            <View style={styles.insightTextWrap}>
              <Text style={styles.insightTitle}>Tabungan Bulan Ini</Text>
              <Text style={styles.insightAmount}>Rp {formatRp(savings)}</Text>
              <Text style={styles.insightNote}>
                {totalIncome > 0 ? `${Math.round((savings / totalIncome) * 100)}% dari pemasukan berhasil ditabung` : "Belum ada data pemasukan"}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSub: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 4 },

  periodRow: { marginTop: 18, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  periodPill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  periodPillActive: { backgroundColor: "rgba(255,255,255,0.24)", borderColor: "rgba(255,255,255,0.30)" },
  periodText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "rgba(255,255,255,0.62)" },
  periodTextActive: { color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" },

  overviewRow: { marginTop: 18, flexDirection: "row", gap: 14 },
  overviewCard: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 18, borderRadius: 22,
    backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  ovIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ovValue: { marginTop: 14, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#102A43" },
  ovLabel: { marginTop: 2, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },

  comparisonCard: {
    marginTop: 18, borderRadius: 24, backgroundColor: "#FFF", padding: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
    borderWidth: 1, borderColor: "#E8EDF5",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardHeaderText: { flex: 1 },
  cardSubtitle: { marginTop: -8, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  periodNavigator: {
    marginTop: 16, minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 8,
  },
  navButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  periodLabelWrap: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  periodLabel: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#102A43", textAlign: "center" },
  periodHint: { marginTop: 1, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center" },
  errorBox: {
    marginTop: 16, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(224,82,82,0.10)",
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: "Poppins_500Medium", color: "#E05252" },
  comparisonTotalRow: { marginTop: 18, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  totalBlock: { flex: 1 },
  totalLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
  totalValue: { marginTop: 3, fontSize: 16, fontFamily: "Poppins_700Bold", color: "#102A43" },
  totalMeta: { marginTop: 1, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  balanceBadge: {
    minWidth: 94, minHeight: 36, borderRadius: 14, paddingHorizontal: 12,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  balanceBadgeLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  compareBars: { marginTop: 16, gap: 12 },
  compareBarRow: { gap: 8 },
  compareBarLabelWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compareBarLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  compareBarMeta: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  compareBarTrack: { height: 10, borderRadius: 10, backgroundColor: "#EEF3F8", overflow: "hidden" },
  compareBarFill: { height: 10, borderRadius: 10 },
  incomeFill: { backgroundColor: "#0C8C76" },
  expenseFill: { backgroundColor: "#12406A" },
  compareBarAmount: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43", textAlign: "right" },
  differenceBox: {
    marginTop: 16, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12,
  },
  differenceIcon: {
    width: 38, height: 38, borderRadius: 14, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  differenceTextWrap: { flex: 1 },
  differenceLabel: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
  differenceValue: { marginTop: 1, fontSize: 14, fontFamily: "Poppins_700Bold" },
  differenceNote: { marginTop: 1, fontSize: 10, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  metricGrid: { marginTop: 16, flexDirection: "row", gap: 10 },
  metricBox: { flex: 1, borderRadius: 16, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 12 },
  metricLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  metricValue: { marginTop: 3, fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  categoryCompareWrap: { marginTop: 16, gap: 10 },
  sectionSmallTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#102A43" },
  compareCategoryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  compareCategoryIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(12,140,118,0.10)" },
  compareCategoryName: { flex: 1, fontSize: 12, fontFamily: "Poppins_500Medium", color: "#102A43" },
  compareCategoryAmount: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  emptyInlineText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center", paddingVertical: 10 },

  chartCard: {
    marginTop: 18, borderRadius: 24, backgroundColor: "#FFF", padding: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
    borderWidth: 1, borderColor: "#E8EDF5",
  },
  chartTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#102A43", marginBottom: 14, borderLeftWidth: 3, borderLeftColor: "#0C8C76", paddingLeft: 8 },
  chartLegend: { flexDirection: "row", gap: 20, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#64748B" },

  barsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 120 },
  barGroup: { alignItems: "center", gap: 6 },
  barPair: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  bar: { width: 20, borderRadius: 6 },
  barIncome: { backgroundColor: "#0C8C76" },
  barExpense: { backgroundColor: "#12406A" },
  barLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },
  emptyChartText: { color: "#94A3B8", fontFamily: "Poppins_400Regular", textAlign: "center", flex: 1, paddingVertical: 20 },

  breakdownCard: {
    marginTop: 18, borderRadius: 24, backgroundColor: "#FFF", padding: 20,
    shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
    borderWidth: 1, borderColor: "#E8EDF5",
  },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { width: 80, fontSize: 13, fontFamily: "Poppins_500Medium", color: "#102A43" },
  catBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F1F5F9" },
  catBarFill: { height: 8, borderRadius: 4 },
  catAmount: { width: 100, textAlign: "right", fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#102A43" },

  insightCard: { marginTop: 18, borderRadius: 24, overflow: "hidden" },
  insightGradient: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 22, paddingVertical: 22 },
  insightTextWrap: { flex: 1 },
  insightTitle: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "rgba(255,255,255,0.78)" },
  insightAmount: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#FFF", marginTop: 2 },
  insightNote: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 4 },
});
