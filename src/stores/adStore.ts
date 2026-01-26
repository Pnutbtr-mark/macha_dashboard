import { create } from 'zustand';
import type {
  AdPerformance,
  DailyAdData,
  CampaignPerformance,
  CampaignHierarchy,
} from '../types';
import type {
  DashAdListItem,
  DashAdCampaignDetailItem,
} from '../types/metaDash';
import {
  fetchDashAdList,
  fetchDashAdCampaignDetail,
} from '../services/metaDashApi';
import {
  mapToAdPerformanceFromCampaignDetail,
  mapToDailyAdDataFromCampaignDetail,
  mapToCampaignPerformanceFromCampaignDetail,
  mapToCampaignHierarchyFromCampaignDetail,
} from '../utils/metaDashMapper';
import {
  cachedFetch,
  forceFetch,
  invalidateCache,
  createCacheKey,
  CACHE_CONFIG,
} from '../utils/apiCache';
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

  // 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  serverSyncTime: Date | null;

  // 현재 로드된 사용자 ID
  currentUserId: string | null;

  // 액션
  fetchAllData: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  reset: () => void;
}

/**
 * 광고 데이터 통합 조회 함수
 * N+1 쿼리를 한 번에 처리하여 API 호출 수를 최소화
 */
async function fetchAllAdDataBatch(
  userId: string
): Promise<{
  campaignList: DashAdListItem[];
  campaignDetails: DashAdCampaignDetailItem[];
}> {
  // 1. 캠페인 목록 조회
  const campaignList = await fetchDashAdList(userId);

  // 캠페인이 없으면 빈 배열 반환
  if (campaignList.length === 0) {
    return { campaignList: [], campaignDetails: [] };
  }

  // 2. 모든 캠페인 상세를 병렬로 조회
  const detailPromises = campaignList.map(item =>
    fetchDashAdCampaignDetail(userId, item.dashAdCampaign.id)
  );

  const detailResults = await Promise.all(detailPromises);
  const campaignDetails = detailResults.flat();

  return { campaignList, campaignDetails };
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
          syncTimes.push(new Date(child.dashAdAccountInsight.lastSyncedAt));
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
  loading: false,
  error: null,
  lastUpdated: null,
  serverSyncTime: null,
  currentUserId: null,

  // 모든 광고 데이터 가져오기 (캐싱 적용)
  fetchAllData: async (userId: string) => {
    // 이미 같은 사용자 데이터가 있으면 다시 로드하지 않음
    const state = get();
    if (state.currentUserId === userId && state.adPerformance && !state.loading) {
      return;
    }

    set({ loading: true, error: null, currentUserId: userId });

    try {
      // 캐싱과 함께 모든 광고 데이터 한 번에 조회
      const { campaignList, campaignDetails } = await cachedFetch(
        createCacheKey('ad', 'all', userId),
        () => fetchAllAdDataBatch(userId),
        CACHE_CONFIG.AD_TTL
      );

      // 서버 동기화 시간 추출
      const serverSyncTime = extractServerSyncTime(campaignDetails);

      // 데이터 변환
      const adPerformance = mapToAdPerformanceFromCampaignDetail(campaignDetails);
      const dailyAdData = mapToDailyAdDataFromCampaignDetail(campaignDetails);
      const campaignPerformance = mapToCampaignPerformanceFromCampaignDetail(campaignDetails);
      const campaignHierarchy = mapToCampaignHierarchyFromCampaignDetail(campaignDetails);

      set({
        rawCampaignList: campaignList,
        rawCampaignDetails: campaignDetails,
        adPerformance,
        dailyAdData,
        campaignPerformance,
        campaignHierarchy,
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
        loading: false,
        error: err instanceof Error ? err.message : '데이터를 불러올 수 없습니다',
        lastUpdated: new Date(),
      });
    }
  },

  // 강제 새로고침 (캐시 무시)
  refresh: async (userId: string) => {
    set({ loading: true, error: null });

    try {
      // 캐시를 무시하고 강제로 새로 가져옴
      const { campaignList, campaignDetails } = await forceFetch(
        createCacheKey('ad', 'all', userId),
        () => fetchAllAdDataBatch(userId),
        CACHE_CONFIG.AD_TTL
      );

      // 서버 동기화 시간 추출
      const serverSyncTime = extractServerSyncTime(campaignDetails);

      // 데이터 변환
      const adPerformance = mapToAdPerformanceFromCampaignDetail(campaignDetails);
      const dailyAdData = mapToDailyAdDataFromCampaignDetail(campaignDetails);
      const campaignPerformance = mapToCampaignPerformanceFromCampaignDetail(campaignDetails);
      const campaignHierarchy = mapToCampaignHierarchyFromCampaignDetail(campaignDetails);

      set({
        rawCampaignList: campaignList,
        rawCampaignDetails: campaignDetails,
        adPerformance,
        dailyAdData,
        campaignPerformance,
        campaignHierarchy,
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

  // Store 리셋
  reset: () => {
    invalidateCache('ad');
    set({
      rawCampaignList: null,
      rawCampaignDetails: null,
      adPerformance: null,
      dailyAdData: null,
      campaignPerformance: [],
      campaignHierarchy: [],
      loading: false,
      error: null,
      lastUpdated: null,
      serverSyncTime: null,
      currentUserId: null,
    });
  },
}));
