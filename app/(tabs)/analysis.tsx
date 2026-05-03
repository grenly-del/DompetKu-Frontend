import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, DateData } from "react-native-calendars";
import { LineChart, lineDataItem } from "react-native-gifted-charts";
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

type PeriodMode = "day" | "month" | "year";

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
  buckets: ComparisonBucket[];
  expenseCategories: CategoryTotal[];
};

type ComparisonBucket = {
  id: string;
  label: string;
  incomeTotal: number;
  expenseTotal: number;
  incomeCount: number;
  expenseCount: number;
  balance: number;
  expenseCategories: CategoryTotal[];
};

type MonthlyTotals = {
  income: number;
  expense: number;
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const categoryColors = ["#0C8C76", "#12406A", "#F2C94C", "#3D52A0", "#E05252", "#D4A017", "#64748B"];
const CHART_COLORS = {
  income: "#0C8C76",
  expense: "#12406A",
  balance: "#E05252",
};
const ANALYSIS_MODES: { key: PeriodMode; label: string; helper: string }[] = [
  { key: "day", label: "Hari", helper: "maks. 10 hari" },
  { key: "month", label: "Bulan", helper: "maks. 10 bulan" },
  { key: "year", label: "Tahun", helper: "maks. 10 tahun" },
];

const emptyComparison: FinanceComparisonData = {
  incomeTotal: 0,
  expenseTotal: 0,
  incomeCount: 0,
  expenseCount: 0,
  balance: 0,
  buckets: [],
  expenseCategories: [],
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

function formatCompactRp(value: number): string {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "";

  if (abs >= 1000000) {
    return `${prefix}${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(abs / 1000000)}jt`;
  }

  if (abs >= 1000) {
    return `${prefix}${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(abs / 1000)}rb`;
  }

  return `${prefix}${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(abs)}`;
}

function toChartPoint(value: number, label?: string): lineDataItem {
  return { value, label };
}

function getChartScale(values: number[]): number {
  const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value)));

  if (maxAbs >= 1000000) return 1000000;
  if (maxAbs >= 1000) return 1000;
  return 1;
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return new Date(targetYear, normalizedMonth, Math.min(date.getDate(), lastDay));
}

function addYearsClamped(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years;
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay));
}

function getMaxRangeEnd(start: Date, mode: PeriodMode): Date {
  if (mode === "month") return addMonthsClamped(start, 9);
  if (mode === "year") return addYearsClamped(start, 9);
  return addDays(start, 9);
}

function clampRangeToMode(startKey: string, endKey: string, mode: PeriodMode): { startKey: string; endKey: string } {
  const fallback = startOfDay(new Date());
  const parsedStart = parseDateKey(startKey) ?? fallback;
  const parsedEnd = parseDateKey(endKey) ?? parsedStart;
  const start = startOfDay(parsedStart <= parsedEnd ? parsedStart : parsedEnd);
  const end = startOfDay(parsedStart <= parsedEnd ? parsedEnd : parsedStart);
  const maxEnd = getMaxRangeEnd(start, mode);

  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end > maxEnd ? maxEnd : end),
  };
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

function buildSelectedRange(mode: PeriodMode, startDateKey: string, endDateKey: string): PeriodRange {
  const fallback = startOfDay(new Date());
  const startValue = parseDateKey(startDateKey) ?? fallback;
  const endValue = parseDateKey(endDateKey) ?? startValue;
  const start = startOfDay(startValue <= endValue ? startValue : endValue);
  const end = endOfDay(startValue <= endValue ? endValue : startValue);
  let unitLabel = "Harian";

  if (mode === "month") {
    unitLabel = "Bulanan";
  }

  if (mode === "year") {
    unitLabel = "Tahunan";
  }

  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    label: formatRangeLabel(start, end),
    unitLabel,
  };
}

