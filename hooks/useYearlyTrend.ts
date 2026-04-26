import { useCallback, useEffect, useState } from 'react';

import { summaryService } from '../services/summary.service';
import { TrendResponse } from '../services/summary.types';

type UseYearlyTrendResult = {
  trend: TrendResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useYearlyTrend(userId: string | null | undefined, year: number): UseYearlyTrendResult {
  const [trend, setTrend] = useState<TrendResponse | null>(() =>
    userId ? summaryService.peekTrend(userId, year) : null
  );
  const [isLoading, setIsLoading] = useState(userId ? trend === null : false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setError(null);
    if (!userId) {
      setTrend(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const cached = summaryService.peekTrend(userId, year);
    if (cached) {
      setTrend(cached);
      setIsLoading(false);
    } else {
      setTrend(null);
      setIsLoading(true);
    }

    const unsubscribe = summaryService.subscribeTrend(userId, year, (next) => {
      if (!active) {
        return;
      }

      setTrend(next);
      setIsLoading(false);
    });

    summaryService
      .getTrend(userId, year)
      .then((next) => {
        if (!active) {
          return;
        }

        setTrend(next);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!active) {
          return;
        }

        setError(err?.message || 'Gagal memuat tren');
        setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, year]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTrend(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const next = await summaryService.refreshTrend(userId, year);
      setTrend(next);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat tren');
    } finally {
      setIsLoading(false);
    }
  }, [userId, year]);

  return { trend, isLoading, error, refresh };
}
