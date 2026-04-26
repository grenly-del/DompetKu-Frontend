import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Alert,
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

import EditProfileModal from "../../components/account/EditProfileModal";
import NotificationModal from "../../components/account/NotificationModal";
import AppearanceModal from "../../components/account/AppearanceModal";
import ChangePasswordModal from "../../components/account/ChangePasswordModal";
import ExportDataModal from "../../components/account/ExportDataModal";
import DeleteAccountModal from "../../components/account/DeleteAccountModal";
import HelpFaqModal from "../../components/account/HelpFaqModal";
import AboutAppModal from "../../components/account/AboutAppModal";
import { authService } from "../../services/auth.service";
import {
  defaultNotificationSettings,
  loadNotificationSettings,
  type NotificationSettings,
} from "../../services/notification.service";

type MenuItemProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  onPress: () => void;
};

type ProfileState = {
  name: string;
  email: string;
  provider?: string;
  createdAt?: string;
};

type AccountStats = {
  transactionCount: number;
  categoryCount: number;
  budgetCount: number;
};

const defaultProfile: ProfileState = {
  name: "Pengguna",
  email: "-",
};

const defaultStats: AccountStats = {
  transactionCount: 0,
  categoryCount: 0,
  budgetCount: 0,
};

const themeLabels: Record<string, string> = {
  light: "Terang",
  dark: "Gelap",
  ocean: "Lautan",
  sunset: "Senja",
};

function MenuItem({ icon, label, subtitle, color, bgColor, onPress }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#94A3B8" />
    </Pressable>
  );
}

function formatProvider(provider?: string) {
  if (provider === "GOOGLE") {
    return "Google";
  }

  return "Lokal";
}

