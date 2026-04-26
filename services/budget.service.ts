import { fetchApi } from './api';

export type BudgetItem = {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: { id: string; name: string; icon: string; type: string };
};

export type BudgetResponse = {
  month: number;
  year: number;
  totalBudget: number;
  budgets: BudgetItem[];
};

export const budgetService = {
  get: (month: number, year: number) =>
    fetchApi<BudgetResponse>(`/budgets?month=${month}&year=${year}`),

  save: (data: {
    month: number;
    year: number;
    allocations: { categoryId: string; amount: number }[];
  }) => fetchApi<{ message: string; count: number }>('/budgets', { method: 'POST', body: data }),

  updateItem: (id: string, amount: number) =>
    fetchApi<{ message: string; budget: BudgetItem }>(`/budgets/${id}`, {
      method: 'PUT',
      body: { amount },
    }),

  deleteItem: (id: string) =>
    fetchApi<{ message: string }>(`/budgets/${id}`, { method: 'DELETE' }),

  delete: (month: number, year: number) =>
    fetchApi<{ message: string }>(`/budgets?month=${month}&year=${year}`, { method: 'DELETE' }),
};
