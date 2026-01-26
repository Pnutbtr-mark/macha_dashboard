import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfileStore } from '../stores/profileStore';

/**
 * 프로필 페이지 전용 통합 훅
 *
 * 기존 4개 훅(useProfileInsight, useDailyProfileData, useFollowerDemographic, useProfileContent)을
 * 하나로 통합하여 API 중복 호출을 방지합니다.
 *
 * 최적화 효과:
 * - 기존: 8회 API 호출 (각 훅이 동일 API 중복 호출)
 * - 최적화 후: 4회 API 호출 (중복 제거)
 */
export function useProfileData() {
  const { user } = useAuth();
  const store = useProfileStore();

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

  return {
    // 데이터
    profileInsight: store.profileInsight,
    dailyProfileData: store.dailyProfileData,
    followerDemographic: store.followerDemographic,
    profileContent: store.profileContent,

    // 상태
    loading: store.loading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    serverSyncTime: store.serverSyncTime,

    // 액션
    refetch,
  };
}
