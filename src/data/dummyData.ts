import type {
  ProfileInsight,
  DailyProfileData,
  AdPerformance,
  DailyAdData,
  Campaign,
  Influencer,
  SeedingItem,
  AffiliateLink,
  ContentItem,
  AIAnalysis,
  MetricDefinition,
} from '../types';

// ============================================
// DUMMY_DATA - API 연동 시 이 부분만 교체하세요
// ============================================

// 캠페인 기본 정보
export const CAMPAIGN_INFO: Campaign = {
  id: 'camp-001',
  name: '스웻이프',
  client: '스웻이프',
  status: 'active',
  startDate: '2024-12-01',
  endDate: '2024-12-31',
  budget: 50000000,
  spent: 32450000,
};

// ============================================
// 인스타그램 Graph API 데이터
// ============================================
export const PROFILE_INSIGHT: ProfileInsight = {
  followers: 125400,
  followersGrowth: 8.5,
  following: 892,
  posts: 1247,
  reach: 892000,
  reachGrowth: 23.1,
  impressions: 2450000,
  impressionsGrowth: 12.3,
  profileViews: 45200,
  profileViewsGrowth: 15.2,
  websiteClicks: 12800,
  websiteClicksGrowth: 8.5,
  engagementRate: 4.8,
  engagementRateGrowth: 5.2,
};

export const DAILY_PROFILE_DATA: DailyProfileData[] = [
  { date: '12/01', followers: 118500, reach: 52000, impressions: 145000, engagement: 4.2 },
  { date: '12/02', followers: 118900, reach: 58000, impressions: 162000, engagement: 4.4 },
  { date: '12/03', followers: 119200, reach: 61000, impressions: 175000, engagement: 4.5 },
  { date: '12/04', followers: 119800, reach: 68000, impressions: 192000, engagement: 4.7 },
  { date: '12/05', followers: 120400, reach: 72000, impressions: 205000, engagement: 4.6 },
  { date: '12/06', followers: 121100, reach: 78000, impressions: 218000, engagement: 4.8 },
  { date: '12/07', followers: 121900, reach: 85000, impressions: 235000, engagement: 5.0 },
  { date: '12/08', followers: 122500, reach: 79000, impressions: 220000, engagement: 4.7 },
  { date: '12/09', followers: 123000, reach: 82000, impressions: 228000, engagement: 4.8 },
  { date: '12/10', followers: 123600, reach: 88000, impressions: 245000, engagement: 4.9 },
  { date: '12/11', followers: 124200, reach: 92000, impressions: 258000, engagement: 5.1 },
  { date: '12/12', followers: 124800, reach: 95000, impressions: 268000, engagement: 5.0 },
  { date: '12/13', followers: 125100, reach: 89000, impressions: 252000, engagement: 4.8 },
  { date: '12/14', followers: 125400, reach: 92000, impressions: 260000, engagement: 4.8 },
];

// ============================================
// 메타 광고 API 데이터
// ============================================
export const AD_PERFORMANCE: AdPerformance = {
  spend: 32450000,
  spendGrowth: 12.3,
  roas: 4.2,
  roasGrowth: 15.8,
  cpc: 380,
  cpcGrowth: -8.5,
  ctr: 3.2,
  ctrGrowth: 11.2,
  impressions: 4850000,
  clicks: 155200,
  conversions: 4850,
  frequency: 2.8,
};

