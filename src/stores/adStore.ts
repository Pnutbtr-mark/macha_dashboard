import { create } from 'zustand';
import type {
  AdPerformance,
  DailyAdData,
  CampaignPerformance,
  CampaignHierarchy,
  CampaignDailyData,
  PeriodType,
} from '../types';
import type {
  DashAdListItem,
  DashAdCampaignDetailItem,
} from '../types/metaDash';
import {
  fetchDashAdStatisticsSummary,
  fetchDashAdDetailInfo,
} from '../services/metaDashApi';
import {
  mapToAdPerformanceFromCampaignDetail,
  mapToDailyAdDataFromCampaignDetail,
  mapToCampaignPerformanceFromCampaignDetail,
  mapToCampaignHierarchyFromCampaignDetail,
  mapToCampaignDailyData,
  convertStatisticsToCampaignDetail,
} from '../utils/metaDashMapper';
import {
  AD_PERFORMANCE,
  DAILY_AD_DATA,
  CAMPAIGN_PERFORMANCE_DATA,
} from '../data/dummyData';

interface AdState {
  // 원시 API 데이터
  rawCampaignList: DashAdListItem[] | null;
  rawCampaignDetails: DashAdCampaignDetailItem[] | null;

  // 변환된 UI 데이터
  adPerformance: AdPerformance | null;
  dailyAdData: DailyAdData[] | null;
  campaignPerformance: CampaignPerformance[];
  campaignHierarchy: CampaignHierarchy[];
  campaignDailyData: CampaignDailyData[];

  // 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  serverSyncTime: Date | null;

  // 현재 로드된 사용자 ID
  currentUserId: string | null;

  // 현재 선택된 기간
  period: PeriodType;
  customDateRange: { start: string; end: string } | null;

  // 액션
  fetchAllData: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  setPeriod: (period: PeriodType, customRange?: { start: string; end: string }) => void;
  reset: () => void;
}

/**
 * 기간별 API 조회 시작일 계산 (비교 기간 포함 2배 범위)
 */
function calculateStartDate(
  period: PeriodType,
  endTime: string,
  customRange?: { start: string; end: string }
): string {
  if (period === 'custom' && customRange) {
    const start = new Date(customRange.start + 'T12:00:00');
    const end = new Date(customRange.end + 'T12:00:00');
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const adjustedStart = new Date(start);
    adjustedStart.setDate(adjustedStart.getDate() - diffDays);
    return adjustedStart.toISOString().split('T')[0];
  }

  const daysMap: Record<string, number> = {
    daily: 31,
    weekly: 14,
    monthly: 60,
  };
  const days = daysMap[period] || 30;
  const start = new Date(endTime + 'T12:00:00');
  start.setDate(start.getDate() - days + 1);
  return start.toISOString().split('T')[0];
}

async function fetchAllAdDataBatch(
  userId: string,
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
): Promise<{
  campaignList: DashAdListItem[];
  campaignDetails: DashAdCampaignDetailItem[];
}> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const endTime = yesterday.toISOString().split('T')[0];

  const time = calculateStartDate(period, endTime, customRange);

  // 1. 통계 전체 조회
  const statistics = await fetchDashAdStatisticsSummary(userId, time, endTime);

  // 2. 응답에서 모든 adId 추출 (중복 제거)
  const adIdSet = new Set<string>();
  for (const campaign of (statistics || [])) {
    for (const adSetResp of (campaign.dashAdSetResponses || [])) {
      for (const insight of (adSetResp.responses || [])) {
        if (insight.adId) adIdSet.add(insight.adId);
      }
    }
  }
  const adIds = Array.from(adIdSet);

  // 3. 광고별 상세 조회
  const adDetails = adIds.length > 0
    ? await fetchDashAdDetailInfo(adIds, endTime)
    : [];

  // 4. 어댑터로 기존 매퍼가 기대하는 형태로 변환
  const campaignDetails = convertStatisticsToCampaignDetail(statistics || [], adDetails);
  return { campaignList: [], campaignDetails };
}

/**
 * 서버 동기화 시간 추출
 */
