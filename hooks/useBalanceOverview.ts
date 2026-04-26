import { useCallback, useEffect, useState } from 'react';

import { summaryService } from '../services/summary.service';
import { OverviewResponse } from '../services/summary.types';

type UseBalanceOverviewResult = {
  overview: OverviewResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useBalanceOverview(userId: string | null | undefined): UseBalanceOverviewResult {
  const [overview, setOverview] = useState<OverviewResponse | null>(() =>
    userId ? summaryService.peekOverview(userId) : null
  );
  const [isLoading, setIsLoading] = useState(userId ? overview === null : false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setError(null);
    if (!userId) {
      setOverview(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const cached = summaryService.peekOverview(userId);
    if (cached) {
      setOverview(cached);
      setIsLoading(false);
    } else {
      setOverview(null);
      setIsLoading(true);
    }

    const unsubscribe = summaryService.subscribeOverview(userId, (next) => {
      if (!active) {
        return;
      }

      setOverview(next);
      setIsLoading(false);
    });

    summaryService
      .getOverview(userId)
      .then((next) => {
        if (!active) {
          return;
        }

        setOverview(next);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!active) {
          return;
        }

        setError(err?.message || 'Gagal memuat total saldo');
        setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setOverview(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const next = await summaryService.refreshOverview(userId);
      setOverview(next);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat total saldo');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { overview, isLoading, error, refresh };
}
