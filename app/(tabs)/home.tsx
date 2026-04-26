import React, { useState, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { useAuth } from "../../contexts/AuthContext";
import { transactionService, Transaction as TxType } from "../../services/transaction.service";
import { useBalanceOverview } from "../../hooks/useBalanceOverview";
import { useMonthlySummary } from "../../hooks/useMonthlySummary";
import TransactionDetailSheet from "../../components/transactions/TransactionDetailSheet";

// ─── Helpers ──────────────────────────────────────────────────
const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function todayString(): string {
  const d = new Date();
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Quick Actions Config ───────────────────────────────────────
type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: [string, string];
  route: string;
};

const quickActions: QuickAction[] = [
  {
    id: "expense",
    label: "Pengeluaran",
    icon: "cash-minus",
    gradient: ["#12406A", "#1A5276"],
    route: "/addExpense",
  },
  {
    id: "income",
    label: "Pemasukan",
    icon: "cash-plus",
    gradient: ["#0C8C76", "#0FA88E"],
    route: "/addIncome",
  },
  {
    id: "category",
    label: "Kategori",
    icon: "shape-outline",
    gradient: ["#2C3E7B", "#3D52A0"],
    route: "/categories",
  },
  {
    id: "budget",
    label: "Planning",
    icon: "clipboard-text-outline",
    gradient: ["#B8860B", "#D4A017"],
    route: "/planBudget",
  },
];

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Format kompak untuk angka besar:
 * 10.000.000  → "10 jt"
 * 1.500.000   → "1,5 jt"
 * 100.000     → "100 rb"
 * 15.500      → "15,5 rb"
 * 500         → "500"
 */
function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const val = n / 1_000_000;
    const str = val % 1 === 0 ? val.toString() : val.toFixed(1).replace('.', ',');
    return `${str} jt`;
  }
  if (abs >= 1_000) {
    const val = n / 1_000;
    const str = val % 1 === 0 ? val.toString() : val.toFixed(1).replace('.', ',');
    return `${str} rb`;
  }
  return n.toString();
}

