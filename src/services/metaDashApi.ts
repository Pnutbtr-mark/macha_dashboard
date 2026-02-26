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
  DashAdStatisticsResponse,
  DashAdDetailInfo,
} from '../types/metaDash';

const BASE_URL = 'https://matcha.pnutbutter.kr';

// 공통 fetch 래퍼 (30초 타임아웃 + 재시도 로직 포함)
async function fetchMetaDash<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = 30000,
  maxRetries: number = 3
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[MetaDashAPI] Request (attempt ${attempt}/${maxRetries}):`, url);

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

      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      clearTimeout(timeoutId);
      if (!text) {
        console.log('[MetaDashAPI] 빈 응답 수신, 빈 result 반환');
        return { result: [] } as T;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`JSON 파싱 실패: ${text.substring(0, 200)}`);
      }
      console.log('[MetaDashAPI] Response:', data);

      // responseCode 체크
      if (data.responseCode && data.responseCode !== 0 && data.responseCode !== 200) {
        throw new Error(`API Error Code: ${data.responseCode} - ${data.message}`);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // 타임아웃 에러 처리
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`API 요청 타임아웃 (${timeoutMs / 1000}초 초과)`);
      }

      // 네트워크 에러 (Failed to fetch, ERR_HTTP2_PROTOCOL_ERROR, ERR_QUIC_PROTOCOL_ERROR 등)는 재시도
      // fetch 스펙 상 TypeError는 네트워크 실패 시에만 발생
      const isNetworkError = error instanceof TypeError;
      const isRetryable = isNetworkError || (error instanceof Error && error.name === 'AbortError');

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 1000; // 1초, 2초, 3초 점진적 대기
        console.log(`[MetaDashAPI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error('[MetaDashAPI] Error:', lastError);
      throw lastError;
    }
  }

  throw lastError || new Error('Unknown error');
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
      },
      60000 // 광고 동기화는 60초 타임아웃
    );
    return response.result?.[0] ?? false;
  } catch (error) {
    console.error('광고 동기화 실패:', error);
    return false;
  }
}

// 2. 회원 인사이트
export async function fetchDashMemberInsight(
  dashMemberId: string,
  time: string,  // 시작 날짜 (YYYY-MM-DD 형식)
  endTime: string  // 종료 날짜 (YYYY-MM-DD 형식)
): Promise<DashMemberInsight[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashMemberInsight[]>>(
    `/api/v1/dash-members/my-insight/${dashMemberId}?time=${time}&endTime=${endTime}`
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
  time: string,  // 시작 날짜 (YYYY-MM-DD 형식)
  endTime: string  // 종료 날짜 (YYYY-MM-DD 형식)
): Promise<DashAdAccountWithInsights[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdAccountWithInsights[]>>(
    `/api/v1/dash-ad/my-insight/${dashMemberId}?time=${time}&endTime=${endTime}`,
    undefined,
    60000 // 광고 인사이트는 60초 타임아웃
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
  sort?: string;
}

export async function fetchDashInfluencersWithDetail(
  params: FetchInfluencersParams = {}
): Promise<PageResponse<DashInfluencerWithDetail>> {
  const { page = 0, size = 15, keyword, category, followerMin, followerMax, activityWithin, engagementMin, sort } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('size', String(size));
  if (keyword) queryParams.append('keyword', keyword);
  if (category) queryParams.append('category', category);
  if (followerMin !== undefined) queryParams.append('followerMin', String(followerMin));
  if (followerMax !== undefined) queryParams.append('followerMax', String(followerMax));
  if (activityWithin !== undefined) queryParams.append('activityWithin', String(activityWithin));
  if (engagementMin !== undefined) queryParams.append('engagementMin', String(engagementMin));
  // sort는 URLSearchParams에 넣지 않음 (콤마 %2C 인코딩 방지)
  const sortParam = sort ? `&sort=${sort}` : '';

  const response = await fetchMetaDash<MetaDashResponse<PageResponse<DashInfluencerWithDetail>[]>>(
    `/api/v1/dash-influencers/list-with-detail?${queryParams.toString()}${sortParam}`
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

// 통계 전체 조회 (time 파라미터 필수)
export async function fetchDashAdStatisticsSummary(
  dashMemberId: string,
  time: string, // 시작 날짜 (YYYY-MM-DD 형식)
  endTime: string // 종료 날짜 (YYYY-MM-DD 형식)
): Promise<DashAdStatisticsResponse[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdStatisticsResponse[]>>(
    `/api/v1/dash-ad-statistics/summary-all/${dashMemberId}?time=${time}&endTime=${endTime}`,
    undefined,
    60000 // 60초 타임아웃
  );
  return response.result || [];
}

// 광고별 상세 조회
export async function fetchDashAdDetailInfo(
  adIds: string[],
  time: string
): Promise<DashAdDetailInfo[]> {
  const params = new URLSearchParams();
  adIds.forEach(id => params.append('adIds', id));
  params.append('time', time);

  const response = await fetchMetaDash<MetaDashResponse<DashAdDetailInfo[]>>(
    `/api/v1/dash-ad/detail/ad-detail?${params.toString()}`
  );
  return response.result || [];
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

// 13. 캠페인 참여자 목록 조회
export async function fetchCampaignParticipants(
  campaignId: string
): Promise<DashCampaignInfluencerParticipate[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashCampaignInfluencerParticipate[]>>(
    `/api/v1/dash-campaign-influencer-participate/${campaignId}`
  );
  return response.result || [];
}

// 14. 캠페인 참여자 상태 변경 (WAIT: 대기, ACTIVE: 참여)
export async function updateParticipantStatus(
  participateIds: string[],
  newStatus: 'WAIT' | 'ACTIVE'
): Promise<boolean> {
  const response = await fetchMetaDash<MetaDashResponse<boolean[]>>(
    `/api/v1/dash-campaign-influencer-participate/status`,
    {
      method: 'PUT',
      body: JSON.stringify({
        participateIds,
        newStatus,
      }),
    }
  );
  return response.result?.[0] ?? false;
}

// 참여 인플루언서 게시물 URL 업데이트
export async function updateParticipantPostUrl(
  participateIds: string[],
  postUrl: string
): Promise<boolean> {
  const response = await fetchMetaDash<MetaDashResponse<boolean[]>>(
    `/api/v1/dash-campaign-influencer-participate/post-url`,
    {
      method: 'PUT',
      body: JSON.stringify({
        participateIds,
        postUrl,
      }),
    }
  );
  return response.result?.[0] ?? false;
}
