import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

type SkeletonProps = {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export default function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#D9E2EC",
          opacity,
        },
        style,
      ]}
    />
  );
}

/* ── Pre-built skeleton groups ───────────────────────────── */

/** Profile header skeleton (for account screen gradient header) */
export function ProfileHeaderSkeleton() {
  return (
    <View style={phs.wrapper}>
      {/* Avatar */}
      <SkeletonLoader width={64} height={64} borderRadius={22} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
      <View style={phs.info}>
        <SkeletonLoader width={140} height={16} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
        <SkeletonLoader width={180} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.14)", marginTop: 8 }} />
        <View style={phs.metaRow}>
          <SkeletonLoader width={60} height={24} borderRadius={999} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
          <SkeletonLoader width={120} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
        </View>
      </View>
    </View>
  );
}

const phs = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", gap: 16 },
  info: { flex: 1 },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
});

/** Stats bar skeleton (for the 3-column stats row) */
export function StatsSkeleton() {
  return (
    <View style={ss.wrapper}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={ss.divider} />}
          <View style={ss.item}>
            <SkeletonLoader width={36} height={16} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
            <SkeletonLoader width={52} height={10} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6 }} />
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  wrapper: {
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
  item: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },
});

/** Menu card skeleton (single card with N rows) */
export function MenuCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={ms.card}>
      {Array.from({ length: rows }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={ms.divider} />}
          <View style={ms.row}>
            <SkeletonLoader width={44} height={44} borderRadius={15} />
            <View style={ms.text}>
              <SkeletonLoader width={120} height={13} borderRadius={6} />
              <SkeletonLoader width={180} height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
            <SkeletonLoader width={18} height={18} borderRadius={9} />
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: "#FFF",
    paddingHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  text: { flex: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 74 },
});

/** Notification setting row skeleton */
export function NotificationSettingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={ns.row}>
            <SkeletonLoader width={44} height={44} borderRadius={15} />
            <View style={ns.text}>
              <SkeletonLoader width={130} height={14} borderRadius={6} />
              <SkeletonLoader width={180} height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
            <SkeletonLoader width={50} height={30} borderRadius={15} />
          </View>
          {i < rows - 1 && <View style={ns.divider} />}
        </React.Fragment>
      ))}
    </>
  );
}

const ns = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  text: { flex: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 58 },
});

/* ═══════════════════════════════════════════════════════
   HOME SCREEN SKELETONS
   ═══════════════════════════════════════════════════════ */

/** Home header card skeleton (greeting + balance + income/expense cards) */
export function HomeHeaderSkeleton() {
  return (
    <View>
      {/* Greeting */}
      <SkeletonLoader width={160} height={18} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
      <SkeletonLoader width={200} height={11} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6 }} />
      {/* Balance */}
      <View style={{ marginTop: 28 }}>
        <SkeletonLoader width={90} height={11} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
        <SkeletonLoader width={200} height={26} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.20)", marginTop: 6 }} />
      </View>
      {/* Summary cards */}
      <View style={{ marginTop: 20, flexDirection: "row", gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
            <SkeletonLoader width={36} height={36} borderRadius={12} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
            <View>
              <SkeletonLoader width={60} height={11} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
              <SkeletonLoader width={80} height={13} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.20)", marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Quick action grid skeleton */
export function QuickActionsSkeleton() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: "22%", alignItems: "center", gap: 6 }}>
          <SkeletonLoader width={60} height={60} borderRadius={20} />
          <SkeletonLoader width={50} height={10} borderRadius={5} />
        </View>
      ))}
    </View>
  );
}

