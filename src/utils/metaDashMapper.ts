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
  AdSetWithPerformance,
  AdWithPerformance,
} from '../types';
import { calculateCtr, calculateCpc, calculateFrequency, calculateGrowth } from './metrics';
import { getLocalDateString, formatDateToMMDD } from './dates';
import { getCountryName, mapMediaType, mapAdStatus } from './converters';
import { getLatestInsightTime, findMetricValue, findInsightValue } from './extractors';

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

  // 날짜별로 중복 제거 (Map 사용, 최신 데이터 유지)
  const dateMap = new Map<string, DashFollower>();

  for (const follower of followers) {
    const dateStr = follower.time.split('T')[0]; // YYYY-MM-DD
    const existing = dateMap.get(dateStr);

    if (!existing) {
      dateMap.set(dateStr, follower);
    } else {
      // 같은 날짜면 더 최신 시간의 데이터로 업데이트
      if (new Date(follower.time) > new Date(existing.time)) {
        dateMap.set(dateStr, follower);
      }
    }
  }

  // 날짜순 정렬 후 최근 14일만 추출
  const uniqueFollowers = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(-14);

  return uniqueFollowers.map(follower => {
    const dateStr = follower.time.split('T')[0];

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
  const todayRoasWeighted = todayInsights.reduce((sum, i) => sum + (i.roas || 0) * i.spend, 0);
  const roas = spend > 0 ? todayRoasWeighted / spend : 0;

  // 어제 합계
  const yesterdayInsights = dateMap.get(yesterdayDate) || [];
  const yesterdaySpend = yesterdayInsights.reduce((sum, i) => sum + i.spend, 0);
  const yesterdayImpressions = yesterdayInsights.reduce((sum, i) => sum + i.impressions, 0);
  const yesterdayClicks = yesterdayInsights.reduce((sum, i) => sum + i.clicks, 0);
  const yesterdayReach = yesterdayInsights.reduce((sum, i) => sum + i.reach, 0);
  const yesterdayCtr = calculateCtr(yesterdayClicks, yesterdayImpressions);
  const yesterdayCpc = calculateCpc(yesterdaySpend, yesterdayClicks);

  // 어제 ROAS 가중 평균 계산
  const yesterdayRoasWeighted = yesterdayInsights.reduce((sum, i) => sum + (i.roas || 0) * i.spend, 0);
  const yesterdayRoas = yesterdaySpend > 0 ? yesterdayRoasWeighted / yesterdaySpend : 0;

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
  }>();

  for (const insight of allInsights) {
    const dateStr = insight.time.split('T')[0];
    const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0, roasWeighted: 0 };
    dateMap.set(dateStr, {
      spend: existing.spend + insight.spend,
      impressions: existing.impressions + insight.impressions,
      clicks: existing.clicks + insight.clicks,
      reach: existing.reach + insight.reach,
      roasWeighted: existing.roasWeighted + (insight.roas || 0) * insight.spend,
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
    const roasWeighted = records.reduce((sum, r) => sum + (r.insight.roas || 0) * r.insight.spend, 0);
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
    };
    adSetPerformanceMap.set(adsetId, {
      spend: existing.spend + insight.spend,
      reach: existing.reach + insight.reach,
      clicks: existing.clicks + insight.clicks,
      impressions: existing.impressions + insight.impressions,
      roasWeighted: existing.roasWeighted + (insight.roas || 0) * insight.spend,
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
        ads: [],  // 기존 API에서는 소재 데이터 없음
      };
    });

    // 캠페인 전체 성과 합산
    const totalSpend = adSetsWithPerformance.reduce((sum, s) => sum + s.spend, 0);
    const totalReach = adSetsWithPerformance.reduce((sum, s) => sum + s.reach, 0);
    const totalClicks = adSetsWithPerformance.reduce((sum, s) => sum + s.clicks, 0);
    const totalImpressions = adSetsWithPerformance.reduce((sum, s) => sum + s.impressions, 0);

    // 캠페인 ROAS 가중 평균 계산
    const totalRoasWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.roas * s.spend, 0);
    const campaignRoas = totalSpend > 0 ? totalRoasWeighted / totalSpend : 0;

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
      adSets: adSetsWithPerformance,
    };
  });
}

// ============================================
// 신규 캠페인 상세 API 응답 변환 함수들
// ============================================

