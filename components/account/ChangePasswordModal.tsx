import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
};

const { height: SH } = Dimensions.get("window");

export default function ChangePasswordModal({ visible, onClose, onSave }: Props) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const slide = React.useRef(new Animated.Value(SH)).current;

  useEffect(() => {
    if (visible) {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [visible, slide]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const getStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: "", color: "#D9E2EC", width: "0%" };
    if (pw.length < 6) return { label: "Lemah", color: "#E05252", width: "30%" };
    if (pw.length < 10) return { label: "Sedang", color: "#F2C94C", width: "60%" };
    return { label: "Kuat", color: "#0C8C76", width: "100%" };
  };

  const strength = getStrength(newPw);

  const handleSave = async () => {
    if (!currentPw) { Alert.alert("Error", "Masukkan password saat ini."); return; }
    if (newPw.length < 6) { Alert.alert("Error", "Password baru minimal 6 karakter."); return; }
    if (newPw !== confirmPw) { Alert.alert("Error", "Konfirmasi password tidak cocok."); return; }

    try {
      setIsSaving(true);
      await onSave(currentPw, newPw);
      Alert.alert("Berhasil", "Password berhasil diubah!");
      handleClose();
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Tidak dapat mengubah password.");
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = currentPw.length > 0 && newPw.length >= 6 && newPw === confirmPw;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={s.handle} />

          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="lock-outline" size={24} color="#12406A" />
              </View>
              <View>
                <Text style={s.title}>Ubah Password</Text>
                <Text style={s.subtitle}>Perbarui keamanan akun kamu</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          {/* Current password */}
          <View style={s.field}>
            <Text style={s.label}>PASSWORD SAAT INI</Text>
            <View style={s.inputShell}>
              <Feather name="lock" size={17} color="#64748B" style={s.inputIcon} />
              <TextInput
                value={currentPw} onChangeText={setCurrentPw}
                placeholder="Masukkan password lama..." placeholderTextColor="#94A3B8"
                secureTextEntry={!showCurrent} style={s.input}
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowCurrent(!showCurrent)}>
                <Feather name={showCurrent ? "eye-off" : "eye"} size={18} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          {/* New password */}
          <View style={s.field}>
            <Text style={s.label}>PASSWORD BARU</Text>
            <View style={s.inputShell}>
              <Feather name="key" size={17} color="#64748B" style={s.inputIcon} />
              <TextInput
                value={newPw} onChangeText={setNewPw}
                placeholder="Minimal 6 karakter..." placeholderTextColor="#94A3B8"
                secureTextEntry={!showNew} style={s.input}
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowNew(!showNew)}>
                <Feather name={showNew ? "eye-off" : "eye"} size={18} color="#94A3B8" />
              </Pressable>
            </View>
            {/* Strength bar */}
            {newPw.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthTrack}>
                  <View style={[s.strengthBar, { width: strength.width as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View style={s.field}>
            <Text style={s.label}>KONFIRMASI PASSWORD</Text>
            <View style={[s.inputShell, confirmPw.length > 0 && confirmPw !== newPw && s.inputError]}>
              <Feather name="check-circle" size={17} color={confirmPw.length > 0 && confirmPw === newPw ? "#0C8C76" : "#64748B"} style={s.inputIcon} />
              <TextInput
                value={confirmPw} onChangeText={setConfirmPw}
                placeholder="Ulangi password baru..." placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirm} style={s.input}
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color="#94A3B8" />
              </Pressable>
            </View>
            {confirmPw.length > 0 && confirmPw !== newPw && (
              <Text style={s.errorText}>Password tidak cocok</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              s.saveBtn,
              pressed && { opacity: 0.9 },
              (!isValid || isSaving) && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={!isValid || isSaving}
          >
            <LinearGradient colors={["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveGrad}>
              <Feather name="shield" size={18} color="#FFF" />
              <Text style={s.saveText}>{isSaving ? "Menyimpan..." : "Ubah Password"}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingBottom: 28,
    shadowColor: "#0F172A", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 20,
  },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(18,64,106,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  field: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#64748B", letterSpacing: 0.5 },
  inputShell: { minHeight: 54, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC", justifyContent: "center" },
  inputError: { borderColor: "#E05252" },
  inputIcon: { position: "absolute", left: 16, top: 17 },
  input: { minHeight: 54, paddingLeft: 46, paddingRight: 50, fontSize: 15, fontFamily: "Poppins_400Regular", color: "#102A43" },
  eyeBtn: { position: "absolute", right: 14, top: 17 },

  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0" },
  strengthBar: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontFamily: "Poppins_600SemiBold" },
  errorText: { marginTop: 6, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#E05252" },

  saveBtn: { marginTop: 8, borderRadius: 18, overflow: "hidden" },
  saveGrad: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
