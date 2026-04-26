export const incomeIconPool = [
  "wallet-outline",
  "briefcase-outline",
  "storefront-outline",
  "cash-plus",
  "chart-line",
] as const;

export const expenseIconPool = [
  "cart-outline",
  "silverware-fork-knife",
  "car-outline",
  "home-city-outline",
  "cellphone-wireless",
] as const;

export function pickCategoryIcon(
  type: "income" | "expense",
  index: number
): string {
  const pool = type === "income" ? incomeIconPool : expenseIconPool;
  return pool[index % pool.length];
}
