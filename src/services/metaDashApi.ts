// Meta Dash API 서비스
import type {
  MetaDashResponse,
  PageResponse,
  SyncResponse,
  DashMemberInsight,
  DashFollower,
  DashFollowerInsight,
  DashMediaResponse,
  DashAdAccount,
  DashAdAccountWithInsights,
  DashInfluencer,
  DashInfluencerDetailResponse,
  DashInfluencerWithDetail,
  DashAdListItem,
  DashAdCampaignDetailItem,
  DashCampaignInfluencerParticipate,
} from '../types/metaDash';

const BASE_URL = 'https://matcha.pnutbutter.kr';

// 공통 fetch 래퍼 (30초 타임아웃 포함)
async function fetchMetaDash<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = 30000
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  console.log('[MetaDashAPI] Request:', url);

  // AbortController로 타임아웃 설정
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[MetaDashAPI] Timeout reached, aborting request:', url);
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[MetaDashAPI] Response:', data);

    // responseCode 체크
    if (data.responseCode && data.responseCode !== 0 && data.responseCode !== 200) {
      throw new Error(`API Error Code: ${data.responseCode} - ${data.message}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`API 요청 타임아웃 (${timeoutMs / 1000}초 초과)`);
      console.error('[MetaDashAPI] Timeout Error:', timeoutError.message);
      throw timeoutError;
    }

    console.error('[MetaDashAPI] Error:', error);
    throw error;
  }
}

// 1. 프로필 동기화 (금일 데이터 갱신)
export async function syncDashMember(dashMemberId: string): Promise<boolean> {
  try {
    const response = await fetchMetaDash<SyncResponse>(
      `/api/v1/dash-members/sync-profile/${dashMemberId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          time: new Date().toISOString().split('T')[0],
        }),
      }
    );
    return response.result?.[0] ?? false;
  } catch (error) {
    console.error('프로필 동기화 실패:', error);
    return false;
  }
}

