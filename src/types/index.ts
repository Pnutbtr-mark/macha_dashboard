// ============================================
// 타입 정의
// ============================================

export type TabType = 'profile' | 'ads' | 'campaign';
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type PlatformType = 'instagram' | 'youtube' | 'tiktok';
export type SeedingType = 'free' | 'paid';
export type SeedingStatus = 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';

// 인스타그램 Graph API 데이터
export interface ProfileInsight {
  followers: number;
  followersGrowth: number;
  following: number;
  posts: number;
  reach: number;
  reachGrowth: number;
  impressions: number;
  impressionsGrowth: number;      // 노출(views) 성장률
  profileViews: number;
  profileViewsGrowth: number;     // 프로필 방문 성장률
  websiteClicks: number;
  websiteClicksGrowth: number;    // 웹사이트 클릭 성장률
  engagementRate: number;
  engagementRateGrowth: number;   // 참여율 성장률
}

export interface DailyProfileData {
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
}

// 메타 광고 API 데이터
export interface AdPerformance {
  spend: number;
  spendGrowth: number;
  roas: number;
  roasGrowth: number;
  cpc: number;
  cpcGrowth: number;
  ctr: number;
  ctrGrowth: number;
  impressions: number;
  reach: number;
  reachGrowth: number;
  clicks: number;
  clicksGrowth: number;
  conversions: number;
  frequency: number;
}

export interface DailyAdData {
  date: string;
  spend: number;
  roas: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

// 캠페인별 성과 데이터 (UI용)
export interface CampaignPerformance {
  id: string;
  name: string;
  spend: number;
  roas: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  status: 'active' | 'paused' | 'completed';
  startDate: string; // 최초 기록일 (YYYY-MM-DD)
}

// 캠페인 데이터 (Notion/DB)
export interface Campaign {
  id: string;
  name: string;
  client: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: PlatformType;
  thumbnail: string;
  followers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  category: string[];
  priceRange: string;
  verified: boolean;
}

export interface SeedingItem {
  id: string;
  campaignId: string;
  influencer: Influencer;
  type: SeedingType;
  status: SeedingStatus;
  requestDate: string;
  responseDate?: string;
  postDate?: string;
  postUrl?: string;
  deliveryCost?: number;
  productValue?: number;
  paymentAmount?: number;
  notes?: string;
}

export interface AffiliateLink {
  id: string;
  influencerId: string;
  influencerName: string;
  code: string;
  url: string;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface ContentItem {
  id: string;
  influencerId: string;
  influencerName: string;
  platform: PlatformType;
  type: 'image' | 'video' | 'reel' | 'story';
  thumbnail: string;
  originalUrl: string;
  downloadUrl: string;
  likes: number;
  comments: number;
  shares?: number;
  views?: number;
  engagementRate: number;
  postedAt: string;
  caption?: string;
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  recommendation: string;
  generatedAt: string;
}

// 지표 설명
export interface MetricDefinition {
  title: string;
  description: string;
}

// 팔로워 인구통계 (API 연동용)
export interface FollowerDemographic {
  gender: {
    male: number;
    female: number;
    malePercent: number;
    femalePercent: number;
  };
  age: {
    range: string;
    count: number;
    percent: number;
  }[];
  country: {
    code: string;
    name: string;
    count: number;
    percent: number;
  }[];
  total: number;
}

// 프로필 콘텐츠 아이템 (API 연동용)
export interface ProfileContentItem {
  id: string;
  type: 'reels' | 'feed' | 'story' | 'carousel';
  uploadDate: string;
  thumbnailUrl?: string;
  permalink?: string;  // 인스타그램 피드 바로가기 URL
  views?: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares?: number;
  engagementRate: number;
}

// 소재(Ad) + 성과 (UI용)
export interface AdWithPerformance {
  id: string;
  adId: string;
  adName: string;
  status: string;
  effectiveStatus: string;
  // 크리에이티브 정보
  creativeId: string;
  creativeName: string;
  thumbnailUrl: string;
  imageUrl: string | null;
  title: string | null;
  message: string | null;
  // 성과 지표
  spend: number;
  reach: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

// 광고세트 + 성과 (UI용)
export interface AdSetWithPerformance {
  id: string;
  metaAdSetId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget: string;
  lifetimeBudget: string;
  optimizationGoal: string;
  bidStrategy: string;
  // 해당 광고세트의 광고들 성과 합산
  spend: number;
  reach: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  roas: number;
  // 소재 목록
  ads: AdWithPerformance[];
}

// 캠페인 계층 구조 (UI용)
export interface CampaignHierarchy {
  campaignId: string;
  campaignName: string;
  objective: string;
  createdTime: string;  // 캠페인 생성일
  status: string;       // 메타 캠페인 상태 (ACTIVE, PAUSED 등)
  effectiveStatus: string;  // 실제 적용 상태
  // 캠페인 전체 성과 (합산)
  totalSpend: number;
  totalReach: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  cpc: number;
  roas: number;
  // 광고세트 목록
  adSets: AdSetWithPerformance[];
}

// ============================================
// 신청자 관리 타입
// ============================================

// 신청자 상태
export type ApplicantStatus =
  | 'pending'      // 대기중 (신규 접수)
  | 'reviewing'    // 검토중
  | 'selected'     // 선택됨 (기업주가 선택)
  | 'rejected'     // 불합격
  | 'converted';   // 참여 인플루언서로 전환됨

// 웰링크 가입 매칭 상태
export type WellinkMatchStatus =
  | 'not_checked'  // 미확인
  | 'matched'      // 매칭됨 (기존 인플루언서 DB에서 발견)
  | 'not_found';   // 미가입 (인플루언서 DB에 없음)

// 신청자 인터페이스
export interface Applicant {
  id: string;
  campaignId: string;

  // 기본 정보 (우피 폼에서 수집)
  name: string;
  phoneNumber: string;
  email?: string;
  instagramHandle?: string;

  // 추가 정보
  followerCount?: number;
  category?: string[];
  introduction?: string;
  portfolioUrl?: string;

  // 매칭 정보
  wellinkMatchStatus: WellinkMatchStatus;
  matchedInfluencerId?: string;

  // 상태 관리
  status: ApplicantStatus;
  isSelected: boolean;

  // 메타데이터
  appliedAt: string;
  reviewedAt?: string;
  selectedAt?: string;
  notes?: string;
}
