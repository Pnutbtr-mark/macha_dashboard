// ============================================
// 타입 정의
// ============================================

export type TabType = 'profile' | 'ads' | 'campaign' | 'influencer';
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
  profileViews: number;
  websiteClicks: number;
  engagementRate: number;
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
