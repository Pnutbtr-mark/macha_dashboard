// 캠페인 API 서비스
// 서버에서 캠페인 데이터를 가져오는 API 클라이언트

// ============================================
// 타입 정의
// ============================================

// 캠페인 API 응답 타입
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
  status: string;
  budget: number;
  spent: number;
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

// 캠페인 통합 조회 API 관련 타입
export interface FetchCampaignsWithDetailParams {
  dashMemberId: string;
  page?: number;
  size?: number;
  direction?: 'ASC' | 'DESC';
}

export interface CampaignWithDetail {
  campaign: CampaignDto;
  campaignResults: CampaignResultDto[];
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CampaignWithDetailApiResponse {
  responseName: string;
  responseCode: number;
  message: string;
  result: PageResponse<CampaignWithDetail>[];
}

// ============================================
// API 함수
// ============================================

// 캠페인 목록 조회
export async function fetchCampaigns(dashMemberId: string): Promise<NotionCampaign[]> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';

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

  // API 응답을 NotionCampaign 형식으로 변환
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

// 캠페인 생성
export async function createCampaign(dashMemberId: string, campaign: CreateCampaignRequest): Promise<CampaignDto> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';

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

// @deprecated fetchInfluencerResultList 사용 권장 (승인된 인플루언서 결과만 반환)
export async function fetchCampaignResults(campaignId: string): Promise<CampaignResultDto[]> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';
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

// 승인된 인플루언서의 캠페인 결과 데이터 조회
export async function fetchInfluencerResultList(campaignId: string): Promise<CampaignResultDto[]> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';
  const url = `${baseUrl}/api/v1/dash-campaigns/influencer-result-list/${campaignId}`;
  console.log('[CampaignAPI] Fetching influencer result list:', url);

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`인플루언서 결과 조회 실패: ${response.status}`);
  }

  const data: CampaignResultApiResponse = await response.json();
  console.log('[CampaignAPI] Influencer result list:', data);
  return data.result || [];
}

// 캠페인 데이터 동기화 (Apify)
export async function syncCampaignData(campaignId: string, time?: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';
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

// 캠페인 목록 + 상세 통합 조회 (페이징 지원)
export async function fetchCampaignsWithDetail(
  params: FetchCampaignsWithDetailParams
): Promise<PageResponse<CampaignWithDetail>> {
  const baseUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'https://matcha.pnutbutter.kr';

  const { dashMemberId, page = 1, size = 10, direction = 'DESC' } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('dashMemberId', dashMemberId);
  queryParams.append('page', String(page));
  queryParams.append('size', String(size));
  queryParams.append('direction', direction);

  const url = `${baseUrl}/api/v1/dash-campaigns/list-with-detail?${queryParams.toString()}`;
  console.log('[CampaignAPI] Fetching campaigns with detail:', url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`캠페인 통합 조회 실패: ${response.status}`);
  }

  const data: CampaignWithDetailApiResponse = await response.json();
  console.log('[CampaignAPI] Campaigns with detail response:', data);

  // result[0]에 PageResponse가 있는 구조
  return data.result?.[0] || {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size,
    first: true,
    last: true,
    empty: true,
  };
}

// 통합 API 응답을 UI 타입으로 변환하는 유틸리티 함수
export function convertCampaignWithDetailToNotionCampaign(item: CampaignWithDetail): NotionCampaign {
  const { campaign } = item;

  return {
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
  };
}

// ============================================
// 신청자 API
// ============================================

// 신청자 데이터 타입
export interface ApplicantDto {
  id: string;
  name: string;
  phoneNumber: string;
  instagramId: string;
  appliedAt: string;
  expectation: string;
  marketingConsent: boolean;
}

export interface ApplicantApiResponse {
  applicants: ApplicantDto[];
}

// 신청자 목록 조회 (노션 DB에서)
// loginId로 계정별, campaignId로 캠페인별 노션 DB 조회
export async function fetchApplicants(loginId?: string, campaignId?: string): Promise<ApplicantDto[]> {
  // 로컬 개발 시 Vite 프록시 사용 (vite.config.ts에서 /api -> localhost:3001)
  const params = new URLSearchParams();
  if (loginId) params.append('loginId', loginId);
  if (campaignId) params.append('campaignId', campaignId);

  const url = params.toString() ? `/api/applicants?${params.toString()}` : '/api/applicants';
  console.log('[ApplicantAPI] Fetching:', url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`신청자 조회 실패: ${response.status}`);
  }

  const data: ApplicantApiResponse = await response.json();
  console.log('[ApplicantAPI] Response:', data);
  return data.applicants || [];
}
