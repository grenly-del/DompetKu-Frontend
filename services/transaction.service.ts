import { fetchApi } from './api';
import { summaryService } from './summary.service';
import storage from './storage';

export type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  note: string | null;
  categoryId: string;
  category: { id: string; name: string; icon: string; type: string };
  createdAt: string;
};

type TransactionsResponse = {
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type TransactionResponse = {
  message: string;
  transaction: Transaction;
  budgetWarning?: {
    categoryName: string;
    budgetAmount: number;
    totalSpent: number;
    overAmount: number;
  } | null;
};

type TransactionFilters = {
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

async function fetchTransactionById(id: string) {
  return fetchApi<{ transaction: Transaction }>(`/transactions/${id}`);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const rawUser = await storage.getItem('user');
    if (!rawUser) {
      return null;
    }

    const parsed = JSON.parse(rawUser) as { id?: unknown };
    return typeof parsed.id === 'string' && parsed.id.length > 0 ? parsed.id : null;
  } catch {
    return null;
  }
}

export const transactionService = {
  getAll: (filters: TransactionFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.month) params.append('month', String(filters.month));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    const qs = params.toString();
    return fetchApi<TransactionsResponse>(`/transactions${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => fetchTransactionById(id),

  create: async (data: {
    name: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: string;
    note?: string;
    categoryId: string;
  }) => {
    const response = await fetchApi<TransactionResponse>('/transactions', {
      method: 'POST',
      body: data,
    });

    const userId = await getCurrentUserId();
    if (userId) {
      await summaryService.applyTransactionMutation(userId, { next: response.transaction }).catch(() => undefined);
      void summaryService.refreshTransactionImpact(userId, { next: response.transaction }).catch(() => undefined);
    }

    return response;
  },

  update: async (
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      date: string;
      note: string;
      categoryId: string;
    }>
  ) => {
    const before = await fetchTransactionById(id).catch(() => null);
    const response = await fetchApi<{ message: string }>(`/transactions/${id}`, {
      method: 'PUT',
      body: data,
    });
    const after = await fetchTransactionById(id).catch(() => null);

    const previous = before?.transaction ?? null;
    const next = after?.transaction ?? null;
    const userId = await getCurrentUserId();

    if (userId && (previous || next)) {
      await summaryService.applyTransactionMutation(userId, { previous, next }).catch(() => undefined);
      void summaryService.refreshTransactionImpact(userId, { previous, next }).catch(() => undefined);
    }

    return response;
  },

  delete: async (id: string) => {
    const before = await fetchTransactionById(id).catch(() => null);
    const response = await fetchApi<{ message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    });

    const previous = before?.transaction ?? null;
    const userId = await getCurrentUserId();
    if (userId && previous) {
      await summaryService.applyTransactionMutation(userId, { previous, next: null }).catch(() => undefined);
      void summaryService.refreshTransactionImpact(userId, { previous, next: null }).catch(() => undefined);
    }

    return response;
  },
};
