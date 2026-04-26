import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

type CategoryCardProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  name: string;
  type: "income" | "expense";
  count: number;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isMutating?: boolean;
};

export default function CategoryCard({
  icon,
  name,
  type,
  count,
  onPress,
  onEdit,
  onDelete,
  isMutating = false,
}: CategoryCardProps) {
  const isIncome = type === "income";
  const accentColor = isIncome ? "#0C8C76" : "#E05252";
  const accentBackground = isIncome
    ? "rgba(12, 140, 118, 0.12)"
    : "rgba(224, 82, 82, 0.12)";
  const showActions = Boolean(onEdit || onDelete);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && !isMutating && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={isMutating}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: accentBackground }]}>
          <MaterialCommunityIcons name={icon} size={24} color={accentColor} />
        </View>

        <View style={styles.headerActions}>
          <View style={[styles.typePill, { backgroundColor: accentBackground }]}>
            <Text style={[styles.typeText, { color: accentColor }]}>
              {isIncome ? "Pemasukan" : "Pengeluaran"}
            </Text>
          </View>

          {showActions && (
            <View style={styles.iconActions}>
              {onEdit && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && !isMutating && styles.actionPressed,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  disabled={isMutating}
                  hitSlop={8}
                >
                  <Feather name="edit-2" size={14} color="#12406A" />
                </Pressable>
              )}

              {onDelete && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    pressed && !isMutating && styles.actionPressed,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  disabled={isMutating}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={14} color="#E05252" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.count}>{count} transaksi</Text>
        <View style={[styles.arrowWrap, { backgroundColor: accentBackground }]}>
          <Feather name="chevron-right" size={14} color={accentColor} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 162,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  accentBar: {
    width: 46,
    height: 5,
    borderRadius: 999,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  headerActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginLeft: 12,
  },
  iconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "rgba(224, 82, 82, 0.08)",
    borderColor: "rgba(224, 82, 82, 0.16)",
  },
  actionPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.82,
  },
  typeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  name: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
    color: "#102A43",
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  count: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