// 9. 캠페인 상세 응답에서 광고 성과 변환
// 캠페인 계층 함수(mapToCampaignHierarchyFromCampaignDetail)와 동일한 3단계 중복 제거 적용
export function mapToAdPerformanceFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[]
): AdPerformance {
  // 실제 오늘/어제 날짜 계산 (로컬 시간 기준)
  const today = new Date();
  const todayDate = getLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = getLocalDateString(yesterday);

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

  // 2. 중복 제거된 캠페인에서 인사이트 추출 (광고세트/소재 중복 제거 포함)
  let todaySpend = 0, todayReach = 0, todayClicks = 0, todayImpressions = 0, todayRoasWeighted = 0;
  let yesterdaySpend = 0, yesterdayReach = 0, yesterdayClicks = 0, yesterdayImpressions = 0, yesterdayRoasWeighted = 0;

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

    // 각 광고세트의 소재에서 오늘/어제 데이터 합산
    for (const adDetailObj of adSetMap.values()) {
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
        if (insightDate === todayDate) {
          todaySpend += insight.spend || 0;
          todayReach += insight.reach || 0;
          todayClicks += insight.clicks || 0;
          todayImpressions += insight.impressions || 0;
          todayRoasWeighted += (insight.roas || 0) * (insight.spend || 0);
        } else if (insightDate === yesterdayDate) {
          yesterdaySpend += insight.spend || 0;
          yesterdayReach += insight.reach || 0;
          yesterdayClicks += insight.clicks || 0;
          yesterdayImpressions += insight.impressions || 0;
          yesterdayRoasWeighted += (insight.roas || 0) * (insight.spend || 0);
        }
      }
    }
  }

  // KPI 계산
  const ctr = calculateCtr(todayClicks, todayImpressions);
  const cpc = calculateCpc(todaySpend, todayClicks);
  const frequency = calculateFrequency(todayImpressions, todayReach);
  const roas = todaySpend > 0 ? todayRoasWeighted / todaySpend : 0;

  const yesterdayCtr = calculateCtr(yesterdayClicks, yesterdayImpressions);
  const yesterdayCpc = calculateCpc(yesterdaySpend, yesterdayClicks);
  const yesterdayRoas = yesterdaySpend > 0 ? yesterdayRoasWeighted / yesterdaySpend : 0;

  return {
    spend: todaySpend,
    spendGrowth: calculateGrowth(todaySpend, yesterdaySpend),
    roas,
    roasGrowth: calculateGrowth(roas, yesterdayRoas),
    cpc,
    cpcGrowth: calculateGrowth(cpc, yesterdayCpc),
    ctr,
    ctrGrowth: calculateGrowth(ctr, yesterdayCtr),
    impressions: todayImpressions,
    reach: todayReach,
    reachGrowth: calculateGrowth(todayReach, yesterdayReach),
    clicks: todayClicks,
    clicksGrowth: calculateGrowth(todayClicks, yesterdayClicks),
    conversions: 0,
    frequency,
  };
}

// 10. 캠페인 상세 응답에서 일별 광고 데이터 변환
// KPI 카드 함수(mapToAdPerformanceFromCampaignDetail)와 동일한 3단계 중복 제거 적용
export function mapToDailyAdDataFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[]
): DailyAdData[] {
  // 1. 캠페인 중복 제거 (metaId 기준) - KPI 카드 함수와 동일
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

  // 2. 날짜별 합계 (중복 제거된 데이터 사용)
  const dateMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; roasWeighted: number }>();

  for (const detail of campaignMap.values()) {
    // 광고세트 중복 제거 (metaAdSetId 기준)
    const adSetMap = new Map<string, typeof detail.adDetailResponseObjs[0]>();
    for (const adDetailObj of (detail.adDetailResponseObjs || [])) {
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

    // 소재 중복 제거 후 날짜별 합산
    for (const adDetailObj of adSetMap.values()) {
      // 소재 중복 제거 (adId + date 기준)
      const adMap = new Map<string, typeof adDetailObj.adSetChildObjs[0]>();
      for (const child of (adDetailObj.adSetChildObjs || [])) {
        const adId = child.dashAdDetailEntity?.adId;
        const dateStr = child.dashAdAccountInsight?.time?.split('T')[0];
        const key = `${adId}_${dateStr}`;
        if (adId && dateStr && !adMap.has(key)) {
          adMap.set(key, child);
        }
      }

      // 중복 제거된 인사이트만 합산
      for (const child of adMap.values()) {
        const insight = child.dashAdAccountInsight;
        if (!insight) continue;

        const dateStr = insight.time.split('T')[0];
        const existing = dateMap.get(dateStr) || { spend: 0, impressions: 0, clicks: 0, reach: 0, roasWeighted: 0 };
        dateMap.set(dateStr, {
          spend: existing.spend + insight.spend,
          impressions: existing.impressions + insight.impressions,
          clicks: existing.clicks + insight.clicks,
          reach: existing.reach + insight.reach,
          roasWeighted: existing.roasWeighted + (insight.roas || 0) * insight.spend,
        });
      }
    }
  }

  if (dateMap.size === 0) {
    return [];
  }

  // 3. 날짜순 정렬 후 변환 (최근 14일)
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([dateStr, data]) => ({
      date: formatDateToMMDD(dateStr + 'T00:00:00'),
      spend: data.spend,
      roas: data.spend > 0 ? data.roasWeighted / data.spend : 0,
      clicks: data.clicks,
      impressions: data.impressions,
      conversions: 0,
      ctr: calculateCtr(data.clicks, data.impressions),
      cpc: calculateCpc(data.spend, data.clicks),
    }));
}

