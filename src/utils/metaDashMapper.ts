// Meta Dash API 응답을 UI 형식으로 변환하는 유틸리티
import type {
  DashMemberInsight,
  DashFollower,
  DashFollowerInsight,
  DashMediaResponse,
  DashAdAccountWithInsights,
  DashAdAccountInsight,
  DashAdSet,
  DashAdCampaignDetailItem,
  DashAdCampaign,
  ActionValue,
} from '../types/metaDash';
import type {
  ProfileInsight,
  DailyProfileData,
  FollowerDemographic,
  ProfileContentItem,
  AdPerformance,
  DailyAdData,
  CampaignPerformance,
  CampaignHierarchy,
  CampaignDailyData,
  AdSetWithPerformance,
  AdWithPerformance,
} from '../types';
import { calculateCtr, calculateCpc, calculateFrequency, calculateGrowth } from './metrics';
import { formatDateToMMDD, getDateRangeForPeriod, getLatestDateFromData } from './dates';
import type { PeriodType } from '../types';
import { getCountryName, mapMediaType, mapAdStatus } from './converters';
import { getLatestInsightTime, findMetricValue, findInsightValue } from './extractors';
import { getResultActionTypes } from './optimizationGoalMap';

/**
 * ActionValue 배열에서 ROAS 값 추출
 * purchaseRoas, webSitePurchaseRoas 등이 배열 형태로 오므로 첫 번째 값 반환
 */
function extractRoasValue(roasArray?: ActionValue[]): number {
  if (!roasArray || roasArray.length === 0) return 0;
  return roasArray[0]?.value || 0;
}

/**
 * actions 배열에서 총 결과 수 추출
 * allowedActionTypes가 있으면 해당 action_type만 필터링, 없으면 전체 합산
 */
function extractTotalResults(actions?: ActionValue[], allowedActionTypes?: string[]): number {
  if (!actions || actions.length === 0) return 0;
  const filtered = allowedActionTypes
    ? actions.filter(a => allowedActionTypes.includes(a.action_type))
    : actions;
  return filtered.reduce((sum, action) => sum + (action.value || 0), 0);
}

/**
 * costPerActionType에서 가중 평균 결과당 비용 추출
 * actions와 매칭하여 (cost * count) / total_count 계산
 * allowedActionTypes가 있으면 해당 action_type만 필터링
 */
function extractCostPerResult(costPerActionType?: ActionValue[], actions?: ActionValue[], allowedActionTypes?: string[]): number {
  if (!costPerActionType || costPerActionType.length === 0) return 0;
  if (!actions || actions.length === 0) return 0;

  // allowedActionTypes가 있으면 해당 action_type만 필터링
  const filteredActions = allowedActionTypes
    ? actions.filter(a => allowedActionTypes.includes(a.action_type))
    : actions;
  const filteredCosts = allowedActionTypes
    ? costPerActionType.filter(a => allowedActionTypes.includes(a.action_type))
    : costPerActionType;

  // action_type을 키로 하는 맵 생성 (결과 수 조회용)
  const actionsMap = new Map<string, number>();
  for (const action of filteredActions) {
    actionsMap.set(action.action_type, action.value || 0);
  }

  // 가중 평균 계산: Σ(cost × count) / Σ(count)
  let totalWeightedCost = 0;
  let totalCount = 0;

  for (const costItem of filteredCosts) {
    const count = actionsMap.get(costItem.action_type) || 0;
    if (count > 0) {
      totalWeightedCost += (costItem.value || 0) * count;
      totalCount += count;
    }
  }

  return totalCount > 0 ? totalWeightedCost / totalCount : 0;
}

