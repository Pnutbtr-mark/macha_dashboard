// Meta Dash API 서비스
import type {
  MetaDashResponse,
  SyncResponse,
  DashMemberInsight,
  DashFollower,
  DashFollowerInsight,
  DashMediaResponse,
  DashAdAccount,
  DashAdAccountWithInsights,
} from '../types/metaDash';

const BASE_URL = 'https://matcha.pnutbutter.kr';

// 공통 fetch 래퍼
async function fetchMetaDash<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  console.log('[MetaDashAPI] Request:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

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
    console.error('[MetaDashAPI] Error:', error);
    throw error;
  }
}

// 1. 동기화 (금일 데이터 갱신)
export async function syncDashMember(dashMemberId: string): Promise<boolean> {
  try {
    const response = await fetchMetaDash<SyncResponse>(
      `/api/v1/dash-members/sync/${dashMemberId}`,
      { method: 'POST' }
    );
    return response.result?.[0] ?? false;
  } catch (error) {
    console.error('동기화 실패:', error);
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
  dashMemberId: string
): Promise<DashAdAccountWithInsights[]> {
  const response = await fetchMetaDash<MetaDashResponse<DashAdAccountWithInsights[]>>(
    `/api/v1/dash-ad/my-insight/${dashMemberId}`
  );
  return response.result || [];
}
