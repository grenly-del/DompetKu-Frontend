import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth.service";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

type AuthFieldProps = {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  rightSlot?: React.ReactNode;
};

function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "none",
  rightSlot,
}: AuthFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <Feather name={icon} size={18} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          style={styles.input}
        />
        {rightSlot}
      </View>
    </View>
  );
}

type StatCardProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  accent: string;
};

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const auth = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const isWideScreen = width >= 960;
  const isTablet = width >= 680 && width < 960;

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const entrance = Animated.timing(fadeInAnimation, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    floatingLoop.start();
    entrance.start();

    return () => {
      floatingLoop.stop();
      entrance.stop();
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, [fadeInAnimation, floatAnimation]);

  const handleSwitchMode = () => {
    setIsLogin((current) => !current);
    setUsername("");
    setEmail("");
    setPassword("");
    setAgreeTerms(false);
    setShowPassword(false);
    setResetMode(false);
    setResetEmail("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
    if (!isLogin && !username.trim()) {
      Alert.alert("Username belum diisi", "Masukkan username untuk membuat akun.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert("Data belum lengkap", "Isi email dan password terlebih dahulu.");
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert("Password terlalu pendek", "Gunakan minimal 6 karakter.");
      return;
    }

    if (!isLogin && !agreeTerms) {
      Alert.alert(
        "Syarat belum disetujui",
        "Kamu perlu menyetujui syarat dan kebijakan privasi sebelum daftar."
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await auth.login(email.trim(), password.trim());
      } else {
        await auth.register(username.trim(), email.trim(), password.trim());
      }
      router.replace("/(tabs)/home" as never);
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetMode(true);
    setResetEmail(email); // pre-fill with login email if any
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Email belum diisi", "Masukkan email akunmu.");
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert("Password terlalu pendek", "Gunakan minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password tidak cocok", "Pastikan password baru dan konfirmasi sama.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(resetEmail.trim(), newPassword.trim());
      Alert.alert("Berhasil", res.message || "Password berhasil direset. Silakan login.");
      setResetMode(false);
      setEmail(resetEmail);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setResetMode(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      "Google Sign-In",
      "Tombol Google sudah ditampilkan, tapi autentikasinya belum dihubungkan."
    );
  };

  if (!fontsLoaded) {
    return <View style={styles.loadingScreen} />;
  }

  const floatingUp = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  const floatingDown = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 8],
  });

  const floatingSoft = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isWideScreen ? 28 : 18, paddingVertical: 18 },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View
            style={[
              styles.shell,
              isWideScreen ? styles.shellWide : styles.shellStacked,
              {
                opacity: fadeInAnimation,
                transform: [
                  {
                    translateY: fadeInAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#0D2349", "#12406A", "#0C8C76"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroPanel,
                isWideScreen ? styles.heroPanelWide : styles.heroPanelStacked,
                isTablet && styles.heroPanelTablet,
              ]}
            >
              <View style={styles.heroGlowTop} />
              <View style={styles.heroGlowBottom} />

              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.badgeTopLeft,
                  { transform: [{ translateY: floatingUp }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={18}
                  color="#DFFCF4"
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.badgeRight,
                  { transform: [{ translateY: floatingDown }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={18}
                  color="#E4FBFF"
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.badgeBottom,
                  { transform: [{ translateY: floatingSoft }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={18}
                  color="#F4FBFF"
                />
              </Animated.View>

              <View style={styles.brandRow}>
                <View style={styles.brandIconWrap}>
                  <Image
                    source={require("../assets/Logo-Dompetku-transparant.png")}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                </View>
                <View>
                  <Text style={styles.brandTitle}>DompetKu</Text>
                  <Text style={styles.brandSubtitle}>Personal budgeting app</Text>
                </View>
              </View>

              <View style={styles.heroCopyWrap}>
                <Text style={styles.heroTitle}>
                  Kelola keuangan pribadimu dengan lebih cerdas
                </Text>
                <Text style={styles.heroDescription}>
                  Catat pemasukan, pantau pengeluaran, dan bangun kebiasaan
                  finansial yang lebih rapi dalam satu aplikasi.
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  icon="trending-up"
                  label="Tracking"
                  value="Real-time"
                  accent="rgba(52, 211, 153, 0.28)"
                />
                <StatCard
                  icon="chart-arc"
                  label="Analitik"
                  value="Mendalam"
                  accent="rgba(56, 189, 248, 0.24)"
                />
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>Portfolio growth</Text>
                  <Text style={styles.chartValue}>+24.5%</Text>
                </View>
                <View style={styles.barChart}>
                  <View style={[styles.chartBar, styles.barShort]} />
                  <View style={[styles.chartBar, styles.barMedium]} />
                  <View style={[styles.chartBar, styles.barTall]} />
                  <View style={[styles.chartBar, styles.barMediumTall]} />
                  <View style={[styles.chartBar, styles.barHighest]} />
                  <View style={[styles.chartBar, styles.barTall]} />
                </View>
              </View>

              <Text style={styles.heroFooter}>Copyright 2026 DompetKu</Text>
            </LinearGradient>

            <View
              style={[
                styles.formPanel,
                isWideScreen ? styles.formPanelWide : styles.formPanelStacked,
              ]}
            >
              {!isWideScreen ? (
                <View style={styles.mobileLogoRow}>
                  <View style={styles.mobileLogoWrap}>
                    <Image
                      source={require("../assets/Logo-Dompetku-transparant.png")}
                      style={styles.mobileLogo}
                      resizeMode="contain"
                    />
                  </View>
                  <View>
                    <Text style={styles.mobileBrandTitle}>DompetKu</Text>
                    <Text style={styles.mobileBrandSubtitle}>
                      Masuk untuk melanjutkan
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.formHeadingWrap}>
                <Text style={styles.formTitle}>
                  {resetMode
                    ? "Reset password"
                    : isLogin
                      ? "Selamat datang kembali"
                      : "Buat akun baru"}
                </Text>
                <Text style={styles.formSubtitle}>
                  {resetMode
                    ? "Masukkan email akunmu dan buat password baru."
                    : isLogin
                      ? "Masuk ke akunmu untuk mulai mengelola anggaran harian."
                      : "Daftar gratis dan mulai rapikan keuanganmu dari satu tempat."}
                </Text>
              </View>

              {resetMode ? (
                <>
                  <AuthField
                    label="Email"
                    icon="mail"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="kamu@email.com"
                    keyboardType="email-address"
                  />

                  <AuthField
                    label="Password Baru"
                    icon="lock"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimal 6 karakter"
                    secureTextEntry={!showNewPassword}
                    rightSlot={
                      <Pressable
                        style={styles.inputAction}
                        onPress={() => setShowNewPassword((c) => !c)}
                      >
                        <Feather
                          name={showNewPassword ? "eye-off" : "eye"}
                          size={18}
                          color="#64748B"
                        />
                      </Pressable>
                    }
                  />

                  <AuthField
                    label="Konfirmasi Password"
                    icon="lock"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Ulangi password baru"
                    secureTextEntry={!showNewPassword}
                  />

                  <Pressable
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && !isLoading && styles.buttonPressed,
                      isLoading && styles.buttonDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={["#12406A", "#0C8C76"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButtonGradient}
                    >
                      {isLoading ? (
                        <>
                          <ActivityIndicator color="#FFFFFF" />
                          <Text style={styles.primaryButtonText}>Memproses...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialCommunityIcons name="lock-reset" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryButtonText}>Reset Password</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.backToLoginWrap}
                    onPress={handleBackToLogin}
                  >
                    <Feather name="arrow-left" size={14} color="#0C8C76" />
                    <Text style={styles.backToLoginText}>Kembali ke login</Text>
                  </Pressable>
                </>
              ) : (
                <>

              {!isLogin ? (
                <AuthField
                  label="Username"
                  icon="user"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="karenbudget"
                  autoCapitalize="none"
                />
              ) : null}

              <AuthField
                label="Email"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="kamu@email.com"
                keyboardType="email-address"
              />

              <AuthField
                label="Password"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimal 6 karakter"
                secureTextEntry={!showPassword}
                rightSlot={
                  <Pressable
                    style={styles.inputAction}
                    onPress={() => setShowPassword((current) => !current)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#64748B"
                    />
                  </Pressable>
                }
              />

              {isLogin ? (
                <Pressable
                  style={styles.inlineActionWrap}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.inlineActionText}>Lupa password?</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setAgreeTerms((current) => !current)}
                >
                  <MaterialCommunityIcons
                    name={
                      agreeTerms
                        ? "checkbox-marked-circle"
                        : "checkbox-blank-circle-outline"
                    }
                    size={22}
                    color={agreeTerms ? "#0C8C76" : "#94A3B8"}
                  />
                  <Text style={styles.termsText}>
                    Saya menyetujui syarat penggunaan dan kebijakan privasi.
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !isLoading && styles.buttonPressed,
                  isLoading && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={["#12406A", "#0C8C76"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Memproses...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        {isLogin ? "Masuk" : "Daftar sekarang"}
                      </Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

             

              <View style={styles.switchModeRow}>
                <Text style={styles.switchModeText}>
                  {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
                </Text>
                <Pressable onPress={handleSwitchMode}>
                  <Text style={styles.switchModeLink}>
                    {isLogin ? " Daftar di sini" : " Masuk"}
                  </Text>
                </Pressable>
              </View>
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  shell: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 1180,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  shellWide: {
    flexDirection: "row",
    minHeight: 760,
  },
  shellStacked: {
    flexDirection: "column",
  },
  heroPanel: {
    overflow: "hidden",
    position: "relative",
  },
  heroPanelWide: {
    width: "47%",
    paddingHorizontal: 34,
    paddingTop: 34,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  heroPanelStacked: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    minHeight: 350,
  },
  heroPanelTablet: {
    minHeight: 390,
  },
  heroGlowTop: {
    position: "absolute",
    top: -120,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  heroGlowBottom: {
    position: "absolute",
    right: -110,
    bottom: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  floatingBadge: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  badgeTopLeft: {
    top: 92,
    left: 18,
  },
  badgeRight: {
    top: 118,
    right: 22,
  },
  badgeBottom: {
    bottom: 92,
    right: 60,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  brandIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  brandSubtitle: {
    marginTop: -2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.72)",
    letterSpacing: 0.3,
  },
  heroCopyWrap: {
    marginTop: 44,
    gap: 16,
    paddingRight: 20,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 44,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 25,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.74)",
    maxWidth: 410,
  },
  statsGrid: {
    marginTop: 26,
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 150,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextWrap: {
    gap: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.6)",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  chartCard: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    maxWidth: 280,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.58)",
  },
  chartValue: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: "#8CF2C3",
  },
  barChart: {
    marginTop: 16,
    height: 78,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBar: {
    width: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
  },
  barShort: {
    height: 24,
  },
  barMedium: {
    height: 38,
  },
  barTall: {
    height: 54,
  },
  barMediumTall: {
    height: 46,
  },
  barHighest: {
    height: 66,
    backgroundColor: "#A7F3D0",
  },
  heroFooter: {
    marginTop: 28,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.42)",
  },
  formPanel: {
    backgroundColor: "#FFFFFF",
  },
  formPanelWide: {
    width: "53%",
    paddingHorizontal: 38,
    paddingVertical: 38,
    justifyContent: "center",
  },
  formPanelStacked: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  mobileLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  mobileLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F4F0",
  },
  mobileLogo: {
    width: 40,
    height: 40,
  },
  mobileBrandTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#102A43",
  },
  mobileBrandSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  formHeadingWrap: {
    marginBottom: 22,
  },
  formTitle: {
    fontSize: 29,
    lineHeight: 38,
    fontFamily: "Poppins_700Bold",
    color: "#0F172A",
  },
  formSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 23,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
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
    paddingRight: 48,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#0F172A",
  },
  inputAction: {
    position: "absolute",
    right: 14,
    top: 16,
    padding: 4,
  },
  inlineActionWrap: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 18,
  },
  inlineActionText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#0C8C76",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  primaryButton: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
  },
  primaryButtonGradient: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  googleButton: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#102A43",
  },
  dividerWrap: {
    marginVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  switchModeRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  switchModeText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  switchModeLink: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#0C8C76",
  },
  backToLoginWrap: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backToLoginText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#0C8C76",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
});
