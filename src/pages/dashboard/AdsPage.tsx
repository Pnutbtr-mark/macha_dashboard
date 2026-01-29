import { useState, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { AdsTab } from '../../components/tabs/AdsTab';
import { PeriodFilter } from '../../components/common/PeriodFilter';
import { useAdData } from '../../hooks/useAdData';
import { useProfileData } from '../../hooks/useProfileData';
import { useAuth } from '../../contexts/AuthContext';
import { syncDashAd } from '../../services/metaDashApi';
import type { PeriodType } from '../../types';

export function AdsPage() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);

  // 통합 훅 사용 (기존 2개 훅 → 1개 훅으로 통합)
  const {
    adPerformance,
    dailyAdData,
    campaignPerformance,
    campaignHierarchy,
    loading: adLoading,
    serverSyncTime,
    period,
    customDateRange,
    refetch: refetchAd,
    setPeriod,
  } = useAdData();

  // 기간 변경 핸들러
  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  }, [setPeriod]);

  // 사용자 지정 날짜 범위 변경 핸들러
  const handleCustomDateChange = useCallback((start: string, end: string) => {
    setPeriod('custom', { start, end });
  }, [setPeriod]);

  // 프로필 데이터 (AdsTab에 필요)
  const { profileInsight } = useProfileData();

  // 광고 동기화 핸들러
  const handleRefreshAds = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      console.log('광고 데이터 동기화 시작...');

      if (user?.id) {
        const syncSuccess = await syncDashAd(user.id);
        console.log('광고 동기화 결과:', syncSuccess);
      }

      await refetchAd();

      console.log('광고 데이터 새로고침 완료');
    } catch (error) {
      console.error('광고 동기화 실패:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing, user?.id, refetchAd]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <PeriodFilter
          period={period}
          onChange={handlePeriodChange}
          customDateRange={customDateRange || { start: '2024-12-01', end: '2024-12-14' }}
          onCustomDateChange={handleCustomDateChange}
        />

        <div className="flex items-center gap-3">
          {serverSyncTime && (
            <div className="text-sm text-slate-500">
              마지막 동기화: {serverSyncTime.toLocaleString('ko-KR')}
            </div>
          )}
          <button
            onClick={handleRefreshAds}
            disabled={syncing}
            className={`flex items-center gap-2 px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${
              syncing ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncing ? '동기화 중...' : '동기화'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AdsTab
        adData={adPerformance}
        dailyData={dailyAdData}
        campaignData={campaignPerformance}
        campaignHierarchy={campaignHierarchy}
        profileData={profileInsight}
        loading={adLoading}
      />
    </>
  );
}