function formatMemberSince(createdAt?: string) {
  if (!createdAt) {
    return "baru bergabung";
  }

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return "baru bergabung";
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function getEnabledNotificationCount(settings: NotificationSettings) {
  return Object.values(settings).filter(Boolean).length;
}

export default function AccountTab() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuth();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<ProfileState>({
    name: user?.username ?? defaultProfile.name,
    email: user?.email ?? defaultProfile.email,
    provider: user?.provider,
    createdAt: user?.createdAt,
  });
  const [accountStats, setAccountStats] = useState<AccountStats>(defaultStats);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setProfile({
      name: user?.username ?? defaultProfile.name,
      email: user?.email ?? defaultProfile.email,
      provider: user?.provider,
      createdAt: user?.createdAt,
    });
  }, [user]);

  const refreshAccountData = useCallback(async () => {
    if (!userId) {
      setAccountStats(defaultStats);
      setNotificationSettings(defaultNotificationSettings);
      return;
    }

    try {
      const [summary, nextNotificationSettings] = await Promise.all([
        authService.getAccountSummary(),
        loadNotificationSettings(userId),
      ]);

      setProfile({
        name: summary.user.username,
        email: summary.user.email,
        provider: summary.user.provider,
        createdAt: summary.user.createdAt,
      });
      setAccountStats(summary.stats);
      setNotificationSettings(nextNotificationSettings);
    } catch (err) {
      console.error("Failed to refresh account data:", err);

      const nextNotificationSettings = await loadNotificationSettings(userId);
      setNotificationSettings(nextNotificationSettings);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshAccountData();
    }, [refreshAccountData])
  );

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showExportData, setShowExportData] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showHelpFaq, setShowHelpFaq] = useState(false);
  const [showAboutApp, setShowAboutApp] = useState(false);

  const providerLabel = useMemo(() => formatProvider(profile.provider), [profile.provider]);
  const memberSinceLabel = useMemo(() => formatMemberSince(profile.createdAt), [profile.createdAt]);
  const notificationCount = useMemo(
    () => getEnabledNotificationCount(notificationSettings),
    [notificationSettings]
  );
  const currentThemeLabel = themeLabels[theme] || "Terang";
  const supportsPasswordChange = profile.provider !== "GOOGLE";

  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth" as never);
        },
      },
    ]);
  };

  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount();
    router.replace("/auth" as never);
  }, [deleteAccount, router]);

  const handleUpdateProfile = useCallback(
    async (data: { name: string; email: string }) => {
      await updateProfile(data);
      await refreshAccountData();
    },
    [refreshAccountData, updateProfile]
  );

  const handleOpenChangePassword = useCallback(() => {
    if (!supportsPasswordChange) {
      Alert.alert("Tidak tersedia", "Akun yang login dengan Google tidak memakai password lokal.");
      return;
    }

    setShowChangePassword(true);
  }, [supportsPasswordChange]);

  if (!fontsLoaded) return <View style={styles.loading} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerOrb} />
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <MaterialCommunityIcons name="account" size={36} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{providerLabel}</Text>
                </View>
                <Text style={styles.memberText}>Bergabung {memberSinceLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profStatItem}>
              <Text style={styles.profStatValue}>{accountStats.transactionCount}</Text>
              <Text style={styles.profStatLabel}>Transaksi</Text>
            </View>
            <View style={styles.profStatDivider} />
            <View style={styles.profStatItem}>
              <Text style={styles.profStatValue}>{accountStats.categoryCount}</Text>
              <Text style={styles.profStatLabel}>Kategori</Text>
            </View>
            <View style={styles.profStatDivider} />
            <View style={styles.profStatItem}>
              <Text style={styles.profStatValue}>{accountStats.budgetCount}</Text>
              <Text style={styles.profStatLabel}>Budget</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionLabel}>Pengaturan</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="account-edit-outline"
            label="Edit Profil"
            subtitle={`Nama aktif: ${profile.name}`}
            color="#12406A"
            bgColor="rgba(18,64,106,0.12)"
            onPress={() => setShowEditProfile(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="bell-outline"
            label="Notifikasi"
            subtitle={`${notificationCount} pengingat aktif untuk akun ini`}
            color="#0C8C76"
            bgColor="rgba(12,140,118,0.12)"
            onPress={() => setShowNotification(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="palette-outline"
            label="Tampilan"
            subtitle={`Tema saat ini: ${currentThemeLabel}`}
            color="#3D52A0"
            bgColor="rgba(61,82,160,0.12)"
            onPress={() => setShowAppearance(true)}
          />
        </View>

        <Text style={styles.sectionLabel}>Data & Keamanan</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="lock-outline"
            label="Ubah Password"
            subtitle={supportsPasswordChange ? `Keamanan akun ${providerLabel}` : "Tidak tersedia untuk akun Google"}
            color="#12406A"
            bgColor="rgba(18,64,106,0.12)"
            onPress={handleOpenChangePassword}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="cloud-download-outline"
            label="Export Data"
            subtitle={`${accountStats.transactionCount} transaksi siap diekspor`}
            color="#0C8C76"
            bgColor="rgba(12,140,118,0.12)"
            onPress={() => setShowExportData(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="delete-outline"
            label="Hapus Akun"
            subtitle={`Akun aktif: ${profile.email}`}
            color="#E05252"
            bgColor="rgba(224,82,82,0.10)"
            onPress={() => setShowDeleteAccount(true)}
          />
        </View>

        <Text style={styles.sectionLabel}>Lainnya</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            label="Bantuan & FAQ"
            subtitle="Pusat bantuan untuk akun aktif"
            color="#64748B"
            bgColor="rgba(100,116,139,0.12)"
            onPress={() => setShowHelpFaq(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="information-outline"
            label="Tentang Aplikasi"
            subtitle={`DompetKu v1.0.0 • ${providerLabel}`}
            color="#64748B"
            bgColor="rgba(100,116,139,0.12)"
            onPress={() => setShowAboutApp(true)}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#E05252" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Text style={styles.versionText}>
          DompetKu v1.0.0 • Login {providerLabel} • Bergabung {memberSinceLabel}
        </Text>
      </ScrollView>

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={{ name: profile.name, email: profile.email }}
        onSave={handleUpdateProfile}
      />
      <NotificationModal
        visible={showNotification}
        onClose={() => setShowNotification(false)}
        userId={userId}
        onSettingsChange={setNotificationSettings}
      />
      <AppearanceModal
        visible={showAppearance}
        onClose={() => setShowAppearance(false)}
        currentTheme={theme}
        onSelectTheme={setTheme}
      />
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSave={changePassword}
      />
      <ExportDataModal
        visible={showExportData}
        onClose={() => setShowExportData(false)}
        profile={{ username: profile.name, email: profile.email }}
        stats={accountStats}
      />
      <DeleteAccountModal
        visible={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDelete={handleDeleteAccount}
        userLabel={profile.email !== "-" ? profile.email : profile.name}
        stats={accountStats}
      />
      <HelpFaqModal
        visible={showHelpFaq}
        onClose={() => setShowHelpFaq(false)}
      />
      <AboutAppModal
        visible={showAboutApp}
        onClose={() => setShowAboutApp(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 32 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#FFF" },
  profileEmail: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  metaChipText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#FFF" },
  memberText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.72)" },

  profileStats: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  profStatItem: { flex: 1, alignItems: "center" },
  profStatValue: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#FFF" },
  profStatLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.60)", marginTop: 2 },
  profStatDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },

  sectionLabel: { marginTop: 24, marginBottom: 10, marginLeft: 4, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#64748B" },

  menuCard: {
    borderRadius: 22,
    backgroundColor: "#FFF",
    paddingHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  menuItemPressed: { backgroundColor: "#F8FAFC" },
  menuIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  menuSubtitle: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8", marginTop: 1 },
  menuDivider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 74 },

  logoutBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "rgba(224,82,82,0.08)",
    borderWidth: 1,
    borderColor: "rgba(224,82,82,0.15)",
  },
  logoutPressed: { opacity: 0.8 },
  logoutText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#E05252" },

  versionText: { textAlign: "center", marginTop: 20, fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
});