export const DAILY_AD_DATA: DailyAdData[] = [
  { date: '12/01', spend: 1850000, roas: 3.2, clicks: 8500, impressions: 285000, conversions: 245, ctr: 2.98, cpc: 218 },
  { date: '12/02', spend: 2100000, roas: 3.5, clicks: 9800, impressions: 312000, conversions: 298, ctr: 3.14, cpc: 214 },
  { date: '12/03', spend: 1950000, roas: 3.8, clicks: 9200, impressions: 298000, conversions: 312, ctr: 3.09, cpc: 212 },
  { date: '12/04', spend: 2450000, roas: 4.1, clicks: 11500, impressions: 365000, conversions: 385, ctr: 3.15, cpc: 213 },
  { date: '12/05', spend: 2200000, roas: 4.0, clicks: 10800, impressions: 342000, conversions: 362, ctr: 3.16, cpc: 204 },
  { date: '12/06', spend: 2580000, roas: 4.3, clicks: 12200, impressions: 385000, conversions: 425, ctr: 3.17, cpc: 211 },
  { date: '12/07', spend: 2850000, roas: 4.5, clicks: 13500, impressions: 425000, conversions: 485, ctr: 3.18, cpc: 211 },
  { date: '12/08', spend: 2350000, roas: 4.2, clicks: 11200, impressions: 355000, conversions: 395, ctr: 3.15, cpc: 210 },
  { date: '12/09', spend: 2150000, roas: 3.9, clicks: 10200, impressions: 325000, conversions: 348, ctr: 3.14, cpc: 211 },
  { date: '12/10', spend: 2480000, roas: 4.4, clicks: 11800, impressions: 375000, conversions: 428, ctr: 3.15, cpc: 210 },
  { date: '12/11', spend: 2720000, roas: 4.6, clicks: 12800, impressions: 405000, conversions: 468, ctr: 3.16, cpc: 213 },
  { date: '12/12', spend: 2950000, roas: 4.8, clicks: 14200, impressions: 448000, conversions: 520, ctr: 3.17, cpc: 208 },
  { date: '12/13', spend: 2420000, roas: 4.3, clicks: 11500, impressions: 365000, conversions: 412, ctr: 3.15, cpc: 210 },
  { date: '12/14', spend: 2400000, roas: 4.2, clicks: 11200, impressions: 358000, conversions: 398, ctr: 3.13, cpc: 214 },
];

// ============================================
// 인플루언서 데이터베이스
// ============================================
export const INFLUENCERS: Influencer[] = [
  {
    id: 'inf-001',
    name: '김뷰티',
    handle: '@beauty_kim',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    followers: 524000,
    engagementRate: 5.2,
    avgLikes: 28500,
    avgComments: 1420,
    category: ['헬스'],
    priceRange: '200-300만원',
    verified: true,
  },
  {
    id: 'inf-002',
    name: '스타일준',
    handle: '@style_jun',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    followers: 892000,
    engagementRate: 6.8,
    avgLikes: 45200,
    avgComments: 2850,
    category: ['러닝'],
    priceRange: '400-500만원',
    verified: true,
  },
  {
    id: 'inf-003',
    name: '데일리수',
    handle: '@daily_soo',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    followers: 312000,
    engagementRate: 4.3,
    avgLikes: 14200,
    avgComments: 680,
    category: ['요가'],
    priceRange: '100-150만원',
    verified: false,
  },
  {
    id: 'inf-004',
    name: '패션민아',
    handle: '@fashion_mina',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    followers: 678000,
    engagementRate: 5.8,
    avgLikes: 38500,
    avgComments: 1980,
    category: ['필라테스'],
    priceRange: '300-400만원',
    verified: true,
  },
  {
    id: 'inf-005',
    name: '리뷰어태현',
    handle: '@review_th',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    followers: 445000,
    engagementRate: 7.2,
    avgLikes: 32500,
    avgComments: 2150,
    category: ['바레'],
    priceRange: '250-350만원',
    verified: true,
  },
  {
    id: 'inf-006',
    name: '트래블지은',
    handle: '@travel_jieun',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    followers: 256000,
    engagementRate: 6.1,
    avgLikes: 16200,
    avgComments: 890,
    category: ['크로스핏'],
    priceRange: '150-200만원',
    verified: false,
  },
  {
    id: 'inf-007',
    name: '피트니스민수',
    handle: '@fitness_ms',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    followers: 1250000,
    engagementRate: 8.5,
    avgLikes: 125000,
    avgComments: 4500,
    category: ['하이록스'],
    priceRange: '500-700만원',
    verified: true,
  },
  {
    id: 'inf-008',
    name: '쿠킹하나',
    handle: '@cooking_hana',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face',
    followers: 385000,
    engagementRate: 5.5,
    avgLikes: 22800,
    avgComments: 1580,
    category: ['F45'],
    priceRange: '200-280만원',
    verified: false,
  },
  {
    id: 'inf-009',
    name: '운동왕철수',
    handle: '@workout_cs',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face',
    followers: 420000,
    engagementRate: 6.2,
    avgLikes: 26000,
    avgComments: 1350,
    category: ['기타'],
    priceRange: '180-250만원',
    verified: true,
  },
  {
    id: 'inf-010',
    name: '헬스영희',
    handle: '@health_yh',
    platform: 'instagram',
    thumbnail: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
    followers: 580000,
    engagementRate: 5.9,
    avgLikes: 34200,
    avgComments: 1780,
    category: ['헬스/웨이트'],
    priceRange: '280-380만원',
    verified: true,
  },
];

