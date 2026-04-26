import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

type TabIconProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      <MaterialCommunityIcons name={name} size={24} color={color} />
      <View style={[styles.activeIndicator, { opacity: focused ? 1 : 0 }]} />
    </View>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({ Poppins_500Medium, Poppins_600SemiBold });
  const insets = useSafeAreaInsets();
  if (!fontsLoaded) return null;

  // Safe area bottom + extra 10px padding
  const safeBottom = insets.bottom + 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0C8C76",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 11,
          marginTop: -2,
          marginBottom: 6,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          height: 68 + safeBottom,
          paddingTop: 8,
          paddingBottom: safeBottom,
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "clock" : "clock-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analisis",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "chart-arc" : "chart-arc"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Akun",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "account-circle" : "account-circle-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 36,
  },
  activeIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#0C8C76",
    marginTop: 4,
  },
});