function getBucketKeyAndLabel(date: Date, mode: PeriodMode): { key: string; label: string } {
  if (mode === "month") {
    return {
      key: `month-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    };
  }

  if (mode === "year") {
    return { key: `year-${date.getFullYear()}`, label: `Tahun ${date.getFullYear()}` };
  }

  return { key: `day-${toDateKey(date)}`, label: formatDateShort(date) };
}

function createEmptyBuckets(mode: PeriodMode, start: Date, end: Date): ComparisonBucket[] {
  const buckets: ComparisonBucket[] = [];
  const seen = new Set<string>();
  let cursor = startOfDay(start);
  const last = startOfDay(end);

  while (cursor <= last) {
    const bucketInfo = getBucketKeyAndLabel(cursor, mode);
    const key = bucketInfo.key;
    const label = bucketInfo.label;
    if (!seen.has(key)) {
      seen.add(key);
      buckets.push({
        id: key,
        label,
        incomeTotal: 0,
        expenseTotal: 0,
        incomeCount: 0,
        expenseCount: 0,
        balance: 0,
        expenseCategories: [],
      });
    }

    if (mode === "year") {
      cursor = new Date(cursor.getFullYear() + 1, 0, 1);
    } else if (mode === "month") {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    } else {
      cursor = addDays(cursor, 1);
    }
  }

  return buckets;
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

function summarizeFinanceComparison(transactions: Transaction[], mode: PeriodMode, range: PeriodRange): FinanceComparisonData {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const categoryMap = new Map<string, CategoryTotal>();
  const bucketMap = new Map<string, ComparisonBucket>();

  createEmptyBuckets(mode, range.start, range.end).forEach((bucket) => {
    bucketMap.set(bucket.id, bucket);
  });

  transactions.forEach((tx) => {
    const amount = Number(tx.amount);
    const txDate = new Date(tx.date);
    const { key, label } = getBucketKeyAndLabel(txDate, mode);
    const bucket = bucketMap.get(key) ?? {
      id: key,
      label,
      incomeTotal: 0,
      expenseTotal: 0,
      incomeCount: 0,
      expenseCount: 0,
      balance: 0,
      expenseCategories: [],
    };

    if (tx.type === "INCOME") {
      incomeTotal += amount;
      incomeCount += 1;
      bucket.incomeTotal += amount;
      bucket.incomeCount += 1;
      bucket.balance = bucket.incomeTotal - bucket.expenseTotal;
      bucketMap.set(key, bucket);
      return;
    }

    expenseTotal += amount;
    expenseCount += 1;
    bucket.expenseTotal += amount;
    bucket.expenseCount += 1;
    bucket.balance = bucket.incomeTotal - bucket.expenseTotal;
    bucketMap.set(key, bucket);

    const category = tx.category;
    const categoryId = category?.id ?? "unknown";
    const existing = categoryMap.get(categoryId);
    const existingBucketCategory = bucket.expenseCategories.find((item) => item.id === categoryId);
    const nextBucketCategoryAmount = (existingBucketCategory?.amount ?? 0) + amount;

    bucket.expenseCategories = [
      ...bucket.expenseCategories.filter((item) => item.id !== categoryId),
      {
        id: categoryId,
        name: category?.name ?? "Tanpa kategori",
        icon: category?.icon ?? "help-circle-outline",
        amount: nextBucketCategoryAmount,
        percent: 0,
      },
    ].sort((a, b) => b.amount - a.amount);

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
    buckets: Array.from(bucketMap.values()),
    expenseCategories,
  };
}

function buildMarkedRange(startKey: string, endKey: string): Record<string, any> {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  if (!start || !end) return {};

  const marks: Record<string, any> = {};
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  let cursor = startOfDay(first);

  while (cursor <= last) {
    const key = toDateKey(cursor);
    const isStart = key === toDateKey(first);
    const isEnd = key === toDateKey(last);

    marks[key] = {
      color: "#0C8C76",
      textColor: "#FFFFFF",
      startingDay: isStart,
      endingDay: isEnd,
    };

    if (isStart && isEnd) {
      marks[key].startingDay = true;
      marks[key].endingDay = true;
    }

    cursor = addDays(cursor, 1);
  }

  return marks;
}

function CalendarRangeModal({
  visible,
  startKey,
  endKey,
  onClose,
  onChange,
}: {
  visible: boolean;
  startKey: string;
  endKey: string;
  onClose: () => void;
  onChange: (startKey: string, endKey: string) => void;
}) {
  const [draftStart, setDraftStart] = useState(startKey);
  const [draftEnd, setDraftEnd] = useState(endKey);
  const [selectingTarget, setSelectingTarget] = useState<"start" | "end">("start");

  useEffect(() => {
    if (visible) {
      setDraftStart(startKey);
      setDraftEnd(endKey);
      setSelectingTarget("start");
    }
  }, [visible, endKey, startKey]);

  const markedDates = useMemo(() => buildMarkedRange(draftStart, draftEnd), [draftEnd, draftStart]);
  const rangeLabel = useMemo(() => {
    const start = parseDateKey(draftStart) ?? new Date();
    const end = parseDateKey(draftEnd) ?? start;
    return formatRangeLabel(start, end);
  }, [draftEnd, draftStart]);

  const handleDayPress = (day: DateData) => {
    const nextKey = day.dateString;
    const nextDate = parseDateKey(nextKey);
    const currentStart = parseDateKey(draftStart);
    const currentEnd = parseDateKey(draftEnd);

    if (!nextDate) {
      return;
    }

    if (selectingTarget === "start") {
      setDraftStart(nextKey);
      if (currentEnd && nextDate > currentEnd) {
        setDraftEnd(nextKey);
      }
      setSelectingTarget("end");
      return;
    }

    if (currentStart && nextDate < currentStart) {
      setDraftStart(nextKey);
      setDraftEnd(draftStart);
    } else {
      setDraftEnd(nextKey);
    }

    setSelectingTarget("end");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dpStyles.overlay}>
        <Pressable style={dpStyles.backdrop} onPress={onClose} />
        <View style={dpStyles.card}>
          <View style={dpStyles.titleRow}>
            <View>
              <Text style={dpStyles.title}>Pilih Range Waktu</Text>
              <Text style={dpStyles.subtitle}>
                {selectingTarget === "start" ? "Pilih tanggal awal" : "Pilih tanggal akhir"}
              </Text>
            </View>
            <Pressable style={dpStyles.closeIconBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </Pressable>
          </View>
          <View style={dpStyles.selectedRangeBox}>
            <MaterialCommunityIcons name="calendar-range" size={18} color="#0C8C76" />
            <Text style={dpStyles.selectedRangeText}>{rangeLabel}</Text>
          </View>
          <View style={dpStyles.targetSwitch}>
            <Pressable
              style={[dpStyles.targetBtn, selectingTarget === "start" && dpStyles.targetBtnActive]}
              onPress={() => setSelectingTarget("start")}
            >
              <Text style={[dpStyles.targetLabel, selectingTarget === "start" && dpStyles.targetLabelActive]}>Dari</Text>
              <Text style={[dpStyles.targetValue, selectingTarget === "start" && dpStyles.targetValueActive]}>
                {formatDateShort(parseDateKey(draftStart) ?? new Date())}
              </Text>
            </Pressable>
            <Pressable
              style={[dpStyles.targetBtn, selectingTarget === "end" && dpStyles.targetBtnActive]}
              onPress={() => setSelectingTarget("end")}
            >
              <Text style={[dpStyles.targetLabel, selectingTarget === "end" && dpStyles.targetLabelActive]}>Sampai</Text>
              <Text style={[dpStyles.targetValue, selectingTarget === "end" && dpStyles.targetValueActive]}>
                {formatDateShort(parseDateKey(draftEnd) ?? new Date())}
              </Text>
            </Pressable>
          </View>
          <Calendar
            current={draftStart}
            markingType="period"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            enableSwipeMonths
            firstDay={1}
            hideExtraDays={false}
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              textSectionTitleColor: "#94A3B8",
              selectedDayBackgroundColor: "#0C8C76",
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: "#0C8C76",
              dayTextColor: "#102A43",
              textDisabledColor: "#CBD5E1",
              arrowColor: "#12406A",
              monthTextColor: "#102A43",
              textDayFontFamily: "Poppins_400Regular",
              textMonthFontFamily: "Poppins_700Bold",
              textDayHeaderFontFamily: "Poppins_600SemiBold",
            }}
          />
          <View style={dpStyles.actions}>
            <Pressable style={dpStyles.cancelBtn} onPress={onClose}>
              <Text style={dpStyles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              style={dpStyles.confirmBtn}
              onPress={() => {
                onChange(draftStart, draftEnd);
                onClose();
              }}
            >
              <LinearGradient colors={["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dpStyles.confirmGradient}>
                <Text style={dpStyles.confirmText}>Pilih</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AnalysisTab() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const userId = user?.id ?? null;
  const { summary } = useMonthlySummary(userId, month, year);
  const { trend } = useYearlyTrend(userId, year);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [rangeStart, setRangeStart] = useState(() => toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [rangeEnd, setRangeEnd] = useState(() => toDateKey(new Date()));
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [comparisonData, setComparisonData] = useState<FinanceComparisonData>(emptyComparison);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({ income: 0, expense: 0 });
  const [isMonthlyTotalsLoading, setIsMonthlyTotalsLoading] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  const periodRange = useMemo(
    () => buildSelectedRange(periodMode, rangeStart, rangeEnd),
    [periodMode, rangeEnd, rangeStart]
  );

  useEffect(() => {
    const nextRange = clampRangeToMode(rangeStart, rangeEnd, periodMode);
    if (nextRange.startKey !== rangeStart || nextRange.endKey !== rangeEnd) {
      setRangeStart(nextRange.startKey);
      setRangeEnd(nextRange.endKey);
    }
  }, [periodMode, rangeEnd, rangeStart]);

  const handleSelectRange = useCallback((startKey: string, endKey: string) => {
    const nextRange = clampRangeToMode(startKey, endKey, periodMode);
    setRangeStart(nextRange.startKey);
    setRangeEnd(nextRange.endKey);
  }, [periodMode]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!userId) {
        setMonthlyTotals({ income: 0, expense: 0 });
        setIsMonthlyTotalsLoading(false);
        return () => {
          active = false;
        };
      }

      const monthStartKey = toDateKey(new Date(year, month - 1, 1));
      const monthEndKey = toDateKey(new Date(year, month, 0));

      setIsMonthlyTotalsLoading(true);
      fetchTransactionsByRange(monthStartKey, monthEndKey)
        .then((transactions) => {
          if (!active) return;

          const nextTotals = transactions.reduce<MonthlyTotals>(
            (totals, tx) => {
              const amount = Number(tx.amount) || 0;
              if (tx.type === "INCOME") {
                return { ...totals, income: totals.income + amount };
              }

              return { ...totals, expense: totals.expense + amount };
            },
            { income: 0, expense: 0 }
          );

          setMonthlyTotals(nextTotals);
        })
        .catch(() => {
          if (active) {
            setMonthlyTotals({ income: 0, expense: 0 });
          }
        })
        .finally(() => {
          if (active) {
            setIsMonthlyTotalsLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [month, userId, year])
  );

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

          setComparisonData(summarizeFinanceComparison(transactions, periodMode, periodRange));
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
    }, [periodMode, periodRange, userId])
  );

  if (!fontsLoaded) return <View style={styles.loading} />;

  const totalIncome = monthlyTotals.income;
  const totalExpense = monthlyTotals.expense;
  const savings = totalIncome - totalExpense;
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
  const balanceColor = comparisonData.balance >= 0 ? "#0C8C76" : "#E05252";
  const chartWidth = Math.max(220, width - 148);
  const chartBuckets = comparisonData.buckets.length > 0
    ? comparisonData.buckets
    : [{ id: "empty", label: periodRange.label, incomeTotal: 0, expenseTotal: 0, incomeCount: 0, expenseCount: 0, balance: 0, expenseCategories: [] }];
  const labelStep = Math.max(1, Math.ceil(chartBuckets.length / 5));
  const chartSpacing = chartBuckets.length > 1
    ? Math.max(54, Math.min(74, chartWidth / Math.min(chartBuckets.length - 1, 4)))
    : chartWidth / 2;
  const shouldScrollChart = chartBuckets.length > 4;
  const makeBucketLabel = (index: number, fallback: string) => {
    if (chartBuckets.length <= 4 || index % labelStep === 0 || index === chartBuckets.length - 1) {
      return fallback;
    }

    return "";
  };
  const financeValues = chartBuckets.flatMap((bucket) => [bucket.incomeTotal, bucket.expenseTotal, bucket.balance]);
  const financeChartScale = getChartScale(financeValues);
  const incomeLineData = chartBuckets.map((bucket, index) => toChartPoint(bucket.incomeTotal / financeChartScale, makeBucketLabel(index, bucket.label)));
  const expenseLineData = chartBuckets.map((bucket, index) => toChartPoint(bucket.expenseTotal / financeChartScale, makeBucketLabel(index, bucket.label)));
  const balanceLineData = chartBuckets.map((bucket, index) => toChartPoint(bucket.balance / financeChartScale, makeBucketLabel(index, bucket.label)));
  const scaledFinanceValues = financeValues.map((value) => value / financeChartScale);
  const financeMaxValue = Math.max(1, ...scaledFinanceValues);
  const financeMinValue = Math.min(0, ...scaledFinanceValues);
  const categoryChartSource = comparisonData.expenseCategories.slice(0, 4);
  const categoryRawSeries = categoryChartSource.map((category) =>
    chartBuckets.map((bucket) => {
      const bucketCategory = bucket.expenseCategories.find((item) => item.id === category.id);
      return bucketCategory?.amount ?? 0;
    })
  );
  const categoryChartScale = getChartScale(categoryRawSeries.flat());
  const categoryLineData = categoryRawSeries.map((series) =>
    series.map((value, bucketIndex) => toChartPoint(value / categoryChartScale, makeBucketLabel(bucketIndex, chartBuckets[bucketIndex]?.label ?? "")))
  );
  const categoryMaxValue = Math.max(1, ...categoryLineData.flatMap((series) => series.map((item) => item.value ?? 0)));
  const floatingTabBottomPadding = 104;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: floatingTabBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerOrb} />
          <Text style={styles.headerTitle}>Analisis Keuangan</Text>
          <Text style={styles.headerSub}>Pilih range tanggal dari kalender untuk melihat perbandingan pemasukan dan pengeluaran</Text>
        </LinearGradient>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <View style={[styles.ovIconWrap, { backgroundColor: "rgba(12,140,118,0.12)" }]}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#0C8C76" />
            </View>
            {isMonthlyTotalsLoading ? (
              <ActivityIndicator style={styles.ovLoader} color="#0C8C76" size="small" />
            ) : (
              <Text style={styles.ovValue}>Rp {formatRp(totalIncome)}</Text>
            )}
            <Text style={styles.ovLabel}>Total Pemasukan Bulan Ini</Text>
          </View>
          <View style={styles.overviewCard}>
            <View style={[styles.ovIconWrap, { backgroundColor: "rgba(18,64,106,0.12)" }]}>
              <MaterialCommunityIcons name="trending-down" size={20} color="#12406A" />
            </View>
            {isMonthlyTotalsLoading ? (
              <ActivityIndicator style={styles.ovLoader} color="#12406A" size="small" />
            ) : (
              <Text style={styles.ovValue}>Rp {formatRp(totalExpense)}</Text>
            )}
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

          <View style={styles.modeFilterRow}>
            {ANALYSIS_MODES.map((mode) => {
              const active = periodMode === mode.key;
              return (
                <Pressable
                  key={mode.key}
                  style={[styles.modeFilterBtn, active && styles.modeFilterBtnActive]}
                  onPress={() => setPeriodMode(mode.key)}
                >
                  <Text style={[styles.modeFilterText, active && styles.modeFilterTextActive]}>{mode.label}</Text>
                  <Text style={[styles.modeFilterHint, active && styles.modeFilterHintActive]}>{mode.helper}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.calendarPickerButton} onPress={() => setIsCalendarVisible(true)}>
            <View style={styles.rangePickerRow}>
              <View style={styles.dateRangeButton}>
                <Text style={styles.dateRangeLabel}>Dari</Text>
                <View style={styles.dateRangeValueRow}>
                  <MaterialCommunityIcons name="calendar-start" size={17} color="#0C8C76" />
                  <Text style={styles.dateRangeValue}>{formatDateShort(periodRange.start)}</Text>
                </View>
              </View>
              <View style={styles.rangeArrowWrap}>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#94A3B8" />
              </View>
              <View style={styles.dateRangeButton}>
                <Text style={styles.dateRangeLabel}>Sampai</Text>
                <View style={styles.dateRangeValueRow}>
                  <MaterialCommunityIcons name="calendar-end" size={17} color="#0C8C76" />
                  <Text style={styles.dateRangeValue}>{formatDateShort(periodRange.end)}</Text>
                </View>
              </View>
            </View>
          </Pressable>
          <Text style={styles.periodHint}>Analisis {periodRange.unitLabel.toLowerCase()} untuk {periodRange.label}</Text>

          {comparisonError ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#E05252" />
              <Text style={styles.errorText}>{comparisonError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.lineChartPanel}>
                <View style={styles.chartLegendWrap}>
                  <View style={styles.lineLegendItem}>
                    <View style={[styles.lineLegendDot, { backgroundColor: CHART_COLORS.income }]} />
                    <Text style={styles.lineLegendText}>Pemasukan</Text>
                  </View>
                  <View style={styles.lineLegendItem}>
                    <View style={[styles.lineLegendDot, { backgroundColor: CHART_COLORS.expense }]} />
                    <Text style={styles.lineLegendText}>Pengeluaran</Text>
                  </View>
                  <View style={styles.lineLegendItem}>
                    <View style={[styles.lineLegendDot, { backgroundColor: CHART_COLORS.balance }]} />
                    <Text style={styles.lineLegendText}>Selisih</Text>
                  </View>
                </View>
                <View style={styles.chartClip}>
                  <LineChart
                    data={incomeLineData}
                    data2={expenseLineData}
                    data3={balanceLineData}
                    height={220}
                    width={chartWidth}
                    spacing={chartSpacing}
                    initialSpacing={12}
                    endSpacing={16}
                    maxValue={financeMaxValue}
                    mostNegativeValue={financeMinValue}
                    noOfSections={4}
                    noOfSectionsBelowXAxis={financeMinValue < 0 ? 2 : 0}
                    yAxisLabelWidth={44}
                    yAxisTextStyle={styles.chartAxisText}
                    xAxisLabelTextStyle={styles.chartAxisText}
                    rulesColor="#E2E8F0"
                    xAxisColor="#E2E8F0"
                    yAxisColor="#E2E8F0"
                    color1={CHART_COLORS.income}
                    color2={CHART_COLORS.expense}
                    color3={CHART_COLORS.balance}
                    thickness1={3}
                    thickness2={3}
                    thickness3={3}
                    dataPointsColor1={CHART_COLORS.income}
                    dataPointsColor2={CHART_COLORS.expense}
                    dataPointsColor3={CHART_COLORS.balance}
                    dataPointsRadius1={3}
                    dataPointsRadius2={3}
                    dataPointsRadius3={3}
                    formatYLabel={(label) => formatCompactRp(Number(label) * financeChartScale)}
                    curved
                    disableScroll={!shouldScrollChart}
                    nestedScrollEnabled
                    showScrollIndicator={shouldScrollChart}
                    isAnimated={false}
                    animateOnDataChange={false}
                    thickness={3}
                    hideDataPoints={false}
                    focusEnabled
                    showStripOnFocus
                    showDataPointOnFocus
                    stripColor="#CBD5E1"
                    stripOpacity={0.5}
                  />
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Pemasukan</Text>
                  <Text style={[styles.metricValue, { color: CHART_COLORS.income }]}>Rp {formatRp(comparisonData.incomeTotal)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Pengeluaran</Text>
                  <Text style={[styles.metricValue, { color: CHART_COLORS.expense }]}>Rp {formatRp(comparisonData.expenseTotal)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Selisih</Text>
                  <Text style={[styles.metricValue, { color: balanceColor }]}>Rp {formatRp(comparisonData.balance)}</Text>
                </View>
              </View>

              <View style={styles.categoryLinePanel}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.sectionSmallTitle}>Trend Kategori Pengeluaran</Text>
                    <Text style={styles.categoryChartHint}>Kategori teratas pada range yang dipilih</Text>
                  </View>
                </View>
                {categoryLineData.length > 0 ? (
                  <>
                    <View style={styles.chartLegendWrap}>
                      {categoryChartSource.map((category, index) => (
                        <View key={category.id} style={styles.lineLegendItem}>
                          <View style={[styles.lineLegendDot, { backgroundColor: categoryColors[index % categoryColors.length] }]} />
                          <Text style={styles.lineLegendText} numberOfLines={1}>{category.name}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.chartClip}>
                      <LineChart
                        data={categoryLineData[0] ?? []}
                        data2={categoryLineData[1] ?? []}
                        data3={categoryLineData[2] ?? []}
                        data4={categoryLineData[3] ?? []}
                        height={190}
                        width={chartWidth}
                        spacing={chartSpacing}
                        initialSpacing={12}
                        endSpacing={16}
                        maxValue={categoryMaxValue}
                        noOfSections={4}
                        yAxisLabelWidth={44}
                        yAxisTextStyle={styles.chartAxisText}
                        xAxisLabelTextStyle={styles.chartAxisText}
                        rulesColor="#E2E8F0"
                        xAxisColor="#E2E8F0"
                        yAxisColor="#E2E8F0"
                        color1={categoryColors[0]}
                        color2={categoryColors[1]}
                        color3={categoryColors[2]}
                        color4={categoryColors[3]}
                        thickness1={3}
                        thickness2={3}
                        thickness3={3}
                        thickness4={3}
                        dataPointsColor1={categoryColors[0]}
                        dataPointsColor2={categoryColors[1]}
                        dataPointsColor3={categoryColors[2]}
                        dataPointsColor4={categoryColors[3]}
                        dataPointsRadius1={3}
                        dataPointsRadius2={3}
                        dataPointsRadius3={3}
                        dataPointsRadius4={3}
                        formatYLabel={(label) => formatCompactRp(Number(label) * categoryChartScale)}
                        curved
                        disableScroll={!shouldScrollChart}
                        nestedScrollEnabled
                        showScrollIndicator={shouldScrollChart}
                        isAnimated={false}
                        animateOnDataChange={false}
                        thickness={3}
                        hideDataPoints={false}
                        focusEnabled
                        showStripOnFocus
                        showDataPointOnFocus
                        stripColor="#CBD5E1"
                        stripOpacity={0.5}
                      />
                    </View>
                  </>
                ) : (
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
      <CalendarRangeModal
        visible={isCalendarVisible}
        startKey={periodRange.startKey}
        endKey={periodRange.endKey}
        onClose={() => setIsCalendarVisible(false)}
        onChange={handleSelectRange}
      />
    </SafeAreaView>
  );
}

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
  titleRow: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  title: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRangeBox: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "rgba(12,140,118,0.10)",
    borderWidth: 1,
    borderColor: "rgba(12,140,118,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedRangeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  targetSwitch: {
    marginBottom: 12,
    flexDirection: "row",
    gap: 10,
  },
  targetBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
  },
  targetBtnActive: {
    backgroundColor: "rgba(12,140,118,0.10)",
    borderColor: "rgba(12,140,118,0.28)",
  },
  targetLabel: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#94A3B8",
  },
  targetLabelActive: { color: "#0C8C76" },
  targetValue: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  targetValueActive: { color: "#0C8C76" },
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSub: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 4 },

  overviewRow: { marginTop: 18, flexDirection: "row", gap: 14 },
  overviewCard: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 18, borderRadius: 22,
    backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  ovIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ovLoader: { marginTop: 14, alignSelf: "flex-start" },
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
  modeFilterRow: { marginTop: 16, flexDirection: "row", gap: 8 },
  modeFilterBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  modeFilterBtnActive: { backgroundColor: "rgba(12,140,118,0.10)", borderColor: "rgba(12,140,118,0.28)" },
  modeFilterText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#64748B", textAlign: "center" },
  modeFilterTextActive: { color: "#0C8C76" },
  modeFilterHint: { marginTop: 1, fontSize: 9, fontFamily: "Poppins_400Regular", color: "#94A3B8", textAlign: "center" },
  modeFilterHintActive: { color: "#0C8C76" },
  calendarPickerButton: { marginTop: 16, borderRadius: 18 },
  rangePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  dateRangeLabel: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
  dateRangeValueRow: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  dateRangeValue: { flex: 1, fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  rangeArrowWrap: { width: 24, alignItems: "center", justifyContent: "center" },
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
  lineChartPanel: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 14,
    paddingRight: 6,
    paddingBottom: 8,
    overflow: "hidden",
  },
  chartClip: { width: "100%", overflow: "hidden" },
  chartLegendWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lineLegendItem: {
    maxWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lineLegendDot: { width: 9, height: 9, borderRadius: 5 },
  lineLegendText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#64748B" },
  chartAxisText: { fontSize: 9, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
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
  categoryLinePanel: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 14,
    paddingRight: 6,
    paddingBottom: 8,
    overflow: "hidden",
  },
  categoryChartHint: { marginTop: -8, marginBottom: 12, fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  periodBreakdownWrap: { marginTop: 16, gap: 10 },
  breakdownItem: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  breakdownItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  breakdownItemTitle: { flex: 1, fontSize: 12, fontFamily: "Poppins_700Bold", color: "#102A43" },
  breakdownBalance: { fontSize: 12, fontFamily: "Poppins_700Bold" },
  miniCompareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniCompareLabel: { width: 42, fontSize: 10, fontFamily: "Poppins_500Medium", color: "#64748B" },
  miniCompareTrack: { flex: 1, height: 8, borderRadius: 8, backgroundColor: "#EEF3F8", overflow: "hidden" },
  miniCompareFill: { height: 8, borderRadius: 8 },
  miniCompareAmount: { width: 88, textAlign: "right", fontSize: 10, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
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