// ─── Component ──────────────────────────────────────────────────
export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [transactions, setTransactions] = useState<TxType[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TxType | null>(null);
  const [hoveredQuickAction, setHoveredQuickAction] = useState<string | null>(null);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { summary } = useMonthlySummary(userId, month, year);
  const { overview, isLoading: isBalanceLoading } = useBalanceOverview(userId);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const loadTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      return;
    }

    try {
      const txRes = await transactionService.getAll({ month, year, limit: 5 });
      setTransactions(txRes.transactions);
    } catch (err) {
      console.error('Home load error:', err);
    }
  }, [month, year, userId]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const handleTransactionDeleted = useCallback((transactionId: string) => {
    setTransactions((current) => current.filter((tx) => tx.id !== transactionId));
    setSelectedTransaction(null);
    void loadTransactions();
  }, [loadTransactions]);

  const balance = overview?.totalBalance ?? 0;
  const totalIncome = summary ? summary.totalIncome : 0;
  const totalExpense = summary ? summary.totalExpense : 0;
  const displayName = user?.username || 'Pengguna';
  const balanceText = overview
    ? `Rp ${formatRp(balance)}`
    : isBalanceLoading
      ? 'Memuat...'
      : 'Rp 0';

  if (!fontsLoaded) return <View style={styles.loading} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <View style={styles.bgLayer}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Card ── */}
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerOrbTop} />
          <View style={styles.headerOrbBottom} />

          {/* Top row */}
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greeting}>Hai, {displayName}! 👋</Text>
              <Text style={styles.dateText}>{todayString()}</Text>
            </View>
            <Pressable style={styles.notifBtn}>
              <Feather name="bell" size={20} color="#FFFFFF" />
              <View style={styles.notifDot} />
            </Pressable>
          </View>

          {/* Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Total Saldo</Text>
            <Text style={styles.balanceAmount}>{balanceText}</Text>
          </View>

          {/* Income / Expense summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconWrap, { backgroundColor: "rgba(52, 224, 161, 0.22)" }]}>
                <MaterialCommunityIcons name="trending-up" size={18} color="#34E0A1" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Pemasukan</Text>
                <Text style={styles.summaryValue}>+Rp {formatCompact(totalIncome)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconWrap, { backgroundColor: "rgba(242, 201, 76, 0.22)" }]}>
                <MaterialCommunityIcons name="trending-down" size={18} color="#F2C94C" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Pengeluaran</Text>
                <Text style={styles.summaryValue}>-Rp {formatCompact(totalExpense)}</Text>
              </View>
            </View>
          </View>

        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleAccent} />
            <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          </View>
        </View>
        <View style={styles.qaGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.qaItem, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(action.route as never)}
            >
              <LinearGradient
                colors={action.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.qaButton}
              >
                <MaterialCommunityIcons name={action.icon} size={26} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.qaLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleAccent} />
            <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/history" as never)}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </Pressable>
        </View>

        <View style={styles.transactionsCard}>
          {transactions.length === 0 ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 20, fontFamily: 'Poppins_400Regular' }}>Belum ada transaksi bulan ini</Text>
          ) : transactions.map((tx, idx) => {
            const isIncome = tx.type === "INCOME";
            const txDate = new Date(tx.date);
            const timeStr = `${txDate.getDate()} ${monthNames[txDate.getMonth()]}`;
            return (
              <View key={tx.id}>
                <Pressable
                  style={({ pressed }) => [
                    styles.txRow,
                    pressed && styles.txRowPressed,
                  ]}
                  onPress={() => setSelectedTransaction(tx)}
                >
                  <View style={[styles.txAccent, { backgroundColor: isIncome ? "#0C8C76" : "#E05252" }]} />
                  <View
                    style={[
                      styles.txIconWrap,
                      {
                        backgroundColor: isIncome
                          ? "rgba(12, 140, 118, 0.12)"
                          : "rgba(18, 64, 106, 0.12)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={(tx.category?.icon || 'help-circle-outline') as any}
                      size={20}
                      color={isIncome ? "#0C8C76" : "#12406A"}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txName}>{tx.name}</Text>
                    <Text style={styles.txCategory}>
                      {tx.category?.name || 'Tanpa kategori'} · {timeStr}
                    </Text>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? "#0C8C76" : "#E05252" },
                      ]}
                    >
                      {isIncome ? "+" : "-"}Rp {formatRp(Number(tx.amount))}
                    </Text>
                    <Feather name="chevron-right" size={15} color="#94A3B8" />
                  </View>
                </Pressable>
                {idx < transactions.length - 1 && (
                  <View style={styles.txDivider} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <TransactionDetailSheet
        visible={selectedTransaction !== null}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDeleted={handleTransactionDeleted}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  loading: {
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
    paddingBottom: 28,
  },

  // ── Header ──
  headerCard: {
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    overflow: "hidden",
  },
  headerOrbTop: {
    position: "absolute",
    top: -110,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerOrbBottom: {
    position: "absolute",
    left: -80,
    bottom: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  dateText: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.68)",
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F2C94C",
    borderWidth: 1.5,
    borderColor: "#12406A",
  },

  // ── Balance ──
  balanceSection: {
    marginTop: 28,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.62)",
    letterSpacing: 0.3,
  },
  balanceAmount: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    marginTop: 2,
  },

  // ── Summary cards ──
  summaryRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.62)",
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    marginTop: 1,
  },

  // ── Section Header ──
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#0C8C76",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#0C8C76",
  },

  // ── Quick Actions Grid ──
  qaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  qaItem: {
    width: "22%",
    alignItems: "center",
    gap: 6,
  },
  qaButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  qaLabel: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#334155",
    textAlign: "center",
  },

  // ── Transactions ──
  transactionsCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  txAccent: {
    width: 3,
    height: 38,
    borderRadius: 2,
    flexShrink: 0,
  },
  txIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  txCategory: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  txAmount: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
  txRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 60,
  },
  txRowPressed: {
    opacity: 0.86,
  },
});