// 1. 프로필 인사이트 변환
// period 파라미터로 기간별 데이터 필터링 지원
export function mapToProfileInsight(
  insights: DashMemberInsight[],
  followers: DashFollower[],
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
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

  // 일별 인사이트에서 날짜 추출
  const dayInsights = insights.filter(i => i.period === 'day');
  const uniqueDates = [...new Set(dayInsights.map(i => i.time.split('T')[0]))].sort().reverse();

  // 기간별 날짜 범위 계산
  const latestDate = uniqueDates[0];
  const baseDate = latestDate ? new Date(latestDate + 'T12:00:00') : new Date();
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRangeForPeriod(period, baseDate, customRange);

  // 현재 기간 범위 내 인사이트 필터링 (startDate ~ endDate 전체)
  const currentInsights = dayInsights.filter(i => {
    const date = i.time.split('T')[0];
    return date >= startDate && date <= endDate;
  });

  // 이전 기간 범위 내 인사이트 필터링 (prevStartDate ~ prevEndDate 전체)
  const prevInsights = dayInsights.filter(i => {
    const date = i.time.split('T')[0];
    return date >= prevStartDate && date <= prevEndDate;
  });

  // 지표별 합산 헬퍼 함수
  const sumMetric = (insights: DashMemberInsight[], metricName: string): number => {
    return insights
      .filter(i => i.metricName === metricName)
      .reduce((sum, i) => sum + (i.value || 0), 0);
  };

  // 현재 기간 데이터 합산
  const reach = sumMetric(currentInsights, 'reach');
  const impressions = sumMetric(currentInsights, 'views');
  const profileViews = sumMetric(currentInsights, 'profile_views');
  const websiteClicks = sumMetric(currentInsights, 'website_clicks');
  const totalInteractions = sumMetric(currentInsights, 'total_interactions');

  // 이전 기간 데이터 합산
  const yesterdayReach = sumMetric(prevInsights, 'reach');
  const yesterdayImpressions = sumMetric(prevInsights, 'views');
  const yesterdayProfileViews = sumMetric(prevInsights, 'profile_views');
  const yesterdayWebsiteClicks = sumMetric(prevInsights, 'website_clicks');
  const yesterdayTotalInteractions = sumMetric(prevInsights, 'total_interactions');

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
// period 파라미터로 기간별 데이터 집계 지원
export function mapToDailyProfileData(
  followers: DashFollower[],
  insights: DashMemberInsight[],
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
): DailyProfileData[] {
  if (followers.length === 0) {
    return [];
  }

  // 1. 먼저 모든 일별 데이터 생성
  const dailyData = generateDailyProfileData(followers, insights);

  // 2. 기간에 따라 집계
  switch (period) {
    case 'daily':
      return dailyData;
    case 'weekly':
      return aggregateProfileByWeek(dailyData);
    case 'monthly':
      return aggregateProfileByMonth(dailyData);
    case 'custom':
      // 직접설정은 범위 내 일별 데이터 반환
      if (customRange) {
        return dailyData.filter(data => {
          return data.originalDate >= customRange.start && data.originalDate <= customRange.end;
        });
      }
      return dailyData;
    default:
      return dailyData;
  }
}

// 일별 프로필 데이터 생성 (내부 함수)
interface DailyProfileDataWithDate extends DailyProfileData {
  originalDate: string; // YYYY-MM-DD 형식 원본 날짜
}

function generateDailyProfileData(
  followers: DashFollower[],
  insights: DashMemberInsight[]
): DailyProfileDataWithDate[] {
  // 날짜별로 중복 제거 (Map 사용, 최신 데이터 유지)
  const dateMap = new Map<string, DashFollower>();

  for (const follower of followers) {
    const dateStr = follower.time.split('T')[0]; // YYYY-MM-DD
    const existing = dateMap.get(dateStr);

    if (!existing) {
      dateMap.set(dateStr, follower);
    } else {
      if (new Date(follower.time) > new Date(existing.time)) {
        dateMap.set(dateStr, follower);
      }
    }
  }

  // 날짜순 정렬
  const uniqueFollowers = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return uniqueFollowers.map(follower => {
    const dateStr = follower.time.split('T')[0];

    const dayInsights = insights.filter(
      i => i.period === 'day' && i.time.startsWith(dateStr)
    );

    const reach = findMetricValue(dayInsights, 'reach') || 0;
    const impressions = findMetricValue(dayInsights, 'views') || 0;
    const interactions = findMetricValue(dayInsights, 'total_interactions') || 0;
    const engagement = reach > 0 ? (interactions / reach) * 100 : 0;

    return {
      date: formatDateToMMDD(follower.time),
      originalDate: dateStr,
      followers: follower.followersCount,
      reach,
      impressions,
      engagement: parseFloat(engagement.toFixed(1)),
    };
  });
}

// 주간 집계 (ISO 주차 기준)
function aggregateProfileByWeek(dailyData: DailyProfileDataWithDate[]): DailyProfileData[] {
  if (dailyData.length === 0) return [];

  // ISO 주차별로 그룹화
  const weekMap = new Map<string, DailyProfileDataWithDate[]>();

  for (const data of dailyData) {
    const date = new Date(data.originalDate);
    const weekKey = getISOWeekKey(date);
    const existing = weekMap.get(weekKey) || [];
    existing.push(data);
    weekMap.set(weekKey, existing);
  }

  // 주차별로 집계
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, weekData]) => {
      // 주의 시작일과 종료일 계산
      const dates = weekData.map(d => d.originalDate).sort();
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      const dateLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}~${endDate.getMonth() + 1}/${endDate.getDate()}`;

      // 마지막 날 팔로워 수
      const lastDay = weekData[weekData.length - 1];
      // 합계
      const totalReach = weekData.reduce((sum, d) => sum + d.reach, 0);
      const totalImpressions = weekData.reduce((sum, d) => sum + d.impressions, 0);
      // 평균 참여율
      const avgEngagement = weekData.reduce((sum, d) => sum + d.engagement, 0) / weekData.length;

      return {
        date: dateLabel,
        followers: lastDay.followers,
        reach: totalReach,
        impressions: totalImpressions,
        engagement: parseFloat(avgEngagement.toFixed(1)),
      };
    });
}

// 월간 집계
function aggregateProfileByMonth(dailyData: DailyProfileDataWithDate[]): DailyProfileData[] {
  if (dailyData.length === 0) return [];

  // 년-월별로 그룹화
  const monthMap = new Map<string, DailyProfileDataWithDate[]>();

  for (const data of dailyData) {
    const monthKey = data.originalDate.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(monthKey) || [];
    existing.push(data);
    monthMap.set(monthKey, existing);
  }

  // 월별로 집계
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthData]) => {
      // 마지막 날 팔로워 수
      const lastDay = monthData[monthData.length - 1];
      // 합계
      const totalReach = monthData.reduce((sum, d) => sum + d.reach, 0);
      const totalImpressions = monthData.reduce((sum, d) => sum + d.impressions, 0);
      // 평균 참여율
      const avgEngagement = monthData.reduce((sum, d) => sum + d.engagement, 0) / monthData.length;

      return {
        date: monthKey, // "2024-01" 형식
        followers: lastDay.followers,
        reach: totalReach,
        impressions: totalImpressions,
        engagement: parseFloat(avgEngagement.toFixed(1)),
      };
    });
}

// ISO 주차 키 생성 (YYYY-Wxx 형식)
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
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
      permalink: dashMedia.permalink,  // 인스타그램 피드 바로가기 URL
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
      results: 0,
      resultsGrowth: 0,
      costPerResult: 0,
      costPerResultGrowth: 0,
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
  const ctr = calculateCtr(clicks, impressions);
  const cpc = calculateCpc(spend, clicks);
  const frequency = calculateFrequency(impressions, reach);

  // 오늘 ROAS 가중 평균 계산
  const todayRoasWeighted = todayInsights.reduce((sum, i) => sum + extractRoasValue(i.purchaseRoas) * i.spend, 0);
  const roas = spend > 0 ? todayRoasWeighted / spend : 0;

  // 오늘 결과 수 및 결과당 비용 계산
  const results = todayInsights.reduce((sum, i) => sum + extractTotalResults(i.actions), 0);
  const todayCostPerResultWeighted = todayInsights.reduce((sum, i) => {
    const r = extractTotalResults(i.actions);
    const cpr = extractCostPerResult(i.costPerActionType, i.actions);
    return sum + cpr * r;
  }, 0);
  const costPerResult = results > 0 ? todayCostPerResultWeighted / results : 0;

  // 어제 합계
  const yesterdayInsights = dateMap.get(yesterdayDate) || [];
  const yesterdaySpend = yesterdayInsights.reduce((sum, i) => sum + i.spend, 0);
  const yesterdayImpressions = yesterdayInsights.reduce((sum, i) => sum + i.impressions, 0);
  const yesterdayClicks = yesterdayInsights.reduce((sum, i) => sum + i.clicks, 0);
  const yesterdayReach = yesterdayInsights.reduce((sum, i) => sum + i.reach, 0);
  const yesterdayCtr = calculateCtr(yesterdayClicks, yesterdayImpressions);
  const yesterdayCpc = calculateCpc(yesterdaySpend, yesterdayClicks);

  // 어제 ROAS 가중 평균 계산
  const yesterdayRoasWeighted = yesterdayInsights.reduce((sum, i) => sum + extractRoasValue(i.purchaseRoas) * i.spend, 0);
  const yesterdayRoas = yesterdaySpend > 0 ? yesterdayRoasWeighted / yesterdaySpend : 0;

  // 어제 결과 수 및 결과당 비용 계산
  const yesterdayResults = yesterdayInsights.reduce((sum, i) => sum + extractTotalResults(i.actions), 0);
  const yesterdayCostPerResultWeighted = yesterdayInsights.reduce((sum, i) => {
    const r = extractTotalResults(i.actions);
    const cpr = extractCostPerResult(i.costPerActionType, i.actions);
    return sum + cpr * r;
  }, 0);
  const yesterdayCostPerResult = yesterdayResults > 0 ? yesterdayCostPerResultWeighted / yesterdayResults : 0;

  return {
    spend,
    spendGrowth: calculateGrowth(spend, yesterdaySpend),
    roas,
    roasGrowth: calculateGrowth(roas, yesterdayRoas),
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
    results,
    resultsGrowth: calculateGrowth(results, yesterdayResults),
    costPerResult,
    costPerResultGrowth: calculateGrowth(costPerResult, yesterdayCostPerResult),
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
    roasWeighted: number;
    results: number;
    costPerResultWeighted: number;
  }>();

  for (const insight of allInsights) {
    const dateStr = insight.time.split('T')[0];
    const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0, roasWeighted: 0, results: 0, costPerResultWeighted: 0 };
    const r = extractTotalResults(insight.actions);
    dateMap.set(dateStr, {
      spend: existing.spend + insight.spend,
      impressions: existing.impressions + insight.impressions,
      clicks: existing.clicks + insight.clicks,
      reach: existing.reach + insight.reach,
      roasWeighted: existing.roasWeighted + extractRoasValue(insight.purchaseRoas) * insight.spend,
      results: existing.results + r,
      costPerResultWeighted: existing.costPerResultWeighted + extractCostPerResult(insight.costPerActionType, insight.actions) * r,
    });
  }

  // 날짜순 정렬 후 변환 (최근 14일)
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([dateStr, data]) => ({
      date: formatDateToMMDD(dateStr + 'T00:00:00'),
      spend: data.spend,
      roas: data.spend > 0 ? data.roasWeighted / data.spend : 0,
      clicks: data.clicks,
      impressions: data.impressions,
      conversions: 0, // API에서 제공하지 않음
      ctr: calculateCtr(data.clicks, data.impressions),
      cpc: calculateCpc(data.spend, data.clicks),
      results: data.results,
      costPerResult: data.results > 0 ? data.costPerResultWeighted / data.results : 0,
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

    // ROAS 가중 평균 계산
    const roasWeighted = records.reduce((sum, r) => sum + extractRoasValue(r.insight.purchaseRoas) * r.insight.spend, 0);
    const roas = totalSpend > 0 ? roasWeighted / totalSpend : 0;

    // 최초 기록일 추출 (가장 빠른 time 값)
    const earliestTime = records.reduce((min, r) =>
      r.insight.time < min ? r.insight.time : min,
      records[0].insight.time
    );

    return {
      id: adId,
      name: detail.adName,
      spend: totalSpend,
      roas,
      reach: totalReach,
      clicks: totalClicks,
      ctr: calculateCtr(totalClicks, totalImpressions),
      cpc: calculateCpc(totalSpend, totalClicks),
      status: mapAdStatus(detail.status),
      startDate: earliestTime,
    };
  });
}

// 8. 캠페인 계층 구조 변환 (캠페인 → 광고세트 → 광고 성과 합산)
export function mapToCampaignHierarchy(
  accountsWithInsights: DashAdAccountWithInsights[]
): CampaignHierarchy[] {
  // 모든 광고세트 추출
  const allAdSets: DashAdSet[] = accountsWithInsights
    .flatMap(acc => acc.dashAdSets || []);

  // 모든 광고 추출
  const allAds = accountsWithInsights.flatMap(acc => acc.dashAdDetailWithInsights || []);

  if (allAdSets.length === 0) {
    return [];
  }

  // 광고를 adsetId로 그룹핑하여 성과 합산
  const adSetPerformanceMap = new Map<string, {
    spend: number;
    reach: number;
    clicks: number;
    impressions: number;
    roasWeighted: number;
    results: number;
    costPerResultWeighted: number;
  }>();

  for (const ad of allAds) {
    const adsetId = ad.dashAdDetailEntity.adsetId;
    const insight = ad.dashAdAccountInsight;
    const existing = adSetPerformanceMap.get(adsetId) || {
      spend: 0,
      reach: 0,
      clicks: 0,
      impressions: 0,
      roasWeighted: 0,
      results: 0,
      costPerResultWeighted: 0,
    };
    const r = extractTotalResults(insight.actions);
    adSetPerformanceMap.set(adsetId, {
      spend: existing.spend + insight.spend,
      reach: existing.reach + insight.reach,
      clicks: existing.clicks + insight.clicks,
      impressions: existing.impressions + insight.impressions,
      roasWeighted: existing.roasWeighted + extractRoasValue(insight.purchaseRoas) * insight.spend,
      results: existing.results + r,
      costPerResultWeighted: existing.costPerResultWeighted + extractCostPerResult(insight.costPerActionType, insight.actions) * r,
    });
  }

  // 캠페인별로 광고세트 그룹핑
  const campaignMap = new Map<string, {
    campaignId: string;
    campaignName: string;
    objective: string;
    adSets: DashAdSet[];
  }>();

  for (const adSet of allAdSets) {
    const campaignId = adSet.campaign.campaignId;
    const existing = campaignMap.get(campaignId);

    if (!existing) {
      campaignMap.set(campaignId, {
        campaignId,
        campaignName: adSet.campaign.name,
        objective: adSet.campaign.objective,
        adSets: [adSet],
      });
    } else {
      // 중복 광고세트 제거 (metaAdSetId 기준)
      const alreadyExists = existing.adSets.some(
        s => s.metaAdSetId === adSet.metaAdSetId
      );
      if (!alreadyExists) {
        existing.adSets.push(adSet);
      }
    }
  }

  // CampaignHierarchy 배열로 변환
  return Array.from(campaignMap.values()).map(campaign => {
    // 광고세트별 성과 매핑
    const adSetsWithPerformance: AdSetWithPerformance[] = campaign.adSets.map(adSet => {
      const perf = adSetPerformanceMap.get(adSet.metaAdSetId) || {
        spend: 0,
        reach: 0,
        clicks: 0,
        impressions: 0,
        roasWeighted: 0,
        results: 0,
        costPerResultWeighted: 0,
      };

      return {
        id: adSet.id,
        metaAdSetId: adSet.metaAdSetId,
        name: adSet.name,
        status: adSet.status,
        effectiveStatus: adSet.effectiveStatus,
        dailyBudget: adSet.dailyBudget,
        lifetimeBudget: adSet.lifetimeBudget,
        optimizationGoal: adSet.optimizationGoal,
        bidStrategy: adSet.bidStrategy,
        spend: perf.spend,
        reach: perf.reach,
        clicks: perf.clicks,
        impressions: perf.impressions,
        ctr: calculateCtr(perf.clicks, perf.impressions),
        cpc: calculateCpc(perf.spend, perf.clicks),
        roas: perf.spend > 0 ? perf.roasWeighted / perf.spend : 0,
        results: perf.results,
        costPerResult: perf.results > 0 ? perf.costPerResultWeighted / perf.results : 0,
        ads: [],  // 기존 API에서는 소재 데이터 없음
      };
    });

    // 캠페인 전체 성과 합산
    const totalSpend = adSetsWithPerformance.reduce((sum, s) => sum + s.spend, 0);
    const totalReach = adSetsWithPerformance.reduce((sum, s) => sum + s.reach, 0);
    const totalClicks = adSetsWithPerformance.reduce((sum, s) => sum + s.clicks, 0);
    const totalImpressions = adSetsWithPerformance.reduce((sum, s) => sum + s.impressions, 0);
    const totalResults = adSetsWithPerformance.reduce((sum, s) => sum + s.results, 0);

    // 캠페인 ROAS 가중 평균 계산
    const totalRoasWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.roas * s.spend, 0);
    const campaignRoas = totalSpend > 0 ? totalRoasWeighted / totalSpend : 0;
    // 캠페인 결과당 비용 가중 평균 계산
    const totalCostPerResultWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.costPerResult * s.results, 0);
    const campaignCostPerResult = totalResults > 0 ? totalCostPerResultWeighted / totalResults : 0;

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      objective: campaign.objective,
      createdTime: '',  // 기존 API에서는 생성일 정보 없음
      status: '',       // 기존 API에서는 상태 정보 없음
      effectiveStatus: '',
      totalSpend,
      totalReach,
      totalClicks,
      totalImpressions,
      ctr: calculateCtr(totalClicks, totalImpressions),
      cpc: calculateCpc(totalSpend, totalClicks),
      roas: campaignRoas,
      totalResults,
      costPerResult: campaignCostPerResult,
      adSets: adSetsWithPerformance,
    };
  });
}

// ============================================
// 신규 캠페인 상세 API 응답 변환 함수들
// ============================================

// 9. 캠페인 상세 응답에서 광고 성과 변환
// 캠페인 계층 함수(mapToCampaignHierarchyFromCampaignDetail)와 동일한 3단계 중복 제거 적용
// period 파라미터로 기간별 데이터 필터링 지원
export function mapToAdPerformanceFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[],
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
): AdPerformance {
  // 1. 캠페인 중복 제거 (metaId 기준) - 캠페인 계층 함수와 동일
  const campaignMap = new Map<string, DashAdCampaignDetailItem>();
  for (const detail of campaignDetails) {
    const campaignId = detail.dashAdCampaign.metaId;
    const existing = campaignMap.get(campaignId);
    if (!existing) {
      campaignMap.set(campaignId, detail);
    } else {
      // 광고세트 병합
      const mergedAdSets = [...(existing.adDetailResponseObjs || [])];
      for (const newAdSet of (detail.adDetailResponseObjs || [])) {
        const alreadyExists = mergedAdSets.some(
          s => s.dashAdSet.metaAdSetId === newAdSet.dashAdSet.metaAdSetId
        );
        if (!alreadyExists) {
          mergedAdSets.push(newAdSet);
        }
      }
      campaignMap.set(campaignId, { ...detail, adDetailResponseObjs: mergedAdSets });
    }
  }

  // 2. 데이터에서 모든 날짜 추출하여 가장 최근 날짜 찾기
  const allDates: string[] = [];
  for (const detail of campaignMap.values()) {
    for (const adDetailObj of (detail.adDetailResponseObjs || [])) {
      for (const child of (adDetailObj.adSetChildObjs || [])) {
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        if (dateStr) allDates.push(dateStr);
      }
    }
  }

  // 가장 최근 데이터 날짜를 기준으로 사용 (동기화 지연 대응)
  const latestDate = getLatestDateFromData(allDates);
  const baseDate = latestDate ? new Date(latestDate + 'T12:00:00') : new Date();

  // 기간별 날짜 범위 계산
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRangeForPeriod(
    period,
    baseDate,
    customRange
  );

  // 3. 중복 제거된 캠페인에서 인사이트 추출 (광고세트/소재 중복 제거 포함)
  let currentSpend = 0, currentReach = 0, currentClicks = 0, currentImpressions = 0, currentRoasWeighted = 0;
  let currentResults = 0, currentCostPerResultWeighted = 0;
  let prevSpend = 0, prevReach = 0, prevClicks = 0, prevImpressions = 0, prevRoasWeighted = 0;
  let prevResults = 0, prevCostPerResultWeighted = 0;

  for (const detail of campaignMap.values()) {
    const adDetailObjs = detail.adDetailResponseObjs || [];

    // 광고세트 중복 제거 (metaAdSetId 기준)
    const adSetMap = new Map<string, typeof adDetailObjs[0]>();
    for (const adDetailObj of adDetailObjs) {
      const metaAdSetId = adDetailObj.dashAdSet.metaAdSetId;
      const existing = adSetMap.get(metaAdSetId);
      if (!existing) {
        adSetMap.set(metaAdSetId, adDetailObj);
      } else {
        // 소재 병합
        const mergedChildObjs = [...(existing.adSetChildObjs || [])];
        for (const newChild of (adDetailObj.adSetChildObjs || [])) {
          const alreadyExists = mergedChildObjs.some(
            c => c.dashAdDetailEntity?.adId === newChild.dashAdDetailEntity?.adId
          );
          if (!alreadyExists) {
            mergedChildObjs.push(newChild);
          }
        }
        adSetMap.set(metaAdSetId, { ...adDetailObj, adSetChildObjs: mergedChildObjs });
      }
    }

    // 각 광고세트의 소재에서 기간별 데이터 합산
    for (const adDetailObj of adSetMap.values()) {
      const allowedActionTypes = getResultActionTypes(adDetailObj.dashAdSet.optimizationGoal);
      const childObjs = adDetailObj.adSetChildObjs || [];

      // 소재 중복 제거 (adId + 날짜 기준 - 같은 adId라도 날짜가 다르면 모두 유지)
      const adMap = new Map<string, typeof childObjs[0]>();
      for (const child of childObjs) {
        const adId = child.dashAdDetailEntity?.adId;
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        const key = `${adId}_${dateStr}`;
        if (adId && dateStr && !adMap.has(key)) {
          adMap.set(key, child);
        }
      }

      // 중복 제거된 소재의 인사이트 합산
      for (const child of adMap.values()) {
        const insight = child.dashAdAccountInsight;
        if (!insight) continue;

        const insightDate = insight.time.split('T')[0];

        // 현재 기간 범위 내 데이터
        if (insightDate >= startDate && insightDate <= endDate) {
          currentSpend += insight.spend || 0;
          currentReach += insight.reach || 0;
          currentClicks += insight.clicks || 0;
          currentImpressions += insight.impressions || 0;
          currentRoasWeighted += extractRoasValue(insight.purchaseRoas) * (insight.spend || 0);
          // 결과 수 및 결과당 비용 합산
          const r = extractTotalResults(insight.actions, allowedActionTypes);
          currentResults += r;
          currentCostPerResultWeighted += extractCostPerResult(insight.costPerActionType, insight.actions, allowedActionTypes) * r;
        }
        // 이전 기간 범위 내 데이터
        else if (insightDate >= prevStartDate && insightDate <= prevEndDate) {
          prevSpend += insight.spend || 0;
          prevReach += insight.reach || 0;
          prevClicks += insight.clicks || 0;
          prevImpressions += insight.impressions || 0;
          prevRoasWeighted += extractRoasValue(insight.purchaseRoas) * (insight.spend || 0);
          // 결과 수 및 결과당 비용 합산
          const r = extractTotalResults(insight.actions, allowedActionTypes);
          prevResults += r;
          prevCostPerResultWeighted += extractCostPerResult(insight.costPerActionType, insight.actions, allowedActionTypes) * r;
        }
      }
    }
  }

  // KPI 계산
  const ctr = calculateCtr(currentClicks, currentImpressions);
  const cpc = calculateCpc(currentSpend, currentClicks);
  const frequency = calculateFrequency(currentImpressions, currentReach);
  const roas = currentSpend > 0 ? currentRoasWeighted / currentSpend : 0;
  const costPerResult = currentResults > 0 ? currentCostPerResultWeighted / currentResults : 0;

  const prevCtr = calculateCtr(prevClicks, prevImpressions);
  const prevCpc = calculateCpc(prevSpend, prevClicks);
  const prevRoas = prevSpend > 0 ? prevRoasWeighted / prevSpend : 0;
  const prevCostPerResult = prevResults > 0 ? prevCostPerResultWeighted / prevResults : 0;

  return {
    spend: currentSpend,
    spendGrowth: calculateGrowth(currentSpend, prevSpend),
    roas,
    roasGrowth: calculateGrowth(roas, prevRoas),
    cpc,
    cpcGrowth: calculateGrowth(cpc, prevCpc),
    ctr,
    ctrGrowth: calculateGrowth(ctr, prevCtr),
    impressions: currentImpressions,
    reach: currentReach,
    reachGrowth: calculateGrowth(currentReach, prevReach),
    clicks: currentClicks,
    clicksGrowth: calculateGrowth(currentClicks, prevClicks),
    conversions: 0,
    frequency,
    results: currentResults,
    resultsGrowth: calculateGrowth(currentResults, prevResults),
    costPerResult,
    costPerResultGrowth: calculateGrowth(costPerResult, prevCostPerResult),
  };
}

// 10. 캠페인 상세 응답에서 일별 광고 데이터 변환
// KPI 카드 함수(mapToAdPerformanceFromCampaignDetail)와 동일한 3단계 중복 제거 적용
// 기간 파라미터로 기간별 데이터 집계 지원
export function mapToDailyAdDataFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[],
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
): DailyAdData[] {
  // 1. 먼저 모든 일별 데이터 생성
  const dailyData = generateDailyAdData(campaignDetails);

  // 2. 기간에 따라 집계
  switch (period) {
    case 'daily':
      return dailyData;
    case 'weekly':
      return aggregateAdByWeek(dailyData);
    case 'monthly':
      return aggregateAdByMonth(dailyData);
    case 'custom':
      // 직접설정은 범위 내 일별 데이터 반환
      if (customRange) {
        return dailyData.filter(data => {
          return data.originalDate >= customRange.start && data.originalDate <= customRange.end;
        });
      }
      return dailyData;
    default:
      return dailyData;
  }
}

// 일별 광고 데이터 생성 (내부 함수)
interface DailyAdDataWithDate extends DailyAdData {
  originalDate: string; // YYYY-MM-DD 형식 원본 날짜
}

function generateDailyAdData(
  campaignDetails: DashAdCampaignDetailItem[]
): DailyAdDataWithDate[] {
  // 1. 캠페인 중복 제거 (metaId 기준)
  const campaignMap = new Map<string, DashAdCampaignDetailItem>();
  for (const detail of campaignDetails) {
    const campaignId = detail.dashAdCampaign.metaId;
    const existing = campaignMap.get(campaignId);
    if (!existing) {
      campaignMap.set(campaignId, detail);
    } else {
      const mergedAdSets = [...(existing.adDetailResponseObjs || [])];
      for (const newAdSet of (detail.adDetailResponseObjs || [])) {
        const alreadyExists = mergedAdSets.some(
          s => s.dashAdSet.metaAdSetId === newAdSet.dashAdSet.metaAdSetId
        );
        if (!alreadyExists) {
          mergedAdSets.push(newAdSet);
        }
      }
      campaignMap.set(campaignId, { ...detail, adDetailResponseObjs: mergedAdSets });
    }
  }

  // 2. 날짜별 합계 (중복 제거된 데이터 사용)
  const dateMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; roasWeighted: number; results: number; costPerResultWeighted: number }>();

  for (const detail of campaignMap.values()) {
    const adSetMap = new Map<string, typeof detail.adDetailResponseObjs[0]>();
    for (const adDetailObj of (detail.adDetailResponseObjs || [])) {
      const metaAdSetId = adDetailObj.dashAdSet.metaAdSetId;
      const existing = adSetMap.get(metaAdSetId);
      if (!existing) {
        adSetMap.set(metaAdSetId, adDetailObj);
      } else {
        const mergedChildObjs = [...(existing.adSetChildObjs || [])];
        for (const newChild of (adDetailObj.adSetChildObjs || [])) {
          const alreadyExists = mergedChildObjs.some(
            c => c.dashAdDetailEntity?.adId === newChild.dashAdDetailEntity?.adId
          );
          if (!alreadyExists) {
            mergedChildObjs.push(newChild);
          }
        }
        adSetMap.set(metaAdSetId, { ...adDetailObj, adSetChildObjs: mergedChildObjs });
      }
    }

    for (const adDetailObj of adSetMap.values()) {
      const allowedActionTypes = getResultActionTypes(adDetailObj.dashAdSet.optimizationGoal);
      const adMap = new Map<string, typeof adDetailObj.adSetChildObjs[0]>();
      for (const child of (adDetailObj.adSetChildObjs || [])) {
        const adId = child.dashAdDetailEntity?.adId;
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        const key = `${adId}_${dateStr}`;
        if (adId && dateStr && !adMap.has(key)) {
          adMap.set(key, child);
        }
      }

      for (const child of adMap.values()) {
        const insight = child.dashAdAccountInsight;
        if (!insight) continue;

        const dateStr = insight.time.split('T')[0];
        const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0, roasWeighted: 0, results: 0, costPerResultWeighted: 0 };
        const r = extractTotalResults(insight.actions, allowedActionTypes);
        dateMap.set(dateStr, {
          spend: existing.spend + insight.spend,
          impressions: existing.impressions + insight.impressions,
          clicks: existing.clicks + insight.clicks,
          reach: existing.reach + insight.reach,
          roasWeighted: existing.roasWeighted + extractRoasValue(insight.purchaseRoas) * insight.spend,
          results: existing.results + r,
          costPerResultWeighted: existing.costPerResultWeighted + extractCostPerResult(insight.costPerActionType, insight.actions, allowedActionTypes) * r,
        });
      }
    }
  }

  if (dateMap.size === 0) {
    return [];
  }

  // 3. 날짜순 정렬 후 변환
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, data]) => ({
      date: formatDateToMMDD(dateStr + 'T00:00:00'),
      originalDate: dateStr,
      spend: data.spend,
      roas: data.spend > 0 ? data.roasWeighted / data.spend : 0,
      clicks: data.clicks,
      impressions: data.impressions,
      conversions: 0,
      ctr: calculateCtr(data.clicks, data.impressions),
      cpc: calculateCpc(data.spend, data.clicks),
      results: data.results,
      costPerResult: data.results > 0 ? data.costPerResultWeighted / data.results : 0,
    }));
}

// 주간 집계 (ISO 주차 기준)
function aggregateAdByWeek(dailyData: DailyAdDataWithDate[]): DailyAdData[] {
  if (dailyData.length === 0) return [];

  const weekMap = new Map<string, DailyAdDataWithDate[]>();

  for (const data of dailyData) {
    const date = new Date(data.originalDate);
    const weekKey = getISOWeekKey(date);
    const existing = weekMap.get(weekKey) || [];
    existing.push(data);
    weekMap.set(weekKey, existing);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, weekData]) => {
      const dates = weekData.map(d => d.originalDate).sort();
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      const dateLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}~${endDate.getMonth() + 1}/${endDate.getDate()}`;

      // 합계
      const totalSpend = weekData.reduce((sum, d) => sum + d.spend, 0);
      const totalClicks = weekData.reduce((sum, d) => sum + d.clicks, 0);
      const totalImpressions = weekData.reduce((sum, d) => sum + d.impressions, 0);
      const totalResults = weekData.reduce((sum, d) => sum + d.results, 0);
      // 가중평균 ROAS
      const roasWeighted = weekData.reduce((sum, d) => sum + d.roas * d.spend, 0);
      const avgRoas = totalSpend > 0 ? roasWeighted / totalSpend : 0;
      // 가중평균 결과당 비용
      const costPerResultWeighted = weekData.reduce((sum, d) => sum + d.costPerResult * d.results, 0);
      const avgCostPerResult = totalResults > 0 ? costPerResultWeighted / totalResults : 0;

      return {
        date: dateLabel,
        spend: totalSpend,
        roas: avgRoas,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: 0,
        ctr: calculateCtr(totalClicks, totalImpressions),
        cpc: calculateCpc(totalSpend, totalClicks),
        results: totalResults,
        costPerResult: avgCostPerResult,
      };
    });
}

