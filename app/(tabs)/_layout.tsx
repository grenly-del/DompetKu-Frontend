import {
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialCommunityIcons name={name} size={24} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({ Poppins_500Medium, Poppins_600SemiBold });
  const insets = useSafeAreaInsets();
  if (!fontsLoaded) return null;

  const floatingBottom = Math.max(insets.bottom, 2);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0C8C76",
        tabBarInactiveTintColor: "#8A9AAF",
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 10,
          marginTop: 2,
          marginBottom: 8,
        },
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: floatingBottom,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(217, 226, 236, 0.9)",
          borderRadius: 30,
          height: 74,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 8,
          shadowColor: "#0F172A",
          shadowOpacity: 0.14,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 18,
        },
        tabBarItemStyle: styles.tabBarItem,
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
    width: 48,
    height: 34,
    borderRadius: 18,
  },
  iconWrapActive: {
    backgroundColor: "rgba(12, 140, 118, 0.1)",
  },
  activeDot: {
    position: "absolute",
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0C8C76",
  },
  tabBarItem: {
    borderRadius: 24,
    paddingVertical: 2,
  },
});
