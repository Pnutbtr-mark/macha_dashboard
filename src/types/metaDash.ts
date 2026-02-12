// Meta Dash API 타입 정의

// 공통 응답 래퍼
export interface MetaDashResponse<T> {
  responseName: string;
  responseCode: number;
  message: string;
  result: T;
}

// Spring Page 응답 타입
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;      // 현재 페이지 (0-based)
  size: number;        // 페이지 크기
  first: boolean;
  last: boolean;
  empty: boolean;
}

// 1. 동기화 API 응답
export interface SyncResponse {
  responseName: string;
  responseCode: number;
  message: string;
  result: boolean[];
}

// 2. 회원 인사이트
export interface DashMemberInsight {
  id: string;
  metricName: string;  // 'website_clicks', 'profile_views', 'reach', 'impressions' 등
  period: string;      // 'day', 'week', 'days_28'
  title: string;
  dashMemberId: string;
  description: string;
  value: number;
  insightId: string;
  collectedAt: string; // ISO datetime
  time: string;        // ISO date (YYYY-MM-DD)
}

// 3. 팔로워 기록
export interface DashFollower {
  id: string;
  dashMemberId: string;
  followersCount: number;
  time: string;        // ISO date (YYYY-MM-DD)
}

// 4. 팔로워 인사이트 (이미 집계된 인구통계 데이터)
export interface DashFollowerInsight {
  id: string;
  dashMemberId: string;
  time: string;        // ISO date
  gender: {
    female: number;
    male: number;
    unknown: number;
  };
  age: {
    age13_17: number;
    age18_24: number;
    age25_34: number;
    age35_44: number;
    age45_54: number;
    age55_64: number;
    age65Plus: number;
  };
  country: {
    countries: {
      [countryCode: string]: number;  // { "KR": 5000, "US": 2000, ... }
    };
  };
}

// 5. 미디어
export interface DashMedia {
  id: string;
  dashMemberId: string;
  igMediaId: string;
  time: string;        // ISO date
  caption: string;
  mediaType: string;   // 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS'
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;   // 인스타그램 피드 URL
  likeCount: number;
  commentsCount: number;
  postedAt: string;    // ISO datetime
}

// 6. 미디어 인사이트
export interface DashMediaInsight {
  id: string;
  mediaId: string;
  igMediaId: string;
  name: string;        // 실제 metricName ('impressions', 'reach', 'likes', 'comments', 'saved', 'plays', 'shares')
  period: string;
  title: string;
  description: string;
  value: number;
  time: string;        // ISO date
}

// 7. 미디어 응답 (미디어 + 인사이트)
export interface DashMediaResponse {
  dashMedia: DashMedia;
  dashMediaInsights: DashMediaInsight[];
}

// 8. 광고 계정
export interface DashAdAccount {
  id: string;
  metaAccountId: string;
  name: string;
  dashMemberId: string;
  accountStatus: number;
  currency: string;
  connected: boolean;
  lastSyncedAt: string;
}

// Meta Ads API 액션 값 타입
export interface ActionValue {
  value: number;
  action_type: string;
}

// 9. 광고 계정 인사이트 (개별 광고 성과)
export interface DashAdAccountInsight {
  id: string;
  dashMemberId: string;
  metaAdAccountId: string;
  adId: string;
  time: string;           // "2026-01-14"
  impressions: number;
  clicks: number;
  reach: number;
  spend: number;
  cpc: number | null;
  ctr: number;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  actions?: ActionValue[];
  actionValues?: ActionValue[];
  purchaseRoas?: ActionValue[];           // 광고비 대비 수익률 (ROAS)
  webSitePurchaseRoas?: ActionValue[];    // 웹사이트 구매 ROAS
  costPerActionType?: ActionValue[];
}

// 10. 광고 상세 정보
export interface DashAdDetailEntity {
  id: string;
  dashMemberId: string;
  time: string;
  adId: string;
  adName: string;
  status: string;
  effectiveStatus: string;
  campaignId: string;
  adsetId: string;
  creativeId: string;
  creativeName: string;
  thumbnailUrl: string;
  pageId: string;
  instagramUserId: string;
  videoId: string | null;
  title: string | null;
  message: string | null;
  imageUrl: string | null;
  imageHash: string | null;
  callToActionType: string | null;
  callToActionLink: string | null;
}

// 11. 광고 상세 + 인사이트 묶음
export interface DashAdDetailWithInsight {
  dashAdAccountInsight: DashAdAccountInsight;
  dashAdDetailEntity: DashAdDetailEntity;
}

// 12. 광고세트 (신규)
export interface DashAdSet {
  id: string;
  adAccountId: string;
  dashMemberId: string;
  time: string;
  metaAdSetId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget: string;
  lifetimeBudget: string;
  billingEvent: string;
  optimizationGoal: string;
  bidStrategy: string;
  startTime: string;
  createdTime: string;
  updatedTime: string;
  campaign: {
    campaignId: string;
    name: string;
    objective: string;
  };
}

// 13. 광고 계정 + 인사이트 응답
export interface DashAdAccountWithInsights {
  dashAdAccount: DashAdAccount;
  dashAdDetailWithInsights: DashAdDetailWithInsight[];
  dashAdSets: DashAdSet[];  // 광고세트 목록 추가
}

