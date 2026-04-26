import { fetchApi } from './api';
import storage from './storage';
import {
  CategoryBreakdown,
  OverviewResponse,
  SummaryResponse,
  TrendResponse,
} from './summary.types';

type CachedEntry<T> = {
  value: T;
  updatedAt: number;
};

type SummaryStore = Record<string, CachedEntry<SummaryResponse>>;
type TrendStore = Record<string, CachedEntry<TrendResponse>>;
type OverviewStore = Record<string, CachedEntry<OverviewResponse>>;

type SummaryTransactionLike = {
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: {
    id: string;
    name: string;
    icon: string;
    type?: string;
  };
};

type TransactionMutation = {
  previous?: SummaryTransactionLike | null;
  next?: SummaryTransactionLike | null;
};

type Period = {
  month: number;
  year: number;
};

type LoadOptions = {
  forceRefresh?: boolean;
};

type SummaryListener = (summary: SummaryResponse | null) => void;
type TrendListener = (trend: TrendResponse | null) => void;
type OverviewListener = (overview: OverviewResponse | null) => void;

type InFlightFetch<T> = {
  startedAt: number;
  promise: Promise<T>;
};

const SUMMARY_CACHE_KEY = 'summary-cache-v2';
const TREND_CACHE_KEY = 'summary-trend-cache-v2';
const OVERVIEW_CACHE_KEY = 'summary-overview-cache-v1';
const SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;
const TREND_CACHE_TTL_MS = 10 * 60 * 1000;
const OVERVIEW_CACHE_TTL_MS = 3 * 60 * 1000;

let summaryStore: SummaryStore | null = null;
let trendStore: TrendStore | null = null;
let overviewStore: OverviewStore | null = null;
let cacheLoadPromise: Promise<void> | null = null;

const summaryListeners = new Map<string, Set<SummaryListener>>();
const trendListeners = new Map<string, Set<TrendListener>>();
const overviewListeners = new Map<string, Set<OverviewListener>>();

const summaryFetches = new Map<string, InFlightFetch<SummaryResponse>>();
const trendFetches = new Map<string, InFlightFetch<TrendResponse>>();
const overviewFetches = new Map<string, InFlightFetch<OverviewResponse>>();

const summaryMutationAt = new Map<string, number>();
const trendMutationAt = new Map<string, number>();
const overviewMutationAt = new Map<string, number>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStore<T>(raw: string | null): Record<string, CachedEntry<T>> {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    const store: Record<string, CachedEntry<T>> = {};

    for (const [key, entry] of Object.entries(parsed)) {
      if (!isRecord(entry)) {
        continue;
      }

      if (typeof entry.updatedAt !== 'number' || !Number.isFinite(entry.updatedAt)) {
        continue;
      }

      if (!('value' in entry)) {
        continue;
      }

      store[key] = {
        value: entry.value as T,
        updatedAt: entry.updatedAt,
      };
    }

    return store;
  } catch {
    return {};
  }
}

function userNamespace(userId: string): string {
  return `user:${userId}`;
}

function summaryKey(userId: string, month: number, year: number): string {
  return `${userNamespace(userId)}:summary:${year}-${String(month).padStart(2, '0')}`;
}

function trendKey(userId: string, year: number): string {
  return `${userNamespace(userId)}:trend:${year}`;
}

function overviewKey(userId: string): string {
  return `${userNamespace(userId)}:overview`;
}

function getPeriod(date: string): Period {
  const parsed = new Date(date);
  return {
    month: parsed.getMonth() + 1,
    year: parsed.getFullYear(),
  };
}

function samePeriod(date: string, period: Period): boolean {
  const parsed = getPeriod(date);
  return parsed.month === period.month && parsed.year === period.year;
}

