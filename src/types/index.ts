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
  clicks: number;
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
  views?: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares?: number;
  engagementRate: number;
}
