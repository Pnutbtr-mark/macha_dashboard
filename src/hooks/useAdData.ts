import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdStore } from '../stores/adStore';
import type { PeriodType } from '../types';

/**
 * 광고 페이지 전용 통합 훅
 *
 * 기존 2개 훅(useAdPerformance, useDailyAdData)을 하나로 통합하고
 * N+1 쿼리 문제를 해결하여 API 호출을 최소화합니다.
 *
 * 최적화 효과 (캠페인 10개 기준):
 * - 기존: 44회 API 호출 (2 * (1 + 10) * 2)
 * - 최적화 후: 11회 API 호출 (1 + 10)
 * - 감소율: 75%
 */
export function useAdData() {
  const { user } = useAuth();
  const store = useAdStore();

  // 초기 데이터 로드
  useEffect(() => {
    if (user?.id) {
      store.fetchAllData(user.id);
    }
  }, [user?.id, store.fetchAllData]);

  // 새로고침 함수 (캐시 무시)
  const refetch = useCallback(async () => {
    if (user?.id) {
      await store.refresh(user.id);
    }
  }, [user?.id, store.refresh]);

  // 기간 변경 함수 (API 재호출 없이 재계산)
  const setPeriod = useCallback((period: PeriodType, customRange?: { start: string; end: string }) => {
    store.setPeriod(period, customRange);
  }, [store.setPeriod]);

  return {
    // 데이터
    adPerformance: store.adPerformance,
    dailyAdData: store.dailyAdData,
    campaignPerformance: store.campaignPerformance,
    campaignHierarchy: store.campaignHierarchy,

    // 상태
    loading: store.loading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    serverSyncTime: store.serverSyncTime,
    period: store.period,
    customDateRange: store.customDateRange,

    // 액션
    refetch,
    setPeriod,
  };
}
