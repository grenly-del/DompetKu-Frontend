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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  profile: { name: string; email: string; whatsapp?: string | null };
  onSave: (data: { name: string; email: string; whatsapp?: string | null }) => Promise<void> | void;
};

const { height: SH } = Dimensions.get("window");

function getErrorMessage(err: any) {
  const errors = err?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find(Boolean);
    if (typeof first === "string") {
      return first;
    }
  }

  return err?.message || "Tidak dapat memperbarui profil.";
}

export default function EditProfileModal({ visible, onClose, profile, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || "");
  const [isSaving, setIsSaving] = useState(false);
  const slide = React.useRef(new Animated.Value(SH)).current;
  const safeBottomPadding = 28 + Math.max(insets.bottom, 12);
  const sheetMaxHeight = SH - insets.top - Math.max(insets.bottom, 12) - 16;

  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setEmail(profile.email);
      setWhatsapp(profile.whatsapp || "");
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slide.setValue(SH);
    }
  }, [visible, profile, slide]);

  const handleClose = () => {
    Animated.timing(slide, { toValue: SH, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Nama dan email tidak boleh kosong.");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim() || null,
      });
      Alert.alert("Berhasil", "Profil berhasil diperbarui!");
      handleClose();
    } catch (err: any) {
      Alert.alert("Gagal", getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            s.sheet,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: safeBottomPadding,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={s.handle} />

          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.iconCircle}>
                <MaterialCommunityIcons name="account-edit-outline" size={24} color="#12406A" />
              </View>
              <View>
                <Text style={s.title}>Edit Profil</Text>
                <Text style={s.subtitle}>Ubah informasi akun kamu</Text>
              </View>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <View style={s.avatarSection}>
            <View style={s.avatarCircle}>
              <MaterialCommunityIcons name="account" size={42} color="#FFF" />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>NAMA LENGKAP</Text>
            <View style={s.inputShell}>
              <Feather name="user" size={17} color="#64748B" style={s.inputIcon} />
              <TextInput value={name} onChangeText={setName} placeholder="Masukkan nama..." placeholderTextColor="#94A3B8" style={s.input} />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>EMAIL</Text>
            <View style={s.inputShell}>
              <Feather name="mail" size={17} color="#64748B" style={s.inputIcon} />
              <TextInput value={email} onChangeText={setEmail} placeholder="Masukkan email..." placeholderTextColor="#94A3B8" style={s.input} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>NOMOR HANDPHONE</Text>
            <View style={s.inputShell}>
              <Feather name="phone" size={17} color="#64748B" style={s.inputIcon} />
              <TextInput value={whatsapp} onChangeText={setWhatsapp} placeholder="Contoh: 082187199940" placeholderTextColor="#94A3B8" style={s.input} keyboardType="phone-pad" />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.9 }, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <LinearGradient colors={["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveGrad}>
              <Feather name="check" size={18} color="#FFF" />
              <Text style={s.saveText}>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</Text>
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
    backgroundColor: "#FFF",
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
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: "#D9E2EC", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(18,64,106,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#102A43" },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B", marginTop: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12406A",
    borderWidth: 3,
    borderColor: "rgba(18,64,106,0.2)",
  },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#64748B", letterSpacing: 0.5 },
  inputShell: { minHeight: 54, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 16, top: 17 },
  input: { minHeight: 54, paddingLeft: 46, paddingRight: 16, fontSize: 15, fontFamily: "Poppins_400Regular", color: "#102A43" },
  saveBtn: { marginTop: 8, borderRadius: 18, overflow: "hidden" },
  saveGrad: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
});
