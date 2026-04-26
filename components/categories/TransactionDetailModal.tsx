import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Transaction } from "../../services/transaction.service";

type TransactionDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  categoryName: string;
  categoryIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  categoryType: "income" | "expense";
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatRupiah(amount: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(amount);
}

export default function TransactionDetailModal({
  visible,
  onClose,
  categoryName,
  categoryIcon,
  categoryType,
  transactions,
  onTransactionPress,
}: TransactionDetailModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const isIncome = categoryType === "income";
  const accentColor = isIncome ? "#0C8C76" : "#E05252";
  const accentBg = isIncome
    ? "rgba(12, 140, 118, 0.12)"
    : "rgba(224, 82, 82, 0.12)";

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const formatDateLabel = (rawDate: string) => {
    const date = new Date(rawDate);
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const dateLabel = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    const timeLabel = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    return `${dateLabel} · ${timeLabel}`;
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View
      style={[
        styles.txCard,
        {
          opacity: 1,
          transform: [{ translateX: 0 }],
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.txRow,
          pressed && styles.txRowPressed,
        ]}
        onPress={onTransactionPress ? () => onTransactionPress(item) : undefined}
      >
        <View style={[styles.txDot, { backgroundColor: accentColor }]} />
        <View style={styles.txContent}>
          <View style={styles.txHeader}>
            <Text style={styles.txName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.txRight}>
              <Text
                style={[
                  styles.txAmount,
                  { color: isIncome ? "#0C8C76" : "#E05252" },
                ]}
              >
                {isIncome ? "+" : "-"} {formatRupiah(Number(item.amount))}
              </Text>
              {onTransactionPress ? (
                <Feather name="chevron-right" size={15} color="#94A3B8" />
              ) : null}
            </View>
          </View>
          <View style={styles.txMeta}>
            <Feather name="calendar" size={12} color="#94A3B8" />
            <Text style={styles.txDate}>{formatDateLabel(item.date)}</Text>
            {item.note ? (
              <>
                <View style={styles.txMetaDot} />
                <Feather name="file-text" size={12} color="#94A3B8" />
                <Text style={styles.txNote} numberOfLines={1}>
                  {item.note}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>
      {index < transactions.length - 1 && (
        <View style={styles.txDivider} />
      )}
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.catIconWrap, { backgroundColor: accentBg }]}>
                <MaterialCommunityIcons
                  name={categoryIcon}
                  size={24}
                  color={accentColor}
                />
              </View>
              <View>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {categoryName}
                </Text>
                <Text style={styles.sheetSub}>
                  {transactions.length} transaksi
                </Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          {/* Summary card */}
          <LinearGradient
            colors={
              isIncome
                ? ["#0C8C76", "#12A68E"]
                : ["#E05252", "#C73B3B"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Total {isIncome ? "Pemasukan" : "Pengeluaran"}</Text>
                <Text style={styles.summaryValue}>
                  {formatRupiah(totalAmount)}
                </Text>
              </View>
              <View style={styles.summaryIconWrap}>
                <MaterialCommunityIcons
                  name={isIncome ? "trending-up" : "trending-down"}
                  size={28}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
            </View>
          </LinearGradient>

          {/* Section title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
            <View style={[styles.countBadge, { backgroundColor: accentBg }]}>
              <Text style={[styles.countText, { color: accentColor }]}>
                {transactions.length}
              </Text>
            </View>
          </View>

          {/* Transaction list */}
          {transactions.length > 0 ? (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              style={styles.txList}
              contentContainerStyle={styles.txListContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color="#CBD5E0" />
              <Text style={styles.emptyText}>
                Belum ada transaksi di kategori ini.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.82,
    backgroundColor: "#FFFFFF",
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
  handleBar: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9E2EC",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },

  // Header
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  catIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  sheetSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    marginTop: 2,
  },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  // Transaction list
  txList: {
    maxHeight: SCREEN_HEIGHT * 0.38,
  },
  txListContent: {
    paddingBottom: 8,
  },
  txCard: {
    paddingVertical: 4,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  txDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  txContent: {
    flex: 1,
  },
  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  txRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#102A43",
  },
  txAmount: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  txDate: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  txMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E0",
    marginHorizontal: 3,
  },
  txNote: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  txDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 22,
  },
  txRowPressed: {
    opacity: 0.85,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
    textAlign: "center",
  },
});