function extractServerSyncTime(campaignDetails: DashAdCampaignDetailItem[]): Date | null {
  const syncTimes: Date[] = [];

  campaignDetails.forEach(detail => {
    detail.adDetailResponseObjs?.forEach(adDetail => {
      adDetail.adSetChildObjs?.forEach(child => {
        if (child.dashAdAccountInsight?.lastSyncedAt) {
          const timeStr = child.dashAdAccountInsight.lastSyncedAt;
          syncTimes.push(new Date(timeStr.endsWith('Z') ? timeStr : timeStr + 'Z'));
        }
      });
    });
  });

  if (syncTimes.length > 0) {
    return syncTimes.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  return null;
}

export const useAdStore = create<AdState>((set, get) => ({
  // 초기 상태
  rawCampaignList: null,
  rawCampaignDetails: null,
  adPerformance: null,
  dailyAdData: null,
  campaignPerformance: [],
  campaignHierarchy: [],
  campaignDailyData: [],
  loading: false,
  error: null,
  lastUpdated: null,
  serverSyncTime: null,
  currentUserId: null,
  period: 'daily',
  customDateRange: null,

  // 모든 광고 데이터 가져오기
  fetchAllData: async (userId: string) => {
    set({ loading: true, error: null, currentUserId: userId });

    try {
      const { period, customDateRange } = get();
      const { campaignList, campaignDetails } = await fetchAllAdDataBatch(
        userId,
        period,
        customDateRange || undefined
      );

      // 서버 동기화 시간 추출
      const serverSyncTime = extractServerSyncTime(campaignDetails);
      const adPerformance = mapToAdPerformanceFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const dailyAdData = mapToDailyAdDataFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignPerformance = mapToCampaignPerformanceFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignHierarchy = mapToCampaignHierarchyFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignDailyData = mapToCampaignDailyData(campaignDetails);

      set({
        rawCampaignList: campaignList,
        rawCampaignDetails: campaignDetails,
        adPerformance,
        dailyAdData,
        campaignPerformance,
        campaignHierarchy,
        campaignDailyData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        serverSyncTime,
      });
    } catch (err) {
      console.error('광고 데이터 조회 실패:', err);

      // 폴백: 더미 데이터
      set({
        adPerformance: AD_PERFORMANCE,
        dailyAdData: DAILY_AD_DATA,
        campaignPerformance: CAMPAIGN_PERFORMANCE_DATA,
        campaignHierarchy: [],
        campaignDailyData: [],
        loading: false,
        error: err instanceof Error ? err.message : '데이터를 불러올 수 없습니다',
        lastUpdated: new Date(),
      });
    }
  },

  // 강제 새로고침
  refresh: async (userId: string) => {
    set({ loading: true, error: null });

    try {
      const { period, customDateRange } = get();
      const { campaignList, campaignDetails } = await fetchAllAdDataBatch(
        userId,
        period,
        customDateRange || undefined
      );

      // 서버 동기화 시간 추출
      const serverSyncTime = extractServerSyncTime(campaignDetails);
      const adPerformance = mapToAdPerformanceFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const dailyAdData = mapToDailyAdDataFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignPerformance = mapToCampaignPerformanceFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignHierarchy = mapToCampaignHierarchyFromCampaignDetail(
        campaignDetails,
        period,
        customDateRange || undefined
      );
      const campaignDailyData = mapToCampaignDailyData(campaignDetails);

      set({
        rawCampaignList: campaignList,
        rawCampaignDetails: campaignDetails,
        adPerformance,
        dailyAdData,
        campaignPerformance,
        campaignHierarchy,
        campaignDailyData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        serverSyncTime,
      });
    } catch (err) {
      console.error('광고 데이터 새로고침 실패:', err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : '데이터를 불러올 수 없습니다',
      });
    }
  },

  // 기간 변경 → API 재호출
  setPeriod: (newPeriod: PeriodType, customRange?: { start: string; end: string }) => {
    const { currentUserId } = get();

    set({
      period: newPeriod,
      customDateRange: customRange || null,
    });

    // 기간 변경 시 API 재호출
    if (currentUserId) {
      get().fetchAllData(currentUserId);
    }
  },

  // Store 리셋
  reset: () => {
    set({
      rawCampaignList: null,
      rawCampaignDetails: null,
      adPerformance: null,
      dailyAdData: null,
      campaignPerformance: [],
      campaignHierarchy: [],
      campaignDailyData: [],
      loading: false,
      error: null,
      lastUpdated: null,
      serverSyncTime: null,
      currentUserId: null,
      period: 'daily',
      customDateRange: null,
    });
  },
}));
