import { fetchApi } from './api';

export type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  isActive: boolean;
  _count?: { transactions: number };
};

type CategoriesResponse = { categories: Category[] };
type CategoryResponse = { message: string; category: Category };

export const categoryService = {
  getAll: (type?: 'INCOME' | 'EXPENSE') =>
    fetchApi<CategoriesResponse>(`/categories${type ? `?type=${type}` : ''}`),

  create: (data: { name: string; type: 'INCOME' | 'EXPENSE'; icon: string }) =>
    fetchApi<CategoryResponse>('/categories', { method: 'POST', body: data }),

  update: (id: string, data: { name?: string; icon?: string; isActive?: boolean }) =>
    fetchApi<CategoryResponse>(`/categories/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
};
