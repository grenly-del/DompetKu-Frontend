import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { transactionService, Transaction } from "../../services/transaction.service";

type TransactionDetailSheetProps = {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onDeleted?: (transactionId: string) => void | Promise<void>;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

function formatRp(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

function formatDateLabel(date: Date): string {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTimeLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function TransactionDetailSheet({
  visible,
  transaction,
  onClose,
  onDeleted,
}: TransactionDetailSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isDeleting, setIsDeleting] = useState(false);
  const insets = useSafeAreaInsets();
  // Safe area bottom + 5px extra padding
  const sheetPaddingBottom = insets.bottom + 5;

  useEffect(() => {
    if (!transaction) {
      return;
    }

    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 68,
        friction: 12,
        useNativeDriver: true,
      }).start();
      return;
    }

    slideAnim.setValue(SCREEN_HEIGHT);
  }, [slideAnim, transaction, visible]);

  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(onClose);
  };

  const handleConfirmDelete = async () => {
    if (!transaction || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await transactionService.delete(transaction.id);

      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setIsDeleting(false);
        void onDeleted?.(transaction.id);
        onClose();
      });
    } catch (err: any) {
      setIsDeleting(false);
      Alert.alert(
        "Gagal Menghapus",
        err?.message || "Transaksi belum berhasil dihapus. Coba lagi nanti."
      );
    }
  };

  const handleDeletePress = () => {
    if (!transaction || isDeleting) {
      return;
    }

    Alert.alert(
      "Hapus Transaksi",
      `Transaksi "${transaction.name}" akan dihapus permanen.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            void handleConfirmDelete();
          },
        },
      ]
    );
  };

  const detail = useMemo(() => {
    if (!transaction) {
      return null;
    }

    const date = new Date(transaction.date);
    const isIncome = transaction.type === "INCOME";
    const accentColor = isIncome ? "#0C8C76" : "#E05252";
    const gradient = isIncome ? ["#0C8C76", "#12A68E"] : ["#D14B4B", "#A83434"];

    return {
      isIncome,
      accentColor,
      gradient: gradient as [string, string],
      typeLabel: isIncome ? "Pemasukan" : "Pengeluaran",
      amountLabel: formatRp(Number(transaction.amount)),
      dateLabel: formatDateLabel(date),
      timeLabel: formatTimeLabel(date),
      noteLabel: transaction.note?.trim() || "Tidak ada catatan",
    };
  }, [transaction]);

  if (!transaction || !detail) {
    return null;
  }

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
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: sheetPaddingBottom,
            },
          ]}
        >
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${detail.accentColor}1F` },
                ]}
              >
                <MaterialCommunityIcons
                  name={(transaction.category?.icon || "help-circle-outline") as any}
                  size={26}
                  color={detail.accentColor}
                />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {transaction.name}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {transaction.category?.name || "Tanpa kategori"}
                </Text>
              </View>
            </View>

            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <LinearGradient
            colors={detail.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.amountCard}
          >
            <View>
              <Text style={styles.amountLabel}>{detail.typeLabel}</Text>
              <Text style={styles.amountValue}>
                {detail.isIncome ? "+" : "-"} {detail.amountLabel}
              </Text>
            </View>

            <View style={styles.amountBadge}>
              <MaterialCommunityIcons
                name={detail.isIncome ? "trending-up" : "trending-down"}
                size={28}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detail Transaksi</Text>

              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="calendar" size={15} color="#12406A" />
                    </View>
                    <Text style={styles.detailLabel}>Tanggal</Text>
                  </View>
                  <Text style={styles.detailValue}>{detail.dateLabel}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="clock" size={15} color="#12406A" />
                    </View>
                    <Text style={styles.detailLabel}>Waktu</Text>
                  </View>
                  <Text style={styles.detailValue}>{detail.timeLabel}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="tag" size={15} color="#12406A" />
                    </View>
                    <Text style={styles.detailLabel}>Kategori</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {transaction.category?.name || "Tanpa kategori"}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="layers" size={15} color="#12406A" />
                    </View>
                    <Text style={styles.detailLabel}>Jenis</Text>
                  </View>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: detail.accentColor },
                    ]}
                  >
                    {detail.typeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catatan</Text>
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>{detail.noteLabel}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ID Transaksi</Text>
              <View style={styles.noteCard}>
                <Text style={styles.idText}>{transaction.id}</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && !isDeleting && styles.deleteButtonPressed,
                isDeleting && styles.deleteButtonDisabled,
              ]}
              onPress={handleDeletePress}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={18} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>
                {isDeleting ? "Menghapus..." : "Hapus Transaksi"}
              </Text>
            </Pressable>
          </ScrollView>
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
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.84,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handleBar: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9E2EC",
    marginTop: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  amountCard: {
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.76)",
  },
  amountValue: {
    marginTop: 3,
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  amountBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    marginTop: 18,
  },
  contentContainer: {
    paddingBottom: 12,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  detailCard: {
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 14,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(18, 64, 106, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  noteCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    color: "#475569",
  },
  idText: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium",
    color: "#475569",
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#E05252",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deleteButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  deleteButtonDisabled: {
    opacity: 0.64,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
});