// ============================================
// 시딩 관리 데이터
// ============================================
export const SEEDING_LIST: SeedingItem[] = [
  {
    id: 'seed-001',
    campaignId: '1',
    influencer: INFLUENCERS[0],
    type: 'paid',
    status: 'completed',
    requestDate: '2024-12-01',
    responseDate: '2024-12-02',
    postDate: '2024-12-10',
    postUrl: 'https://instagram.com/p/example1',
    paymentAmount: 2500000,
    notes: '피드 1개 + 스토리 3개',
  },
  {
    id: 'seed-002',
    campaignId: '1',
    influencer: INFLUENCERS[1],
    type: 'paid',
    status: 'completed',
    requestDate: '2024-12-03',
    responseDate: '2024-12-04',
    postDate: '2024-12-12',
    postUrl: 'https://youtube.com/watch?v=example2',
    paymentAmount: 4500000,
    notes: '유튜브 숏츠 + 커뮤니티 포스트',
  },
  {
    id: 'seed-003',
    campaignId: '1',
    influencer: INFLUENCERS[2],
    type: 'free',
    status: 'confirmed',
    requestDate: '2024-12-05',
    responseDate: '2024-12-06',
    productValue: 150000,
    deliveryCost: 5000,
    notes: '제품 협찬',
  },
  {
    id: 'seed-004',
    campaignId: '2',
    influencer: INFLUENCERS[3],
    type: 'paid',
    status: 'contacted',
    requestDate: '2024-12-10',
    paymentAmount: 3500000,
    notes: '협의 중',
  },
  {
    id: 'seed-005',
    campaignId: '2',
    influencer: INFLUENCERS[5],
    type: 'free',
    status: 'pending',
    requestDate: '2024-12-12',
    productValue: 200000,
    notes: '컨택 예정',
  },
];

// ============================================
// 제휴 링크 데이터
// ============================================
export const AFFILIATE_LINKS: AffiliateLink[] = [
  {
    id: 'aff-001',
    influencerId: 'inf-001',
    influencerName: '김뷰티',
    code: 'BEAUTY_KIM_2024',
    url: 'https://brand.com/ref/beauty_kim',
    clicks: 12580,
    conversions: 425,
    revenue: 18500000,
    createdAt: '2024-12-01',
    expiresAt: '2025-01-31',
    isActive: true,
  },
  {
    id: 'aff-002',
    influencerId: 'inf-002',
    influencerName: '스타일준',
    code: 'STYLE_JUN_WINTER',
    url: 'https://brand.com/ref/style_jun',
    clicks: 25800,
    conversions: 892,
    revenue: 38200000,
    createdAt: '2024-12-01',
    expiresAt: '2025-01-31',
    isActive: true,
  },
  {
    id: 'aff-003',
    influencerId: 'inf-004',
    influencerName: '패션민아',
    code: 'MINA_FASHION',
    url: 'https://brand.com/ref/mina',
    clicks: 8920,
    conversions: 312,
    revenue: 13800000,
    createdAt: '2024-12-05',
    isActive: true,
  },
  {
    id: 'aff-004',
    influencerId: 'inf-005',
    influencerName: '리뷰어태현',
    code: 'REVIEW_TH_DEC',
    url: 'https://brand.com/ref/review_th',
    clicks: 15200,
    conversions: 528,
    revenue: 22500000,
    createdAt: '2024-12-08',
    isActive: true,
  },
];