// 월간 집계
function aggregateAdByMonth(dailyData: DailyAdDataWithDate[]): DailyAdData[] {
  if (dailyData.length === 0) return [];

  const monthMap = new Map<string, DailyAdDataWithDate[]>();

  for (const data of dailyData) {
    const monthKey = data.originalDate.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(monthKey) || [];
    existing.push(data);
    monthMap.set(monthKey, existing);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthData]) => {
      // 합계
      const totalSpend = monthData.reduce((sum, d) => sum + d.spend, 0);
      const totalClicks = monthData.reduce((sum, d) => sum + d.clicks, 0);
      const totalImpressions = monthData.reduce((sum, d) => sum + d.impressions, 0);
      const totalResults = monthData.reduce((sum, d) => sum + d.results, 0);
      // 가중평균 ROAS
      const roasWeighted = monthData.reduce((sum, d) => sum + d.roas * d.spend, 0);
      const avgRoas = totalSpend > 0 ? roasWeighted / totalSpend : 0;
      // 가중평균 결과당 비용
      const costPerResultWeighted = monthData.reduce((sum, d) => sum + d.costPerResult * d.results, 0);
      const avgCostPerResult = totalResults > 0 ? costPerResultWeighted / totalResults : 0;

      return {
        date: monthKey, // "2024-01" 형식
        spend: totalSpend,
        roas: avgRoas,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: 0,
        ctr: calculateCtr(totalClicks, totalImpressions),
        cpc: calculateCpc(totalSpend, totalClicks),
        results: totalResults,
        costPerResult: avgCostPerResult,
      };
    });
}

