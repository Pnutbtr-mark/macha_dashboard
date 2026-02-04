import { create } from 'zustand';
import type {
  ProfileInsight,
  DailyProfileData,
  FollowerDemographic,
  ProfileContentItem,
} from '../types';
import type {
  DashMemberInsight,
  DashFollower,
  DashFollowerInsight,
  DashMediaResponse,
} from '../types/metaDash';
import {
  fetchDashMemberInsight,
  fetchDashFollowers,
  fetchDashFollowerInsight,
  fetchDashMedias,
} from '../services/metaDashApi';
import {
  mapToProfileInsight,
  mapToDailyProfileData,
  mapToFollowerDemographic,
  mapToContentItems,
} from '../utils/metaDashMapper';
import {
  cachedFetch,
  forceFetch,
  invalidateCache,
  createCacheKey,
  CACHE_CONFIG,
} from '../utils/apiCache';
import {
  PROFILE_INSIGHT,
  DAILY_PROFILE_DATA,
} from '../data/dummyData';

interface ProfileState {
  // 원시 API 데이터
  rawInsights: DashMemberInsight[] | null;
  rawFollowers: DashFollower[] | null;
  rawFollowerInsights: DashFollowerInsight[] | null;
  rawMedias: DashMediaResponse[] | null;

  // 변환된 UI 데이터
  profileInsight: ProfileInsight | null;
  dailyProfileData: DailyProfileData[] | null;
  followerDemographic: FollowerDemographic | null;
  profileContent: ProfileContentItem[] | null;

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

export const useProfileStore = create<ProfileState>((set, get) => ({
  // 초기 상태
  rawInsights: null,
  rawFollowers: null,
  rawFollowerInsights: null,
  rawMedias: null,
  profileInsight: null,
  dailyProfileData: null,
  followerDemographic: null,
  profileContent: null,
  loading: false,
  error: null,
  lastUpdated: null,
  serverSyncTime: null,
  currentUserId: null,

  // 모든 프로필 데이터 가져오기 (캐싱 적용)
  fetchAllData: async (userId: string) => {
    // 이미 같은 사용자 데이터가 있으면 다시 로드하지 않음
    const state = get();
    if (state.currentUserId === userId && state.profileInsight && !state.loading) {
      return;
    }

    set({ loading: true, error: null, currentUserId: userId });

    try {
      // 서버에 적재된 모든 데이터 조회
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];

      // 4개 API를 캐싱과 함께 병렬 호출 (중복 방지됨)
      const [insights, followers, followerInsights, medias] = await Promise.all([
        cachedFetch(
          createCacheKey('profile', 'insights', userId),
          () => fetchDashMemberInsight(userId, startDate, endDate),
          CACHE_CONFIG.PROFILE_TTL
        ),
        cachedFetch(
          createCacheKey('profile', 'followers', userId),
          () => fetchDashFollowers(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
        cachedFetch(
          createCacheKey('profile', 'followerInsights', userId),
          () => fetchDashFollowerInsight(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
        cachedFetch(
          createCacheKey('profile', 'medias', userId),
          () => fetchDashMedias(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
      ]);

      // 서버 동기화 시간 추출
      let serverSyncTime: Date | null = null;
      if (insights.length > 0) {
        serverSyncTime = insights
          .map(item => new Date(item.collectedAt))
          .sort((a, b) => b.getTime() - a.getTime())[0];
      }

      // 데이터 변환
      const profileInsight = mapToProfileInsight(insights, followers);
      const dailyProfileData = mapToDailyProfileData(followers, insights);
      const followerDemographic = mapToFollowerDemographic(followerInsights);
      const profileContent = mapToContentItems(medias);

      set({
        rawInsights: insights,
        rawFollowers: followers,
        rawFollowerInsights: followerInsights,
        rawMedias: medias,
        profileInsight,
        dailyProfileData,
        followerDemographic,
        profileContent,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        serverSyncTime,
      });
    } catch (err) {
      console.error('프로필 데이터 조회 실패:', err);

      // 폴백: 더미 데이터
      set({
        profileInsight: PROFILE_INSIGHT,
        dailyProfileData: DAILY_PROFILE_DATA,
        followerDemographic: null,
        profileContent: [],
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
      // 서버에 적재된 모든 데이터 조회
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];

      // 캐시를 무시하고 강제로 새로 가져옴
      const [insights, followers, followerInsights, medias] = await Promise.all([
        forceFetch(
          createCacheKey('profile', 'insights', userId),
          () => fetchDashMemberInsight(userId, startDate, endDate),
          CACHE_CONFIG.PROFILE_TTL
        ),
        forceFetch(
          createCacheKey('profile', 'followers', userId),
          () => fetchDashFollowers(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
        forceFetch(
          createCacheKey('profile', 'followerInsights', userId),
          () => fetchDashFollowerInsight(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
        forceFetch(
          createCacheKey('profile', 'medias', userId),
          () => fetchDashMedias(userId),
          CACHE_CONFIG.PROFILE_TTL
        ),
      ]);

      // 서버 동기화 시간 추출
      let serverSyncTime: Date | null = null;
      if (insights.length > 0) {
        serverSyncTime = insights
          .map(item => new Date(item.collectedAt))
          .sort((a, b) => b.getTime() - a.getTime())[0];
      }

      // 데이터 변환
      const profileInsight = mapToProfileInsight(insights, followers);
      const dailyProfileData = mapToDailyProfileData(followers, insights);
      const followerDemographic = mapToFollowerDemographic(followerInsights);
      const profileContent = mapToContentItems(medias);

      set({
        rawInsights: insights,
        rawFollowers: followers,
        rawFollowerInsights: followerInsights,
        rawMedias: medias,
        profileInsight,
        dailyProfileData,
        followerDemographic,
        profileContent,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        serverSyncTime,
      });
    } catch (err) {
      console.error('프로필 데이터 새로고침 실패:', err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : '데이터를 불러올 수 없습니다',
      });
    }
  },

  // Store 리셋
  reset: () => {
    invalidateCache('profile');
    set({
      rawInsights: null,
      rawFollowers: null,
      rawFollowerInsights: null,
      rawMedias: null,
      profileInsight: null,
      dailyProfileData: null,
      followerDemographic: null,
      profileContent: null,
      loading: false,
      error: null,
      lastUpdated: null,
      serverSyncTime: null,
      currentUserId: null,
    });
  },
}));