// 11. 캠페인 상세 응답에서 캠페인 계층 구조 변환
export function mapToCampaignHierarchyFromCampaignDetail(
  campaignDetails: DashAdCampaignDetailItem[]
): CampaignHierarchy[] {
  // 실제 오늘 날짜 계산 (로컬 시간 기준, KPI 카드와 동일)
  const today = new Date();
  const todayStr = getLocalDateString(today);

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
      const childObjs = adDetailObj.adSetChildObjs || [];

      // 소재 중복 제거 (adId 기준, 오늘 데이터 우선)
      const adMap = new Map<string, typeof childObjs[0]>();
      for (const child of childObjs) {
        const adId = child.dashAdDetailEntity?.adId;
        if (!adId) continue;

        const existingChild = adMap.get(adId);
        if (!existingChild) {
          adMap.set(adId, child);
        } else {
          // 기존 데이터가 오늘이 아니고, 새 데이터가 오늘이면 교체
          const existingDate = existingChild.dashAdAccountInsight?.time?.split('T')[0];
          const newDate = child.dashAdAccountInsight?.time?.split('T')[0];
          if (existingDate !== todayStr && newDate === todayStr) {
            adMap.set(adId, child);
          }
        }
      }
      const uniqueChildObjs = Array.from(adMap.values());

      // 소재(Ad) 목록 매핑 (중복 제거된 데이터 사용)
      const ads: AdWithPerformance[] = uniqueChildObjs.map(child => {
        const adDetail = child.dashAdDetailEntity;
        const insight = child.dashAdAccountInsight;

        // 오늘 데이터인지 확인 (KPI 카드와 동일한 기준)
        const insightDate = insight?.time?.split('T')[0];
        const isToday = insightDate === todayStr;

        // 오늘 데이터만 사용 (오늘이 아니면 0)
        const adSpend = isToday ? (insight?.spend || 0) : 0;
        const adReach = isToday ? (insight?.reach || 0) : 0;
        const adClicks = isToday ? (insight?.clicks || 0) : 0;
        const adImpressions = isToday ? (insight?.impressions || 0) : 0;
        const adRoas = isToday ? (insight?.roas || 0) : 0;

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
        };
      });

      // 해당 광고세트의 오늘 광고 성과 합산 (중복 제거된 데이터 사용)
      const totalSpend = uniqueChildObjs.reduce((sum, c) => {
        const insightDate = c.dashAdAccountInsight?.time?.split('T')[0];
        return sum + (insightDate === todayStr ? (c.dashAdAccountInsight?.spend || 0) : 0);
      }, 0);
      const totalReach = uniqueChildObjs.reduce((sum, c) => {
        const insightDate = c.dashAdAccountInsight?.time?.split('T')[0];
        return sum + (insightDate === todayStr ? (c.dashAdAccountInsight?.reach || 0) : 0);
      }, 0);
      const totalClicks = uniqueChildObjs.reduce((sum, c) => {
        const insightDate = c.dashAdAccountInsight?.time?.split('T')[0];
        return sum + (insightDate === todayStr ? (c.dashAdAccountInsight?.clicks || 0) : 0);
      }, 0);
      const totalImpressions = uniqueChildObjs.reduce((sum, c) => {
        const insightDate = c.dashAdAccountInsight?.time?.split('T')[0];
        return sum + (insightDate === todayStr ? (c.dashAdAccountInsight?.impressions || 0) : 0);
      }, 0);

      // 광고세트 ROAS 가중 평균 계산
      const totalRoasWeighted = uniqueChildObjs.reduce((sum, c) => {
        const insightDate = c.dashAdAccountInsight?.time?.split('T')[0];
        if (insightDate !== todayStr) return sum;
        const spend = c.dashAdAccountInsight?.spend || 0;
        const roas = c.dashAdAccountInsight?.roas || 0;
        return sum + roas * spend;
      }, 0);
      const adSetRoas = totalSpend > 0 ? totalRoasWeighted / totalSpend : 0;

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
        ads,
      };
    });

    // 캠페인 전체 성과 합산
    const totalSpend = adSetsWithPerformance.reduce((sum, s) => sum + s.spend, 0);
    const totalReach = adSetsWithPerformance.reduce((sum, s) => sum + s.reach, 0);
    const totalClicks = adSetsWithPerformance.reduce((sum, s) => sum + s.clicks, 0);
    const totalImpressions = adSetsWithPerformance.reduce((sum, s) => sum + s.impressions, 0);

    // 캠페인 ROAS 가중 평균 계산
    const campaignRoasWeighted = adSetsWithPerformance.reduce((sum, s) => sum + s.roas * s.spend, 0);
    const campaignRoas = totalSpend > 0 ? campaignRoasWeighted / totalSpend : 0;

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
    const roasWeighted = records.reduce((sum, r) => sum + (r.dashAdAccountInsight.roas || 0) * r.dashAdAccountInsight.spend, 0);
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