// 11. 캠페인 상세 응답에서 캠페인 계층 구조 변환
// 기간 파라미터로 기간별 데이터 필터링 지원
export function mapToCampaignHierarchyFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[],
  period: PeriodType = 'daily',
  customRange?: { start: string; end: string }
): CampaignHierarchy[] {
  // campaignId 기준 중복 제거 (Map 사용)
  const campaignMap = new Map<string, DashAdCampaignDetailItem>();

  for (const detail of campaignDetails) {
    // metaId로 중복 제거 (id는 DB 내부 ID라 각 레코드마다 다름)
    const campaignId = detail.dashAdCampaign.metaId;
    const existing = campaignMap.get(campaignId);

    if (!existing) {
      campaignMap.set(campaignId, detail);
    } else {
      // 같은 캠페인이면 광고세트를 병합
      const existingAdSets = existing.adDetailResponseObjs || [];
      const newAdSets = detail.adDetailResponseObjs || [];

      // 광고세트 병합 (metaAdSetId 기준 중복 제거)
      const mergedAdSets = [...existingAdSets];
      for (const newAdSet of newAdSets) {
        const alreadyExists = mergedAdSets.some(
          s => s.dashAdSet.metaAdSetId === newAdSet.dashAdSet.metaAdSetId
        );
        if (!alreadyExists) {
          mergedAdSets.push(newAdSet);
        }
      }

      campaignMap.set(campaignId, {
        ...detail,
        adDetailResponseObjs: mergedAdSets,
      });
    }
  }

  // 데이터에서 모든 날짜 추출하여 가장 최근 날짜 찾기
  const allDates: string[] = [];
  for (const detail of campaignMap.values()) {
    for (const adDetailObj of (detail.adDetailResponseObjs || [])) {
      for (const child of (adDetailObj.adSetChildObjs || [])) {
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        if (dateStr) allDates.push(dateStr);
      }
    }
  }

  // 가장 최근 데이터 날짜를 기준으로 사용 (동기화 지연 대응)
  const latestDate = getLatestDateFromData(allDates);
  const baseDate = latestDate ? new Date(latestDate + 'T12:00:00') : new Date();

  // 기간별 날짜 범위 계산
  const { startDate, endDate } = getDateRangeForPeriod(period, baseDate, customRange);

  // 중복 제거된 캠페인만 변환
  return Array.from(campaignMap.values()).map(detail => {
    const campaign = detail.dashAdCampaign;
    const adDetailObjs = detail.adDetailResponseObjs || [];

    // 광고세트 중복 제거 (metaAdSetId 기준)
    const adSetMap = new Map<string, typeof adDetailObjs[0]>();
    for (const adDetailObj of adDetailObjs) {
      const metaAdSetId = adDetailObj.dashAdSet.metaAdSetId;
      const existing = adSetMap.get(metaAdSetId);
      if (!existing) {
        adSetMap.set(metaAdSetId, adDetailObj);
      } else {
        // 같은 광고세트면 소재(childObjs) 병합
        const mergedChildObjs = [...(existing.adSetChildObjs || [])];
        for (const newChild of (adDetailObj.adSetChildObjs || [])) {
          const alreadyExists = mergedChildObjs.some(
            c => c.dashAdDetailEntity?.adId === newChild.dashAdDetailEntity?.adId
          );
          if (!alreadyExists) {
            mergedChildObjs.push(newChild);
          }
        }
        adSetMap.set(metaAdSetId, {
          ...adDetailObj,
          adSetChildObjs: mergedChildObjs,
        });
      }
    }
    const uniqueAdDetailObjs = Array.from(adSetMap.values());

    // 광고세트별 성과 매핑 (중복 제거된 데이터 사용)
    const adSetsWithPerformance: AdSetWithPerformance[] = uniqueAdDetailObjs.map(adDetailObj => {
      const adSet = adDetailObj.dashAdSet;
      const allowedActionTypes = getResultActionTypes(adSet.optimizationGoal);
      const childObjs = adDetailObj.adSetChildObjs || [];

      // 소재별로 기간 내 인사이트를 그룹핑
      const adInsightsMap = new Map<string, { detail: typeof childObjs[0]['dashAdDetailEntity']; insights: typeof childObjs[0]['dashAdAccountInsight'][] }>();
      for (const child of childObjs) {
        const adId = child.dashAdDetailEntity?.adId;
        if (!adId) continue;

        // 기간 필터: 선택한 기간 범위 내 데이터만 포함
        const insightDate = child.dashAdAccountInsight?.time?.split('T')[0];
        if (!insightDate || insightDate < startDate || insightDate > endDate) continue;

        const existing = adInsightsMap.get(adId);
        if (!existing) {
          adInsightsMap.set(adId, {
            detail: child.dashAdDetailEntity,
            insights: child.dashAdAccountInsight ? [child.dashAdAccountInsight] : [],
          });
        } else {
          // 같은 adId의 다른 날짜 인사이트 추가 (중복 날짜 제거)
          if (child.dashAdAccountInsight) {
            const newDate = child.dashAdAccountInsight.time?.split('T')[0];
            const alreadyHasDate = existing.insights.some(i => i.time?.split('T')[0] === newDate);
            if (!alreadyHasDate) {
              existing.insights.push(child.dashAdAccountInsight);
            }
          }
        }
      }

      // 소재(Ad) 목록 매핑 (기간 내 데이터 합산)
      const ads: AdWithPerformance[] = Array.from(adInsightsMap.values()).map(({ detail: adDetail, insights }) => {
        // 기간 내 인사이트 합산
        const adSpend = insights.reduce((sum, i) => sum + (i?.spend || 0), 0);
        const adReach = insights.reduce((sum, i) => sum + (i?.reach || 0), 0);
        const adClicks = insights.reduce((sum, i) => sum + (i?.clicks || 0), 0);
        const adImpressions = insights.reduce((sum, i) => sum + (i?.impressions || 0), 0);
        // ROAS 가중 평균 계산
        const adRoasWeighted = insights.reduce((sum, i) => sum + extractRoasValue(i?.purchaseRoas) * (i?.spend || 0), 0);
        const adRoas = adSpend > 0 ? adRoasWeighted / adSpend : 0;
        // 결과 수 및 결과당 비용 계산
        const adResults = insights.reduce((sum, i) => sum + extractTotalResults(i?.actions, allowedActionTypes), 0);
        const adCostPerResultWeighted = insights.reduce((sum, i) => {
          const r = extractTotalResults(i?.actions, allowedActionTypes);
          return sum + extractCostPerResult(i?.costPerActionType, i?.actions, allowedActionTypes) * r;
        }, 0);
        const adCostPerResult = adResults > 0 ? adCostPerResultWeighted / adResults : 0;

        return {
          id: adDetail?.id || '',
          adId: adDetail?.adId || '',
          adName: adDetail?.adName || '',
          status: adDetail?.status || '',
          effectiveStatus: adDetail?.effectiveStatus || '',
          creativeId: adDetail?.creativeId || '',
          creativeName: adDetail?.creativeName || '',
          thumbnailUrl: adDetail?.thumbnailUrl || '',
          imageUrl: adDetail?.imageUrl || null,
          title: adDetail?.title || null,
          message: adDetail?.message || null,
          spend: adSpend,
          reach: adReach,
          clicks: adClicks,
          impressions: adImpressions,
          ctr: calculateCtr(adClicks, adImpressions),
          cpc: calculateCpc(adSpend, adClicks),
          roas: adRoas,
          results: adResults,
          costPerResult: adCostPerResult,
        };
      });

      // 해당 광고세트의 기간 내 성과 합산 (소재 성과 합산)
      const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
      const totalReach = ads.reduce((sum, ad) => sum + ad.reach, 0);
      const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
      const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
      const totalResults = ads.reduce((sum, ad) => sum + ad.results, 0);

      // 광고세트 ROAS 가중 평균 계산
      const totalRoasWeighted = ads.reduce((sum, ad) => sum + ad.roas * ad.spend, 0);
      const adSetRoas = totalSpend > 0 ? totalRoasWeighted / totalSpend : 0;
      // 광고세트 결과당 비용 가중 평균 계산
      const totalCostPerResultWeighted = ads.reduce((sum, ad) => sum + ad.costPerResult * ad.results, 0);
      const adSetCostPerResult = totalResults > 0 ? totalCostPerResultWeighted / totalResults : 0;

      return {
        id: adSet.id,
        metaAdSetId: adSet.metaAdSetId,
        name: adSet.name,
        status: adSet.status,
        effectiveStatus: adSet.effectiveStatus,
        dailyBudget: adSet.dailyBudget,
        lifetimeBudget: adSet.lifetimeBudget,
        optimizationGoal: adSet.optimizationGoal,
        bidStrategy: adSet.bidStrategy,
        spend: totalSpend,
        reach: totalReach,
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: calculateCtr(totalClicks, totalImpressions),
        cpc: calculateCpc(totalSpend, totalClicks),
        roas: adSetRoas,
        results: totalResults,
        costPerResult: adSetCostPerResult,
        ads,
      };
    });

    // 캠페인 전체 성과 합산
    const totalSpend = adSetsWithPerformance.reduce((sum, s) => sum + s.spend, 0);
    const totalReach = adSetsWithPerformance.reduce((sum, s) => sum + s.reach, 0);
    const totalClicks = adSetsWithPerformance.reduce((sum, s) => sum + s.clicks, 0);
    const totalImpressions = adSetsWithPerformance.reduce((sum, s) => sum + s.impressions, 0);
    const totalResults = adSetsWithPerformance.reduce((sum, s) => sum + s.results, 0);

    // 캠페인 ROAS 가중 평균 계산
    const campaignRoasWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.roas * s.spend, 0);
    const campaignRoas = totalSpend > 0 ? campaignRoasWeighted / totalSpend : 0;
    // 캠페인 결과당 비용 가중 평균 계산
    const campaignCostPerResultWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.costPerResult * s.results, 0);
    const campaignCostPerResult = totalResults > 0 ? campaignCostPerResultWeighted / totalResults : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      objective: campaign.objective,
      createdTime: campaign.createdTime || campaign.startTime || '',
      status: campaign.status || '',
      effectiveStatus: campaign.effectiveStatus || '',
      totalSpend,
      totalReach,
      totalClicks,
      totalImpressions,
      ctr: calculateCtr(totalClicks, totalImpressions),
      cpc: calculateCpc(totalSpend, totalClicks),
      roas: campaignRoas,
      totalResults,
      costPerResult: campaignCostPerResult,
      adSets: adSetsWithPerformance,
    };
  });
}