// ============================================
// 콘텐츠 데이터
// ============================================
export const CONTENT_LIST: ContentItem[] = [
  {
    id: 'cont-001',
    influencerId: 'inf-001',
    influencerName: '김뷰티',
    platform: 'instagram',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=400&fit=crop',
    originalUrl: 'https://instagram.com/reel/example1',
    downloadUrl: '/downloads/content-001.mp4',
    likes: 45200,
    comments: 1820,
    views: 285000,
    engagementRate: 8.6,
    postedAt: '2024-12-10',
    caption: '겨울 스킨케어 루틴 공개! ❄️✨ #AD #브랜드명',
  },
  {
    id: 'cont-002',
    influencerId: 'inf-002',
    influencerName: '스타일준',
    platform: 'youtube',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=400&fit=crop',
    originalUrl: 'https://youtube.com/watch?v=example2',
    downloadUrl: '/downloads/content-002.mp4',
    likes: 28500,
    comments: 2150,
    views: 520000,
    engagementRate: 5.9,
    postedAt: '2024-12-12',
    caption: '[광고] 이번 시즌 필수템 리뷰!',
  },
  {
    id: 'cont-003',
    influencerId: 'inf-001',
    influencerName: '김뷰티',
    platform: 'instagram',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=400&fit=crop',
    originalUrl: 'https://instagram.com/p/example3',
    downloadUrl: '/downloads/content-003.jpg',
    likes: 32800,
    comments: 980,
    engagementRate: 6.4,
    postedAt: '2024-12-08',
    caption: '데일리 메이크업 룩 💄 #브랜드명 #협찬',
  },
  {
    id: 'cont-004',
    influencerId: 'inf-004',
    influencerName: '패션민아',
    platform: 'instagram',
    type: 'reel',
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=400&fit=crop',
    originalUrl: 'https://instagram.com/reel/example4',
    downloadUrl: '/downloads/content-004.mp4',
    likes: 58900,
    comments: 2450,
    views: 412000,
    engagementRate: 9.2,
    postedAt: '2024-12-11',
    caption: '윈터 코디 하울! 🧥❄️ #AD',
  },
];

// ============================================
// AI 분석 데이터
// ============================================
export const AI_ANALYSIS: AIAnalysis = {
  summary: '이번 캠페인은 전월 대비 ROAS가 23% 상승하며 우수한 성과를 기록하고 있습니다. 특히 인플루언서 협업 콘텐츠의 전환율이 기대 이상입니다.',
  insights: [
    '주말(토-일) 광고 효율이 평일 대비 35% 높게 나타났습니다. 주말 예산 증액을 권장합니다.',
    '뷰티 카테고리 크리에이터의 전환율이 패션 카테고리 대비 1.8배 높습니다.',
    '릴스/숏폼 콘텐츠가 일반 피드 대비 2.3배 높은 참여율을 보입니다.',
    '25-34세 여성 타겟층에서 가장 높은 구매 전환이 발생했습니다.',
    '김뷰티(@beauty_kim)의 콘텐츠가 가장 높은 ROI를 기록하고 있습니다.',
  ],
  recommendation: '다음 주에는 주말 예산을 20% 증액하고, 뷰티 카테고리 크리에이터 중심으로 숏폼 콘텐츠를 확대하는 것을 권장합니다. 또한 25-34세 여성 타겟 세그먼트의 리타겟팅 캠페인 추가를 검토해 주세요.',
  generatedAt: '2024-12-14T09:30:00Z',
};