/** Transaction list skeleton (for Home & History) */
export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={tls.card}>
      {Array.from({ length: rows }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={tls.row}>
            <SkeletonLoader width={3} height={38} borderRadius={2} />
            <SkeletonLoader width={46} height={46} borderRadius={16} />
            <View style={tls.info}>
              <SkeletonLoader width={120} height={13} borderRadius={6} />
              <SkeletonLoader width={160} height={11} borderRadius={5} style={{ marginTop: 4 }} />
            </View>
            <SkeletonLoader width={80} height={13} borderRadius={6} />
          </View>
          {i < rows - 1 && <View style={tls.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const tls = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  info: { flex: 1 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 60 },
});

/* ═══════════════════════════════════════════════════════
   HISTORY SCREEN SKELETONS
   ═══════════════════════════════════════════════════════ */

/** History header skeleton (title + summary cards) */
export function HistoryHeaderSkeleton() {
  return (
    <View>
      <SkeletonLoader width={180} height={18} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
      <SkeletonLoader width={240} height={11} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6 }} />
      <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
            <SkeletonLoader width={16} height={16} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
            <View>
              <SkeletonLoader width={60} height={11} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
              <SkeletonLoader width={90} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.20)", marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Filter row skeleton */
export function FilterRowSkeleton() {
  return (
    <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <SkeletonLoader key={i} width={80} height={40} borderRadius={16} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   ANALYSIS SCREEN SKELETONS
   ═══════════════════════════════════════════════════════ */

/** Analysis overview cards skeleton */
export function AnalysisOverviewSkeleton() {
  return (
    <View style={{ marginTop: 18, flexDirection: "row", gap: 14 }}>
      {[0, 1].map((i) => (
        <View key={i} style={aos.card}>
          <SkeletonLoader width={44} height={44} borderRadius={15} />
          <SkeletonLoader width={100} height={13} borderRadius={6} style={{ marginTop: 14 }} />
          <SkeletonLoader width={140} height={11} borderRadius={5} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

const aos = StyleSheet.create({
  card: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: "#FFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

/** Analysis comparison card skeleton */
export function AnalysisComparisonSkeleton() {
  return (
    <View style={acs.card}>
      <SkeletonLoader width={180} height={14} borderRadius={6} />
      <SkeletonLoader width={130} height={12} borderRadius={6} style={{ marginTop: 4 }} />
      {/* Navigator */}
      <View style={acs.nav}>
        <SkeletonLoader width={42} height={42} borderRadius={14} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <SkeletonLoader width={160} height={14} borderRadius={6} />
          <SkeletonLoader width={120} height={11} borderRadius={5} style={{ marginTop: 4 }} />
        </View>
        <SkeletonLoader width={42} height={42} borderRadius={14} />
      </View>
      {/* Bars */}
      <View style={{ marginTop: 16, gap: 14 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <SkeletonLoader width={80} height={12} borderRadius={6} />
              <SkeletonLoader width={40} height={12} borderRadius={6} />
            </View>
            <SkeletonLoader width={"100%"} height={10} borderRadius={10} />
            <SkeletonLoader width={100} height={12} borderRadius={6} style={{ alignSelf: "flex-end" }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const acs = StyleSheet.create({
  card: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: "#FFF",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },
  nav: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});

/** Bar chart skeleton */
export function BarChartSkeleton() {
  return (
    <View style={bcs.card}>
      <SkeletonLoader width={120} height={14} borderRadius={6} />
      <View style={{ flexDirection: "row", gap: 20, marginTop: 16, marginBottom: 16 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <SkeletonLoader width={10} height={10} borderRadius={5} />
            <SkeletonLoader width={60} height={12} borderRadius={5} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 120 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <SkeletonLoader width={20} height={20 + Math.random() * 60} borderRadius={6} />
              <SkeletonLoader width={20} height={15 + Math.random() * 50} borderRadius={6} />
            </View>
            <SkeletonLoader width={24} height={12} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  );
}

const bcs = StyleSheet.create({
  card: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: "#FFF",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },
});

/** Category breakdown skeleton */
export function CategoryBreakdownSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={cbs.card}>
      <SkeletonLoader width={180} height={14} borderRadius={6} />
      <View style={{ marginTop: 14, gap: 14 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <SkeletonLoader width={10} height={10} borderRadius={5} />
            <SkeletonLoader width={80} height={13} borderRadius={6} />
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F1F5F9" }}>
              <SkeletonLoader width={`${30 + Math.random() * 50}%`} height={8} borderRadius={4} />
            </View>
            <SkeletonLoader width={90} height={12} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

const cbs = StyleSheet.create({
  card: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: "#FFF",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },
});

/* ═══════════════════════════════════════════════════════
   CATEGORIES SCREEN SKELETONS
   ═══════════════════════════════════════════════════════ */

/** Categories header insights skeleton */
export function CategoriesInsightSkeleton() {
  return (
    <View>
      <SkeletonLoader width={180} height={18} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
      <SkeletonLoader width={250} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.12)", marginTop: 4 }} />
      <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ minWidth: 140, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
            <SkeletonLoader width={36} height={20} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.20)" }} />
            <SkeletonLoader width={80} height={12} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.14)", marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Categories grid skeleton */
export function CategoriesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={cgs.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SkeletonLoader width={44} height={44} borderRadius={15} />
            <View style={{ flex: 1 }}>
              <SkeletonLoader width={100} height={14} borderRadius={6} />
              <SkeletonLoader width={60} height={11} borderRadius={5} style={{ marginTop: 4 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <SkeletonLoader width={32} height={32} borderRadius={10} />
            <SkeletonLoader width={32} height={32} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

const cgs = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

/* ═══════════════════════════════════════════════════════
   PLAN BUDGET SCREEN SKELETONS
   ═══════════════════════════════════════════════════════ */

/** Budget list skeleton */
export function BudgetListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={bls.item}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SkeletonLoader width={42} height={42} borderRadius={14} />
            <View style={{ flex: 1 }}>
              <SkeletonLoader width={120} height={14} borderRadius={6} />
              <SkeletonLoader width={80} height={11} borderRadius={5} style={{ marginTop: 4 }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SkeletonLoader width={34} height={34} borderRadius={12} />
              <SkeletonLoader width={34} height={34} borderRadius={12} />
            </View>
          </View>
          <SkeletonLoader width={110} height={15} borderRadius={6} style={{ marginTop: 10, alignSelf: "flex-end" }} />
        </View>
      ))}
    </View>
  );
}

const bls = StyleSheet.create({
  item: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

/** Form fields skeleton (for addExpense, addIncome, planBudget input forms) */
export function FormFieldsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <View style={ffs.card}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={{ marginBottom: 20 }}>
          <SkeletonLoader width={100} height={11} borderRadius={5} />
          <SkeletonLoader width={"100%"} height={56} borderRadius={18} style={{ marginTop: 10 }} />
        </View>
      ))}
      {/* Submit button skeleton */}
      <SkeletonLoader width={"100%"} height={58} borderRadius={20} style={{ marginTop: 6 }} />
    </View>
  );
}

const ffs = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
});