// 12. 캠페인 상세 응답에서 캠페인별 성과 변환
export function mapToCampaignPerformanceFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[]
): CampaignPerformance[] {
  // 모든 광고 추출
  const allAds = campaignDetails
    .flatMap(detail => detail.adDetailResponseObjs || [])
    .flatMap(adDetailObj => adDetailObj.adSetChildObjs || [])
    .filter(child => child.dashAdDetailEntity && child.dashAdAccountInsight);

  if (allAds.length === 0) {
    return [];
  }

  // adId로 그룹핑
  const adMap = new Map<string, typeof allAds>();

  for (const ad of allAds) {
    const adId = ad.dashAdDetailEntity.adId;
    if (!adMap.has(adId)) adMap.set(adId, []);
    adMap.get(adId)!.push(ad);
  }

  // 광고별 합산
  return Array.from(adMap.entries()).map(([adId, records]) => {
    const detail = records[0].dashAdDetailEntity;
    const totalSpend = records.reduce((sum, r) => sum + r.dashAdAccountInsight.spend, 0);
    const totalReach = records.reduce((sum, r) => sum + r.dashAdAccountInsight.reach, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.dashAdAccountInsight.clicks, 0);
    const totalImpressions = records.reduce((sum, r) => sum + r.dashAdAccountInsight.impressions, 0);

    // ROAS 가중 평균 계산
    const roasWeighted = records.reduce((sum, r) => sum + extractRoasValue(r.dashAdAccountInsight.purchaseRoas) * r.dashAdAccountInsight.spend, 0);
    const roas = totalSpend > 0 ? roasWeighted / totalSpend : 0;

    const earliestTime = records.reduce((min, r) =>
      r.dashAdAccountInsight.time < min ? r.dashAdAccountInsight.time : min,
      records[0].dashAdAccountInsight.time
    );

    return {
      id: adId,
      name: detail.adName,
      spend: totalSpend,
      roas,
      reach: totalReach,
      clicks: totalClicks,
      ctr: calculateCtr(totalClicks, totalImpressions),
      cpc: calculateCpc(totalSpend, totalClicks),
      status: mapAdStatus(detail.status),
      startDate: earliestTime,
    };
  });
}

