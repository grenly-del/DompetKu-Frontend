import { useCallback, useEffect, useState } from 'react';

import { summaryService } from '../services/summary.service';
import { SummaryResponse } from '../services/summary.types';

type UseMonthlySummaryResult = {
  summary: SummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMonthlySummary(userId: string | null | undefined, month: number, year: number): UseMonthlySummaryResult {
  const [summary, setSummary] = useState<SummaryResponse | null>(() =>
    userId ? summaryService.peek(userId, month, year) : null
  );
  const [isLoading, setIsLoading] = useState(userId ? summary === null : false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setError(null);
    if (!userId) {
      setSummary(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const cached = summaryService.peek(userId, month, year);
    if (cached) {
      setSummary(cached);
      setIsLoading(false);
    } else {
      setSummary(null);
      setIsLoading(true);
    }

    const unsubscribe = summaryService.subscribe(userId, month, year, (next) => {
      if (!active) {
        return;
      }

      setSummary(next);
      setIsLoading(false);
    });

    summaryService
      .get(userId, month, year)
      .then((next) => {
        if (!active) {
          return;
        }

        setSummary(next);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!active) {
          return;
        }

        setError(err?.message || 'Gagal memuat ringkasan');
        setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, month, year]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const next = await summaryService.refresh(userId, month, year);
      setSummary(next);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat ringkasan');
    } finally {
      setIsLoading(false);
    }
  }, [userId, month, year]);

  return { summary, isLoading, error, refresh };
}