// 13. 인플루언서 (목록용)
export interface DashInfluencer {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phoneNumber: string | null;
  followerCount: number | null;
  engagementRate: number | null;
  averageLikes: number | null;
  averageComments: number | null;
  profileImageUrl: string | null;
  category: string[];
  activityField: string[];
  availableContentTypes: string[];
  desiredCompensation: string[];
  privacyAgree: boolean;
  status: string | null;
  createdTime: string;
  updateTime: string;
  // 신규 필드
  creatorCode: string | null;
  instagramProfile: string | null;
  type: string | null;
}

// 14. 인플루언서 포스트에 태그된 유저
export interface TaggedUser {
  fullName: string;
  id: string;
  isVerified: boolean;
  profilePicUrl: string;
  username: string;
}

// 15. 인플루언서 포스트 음악 정보
export interface MusicInfo {
  artistName: string;
  songName: string;
  usesOriginalAudio: boolean;
  shouldMuteAudio: boolean;
  shouldMuteAudioReason: string;
  audioId: string;
}

// 16. 인플루언서 포스트 (Apify 수집)
export interface DashInfluencerPost {
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  commentsCount: number;
  displayUrl: string;
  images: string[];
  likesCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerId: string;
  // 신규 필드
  title?: string;
  commentsDisabled?: boolean;
  dimensionsHeight?: number;
  dimensionsWidth?: number;
  videoDuration?: number;
  videoViewCount?: number;
  firstComment?: string;
  latestComments?: string[];
  videoUrl?: string;
  alt?: string;
  productType?: string;
  isCommentsDisabled?: boolean;
  taggedUsers?: TaggedUser[];
  musicInfo?: MusicInfo;
  childPosts?: DashInfluencerPost[];
  locationName?: string;
  locationId?: string;
  isPinned?: boolean;
}

// 17. 인플루언서 외부 URL
export interface ExternalUrl {
  title: string;
  lynxUrl: string;
  url: string;
  linkType: string;
}

// 18. 인플루언서 상세 - Apify 데이터
export interface DashInfluencerDetail {
  id: string;
  influencerId: string;
  username: string;
  url: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  isBusinessAccount: boolean;
  businessCategoryName: string;
  verified: boolean;
  profilePicUrl: string;
  profilePicUrlHD: string;
  postsCount: number;
  latestPosts: DashInfluencerPost[];
  // 신규 필드
  influencerEntityId: string | null;
  externalUrls: ExternalUrl[] | null;
  externalUrl: string | null;
  externalUrlShimmed: string | null;
  hasChannel: boolean;
  highlightReelCount: number;
  joinedRecently: boolean;
  privateAccount: boolean;
  igtvVideoCount: number;
  latestIgtvVideos: DashInfluencerPost[];
  fbid: string | null;
  error: string | null;
  errorDescription: string | null;
}

// 19. 인플루언서 상세 조회 응답 (기존 단일 상세 API용)
export interface DashInfluencerDetailResponse {
  dashInfluencer: {
    id: string;
    name: string;
    username: string;
    email: string;
    followerCount: number;
    engagementRate: number;
    averageLikes: number;
    averageComments: number;
    profileImageUrl: string;
    status: string;
  };
  dashInfluencerDetail: DashInfluencerDetail | null;
}

// 20. 인플루언서 목록 + 상세 통합 아이템 (신규 통합 API용)
export interface DashInfluencerWithDetail {
  dashInfluencer: DashInfluencer;
  dashInfluencerDetail: DashInfluencerDetail | null;
}

// ============================================
// 광고 캠페인 API 타입 (신규)
// ============================================

// 17. 광고 캠페인 정보
export interface DashAdCampaign {
  id: string;
  metaId: string;
  dashMemberId: string;
  adAccountId: string;
  time: string;
  status: string;
  name: string;
  effectiveStatus: string;
  objective: string;
  startTime: string;
  createdTime: string;
  updatedTime: string;
}

// 18. 캠페인 목록 아이템 (/api/v1/dash-ad/my-list 응답)
export interface DashAdListItem {
  dashAdCampaign: DashAdCampaign;
  dashAdAccount: DashAdAccount;
}

// 19. 광고 상세 + 인사이트 (광고세트 하위)
export interface AdSetChildObj {
  dashAdDetailEntity: DashAdDetailEntity;
  dashAdAccountInsight: DashAdAccountInsight;
}

// 20. 광고세트 + 자식 광고들
export interface AdDetailResponseObj {
  dashAdSet: DashAdSet;
  adSetChildObjs: AdSetChildObj[];
}

// 21. 캠페인 상세 응답 아이템 (/api/v1/dash-ad/{id}/detail/{campaignId} 응답)
export interface DashAdCampaignDetailItem {
  dashAdCampaign: DashAdCampaign;
  dashAdAccount: DashAdAccount;
  adDetailResponseObjs: AdDetailResponseObj[];
}

// ============================================
// 캠페인-인플루언서 참여 API 타입
// ============================================

// 22. 시딩 캠페인 정보 (참여 API 응답용)
export interface DashCampaign {
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
  mentionName: string;
  syncTime: string;
  createdAt: string;
  updatedAt: string;
}

// 23. 캠페인-인플루언서 참여 응답 아이템
export interface DashCampaignInfluencerParticipate {
  id: string; // 참여 레코드 고유 ID
  dashCampaign: DashCampaign;
  dashInfluencer: DashInfluencer;
  status: string;
  postUrl?: string; // 게시물 URL
}