// ============================================
// 어댑터 함수: 새 API 응답 → 기존 매퍼 형태로 변환
// ============================================

/**
 * 새 API 응답(DashAdAccountWithInsights[])을
 * 기존 매퍼가 기대하는 형태(DashAdCampaignDetailItem[])로 변환
 *
 * 이 어댑터를 통해 기존 `*FromCampaignDetail` 매퍼들을 그대로 사용 가능
 *
 * 참고: API 응답에 dashAdSets가 없으면 dashAdDetailWithInsights에서 직접 추출
 */
export function convertInsightsToCampaignDetail(
  accountsWithInsights: DashAdAccountWithInsights[]
): DashAdCampaignDetailItem[] {
  const result: DashAdCampaignDetailItem[] = [];

  accountsWithInsights.forEach(account => {
    const details = account.dashAdDetailWithInsights || [];

    // 데이터가 없으면 스킵
    if (details.length === 0) {
      return;
    }

    // dashAdDetailWithInsights에서 캠페인ID별로 그룹핑
    const campaignMap = new Map<string, typeof details>();

    details.forEach(detail => {
      const campaignId = detail.dashAdDetailEntity?.campaignId;
      if (!campaignId) return;

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, []);
      }
      campaignMap.get(campaignId)!.push(detail);
    });

    // 각 캠페인별로 DashAdCampaignDetailItem 생성
    campaignMap.forEach((campaignDetails, campaignId) => {
      const firstDetail = campaignDetails[0].dashAdDetailEntity;
      const firstInsight = campaignDetails[0].dashAdAccountInsight;

      // DashAdCampaign 생성 (API에서 캠페인 상세 정보가 없으므로 가용 데이터로 구성)
      const dashAdCampaign: DashAdCampaign = {
        id: campaignId,
        metaId: campaignId,
        dashMemberId: firstDetail.dashMemberId,
        adAccountId: account.dashAdAccount.metaAccountId,
        time: firstInsight.time,
        status: firstDetail.status || 'ACTIVE',
        name: `캠페인 ${campaignId.slice(-6)}`, // 캠페인 이름 없음, ID 일부 사용
        effectiveStatus: firstDetail.effectiveStatus || 'ACTIVE',
        objective: 'OUTCOME_TRAFFIC', // 기본값
        startTime: firstInsight.time,
        createdTime: firstInsight.createdAt || firstInsight.time,
        updatedTime: firstInsight.updatedAt || firstInsight.time,
      };

      // adsetId별로 그룹핑하여 adDetailResponseObjs 구성
      const adSetMap = new Map<string, typeof campaignDetails>();

      campaignDetails.forEach(detail => {
        const adsetId = detail.dashAdDetailEntity?.adsetId;
        if (!adsetId) return;

        if (!adSetMap.has(adsetId)) {
          adSetMap.set(adsetId, []);
        }
        adSetMap.get(adsetId)!.push(detail);
      });

      const adDetailResponseObjs = Array.from(adSetMap.entries()).map(([adsetId, adSetDetails]) => {
        const firstAdSetDetail = adSetDetails[0].dashAdDetailEntity;
        const realAdSet = (account.dashAdSets || []).find(s => s.metaAdSetId === adsetId);

        // 가상의 DashAdSet 생성 (실제 광고세트 정보가 없으므로 가용 데이터로 구성)
        const dashAdSet: DashAdSet = {
          id: adsetId,
          adAccountId: account.dashAdAccount.metaAccountId,
          dashMemberId: firstAdSetDetail.dashMemberId,
          time: adSetDetails[0].dashAdAccountInsight.time,
          metaAdSetId: adsetId,
          name: realAdSet?.name || `광고세트 ${adsetId.slice(-6)}`,
          status: realAdSet?.status || 'ACTIVE',
          effectiveStatus: realAdSet?.effectiveStatus || 'ACTIVE',
          dailyBudget: realAdSet?.dailyBudget || '0',
          lifetimeBudget: realAdSet?.lifetimeBudget || '0',
          billingEvent: realAdSet?.billingEvent || 'IMPRESSIONS',
          optimizationGoal: realAdSet?.optimizationGoal || 'REACH',
          bidStrategy: realAdSet?.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
          startTime: realAdSet?.startTime || adSetDetails[0].dashAdAccountInsight.time,
          createdTime: realAdSet?.createdTime || adSetDetails[0].dashAdAccountInsight.createdAt || adSetDetails[0].dashAdAccountInsight.time,
          updatedTime: realAdSet?.updatedTime || adSetDetails[0].dashAdAccountInsight.updatedAt || adSetDetails[0].dashAdAccountInsight.time,
          campaign: {
            campaignId: campaignId,
            name: dashAdCampaign.name,
            objective: dashAdCampaign.objective,
          },
        };

        const adSetChildObjs = adSetDetails.map(detail => ({
          dashAdDetailEntity: detail.dashAdDetailEntity,
          dashAdAccountInsight: detail.dashAdAccountInsight,
        }));

        return {
          dashAdSet,
          adSetChildObjs,
        };
      });

      result.push({
        dashAdCampaign,
        dashAdAccount: account.dashAdAccount,
        adDetailResponseObjs,
      });
    });
  });

  return result;
}