function getPeriodsFromMutation(mutation: TransactionMutation): Period[] {
  const periods: Period[] = [];
  const seen = new Set<string>();

  for (const tx of [mutation.previous, mutation.next]) {
    if (!tx) {
      continue;
    }

    const period = getPeriod(tx.date);
    const key = `${period.year}-${String(period.month).padStart(2, '0')}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    periods.push(period);
  }

  return periods;
}

function getYearsFromMutation(mutation: TransactionMutation): number[] {
  const years = new Set<number>();

  for (const tx of [mutation.previous, mutation.next]) {
    if (!tx) {
      continue;
    }

    years.add(getPeriod(tx.date).year);
  }

  return [...years];
}

function ensureListenerSet<T>(store: Map<string, Set<T>>, key: string): Set<T> {
  const existing = store.get(key);
  if (existing) {
    return existing;
  }

  const next = new Set<T>();
  store.set(key, next);
  return next;
}

function emitSummary(key: string) {
  const listeners = summaryListeners.get(key);
  if (!listeners) {
    return;
  }

  const snapshot = summaryStore?.[key]?.value ?? null;
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Listener failures should not break cache updates.
    }
  }
}

function emitTrend(key: string) {
  const listeners = trendListeners.get(key);
  if (!listeners) {
    return;
  }

  const snapshot = trendStore?.[key]?.value ?? null;
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Listener failures should not break cache updates.
    }
  }
}

function emitOverview(key: string) {
  const listeners = overviewListeners.get(key);
  if (!listeners) {
    return;
  }

  const snapshot = overviewStore?.[key]?.value ?? null;
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Listener failures should not break cache updates.
    }
  }
}

async function ensureCacheLoaded(): Promise<void> {
  if (summaryStore && trendStore && overviewStore) {
    return;
  }

  if (!cacheLoadPromise) {
    cacheLoadPromise = (async () => {
      const [summaryRaw, trendRaw, overviewRaw] = await Promise.all([
        storage.getItem(SUMMARY_CACHE_KEY),
        storage.getItem(TREND_CACHE_KEY),
        storage.getItem(OVERVIEW_CACHE_KEY),
      ]);

      summaryStore = parseStore<SummaryResponse>(summaryRaw);
      trendStore = parseStore<TrendResponse>(trendRaw);
      overviewStore = parseStore<OverviewResponse>(overviewRaw);
    })().finally(() => {
      cacheLoadPromise = null;
    });
  }

  await cacheLoadPromise;
}

async function persistStore<T>(cacheKey: string, store: Record<string, CachedEntry<T>> | null): Promise<void> {
  if (!store || Object.keys(store).length === 0) {
    await storage.removeItem(cacheKey);
    return;
  }

  await storage.setItem(cacheKey, JSON.stringify(store));
}

async function persistSummaryStore(): Promise<void> {
  await persistStore(SUMMARY_CACHE_KEY, summaryStore);
}

async function persistTrendStore(): Promise<void> {
  await persistStore(TREND_CACHE_KEY, trendStore);
}

async function persistOverviewStore(): Promise<void> {
  await persistStore(OVERVIEW_CACHE_KEY, overviewStore);
}

function peekSummaryEntry(userId: string, month: number, year: number): CachedEntry<SummaryResponse> | null {
  return summaryStore?.[summaryKey(userId, month, year)] ?? null;
}

function peekTrendEntry(userId: string, year: number): CachedEntry<TrendResponse> | null {
  return trendStore?.[trendKey(userId, year)] ?? null;
}

function peekOverviewEntry(userId: string): CachedEntry<OverviewResponse> | null {
  return overviewStore?.[overviewKey(userId)] ?? null;
}

function isFresh(updatedAt: number, ttlMs: number): boolean {
  return Date.now() - updatedAt < ttlMs;
}

function shouldReuseFetch<T>(existing: InFlightFetch<T> | undefined, mutationAt: number): boolean {
  return Boolean(existing && existing.startedAt >= mutationAt);
}

function cloneSummary(summary: SummaryResponse): SummaryResponse {
  return {
    ...summary,
    expenseByCategory: summary.expenseByCategory.map((item) => ({ ...item })),
  };
}

function cloneTrend(trend: TrendResponse): TrendResponse {
  return {
    ...trend,
    summaries: trend.summaries.map((item) => ({ ...item })),
  };
}

function getBalanceDelta(mutation: TransactionMutation): number {
  let delta = 0;

  if (mutation.previous) {
    delta += mutation.previous.type === 'INCOME' ? -mutation.previous.amount : mutation.previous.amount;
  }

  if (mutation.next) {
    delta += mutation.next.type === 'INCOME' ? mutation.next.amount : -mutation.next.amount;
  }

  return delta;
}

function applyMutationToSummary(
  summary: SummaryResponse,
  period: Period,
  mutation: TransactionMutation
): SummaryResponse | null {
  const previousMatches = mutation.previous && samePeriod(mutation.previous.date, period);
  const nextMatches = mutation.next && samePeriod(mutation.next.date, period);

  if (!previousMatches && !nextMatches) {
    return null;
  }

  const nextIncome = nextMatches && mutation.next?.type === 'INCOME' ? mutation.next.amount : 0;
  const prevIncome = previousMatches && mutation.previous?.type === 'INCOME' ? mutation.previous.amount : 0;
  const nextExpense = nextMatches && mutation.next?.type === 'EXPENSE' ? mutation.next.amount : 0;
  const prevExpense = previousMatches && mutation.previous?.type === 'EXPENSE' ? mutation.previous.amount : 0;

  const categoryMap = new Map<string, CategoryBreakdown>(
    summary.expenseByCategory.map((item) => [item.categoryId, { ...item }])
  );

  const applyExpense = (tx: SummaryTransactionLike | null | undefined, sign: 1 | -1) => {
    if (!tx || tx.type !== 'EXPENSE' || !samePeriod(tx.date, period)) {
      return;
    }

    const existing = categoryMap.get(tx.category.id);
    const nextAmount = (existing?.amount ?? 0) + sign * tx.amount;

    if (nextAmount <= 0) {
      categoryMap.delete(tx.category.id);
      return;
    }

    categoryMap.set(tx.category.id, {
      categoryId: tx.category.id,
      categoryName: tx.category.name,
      categoryIcon: tx.category.icon,
      amount: nextAmount,
      percent: 0,
    });
  };

  applyExpense(mutation.previous, -1);
  applyExpense(mutation.next, 1);

  const totalIncome = summary.totalIncome + nextIncome - prevIncome;
  const totalExpense = summary.totalExpense + nextExpense - prevExpense;
  const balance = totalIncome - totalExpense;

  const expenseByCategory = Array.from(categoryMap.values())
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      ...item,
      percent: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
    }));

  return {
    ...cloneSummary(summary),
    totalIncome,
    totalExpense,
    balance,
    savings: balance,
    expenseByCategory,
  };
}

function applyMutationToTrend(
  trend: TrendResponse,
  year: number,
  mutation: TransactionMutation
): TrendResponse | null {
  let changed = false;

  const summaries = trend.summaries.map((item) => {
    const period = { month: item.month, year: item.year };
    const previousMatches = mutation.previous && samePeriod(mutation.previous.date, period);
    const nextMatches = mutation.next && samePeriod(mutation.next.date, period);

    if (!previousMatches && !nextMatches) {
      return item;
    }

    const nextIncome = nextMatches && mutation.next?.type === 'INCOME' ? mutation.next.amount : 0;
    const prevIncome = previousMatches && mutation.previous?.type === 'INCOME' ? mutation.previous.amount : 0;
    const nextExpense = nextMatches && mutation.next?.type === 'EXPENSE' ? mutation.next.amount : 0;
    const prevExpense = previousMatches && mutation.previous?.type === 'EXPENSE' ? mutation.previous.amount : 0;

    const totalIncome = item.totalIncome + nextIncome - prevIncome;
    const totalExpense = item.totalExpense + nextExpense - prevExpense;
    const balance = totalIncome - totalExpense;
    changed = true;

    return {
      ...item,
      totalIncome,
      totalExpense,
      balance,
      savings: balance,
    };
  });

  if (!changed) {
    return null;
  }

  return {
    ...trend,
    year,
    summaries,
  };
}

function applyMutationToOverview(
  overview: OverviewResponse,
  mutation: TransactionMutation
): OverviewResponse | null {
  const delta = getBalanceDelta(mutation);
  if (delta === 0) {
    return null;
  }

  return {
    totalBalance: overview.totalBalance + delta,
  };
}

async function refreshSummary(userId: string, month: number, year: number): Promise<SummaryResponse> {
  await ensureCacheLoaded();
  const key = summaryKey(userId, month, year);
  const mutationAt = summaryMutationAt.get(key) ?? 0;
  const existing = summaryFetches.get(key);

  if (shouldReuseFetch(existing, mutationAt)) {
    return existing!.promise;
  }

  const startedAt = Date.now();
  const promise = (async () => {
    const fresh = await fetchApi<SummaryResponse>(`/summary?month=${month}&year=${year}`);

    const latestMutationAt = summaryMutationAt.get(key) ?? 0;
    if (latestMutationAt > startedAt) {
      return refreshSummary(userId, month, year);
    }

    if (!summaryStore) {
      summaryStore = {};
    }

    summaryStore[key] = {
      value: cloneSummary(fresh),
      updatedAt: Date.now(),
    };
    await persistSummaryStore();
    emitSummary(key);
    return fresh;
  })().finally(() => {
    const current = summaryFetches.get(key);
    if (current?.startedAt === startedAt) {
      summaryFetches.delete(key);
    }
  });

  summaryFetches.set(key, { startedAt, promise });
  return promise;
}

async function refreshTrend(userId: string, year: number): Promise<TrendResponse> {
  await ensureCacheLoaded();
  const key = trendKey(userId, year);
  const mutationAt = trendMutationAt.get(key) ?? 0;
  const existing = trendFetches.get(key);

  if (shouldReuseFetch(existing, mutationAt)) {
    return existing!.promise;
  }

  const startedAt = Date.now();
  const promise = (async () => {
    const fresh = await fetchApi<TrendResponse>(`/summary/trend?year=${year}`);

    const latestMutationAt = trendMutationAt.get(key) ?? 0;
    if (latestMutationAt > startedAt) {
      return refreshTrend(userId, year);
    }

    if (!trendStore) {
      trendStore = {};
    }

    trendStore[key] = {
      value: cloneTrend(fresh),
      updatedAt: Date.now(),
    };
    await persistTrendStore();
    emitTrend(key);
    return fresh;
  })().finally(() => {
    const current = trendFetches.get(key);
    if (current?.startedAt === startedAt) {
      trendFetches.delete(key);
    }
  });

  trendFetches.set(key, { startedAt, promise });
  return promise;
}

async function refreshOverview(userId: string): Promise<OverviewResponse> {
  await ensureCacheLoaded();
  const key = overviewKey(userId);
  const mutationAt = overviewMutationAt.get(key) ?? 0;
  const existing = overviewFetches.get(key);

  if (shouldReuseFetch(existing, mutationAt)) {
    return existing!.promise;
  }

  const startedAt = Date.now();
  const promise = (async () => {
    const fresh = await fetchApi<OverviewResponse>('/summary/overview');

    const latestMutationAt = overviewMutationAt.get(key) ?? 0;
    if (latestMutationAt > startedAt) {
      return refreshOverview(userId);
    }

    if (!overviewStore) {
      overviewStore = {};
    }

    overviewStore[key] = {
      value: { ...fresh },
      updatedAt: Date.now(),
    };
    await persistOverviewStore();
    emitOverview(key);
    return fresh;
  })().finally(() => {
    const current = overviewFetches.get(key);
    if (current?.startedAt === startedAt) {
      overviewFetches.delete(key);
    }
  });

  overviewFetches.set(key, { startedAt, promise });
  return promise;
}

async function applyTransactionMutation(userId: string, mutation: TransactionMutation): Promise<void> {
  if (!mutation.previous && !mutation.next) {
    return;
  }

  await ensureCacheLoaded();

  if (!summaryStore) {
    summaryStore = {};
  }

  if (!trendStore) {
    trendStore = {};
  }

  if (!overviewStore) {
    overviewStore = {};
  }

  const now = Date.now();
  const periods = getPeriodsFromMutation(mutation);
  const years = getYearsFromMutation(mutation);

  for (const period of periods) {
    const key = summaryKey(userId, period.month, period.year);
    summaryMutationAt.set(key, now);

    const cached = summaryStore[key];
    if (!cached) {
      continue;
    }

    const nextValue = applyMutationToSummary(cached.value, period, mutation);
    if (!nextValue) {
      continue;
    }

    summaryStore[key] = {
      value: nextValue,
      updatedAt: now,
    };
  }

  for (const year of years) {
    const key = trendKey(userId, year);
    trendMutationAt.set(key, now);

    const cached = trendStore[key];
    if (!cached) {
      continue;
    }

    const nextValue = applyMutationToTrend(cached.value, year, mutation);
    if (!nextValue) {
      continue;
    }

    trendStore[key] = {
      value: cloneTrend(nextValue),
      updatedAt: now,
    };
  }

  const accountOverviewKey = overviewKey(userId);
  overviewMutationAt.set(accountOverviewKey, now);
  const cachedOverview = overviewStore[accountOverviewKey];
  if (cachedOverview) {
    const nextOverview = applyMutationToOverview(cachedOverview.value, mutation);
    if (nextOverview) {
      overviewStore[accountOverviewKey] = {
        value: { ...nextOverview },
        updatedAt: now,
      };
    }
  }

  await Promise.all([
    persistSummaryStore(),
    persistTrendStore(),
    persistOverviewStore(),
  ]);

  for (const period of periods) {
    emitSummary(summaryKey(userId, period.month, period.year));
  }

  for (const year of years) {
    emitTrend(trendKey(userId, year));
  }

  emitOverview(accountOverviewKey);
}

async function refreshTransactionImpact(userId: string, mutation: TransactionMutation): Promise<void> {
  if (!mutation.previous && !mutation.next) {
    return;
  }

  const periods = getPeriodsFromMutation(mutation);
  const years = getYearsFromMutation(mutation);

  await ensureCacheLoaded();

  const summaryTasks = periods.map((period) => refreshSummary(userId, period.month, period.year));
  const trendTasks = years.map((year) => refreshTrend(userId, year));

  await Promise.allSettled([
    refreshOverview(userId),
    ...summaryTasks,
    ...trendTasks,
  ]);
}

function subscribeSummary(userId: string, month: number, year: number, listener: SummaryListener): () => void {
  const key = summaryKey(userId, month, year);
  const listeners = ensureListenerSet(summaryListeners, key);
  listeners.add(listener);

  const snapshot = peekSummary(userId, month, year);
  if (snapshot) {
    listener(snapshot);
  }

  return () => {
    const current = summaryListeners.get(key);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      summaryListeners.delete(key);
    }
  };
}

function subscribeTrend(userId: string, year: number, listener: TrendListener): () => void {
  const key = trendKey(userId, year);
  const listeners = ensureListenerSet(trendListeners, key);
  listeners.add(listener);

  const snapshot = peekTrend(userId, year);
  if (snapshot) {
    listener(snapshot);
  }

  return () => {
    const current = trendListeners.get(key);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      trendListeners.delete(key);
    }
  };
}

function subscribeOverview(userId: string, listener: OverviewListener): () => void {
  const key = overviewKey(userId);
  const listeners = ensureListenerSet(overviewListeners, key);
  listeners.add(listener);

  const snapshot = peekOverview(userId);
  if (snapshot) {
    listener(snapshot);
  }

  return () => {
    const current = overviewListeners.get(key);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      overviewListeners.delete(key);
    }
  };
}

async function getSummary(userId: string, month: number, year: number, options: LoadOptions = {}): Promise<SummaryResponse> {
  await ensureCacheLoaded();
  const key = summaryKey(userId, month, year);
  const cached = summaryStore?.[key];

  if (cached && !options.forceRefresh) {
    if (!isFresh(cached.updatedAt, SUMMARY_CACHE_TTL_MS)) {
      void refreshSummary(userId, month, year).catch(() => undefined);
    }

    return cached.value;
  }

  return refreshSummary(userId, month, year);
}

async function getTrend(userId: string, year: number, options: LoadOptions = {}): Promise<TrendResponse> {
  await ensureCacheLoaded();
  const key = trendKey(userId, year);
  const cached = trendStore?.[key];

  if (cached && !options.forceRefresh) {
    if (!isFresh(cached.updatedAt, TREND_CACHE_TTL_MS)) {
      void refreshTrend(userId, year).catch(() => undefined);
    }

    return cached.value;
  }

  return refreshTrend(userId, year);
}

async function getOverview(userId: string, options: LoadOptions = {}): Promise<OverviewResponse> {
  await ensureCacheLoaded();
  const key = overviewKey(userId);
  const cached = overviewStore?.[key];

  if (cached && !options.forceRefresh) {
    if (!isFresh(cached.updatedAt, OVERVIEW_CACHE_TTL_MS)) {
      void refreshOverview(userId).catch(() => undefined);
    }

    return cached.value;
  }

  return refreshOverview(userId);
}

function peekSummary(userId: string, month: number, year: number): SummaryResponse | null {
  return peekSummaryEntry(userId, month, year)?.value ?? null;
}

function peekTrend(userId: string, year: number): TrendResponse | null {
  return peekTrendEntry(userId, year)?.value ?? null;
}

function peekOverview(userId: string): OverviewResponse | null {
  return peekOverviewEntry(userId)?.value ?? null;
}

export const summaryService = {
  get: getSummary,
  refresh: refreshSummary,
  peek: peekSummary,
  subscribe: subscribeSummary,
  getTrend,
  refreshTrend,
  peekTrend,
  subscribeTrend,
  getOverview,
  refreshOverview,
  peekOverview,
  subscribeOverview,
  applyTransactionMutation,
  refreshTransactionImpact,
};

export type { CategoryBreakdown, OverviewResponse, SummaryResponse, TrendResponse } from './summary.types';