// ============================================
// 지표 설명 (Tooltip용)
// ============================================
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  roas: {
    title: 'ROAS (Return on Ad Spend)',
    description: '광고비 대비 수익률입니다. 4.2x는 1원 투자 시 4.2원의 매출을 의미합니다.',
  },
  spend: {
    title: 'Ad Spend (광고 지출)',
    description: '해당 기간 동안 집행된 총 광고비입니다.',
  },
  reach: {
    title: 'Reach (도달)',
    description: '광고 또는 콘텐츠에 노출된 고유 사용자 수입니다.',
  },
  impressions: {
    title: 'Impressions (노출)',
    description: '광고 또는 콘텐츠가 화면에 표시된 총 횟수입니다. 한 사용자가 여러 번 볼 수 있습니다.',
  },
  clicks: {
    title: 'Clicks (클릭)',
    description: '광고를 클릭한 총 횟수입니다.',
  },
  cpc: {
    title: 'CPC (Cost Per Click)',
    description: '클릭당 비용입니다. 낮을수록 효율적인 광고 운영을 의미합니다.',
  },
  ctr: {
    title: 'CTR (Click Through Rate)',
    description: '클릭률입니다. 노출 대비 클릭 비율(%)로, 높을수록 광고 소재의 매력도가 높습니다.',
  },
  engagementRate: {
    title: 'Engagement Rate (참여율)',
    description: '팔로워 대비 좋아요, 댓글, 공유 등 상호작용 비율입니다. 인플루언서의 실질적 영향력을 측정합니다.',
  },
  conversions: {
    title: 'Conversions (전환)',
    description: '광고를 통해 발생한 구매, 회원가입 등 목표 행동의 수입니다.',
  },
  frequency: {
    title: 'Frequency (빈도)',
    description: '한 사용자가 평균적으로 광고를 본 횟수입니다. 너무 높으면 피로도가 증가할 수 있습니다.',
  },
  followers: {
    title: 'Followers (팔로워)',
    description: '계정을 팔로우하고 있는 사용자 수입니다.',
  },
  organic: {
    title: 'Organic (오가닉)',
    description: '광고 없이 자연적으로 발생한 도달, 참여 등을 의미합니다.',
  },
  profileVisits: {
    title: 'Profile Visits (프로필 방문)',
    description: '프로필 페이지를 방문한 사용자 수입니다. 브랜드 관심도를 나타냅니다.',
  },
  websiteClicks: {
    title: 'Website Clicks (웹사이트 클릭)',
    description: '프로필의 웹사이트 링크를 클릭한 횟수입니다. 구매 전환의 선행 지표입니다.',
  },
  clickRate: {
    title: 'Click Rate (클릭률)',
    description: '프로필 방문 대비 웹사이트 클릭 비율입니다. 높을수록 CTA가 효과적입니다.',
  },
  storyViews: {
    title: 'Story Views (스토리 조회)',
    description: '스토리를 본 사용자 수입니다. 24시간 동안 유효한 휘발성 콘텐츠의 도달력을 측정합니다.',
  },
  storyReach: {
    title: 'Story Reach (스토리 도달)',
    description: '스토리에 도달한 고유 사용자 수입니다.',
  },
  linkClicks: {
    title: 'Link Clicks (링크 클릭)',
    description: '스토리 내 링크 스티커나 스와이프업을 통한 클릭 수입니다.',
  },
  feedImpressions: {
    title: 'Feed Impressions (노출 피드 수)',
    description: '캠페인 관련 피드 게시물이 사용자에게 노출된 총 횟수입니다.',
  },
  totalLikes: {
    title: 'Total Likes (총 좋아요)',
    description: '캠페인 기간 동안 발생한 모든 좋아요 수입니다.',
  },
  videoViews: {
    title: 'Video Views (비디오 재생 수)',
    description: '영상 콘텐츠가 재생된 총 횟수입니다. 3초 이상 시청 시 카운트됩니다.',
  },
  totalShares: {
    title: 'Total Shares (총 공유 수)',
    description: 'DM이나 스토리로 콘텐츠가 공유된 횟수입니다. 바이럴 효과의 지표입니다.',
  },
  totalComments: {
    title: 'Total Comments (총 댓글 수)',
    description: '게시물에 달린 댓글 수입니다. 참여도와 관심도를 나타냅니다.',
  },
  reachSource: {
    title: 'Reach Source (도달 출처)',
    description: '도달이 발생한 출처 비율입니다. 광고와 유기적 도달의 비율을 확인할 수 있습니다.',
  },
  engagementSource: {
    title: 'Engagement Source (참여 출처)',
    description: '참여가 발생한 출처 비율입니다. 광고와 유기적 참여의 비율을 확인할 수 있습니다.',
  },
};