// 13. 캠페인별 일별 데이터 변환
// 각 캠페인의 일별 성과 추이를 보여주기 위한 함수
export function mapToCampaignDailyData(
  campaignDetails: DashAdCampaignDetailItem[]
): CampaignDailyData[] {
  // 1. 캠페인 중복 제거 (metaId 기준)
  const campaignMap = new Map<string, DashAdCampaignDetailItem>();
  for (const detail of campaignDetails) {
    const campaignId = detail.dashAdCampaign.metaId;
    const existing = campaignMap.get(campaignId);
    if (!existing) {
      campaignMap.set(campaignId, detail);
    } else {
      // 광고세트 병합
      const mergedAdSets = [...(existing.adDetailResponseObjs || [])];
      for (const newAdSet of (detail.adDetailResponseObjs || [])) {
        const alreadyExists = mergedAdSets.some(
          s => s.dashAdSet.metaAdSetId === newAdSet.dashAdSet.metaAdSetId
        );
        if (!alreadyExists) {
          mergedAdSets.push(newAdSet);
        }
      }
      campaignMap.set(campaignId, { ...detail, adDetailResponseObjs: mergedAdSets });
    }
  }

  // 2. 각 캠페인별로 일별 데이터 추출
  const result: CampaignDailyData[] = [];

  for (const [campaignId, detail] of campaignMap.entries()) {
    const campaign = detail.dashAdCampaign;
    const dateMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; roasWeighted: number; results: number; costPerResultWeighted: number }>();

    // 광고세트 중복 제거 후 날짜별 합산
    const adSetMap = new Map<string, typeof detail.adDetailResponseObjs[0]>();
    for (const adDetailObj of (detail.adDetailResponseObjs || [])) {
      const metaAdSetId = adDetailObj.dashAdSet.metaAdSetId;
      const existing = adSetMap.get(metaAdSetId);
      if (!existing) {
        adSetMap.set(metaAdSetId, adDetailObj);
      } else {
        const mergedChildObjs = [...(existing.adSetChildObjs || [])];
        for (const newChild of (adDetailObj.adSetChildObjs || [])) {
          const alreadyExists = mergedChildObjs.some(
            c => c.dashAdDetailEntity?.adId === newChild.dashAdDetailEntity?.adId
          );
          if (!alreadyExists) {
            mergedChildObjs.push(newChild);
          }
        }
        adSetMap.set(metaAdSetId, { ...adDetailObj, adSetChildObjs: mergedChildObjs });
      }
    }

    // 소재 중복 제거 후 날짜별 합산
    for (const adDetailObj of adSetMap.values()) {
      const allowedActionTypes = getResultActionTypes(adDetailObj.dashAdSet.optimizationGoal);
      const adMap = new Map<string, typeof adDetailObj.adSetChildObjs[0]>();
      for (const child of (adDetailObj.adSetChildObjs || [])) {
        const adId = child.dashAdDetailEntity?.adId;
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        const key = `${adId}_${dateStr}`;
        if (adId && dateStr && !adMap.has(key)) {
          adMap.set(key, child);
        }
      }

      for (const child of adMap.values()) {
        const insight = child.dashAdAccountInsight;
        if (!insight) continue;

        const dateStr = insight.time.split('T')[0];
        const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0, roasWeighted: 0, results: 0, costPerResultWeighted: 0 };
        const r = extractTotalResults(insight.actions, allowedActionTypes);
        dateMap.set(dateStr, {
          spend: existing.spend + insight.spend,
          impressions: existing.impressions + insight.impressions,
          clicks: existing.clicks + insight.clicks,
          reach: existing.reach + insight.reach,
          roasWeighted: existing.roasWeighted + extractRoasValue(insight.purchaseRoas) * insight.spend,
          results: existing.results + r,
          costPerResultWeighted: existing.costPerResultWeighted + extractCostPerResult(insight.costPerActionType, insight.actions, allowedActionTypes) * r,
        });
      }
    }

    // 일별 데이터 배열로 변환
    const dailyData: DailyAdData[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, data]) => ({
        date: formatDateToMMDD(dateStr + 'T00:00:00'),
        spend: data.spend,
        roas: data.spend > 0 ? data.roasWeighted / data.spend : 0,
        clicks: data.clicks,
        impressions: data.impressions,
        conversions: 0,
        ctr: calculateCtr(data.clicks, data.impressions),
        cpc: calculateCpc(data.spend, data.clicks),
        results: data.results,
        costPerResult: data.results > 0 ? data.costPerResultWeighted / data.results : 0,
      }));

    // 데이터가 있는 캠페인만 추가
    if (dailyData.length > 0) {
      result.push({
        campaignId,
        campaignName: campaign.name,
        dailyData,
      });
    }
  }

  return result;
}