// 1-2. 광고 동기화
export async function syncDashAd(dashMemberId: string): Promise<boolean> {
  try {
    const response = await fetchMetaDash<SyncResponse>(
      `/api/v1/dash-members/sync-ad/${dashMemberId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          time: new Date().toISOString().split('T')[0],
        }),
      }
    );
    return response.result?.[0] ?? false;
  } catch (error) {
    console.error('광고 동기화 실패:', error);
    return false;
  }
}

// 2. 회원 인사이트
export async function fetchDashMemberInsight(
  dashMemberId: string
): Promise<DashMemberInsight[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashMemberInsight[]>>(
    `/api/v1/dash-members/my-insight/${dashMemberId}`
  );
  return response.result || [];
}

// 3. 팔로워 기록
export async function fetchDashFollowers(
  dashMemberId: string
): Promise<DashFollower[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashFollower[]>>(
    `/api/v1/dash-followers/my/${dashMemberId}`
  );
  return response.result || [];
}

// 4. 팔로워 인사이트 (성별/나이/지역)
export async function fetchDashFollowerInsight(
  dashMemberId: string
): Promise<DashFollowerInsight[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashFollowerInsight[]>>(
    `/api/v1/dash-followers/my-insight/${dashMemberId}`
  );
  return response.result || [];
}

// 5. 미디어 (게시물)
export async function fetchDashMedias(
  dashMemberId: string
): Promise<DashMediaResponse[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashMediaResponse[]>>(
    `/api/v1/dash-medias/my/${dashMemberId}`
  );
  return response.result || [];
}

// 6. 광고 계정 조회
export async function fetchDashAdAccount(
  dashMemberId: string
): Promise<DashAdAccount[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdAccount[]>>(
    `/api/v1/dash-ad/me/${dashMemberId}`
  );
  return response.result || [];
}

// 7. 광고 인사이트 (계정별 광고 성과)
export async function fetchDashAdInsight(
  dashMemberId: string,
  time: string  // 필수 파라미터 (YYYY-MM-DD 형식)
): Promise<DashAdAccountWithInsights[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdAccountWithInsights[]>>(
    `/api/v1/dash-ad/my-insight/${dashMemberId}?time=${time}`
  );
  return response.result || [];
}

// 8. 인플루언서 목록 조회
export async function fetchDashInfluencers(): Promise<DashInfluencer[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashInfluencer[]>>(
    `/api/v1/dash-influencers`
  );
  return response.result || [];
}

// 9. 인플루언서 상세 조회
export async function fetchDashInfluencerDetail(
  influencerId: string
): Promise<DashInfluencerDetailResponse | null> {
  const response = await fetchMetaDash<MetaDashResponse<DashInfluencerDetailResponse[]>>(
    `/api/v1/dash-influencers/${influencerId}`
  );
  return response.result?.[0] || null;
}

// 9-1. 인플루언서 데이터 갱신 (Apify 새로고침)
export async function updateDashInfluencer(
  influencerId: string,
  influencer: DashInfluencer
): Promise<DashInfluencer | null> {
  const response = await fetchMetaDash<MetaDashResponse<DashInfluencer[]>>(
    `/api/v1/dash-influencers/${influencerId}`,
    {
      method: 'PUT',
      body: JSON.stringify(influencer),
    }
  );
  return response.result?.[0] || null;
}

// 10. 인플루언서 목록 + 상세 통합 조회 (페이징 + 필터 지원)
export interface FetchInfluencersParams {
  page?: number;
  size?: number;
  keyword?: string;
  category?: string;
  followerMin?: number;
  followerMax?: number;
  activityWithin?: number;
  engagementMin?: number;
}

export async function fetchDashInfluencersWithDetail(
  params: FetchInfluencersParams = {}
): Promise<PageResponse<DashInfluencerWithDetail>> {
  const { page = 0, size = 15, keyword, category, followerMin, followerMax, activityWithin, engagementMin } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('size', String(size));
  if (keyword) queryParams.append('keyword', keyword);
  if (category) queryParams.append('category', category);
  if (followerMin !== undefined) queryParams.append('followerMin', String(followerMin));
  if (followerMax !== undefined) queryParams.append('followerMax', String(followerMax));
  if (activityWithin !== undefined) queryParams.append('activityWithin', String(activityWithin));
  if (engagementMin !== undefined) queryParams.append('engagementMin', String(engagementMin));

  const response = await fetchMetaDash<MetaDashResponse<PageResponse<DashInfluencerWithDetail>[]>>(
    `/api/v1/dash-influencers/list-with-detail?${queryParams.toString()}`
  );
  return response.result?.[0] || {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size,
    first: true,
    last: true,
    empty: true
  };
}

// 11. 광고 캠페인 목록 조회
export async function fetchDashAdList(
  dashMemberId: string
): Promise<DashAdListItem[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdListItem[]>>(
    `/api/v1/dash-ad/my-list/${dashMemberId}`
  );
  return response.result || [];
}

// 11. 광고 캠페인 상세 조회
export async function fetchDashAdCampaignDetail(
  dashMemberId: string,
  dashAdCampaignId: string
): Promise<DashAdCampaignDetailItem[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdCampaignDetailItem[]>>(
    `/api/v1/dash-ad/${dashMemberId}/detail/${dashAdCampaignId}`
  );
  return response.result || [];
}

// 12. 캠페인-인플루언서 참여 등록
export async function participateCampaignInfluencer(
  dashCampaignId: string,
  dashInfluencerId: string
): Promise<DashCampaignInfluencerParticipate[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashCampaignInfluencerParticipate[]>>(
    `/api/v1/dash-campaign-influencer-participate`,
    {
      method: 'POST',
      body: JSON.stringify({
        dashCampaignId,
        dashInfluencerId,
      }),
    }
  );
  return response.result || [];
}
