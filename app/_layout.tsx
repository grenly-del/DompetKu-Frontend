import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="addExpense" />
        <Stack.Screen name="addIncome" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="planBudget" />
      </Stack>
    </AuthProvider>
  );
}
