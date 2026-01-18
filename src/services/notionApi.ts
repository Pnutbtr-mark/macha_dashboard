// Notion API 서비스
// 서버에서 Notion 데이터를 가져오는 API 클라이언트

// Vercel에서는 같은 도메인이므로 빈 문자열, 로컬에서는 localhost:3001
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 공통 fetch 래퍼
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[NotionAPI] Fetching:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    console.log('[NotionAPI] Response status:', response.status);
    console.log('[NotionAPI] Response headers:', Object.fromEntries(response.headers.entries()));

    // 응답 텍스트를 먼저 가져옴
    const text = await response.text();
    console.log('[NotionAPI] Response body (first 500 chars):', text.substring(0, 500));

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // JSON 파싱 실패시 텍스트 그대로 사용
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          errorMessage = 'API가 HTML을 반환했습니다. 라우팅 설정을 확인하세요.';
        }
      }
      throw new Error(errorMessage);
    }

    // JSON 파싱
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('응답이 유효한 JSON이 아닙니다.');
    }
  } catch (error) {
    console.error('[NotionAPI] Fetch error:', error);
    throw error;
  }
}

// ============================================
// 타입 정의
// ============================================

// 새 캠페인 API 응답 타입
export interface CampaignApiResponse {
  responseName: string;
  responseCode: number;
  message: string;
  result: CampaignDto[];
}

export interface CampaignDto {
  id: string;
  name: string;
  dashMemberId: string;
  category: string;
  type: string;
  product: string;
  participantCount: number;
  startDate: string;
  endDate: string;
  manager: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotionCampaign {
  id: string;
  name: string;
  category: string;
  campaignType: '협찬' | '유료';
  productType: string;
  participants: number;
  startDate: string;
  endDate: string;
  manager: string;
  status: string; // Notion에서 '진행중', '완료' 등 한국어 상태값이 옴
  budget: number;
  spent: number;
}

export interface NotionInfluencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  thumbnail: string;
  followers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  category: string[];
  priceRange: string;
  verified: boolean;
  status: string;
  email: string;
  phone: string;
}

export interface NotionMention {
  id: string;
  influencerName: string;
  handle: string;
  platform: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  postUrl: string;
  postedAt: string;
  caption: string;
  thumbnail: string;
}

export interface NotionDailyReport {
  id: string;
  date: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  followers: number;
  engagement: number;
}

export interface NotionSeeding {
  id: string;
  influencer: {
    id: string;
    name: string;
    handle: string;
    thumbnail: string;
    followers: number;
    engagementRate: number;
  };
  type: 'paid' | 'free';
  status: string;
  paymentAmount: number;
  productValue: number;
  notes: string;
  requestDate: string;
  postDate: string;
}

export interface DashboardStats {
  totalCampaigns: number;
  totalInfluencers: number;
  totalMentions: number;
  performance: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

// 캠페인 결과 데이터 타입 (Instagram 포스트 데이터)
export interface CampaignResultDto {
  id: string;
  dashMemberId: string;
  campaignId: string;
  time: string;
  postId: string;
  postType: string;
  shortCode: string;
  postUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  videoPlayCount: number;
  igPlayCount: number;
  reshareCount: number;
  videoDuration: number;
  postedAt: string;
  ownerId: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerProfilePicUrl: string;
  displayUrl: string;
  videoUrl: string;
  images: string;
  hashtags: string;
  mentions: string;
  taggedUsers: string;
  musicInfo: string;
  coauthorProducers: string;
  childPosts: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignResultApiResponse {
  responseName: string;
  responseCode: number;
  message: string;
  result: CampaignResultDto[];
}

// ============================================
// API 함수
// ============================================

// 캠페인 목록 조회 (새 API)
export async function fetchCampaigns(dashMemberId: string): Promise<NotionCampaign[]> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || '';

  const url = `${baseUrl}/api/v1/campaigns/my/${dashMemberId}`;
  console.log('[CampaignAPI] Fetching:', url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`캠페인 조회 실패: ${response.status}`);
  }

  const data: CampaignApiResponse = await response.json();
  console.log('[CampaignAPI] Response:', data);

  // 새 API 응답을 기존 NotionCampaign 형식으로 변환
  return data.result.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    category: campaign.category,
    campaignType: campaign.type as '협찬' | '유료',
    productType: campaign.product,
    participants: campaign.participantCount,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    manager: campaign.manager,
    status: campaign.status,
    budget: 0,
    spent: 0,
  }));
}

// 캠페인 생성 요청 타입
export interface CreateCampaignRequest {
  id?: string;
  name: string;
  category: string;
  type: string;
  product: string;
  participantCount: number;
  startDate: string;
  endDate: string;
  manager: string;
  status: string;
}

// 캠페인 생성 (새 API)
export async function createCampaign(dashMemberId: string, campaign: CreateCampaignRequest): Promise<CampaignDto> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || '';

  const url = `${baseUrl}/api/v1/campaigns/create/${dashMemberId}`;
  console.log('[CampaignAPI] Creating campaign:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaign),
  });

  if (!response.ok) {
    throw new Error(`캠페인 생성 실패: ${response.status}`);
  }

  const data = await response.json();
  console.log('[CampaignAPI] Created campaign:', data);
  return data;
}

// 캠페인 상세 조회
export async function fetchCampaignById(id: string): Promise<NotionCampaign> {
  return fetchApi<NotionCampaign>(`/api/campaigns/${id}`);
}

// 인플루언서 목록 조회
export async function fetchInfluencers(): Promise<NotionInfluencer[]> {
  return fetchApi<NotionInfluencer[]>('/api/influencers');
}

// 멘션 (콘텐츠 성과) 조회
export async function fetchMentions(campaignId?: string): Promise<NotionMention[]> {
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  return fetchApi<NotionMention[]>(`/api/mentions${query}`);
}

// 일별 리포트 조회
export async function fetchDailyReport(params?: {
  campaignId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<NotionDailyReport[]> {
  const searchParams = new URLSearchParams();
  if (params?.campaignId) searchParams.set('campaignId', params.campaignId);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return fetchApi<NotionDailyReport[]>(`/api/daily-report${query}`);
}

// 대시보드 통계 조회
export async function fetchDashboardStats(campaignId?: string): Promise<DashboardStats> {
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  return fetchApi<DashboardStats>(`/api/dashboard${query}`);
}

// 시딩 (캠페인 참여자) 조회
export async function fetchSeeding(campaignId: string): Promise<NotionSeeding[]> {
  return fetchApi<NotionSeeding[]>(`/api/seeding?campaignId=${campaignId}`);
}

// 캠페인 결과 데이터 조회 (Instagram 포스트)
export async function fetchCampaignResults(campaignId: string): Promise<CampaignResultDto[]> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || '';
  const url = `${baseUrl}/api/v1/my-campaign-result/${campaignId}`;
  console.log('[CampaignAPI] Fetching campaign results:', url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`캠페인 결과 조회 실패: ${response.status}`);
  }

  const data: CampaignResultApiResponse = await response.json();
  console.log('[CampaignAPI] Campaign results:', data);
  return data.result || [];
}

// 캠페인 데이터 동기화 (Apify)
export async function syncCampaignData(campaignId: string, time?: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || '';
  const url = `${baseUrl}/api/v1/apify-sync/${campaignId}`;
  console.log('[CampaignAPI] Syncing campaign data:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      time: time || new Date().toISOString().split('T')[0],
    }),
  });

  if (!response.ok) {
    throw new Error(`캠페인 데이터 동기화 실패: ${response.status}`);
  }

  const data = await response.json();
  console.log('[CampaignAPI] Sync result:', data);
}
