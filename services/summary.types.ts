export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percent: number;
};

export type SummaryResponse = {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalBudget: number;
  balance: number;
  savings: number;
  expenseByCategory: CategoryBreakdown[];
};

export type OverviewResponse = {
  totalBalance: number;
};

export type TrendItem = {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
};

export type TrendResponse = {
  year: number;
  summaries: TrendItem[];
};
