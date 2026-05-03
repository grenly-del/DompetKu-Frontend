import storage from './storage';

const API_PATH = '/api';
const DEFAULT_API_URL = 'https://mobile.klabatdev.my.id';
// const DEFAULT_API_URL = 'http://localhost:4321';

function normalizeApiUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith(API_PATH) ? trimmed : `${trimmed}${API_PATH}`;
}

function getDefaultApiUrl() {
  return normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);
}

export const BASE_URL = getDefaultApiUrl();

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean; // default true
};

export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    try {
      const token = await storage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Storage is best-effort; continue without token if it fails.
    }
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkError: any) {
    console.error('[API] Network error:', networkError?.message || networkError);
    throw {
      status: 0,
      message: `Tidak dapat terhubung ke server. Periksa koneksi internet Anda.`,
      errors: null,
    };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw {
      status: response.status,
      message: 'Respons server tidak valid',
      errors: null,
    };
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || 'Terjadi kesalahan',
      errors: data.errors,
    };
  }

  return data as T;
}
