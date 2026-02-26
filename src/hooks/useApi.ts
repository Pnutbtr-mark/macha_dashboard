import { useState, useEffect, useCallback } from 'react';
import type {
  ProfileInsight,
  DailyProfileData,
  Influencer,
  SeedingItem,
  AffiliateLink,
  ContentItem,
  AIAnalysis,
  FollowerDemographic,
  ProfileContentItem,
} from '../types';
import {
  PROFILE_INSIGHT,
  DAILY_PROFILE_DATA,
  INFLUENCERS,
  SEEDING_LIST,
  AFFILIATE_LINKS,
  CONTENT_LIST,
  AI_ANALYSIS,
} from '../data/dummyData';
import { useAuth } from '../contexts/AuthContext';
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

// ============================================
// API 호출 구조 - 실제 연동 시 이 함수들을 수정하세요
// ============================================

// API 응답 타입
interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
  serverSyncTime?: Date | null;  // 서버 동기화 시간 (API에서 추출)
}

// 공통 fetch 함수 (실제 API 연동 시 사용)
async function fetchFromApi<T>(_endpoint: string): Promise<T> {
  // 실제 API 연동 시 아래 주석을 해제하고 더미 데이터 반환 부분을 제거하세요
  /*
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${token}`, // 인증 토큰 추가
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
  */

  // 현재는 더미 데이터 반환 (API 연동 시 제거)
  await new Promise(resolve => setTimeout(resolve, 300)); // 로딩 시뮬레이션
  throw new Error('Use dummy data'); // 더미 데이터 사용하도록 에러 발생
}

// ============================================
// 프로필 인사이트 (Meta Dash API)
// ============================================
export function useProfileInsight(): ApiResponse<ProfileInsight> {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [serverSyncTime, setServerSyncTime] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setData(PROFILE_INSIGHT);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 서버에 적재된 모든 데이터 조회
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];

      // Meta Dash API 호출
      const [insights, followers] = await Promise.all([
        fetchDashMemberInsight(user.id, startDate, endDate),
        fetchDashFollowers(user.id),
      ]);

      // 서버 동기화 시간 추출 (가장 최근 collectedAt)
      if (insights.length > 0) {
        const latestSyncTime = insights
          .map(item => {
            const timeStr = item.collectedAt;
            return new Date(timeStr.endsWith('Z') ? timeStr : timeStr + 'Z');
          })
          .sort((a, b) => b.getTime() - a.getTime())[0];
        setServerSyncTime(latestSyncTime);
      }

      // 데이터 변환
      const profileData = mapToProfileInsight(insights, followers);
      setData(profileData);
      setError(null);
    } catch (err) {
      console.error('프로필 인사이트 조회 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
      // 폴백: 더미 데이터
      setData(PROFILE_INSIGHT);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated, serverSyncTime };
}

// ============================================
// 일별 프로필 데이터 (Meta Dash API)
// ============================================
export function useDailyProfileData(period: string): ApiResponse<DailyProfileData[]> {
  const { user } = useAuth();
  const [data, setData] = useState<DailyProfileData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setData(DAILY_PROFILE_DATA);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 서버에 적재된 모든 데이터 조회
      const startDate = '2020-01-01';
      const endDate = new Date().toISOString().split('T')[0];

      // Meta Dash API 호출
      const [followers, insights] = await Promise.all([
        fetchDashFollowers(user.id),
        fetchDashMemberInsight(user.id, startDate, endDate),
      ]);

      // 데이터 변환
      const dailyData = mapToDailyProfileData(followers, insights);
      setData(dailyData);
      setError(null);
    } catch (err) {
      console.error('일별 프로필 데이터 조회 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
      setData(DAILY_PROFILE_DATA);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user?.id, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 인플루언서 목록 (DB)
// ============================================
export function useInfluencers(): ApiResponse<Influencer[]> {
  const [data, setData] = useState<Influencer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<Influencer[]>('/influencers');
      setData(result);
    } catch {
      setData(INFLUENCERS);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 시딩 목록 (Notion/DB)
// ============================================
export function useSeedingList(): ApiResponse<SeedingItem[]> {
  const [data, setData] = useState<SeedingItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<SeedingItem[]>('/seeding');
      setData(result);
    } catch {
      setData(SEEDING_LIST);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 제휴 링크 (DB)
// ============================================
export function useAffiliateLinks(): ApiResponse<AffiliateLink[]> {
  const [data, setData] = useState<AffiliateLink[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<AffiliateLink[]>('/affiliate-links');
      setData(result);
    } catch {
      setData(AFFILIATE_LINKS);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 콘텐츠 목록 (DB)
// ============================================
export function useContentList(): ApiResponse<ContentItem[]> {
  const [data, setData] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<ContentItem[]>('/contents');
      setData(result);
    } catch {
      setData(CONTENT_LIST);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// AI 분석 (Backend)
// ============================================
export function useAIAnalysis(): ApiResponse<AIAnalysis> {
  const [data, setData] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<AIAnalysis>('/ai/analysis');
      setData(result);
    } catch {
      setData(AI_ANALYSIS);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 팔로워 분석 (Meta Dash API) - 신규
// ============================================
export function useFollowerDemographic(): ApiResponse<FollowerDemographic> {
  const { user } = useAuth();
  const [data, setData] = useState<FollowerDemographic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const insights = await fetchDashFollowerInsight(user.id);
      const demographic = mapToFollowerDemographic(insights);
      setData(demographic);
      setError(null);
    } catch (err) {
      console.error('팔로워 분석 조회 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
      setData(null);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 프로필 콘텐츠 (Meta Dash API) - 신규
// ============================================
export function useProfileContent(): ApiResponse<ProfileContentItem[]> {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mediaList = await fetchDashMedias(user.id);
      const contents = mapToContentItems(mediaList);
      setData(contents);
      setError(null);
    } catch (err) {
      console.error('프로필 콘텐츠 조회 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
      setData([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}

// ============================================
// 뮤테이션 함수들 (생성/수정/삭제)
// ============================================

// 제휴 링크 생성
export async function createAffiliateLink(influencerId: string, code: string): Promise<AffiliateLink> {
  // 실제 API 연동 시 아래 주석 해제
  /*
  const response = await fetch(`${API_BASE_URL}/affiliate-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ influencerId, code }),
  });
  return response.json();
  */

  // 더미 응답
  return {
    id: `aff-${Date.now()}`,
    influencerId,
    influencerName: INFLUENCERS.find(i => i.id === influencerId)?.name || '',
    code,
    url: `https://brand.com/ref/${code.toLowerCase()}`,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: new Date().toISOString().split('T')[0],
    isActive: true,
  };
}

// 시딩 상태 업데이트
export async function updateSeedingStatus(
  seedingId: string,
  status: SeedingItem['status']
): Promise<SeedingItem> {
  // 실제 API 연동 시 구현
  const item = SEEDING_LIST.find(s => s.id === seedingId);
  if (!item) throw new Error('Seeding not found');
  return { ...item, status };
}

// 콘텐츠 다운로드 URL 생성
export async function getContentDownloadUrl(contentId: string): Promise<string> {
  // 실제 API 연동 시 서명된 URL 반환
  const content = CONTENT_LIST.find(c => c.id === contentId);
  return content?.downloadUrl || '';
}
