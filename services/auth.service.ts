import { fetchApi } from './api';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  provider?: string;
  createdAt?: string;
};

type AuthResponse = {
  message: string;
  user: AuthUser;
  token: string;
};

export type ProfileResponse = {
  user: AuthUser;
};

export type AccountSummaryResponse = {
  user: AuthUser;
  stats: {
    transactionCount: number;
    categoryCount: number;
    budgetCount: number;
  };
};

type UpdateProfileInput = {
  name: string;
  email: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export const authService = {
  register: (username: string, email: string, password: string) =>
    fetchApi<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { username, email, password },
      auth: false,
    }),

  login: (email: string, password: string) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  getCurrentUser: () =>
    fetchApi<ProfileResponse>('/auth/me'),

  getProfile: () =>
    fetchApi<ProfileResponse>('/auth/profile'),

  getAccountSummary: () =>
    fetchApi<AccountSummaryResponse>('/auth/account-summary'),

  updateProfile: (data: UpdateProfileInput) =>
    fetchApi<ProfileResponse>('/auth/profile', {
      method: 'PUT',
      body: {
        username: data.name,
        email: data.email,
      },
    }),

  changePassword: (data: ChangePasswordInput) =>
    fetchApi<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: data,
    }),

  deleteAccount: () =>
    fetchApi<{ message: string }>('/auth/account', {
      method: 'DELETE',
    }),
};
