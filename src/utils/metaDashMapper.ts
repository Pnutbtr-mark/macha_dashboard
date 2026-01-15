// Meta Dash API 응답을 UI 형식으로 변환하는 유틸리티
import type {
  DashMemberInsight,
  DashFollower,
  DashFollowerInsight,
  DashMediaResponse,
  DashMediaInsight,
  DashAdAccountWithInsights,
  DashAdAccountInsight,
} from '../types/metaDash';
import type {
  ProfileInsight,
  DailyProfileData,
  FollowerDemographic,
  ProfileContentItem,
  AdPerformance,
  DailyAdData,
  CampaignPerformance,
} from '../types';

// 성장률 계산 헬퍼 함수
function calculateGrowth(today: number, yesterday: number): number {
  if (yesterday === 0) return 0;
  return parseFloat((((today - yesterday) / yesterday) * 100).toFixed(1));
}

// 1. 프로필 인사이트 변환
export function mapToProfileInsight(
  insights: DashMemberInsight[],
  followers: DashFollower[]
): ProfileInsight {
  if (followers.length === 0) {
    throw new Error('팔로워 데이터가 없습니다');
  }

  // 최신 & 이전 팔로워 수
  const sortedFollowers = [...followers].sort((a, b) =>
    new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  const latestFollower = sortedFollowers[0];
  const previousFollower = sortedFollowers[1];

  const followersGrowth = previousFollower
    ? ((latestFollower.followersCount - previousFollower.followersCount) /
       previousFollower.followersCount) * 100
    : 0;

  // 일별 인사이트에서 날짜 추출 (오늘/어제)
  const dayInsights = insights.filter(i => i.period === 'day');
  const uniqueDates = [...new Set(dayInsights.map(i => i.time.split('T')[0]))].sort().reverse();
  const todayDate = uniqueDates[0];
  const yesterdayDate = uniqueDates[1];

  // 오늘/어제 인사이트 필터링
  const todayInsights = dayInsights.filter(i => i.time.startsWith(todayDate));
  const yesterdayInsights = yesterdayDate
    ? dayInsights.filter(i => i.time.startsWith(yesterdayDate))
    : [];

  // 오늘 데이터
  const reach = findMetricValue(todayInsights, 'reach') || 0;
  const impressions = findMetricValue(todayInsights, 'views') || 0;
  const profileViews = findMetricValue(todayInsights, 'profile_views') || 0;
  const websiteClicks = findMetricValue(todayInsights, 'website_clicks') || 0;
  const totalInteractions = findMetricValue(todayInsights, 'total_interactions') || 0;

  // 어제 데이터
  const yesterdayReach = findMetricValue(yesterdayInsights, 'reach') || 0;
  const yesterdayImpressions = findMetricValue(yesterdayInsights, 'views') || 0;
  const yesterdayProfileViews = findMetricValue(yesterdayInsights, 'profile_views') || 0;
  const yesterdayWebsiteClicks = findMetricValue(yesterdayInsights, 'website_clicks') || 0;
  const yesterdayTotalInteractions = findMetricValue(yesterdayInsights, 'total_interactions') || 0;

  // 참여율 계산
  const engagementRate = reach > 0 ? (totalInteractions / reach) * 100 : 0;
  const yesterdayEngagementRate = yesterdayReach > 0 ? (yesterdayTotalInteractions / yesterdayReach) * 100 : 0;

  // 전일 대비 성장률 계산
  const reachGrowth = calculateGrowth(reach, yesterdayReach);
  const impressionsGrowth = calculateGrowth(impressions, yesterdayImpressions);
  const profileViewsGrowth = calculateGrowth(profileViews, yesterdayProfileViews);
  const websiteClicksGrowth = calculateGrowth(websiteClicks, yesterdayWebsiteClicks);
  const engagementRateGrowth = calculateGrowth(engagementRate, yesterdayEngagementRate);

  return {
    followers: latestFollower.followersCount,
    followersGrowth: parseFloat(followersGrowth.toFixed(1)),
    following: 0,
    posts: 0,
    reach,
    reachGrowth,
    impressions,
    impressionsGrowth,
    profileViews,
    profileViewsGrowth,
    websiteClicks,
    websiteClicksGrowth,
    engagementRate: parseFloat(engagementRate.toFixed(1)),
    engagementRateGrowth,
  };
}

// 2. 일별 프로필 데이터 변환
export function mapToDailyProfileData(
  followers: DashFollower[],
  insights: DashMemberInsight[]
): DailyProfileData[] {
  if (followers.length === 0) {
    return [];
  }

  // 최근 14일 팔로워 데이터
  const sortedFollowers = [...followers]
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(-14);

  return sortedFollowers.map(follower => {
    const dateStr = follower.time.split('T')[0]; // YYYY-MM-DD

    // 해당 날짜의 일별 인사이트
    const dayInsights = insights.filter(
      i => i.period === 'day' && i.time.startsWith(dateStr)
    );

    const reach = findMetricValue(dayInsights, 'reach') || 0;
    const impressions = findMetricValue(dayInsights, 'views') || 0;  // 노출 → views 값 사용
    const interactions = findMetricValue(dayInsights, 'total_interactions') || 0;
    const engagement = reach > 0 ? (interactions / reach) * 100 : 0;

    return {
      date: formatDateToMMDD(follower.time),
      followers: follower.followersCount,
      reach,
      impressions,
      engagement: parseFloat(engagement.toFixed(1)),
    };
  });
}

// 3. 콘텐츠 성과 변환
export function mapToContentItems(
  mediaList: DashMediaResponse[]
): ProfileContentItem[] {
  // igMediaId 기준으로 중복 제거 (최신 인사이트 데이터만 유지)
  const mediaMap = new Map<string, DashMediaResponse>();

  for (const item of mediaList) {
    const mediaId = item.dashMedia.igMediaId;
    const existing = mediaMap.get(mediaId);

    if (!existing) {
      mediaMap.set(mediaId, item);
    } else {
      // 최신 인사이트 데이터로 업데이트
      const existingTime = getLatestInsightTime(existing.dashMediaInsights);
      const newTime = getLatestInsightTime(item.dashMediaInsights);

      if (newTime > existingTime) {
        mediaMap.set(mediaId, item);
      }
    }
  }

  // 중복 제거된 콘텐츠만 변환
  return Array.from(mediaMap.values()).map(item => {
    const { dashMedia, dashMediaInsights } = item;

    // 인사이트 값 추출
    const reach = findInsightValue(dashMediaInsights, 'reach') || 0;
    const impressions = findInsightValue(dashMediaInsights, 'impressions') || 0;
    const likes = dashMedia.likeCount || 0;
    const comments = dashMedia.commentsCount || 0;
    const saves = findInsightValue(dashMediaInsights, 'saved') || 0;
    const shares = findInsightValue(dashMediaInsights, 'shares') || 0;
    const views = findInsightValue(dashMediaInsights, 'views') ||
                  findInsightValue(dashMediaInsights, 'plays') ||
                  findInsightValue(dashMediaInsights, 'video_views') || 0;

    // 참여율 = (좋아요 + 댓글 + 저장) / 도달 * 100
    const engagementRate = reach > 0
      ? ((likes + comments + saves) / reach) * 100
      : 0;

    return {
      id: dashMedia.id.toString(),
      type: mapMediaType(dashMedia.mediaType),
      uploadDate: dashMedia.postedAt.split('T')[0],
      thumbnailUrl: dashMedia.thumbnailUrl || dashMedia.mediaUrl,
      views,
      reach,
      impressions,
      likes,
      comments,
      saves,
      shares,
      engagementRate: parseFloat(engagementRate.toFixed(1)),
    };
  });
}

// 가장 최신 인사이트 시간 찾기
function getLatestInsightTime(insights: DashMediaInsight[]): string {
  if (insights.length === 0) return '';
  return insights
    .map(i => i.time)
    .sort()
    .reverse()[0];
}

// 4. 팔로워 인구통계 변환
export function mapToFollowerDemographic(
  insights: DashFollowerInsight[]
): FollowerDemographic {
  if (insights.length === 0) {
    throw new Error('팔로워 분석 데이터가 없습니다');
  }

  // 최신 인사이트 사용 (이미 집계된 데이터)
  const latest = insights.sort((a, b) =>
    new Date(b.time).getTime() - new Date(a.time).getTime()
  )[0];

  // 성별 데이터
  const male = latest.gender?.male || 0;
  const female = latest.gender?.female || 0;
  const genderTotal = male + female;

  // 나이대 데이터
  const ageData = [
    { range: '13-17', count: latest.age?.age13_17 || 0 },
    { range: '18-24', count: latest.age?.age18_24 || 0 },
    { range: '25-34', count: latest.age?.age25_34 || 0 },
    { range: '35-44', count: latest.age?.age35_44 || 0 },
    { range: '45-54', count: latest.age?.age45_54 || 0 },
    { range: '55-64', count: latest.age?.age55_64 || 0 },
    { range: '65+', count: latest.age?.age65Plus || 0 },
  ];
  const ageTotal = ageData.reduce((sum, item) => sum + item.count, 0);

  // 국가 데이터
  const countriesObj = latest.country?.countries || {};
  const countries = Object.entries(countriesObj)
    .map(([code, count]) => ({
      code,
      name: getCountryName(code),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const countryTotal = countries.reduce((sum, item) => sum + item.count, 0);

  return {
    gender: {
      male,
      female,
      malePercent: genderTotal > 0 ? parseFloat(((male / genderTotal) * 100).toFixed(1)) : 0,
      femalePercent: genderTotal > 0 ? parseFloat(((female / genderTotal) * 100).toFixed(1)) : 0,
    },
    age: ageData
      .map(item => ({
        ...item,
        percent: ageTotal > 0 ? parseFloat(((item.count / ageTotal) * 100).toFixed(1)) : 0,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count),
    country: countries.map(item => ({
      ...item,
      percent: countryTotal > 0 ? parseFloat(((item.count / countryTotal) * 100).toFixed(1)) : 0,
    })),
    total: Math.max(genderTotal, ageTotal, countryTotal),
  };
}

// === 헬퍼 함수들 ===

function findMetricValue(
  insights: DashMemberInsight[],
  metricName: string
): number | undefined {
  return insights.find(i => i.metricName === metricName)?.value;
}

function findInsightValue(
  insights: DashMediaInsight[],
  metricName: string
): number | undefined {
  // DashMediaInsight의 'name' 필드가 실제 metricName
  return insights.find(i => i.name === metricName)?.value;
}

function mapMediaType(apiType: string): 'reels' | 'feed' | 'story' | 'carousel' {
  const normalized = (apiType || '').toUpperCase();
  if (normalized.includes('REEL')) return 'reels';
  if (normalized.includes('VIDEO')) return 'reels';      // VIDEO → reels
  if (normalized.includes('CAROUSEL')) return 'carousel'; // CAROUSEL → carousel
  if (normalized.includes('STORY')) return 'story';
  return 'feed';  // IMAGE → feed
}

function formatDateToMMDD(isoDate: string): string {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function getCountryName(code: string): string {
  const countryNames: Record<string, string> = {
    KR: '한국',
    US: '미국',
    JP: '일본',
    CN: '중국',
    TW: '대만',
    HK: '홍콩',
    SG: '싱가포르',
    TH: '태국',
    VN: '베트남',
    ID: '인도네시아',
    PH: '필리핀',
    MY: '말레이시아',
    IN: '인도',
    AU: '호주',
    GB: '영국',
    DE: '독일',
    FR: '프랑스',
    CA: '캐나다',
    BR: '브라질',
    MX: '멕시코',
  };
  return countryNames[code] || code;
}

// 5. 광고 성과 변환 (모든 광고 계정의 인사이트 합산)
export function mapToAdPerformance(
  accountsWithInsights: DashAdAccountWithInsights[]
): AdPerformance {
  // 모든 광고 인사이트 추출
  const allInsights: DashAdAccountInsight[] = accountsWithInsights
    .flatMap(acc => acc.dashAdDetailWithInsights)
    .map(item => item.dashAdAccountInsight);

  if (allInsights.length === 0) {
    return {
      spend: 0,
      spendGrowth: 0,
      roas: 0,
      roasGrowth: 0,
      cpc: 0,
      cpcGrowth: 0,
      ctr: 0,
      ctrGrowth: 0,
      impressions: 0,
      reach: 0,
      reachGrowth: 0,
      clicks: 0,
      clicksGrowth: 0,
      conversions: 0,
      frequency: 1,
    };
  }

  // 날짜별 그룹핑
  const dateMap = new Map<string, DashAdAccountInsight[]>();
  for (const insight of allInsights) {
    const dateStr = insight.time.split('T')[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, []);
    }
    dateMap.get(dateStr)!.push(insight);
  }

  // 날짜 정렬 (최신 순)
  const sortedDates = Array.from(dateMap.keys()).sort().reverse();
  const todayDate = sortedDates[0];
  const yesterdayDate = sortedDates[1];

  // 오늘 합계
  const todayInsights = dateMap.get(todayDate) || [];
  const spend = todayInsights.reduce((sum, i) => sum + i.spend, 0);
  const impressions = todayInsights.reduce((sum, i) => sum + i.impressions, 0);
  const clicks = todayInsights.reduce((sum, i) => sum + i.clicks, 0);
  const reach = todayInsights.reduce((sum, i) => sum + i.reach, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const frequency = reach > 0 ? impressions / reach : 1;

  // 어제 합계
  const yesterdayInsights = dateMap.get(yesterdayDate) || [];
  const yesterdaySpend = yesterdayInsights.reduce((sum, i) => sum + i.spend, 0);
  const yesterdayImpressions = yesterdayInsights.reduce((sum, i) => sum + i.impressions, 0);
  const yesterdayClicks = yesterdayInsights.reduce((sum, i) => sum + i.clicks, 0);
  const yesterdayReach = yesterdayInsights.reduce((sum, i) => sum + i.reach, 0);
  const yesterdayCtr = yesterdayImpressions > 0 ? (yesterdayClicks / yesterdayImpressions) * 100 : 0;
  const yesterdayCpc = yesterdayClicks > 0 ? yesterdaySpend / yesterdayClicks : 0;

  return {
    spend,
    spendGrowth: calculateGrowth(spend, yesterdaySpend),
    roas: 0, // API에서 제공하지 않음
    roasGrowth: 0,
    cpc,
    cpcGrowth: calculateGrowth(cpc, yesterdayCpc),
    ctr,
    ctrGrowth: calculateGrowth(ctr, yesterdayCtr),
    impressions,
    reach,
    reachGrowth: calculateGrowth(reach, yesterdayReach),
    clicks,
    clicksGrowth: calculateGrowth(clicks, yesterdayClicks),
    conversions: 0, // API에서 제공하지 않음
    frequency,
  };
}

// 6. 일별 광고 데이터 변환
export function mapToDailyAdData(
  accountsWithInsights: DashAdAccountWithInsights[]
): DailyAdData[] {
  // 모든 광고 인사이트 추출
  const allInsights: DashAdAccountInsight[] = accountsWithInsights
    .flatMap(acc => acc.dashAdDetailWithInsights)
    .map(item => item.dashAdAccountInsight);

  if (allInsights.length === 0) {
    return [];
  }

  // 날짜별 그룹핑 및 합계
  const dateMap = new Map<string, {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
  }>();

  for (const insight of allInsights) {
    const dateStr = insight.time.split('T')[0];
    const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0 };
    dateMap.set(dateStr, {
      spend: existing.spend + insight.spend,
      impressions: existing.impressions + insight.impressions,
      clicks: existing.clicks + insight.clicks,
      reach: existing.reach + insight.reach,
    });
  }

  // 날짜순 정렬 후 변환 (최근 14일)
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([dateStr, data]) => ({
      date: formatDateToMMDD(dateStr + 'T00:00:00'),
      spend: data.spend,
      roas: 0, // API에서 제공하지 않음
      clicks: data.clicks,
      impressions: data.impressions,
      conversions: 0, // API에서 제공하지 않음
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
    }));
}

// 7. 캠페인별 성과 변환 (개별 광고별 데이터)
export function mapToCampaignPerformance(
  accountsWithInsights: DashAdAccountWithInsights[]
): CampaignPerformance[] {
  // 모든 광고 추출
  const allAds = accountsWithInsights.flatMap(acc => acc.dashAdDetailWithInsights);

  if (allAds.length === 0) {
    return [];
  }

  // adId로 그룹핑 (같은 광고의 여러 날짜 데이터 합산)
  const adMap = new Map<string, { insight: DashAdAccountInsight; detail: typeof allAds[0]['dashAdDetailEntity'] }[]>();

  for (const ad of allAds) {
    const adId = ad.dashAdDetailEntity.adId;
    if (!adMap.has(adId)) adMap.set(adId, []);
    adMap.get(adId)!.push({ insight: ad.dashAdAccountInsight, detail: ad.dashAdDetailEntity });
  }

  // 광고별 합산
  return Array.from(adMap.entries()).map(([adId, records]) => {
    const detail = records[0].detail;
    const totalSpend = records.reduce((sum, r) => sum + r.insight.spend, 0);
    const totalReach = records.reduce((sum, r) => sum + r.insight.reach, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.insight.clicks, 0);
    const totalImpressions = records.reduce((sum, r) => sum + r.insight.impressions, 0);

    return {
      id: adId,
      name: detail.adName,
      spend: totalSpend,
      roas: 0, // API 미제공
      reach: totalReach,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      status: mapAdStatus(detail.status),
    };
  });
}

// 광고 상태 매핑
function mapAdStatus(apiStatus: string): 'active' | 'paused' | 'completed' {
  const s = (apiStatus || '').toUpperCase();
  if (s === 'ACTIVE') return 'active';
  if (s === 'PAUSED') return 'paused';
  return 'completed';
}
