import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type AddCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (category: { name: string; type: "income" | "expense" }) => Promise<void> | void;
  initialName?: string;
  initialType?: "income" | "expense";
  lockType?: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
};

export default function AddCategoryModal({
  visible,
  onClose,
  onAdd,
  initialName = "",
  initialType = "income",
  lockType = false,
  title = "Tambah kategori",
  subtitle = "Buat kategori baru untuk transaksi kamu.",
  submitLabel = "Tambah kategori",
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setType(initialType);
      setIsSubmitting(false);
      return;
    }

    setName("");
    setType(initialType);
    setIsSubmitting(false);
  }, [initialName, initialType, visible]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onAdd({ name: trimmedName, type });
      onClose();
    } catch {
      // Keep the modal open so the user can fix the input and retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Nama kategori</Text>
            <View style={styles.inputShell}>
              <Feather name="tag" size={17} color="#64748B" style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Gaji bulanan"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoFocus
              />
            </View>
          </View>

          {!lockType && (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Tipe kategori</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[
                    styles.typeButton,
                    type === "income" && styles.typeButtonIncome,
                  ]}
                  onPress={() => setType("income")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === "income" && styles.typeButtonIncomeText,
                    ]}
                  >
                    Pemasukan
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typeButton,
                    type === "expense" && styles.typeButtonExpense,
                  ]}
                  onPress={() => setType("expense")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === "expense" && styles.typeButtonExpenseText,
                    ]}
                  >
                    Pengeluaran
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !isSubmitting && styles.buttonPressed,
              (!name.trim() || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            <LinearGradient
              colors={["#12406A", "#0C8C76"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Feather name={submitLabel.toLowerCase().includes("simpan") ? "check" : "plus"} size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>{isSubmitting ? "Menyimpan..." : submitLabel}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 22,
  },
  title: {
    fontSize: 21,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBlock: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#1E293B",
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
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  typeButtonIncome: {
    backgroundColor: "rgba(12, 140, 118, 0.12)",
    borderColor: "rgba(12, 140, 118, 0.24)",
  },
  typeButtonExpense: {
    backgroundColor: "rgba(18, 64, 106, 0.12)",
    borderColor: "rgba(18, 64, 106, 0.24)",
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
  },
  typeButtonIncomeText: {
    color: "#0C8C76",
  },
  typeButtonExpenseText: {
    color: "#12406A",
  },
  submitButton: {
    marginTop: 4,
    borderRadius: 18,
    overflow: "hidden",
  },
  submitGradient: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    opacity: 0.6,
  },
});
