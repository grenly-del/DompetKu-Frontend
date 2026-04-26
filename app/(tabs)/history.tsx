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
import { useFocusEffect } from "@react-navigation/native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

// Data fetched from API
import { transactionService, Transaction } from "../../services/transaction.service";
import TransactionDetailSheet from "../../components/transactions/TransactionDetailSheet";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ─── Component ──────────────────────────────────────────────────
export default function HistoryTab() {
  const [filter, setFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const loadTransactions = useCallback(async () => {
    try {
      const now = new Date();
      const params: any = { month: now.getMonth() + 1, year: now.getFullYear(), limit: 50 };
      if (filter !== 'all') params.type = filter;
      const res = await transactionService.getAll(params);
      setTransactions(res.transactions);
    } catch (err) {
      console.error('History load error:', err);
    }
  }, [filter]);

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

  if (!fontsLoaded) return <View style={styles.loading} />;

  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerOrbTop} />
          <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
          <Text style={styles.headerSubtitle}>Semua catatan pemasukan &amp; pengeluaran</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="trending-up" size={16} color="#34E0A1" />
              <View>
                <Text style={styles.summaryLabel}>Pemasukan</Text>
                <Text style={styles.summaryValue}>Rp {formatRp(totalIncome)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="trending-down" size={16} color="#F2C94C" />
              <View>
                <Text style={styles.summaryLabel}>Pengeluaran</Text>
                <Text style={styles.summaryValue}>Rp {formatRp(totalExpense)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Filter */}
        <View style={styles.filterRow}>
          {(["all", "INCOME", "EXPENSE"] as const).map((opt) => {
            const active = filter === opt;
            const label = opt === "all" ? "Semua" : opt === "INCOME" ? "Pemasukan" : "Pengeluaran";
            return (
              <Pressable
                key={opt}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                onPress={() => setFilter(opt)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Transactions list */}
        <View style={styles.listCard}>
          {transactions.map((tx, idx) => {
            const isIncome = tx.type === "INCOME";
            const txDate = new Date(tx.date);
            const dateStr = `${txDate.getDate()} ${monthNames[txDate.getMonth()]} ${txDate.getFullYear()}`;
            const timeStr = `${String(txDate.getHours()).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')}`;
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
                  <View style={[
                    styles.txIcon,
                    {
                      backgroundColor: isIncome
                        ? "rgba(12, 140, 118, 0.12)"
                        : "rgba(18, 64, 106, 0.12)",
                    },
                  ]}>
                    <MaterialCommunityIcons
                      name={(tx.category?.icon || 'help-circle-outline') as any}
                      size={20}
                      color={isIncome ? "#0C8C76" : "#12406A"}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName}>{tx.name}</Text>
                    <Text style={styles.txMeta}>{tx.category?.name || '-'} · {dateStr} · {timeStr}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: isIncome ? "#0C8C76" : "#E05252" }]}>
                      {isIncome ? "+" : "-"}Rp {formatRp(Number(tx.amount))}
                    </Text>
                    <Feather name="chevron-right" size={15} color="#94A3B8" />
                  </View>
                </Pressable>
                {idx < transactions.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
          {transactions.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyText}>Tidak ada transaksi</Text>
            </View>
          )}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },

  headerCard: {
    borderRadius: 30, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22, overflow: "hidden",
  },
  headerOrbTop: {
    position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSubtitle: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 4 },

  summaryRow: { marginTop: 18, flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  summaryLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.60)" },
  summaryValue: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#FFF" },

  filterRow: { marginTop: 18, flexDirection: "row", gap: 10 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D9E2EC",
  },
  filterBtnActive: { backgroundColor: "#0C8C76", borderColor: "#0C8C76" },
  filterText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },
  filterTextActive: { color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" },

  listCard: {
    marginTop: 16, borderRadius: 24, backgroundColor: "#FFF",
    paddingHorizontal: 18, paddingVertical: 10,
    shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 10 },
  txAccent: { width: 3, height: 38, borderRadius: 2, flexShrink: 0 },
  txIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txName: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  txMeta: { marginTop: 2, fontSize: 10, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  txAmount: { fontSize: 12, fontFamily: "Poppins_700Bold" },
  txRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 58 },
  txRowPressed: { opacity: 0.86 },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#94A3B8" },
});
