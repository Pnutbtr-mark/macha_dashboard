import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// 신청자 관리 활성화 계정 목록 (이 계정만 신청자 데이터 로드)
const APPLICANT_ENABLED_ACCOUNTS = ['w365299', 'ehddls5151@', 'sweatif'];
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  MessageCircle,
  Package,
  AlertCircle,
  Image,
  Eye,
  Heart,
  TrendingUp,
  BarChart3,
  Calendar,
  Loader2,
  RefreshCw,
  Users,
  Play,
} from 'lucide-react';
import { getProxiedImageUrl, isInstagramCdnUrl, getInstagramPostImageUrl } from '../../utils/imageProxy';
import { InfoTooltip } from '../common/InfoTooltip';
import { AIAnalysisCard } from '../common/AIAnalysisCard';
import { formatNumber, formatDateTime, formatPercent } from '../../utils/formatters';
import {
  fetchCampaignsWithDetail,
  fetchInfluencerResultList,
  syncCampaignData,
  convertCampaignWithDetailToNotionCampaign,
  type NotionCampaign,
  type CampaignResultDto,
  type CampaignWithDetail,
} from '../../services/notionApi';
import { fetchDashInfluencersWithDetail, participateCampaignInfluencer, fetchCampaignParticipants, updateParticipantStatus, updateParticipantPostUrl } from '../../services/metaDashApi';
import type { DashInfluencerWithDetail, DashCampaignInfluencerParticipate } from '../../types/metaDash';
import type {
  Influencer,
  SeedingItem,
  ContentItem,
  AIAnalysis,
  SeedingStatus,
  SeedingType,
} from '../../types';
import { CampaignSummaryHeader } from '../campaign/CampaignSummaryHeader';
import { ApplicantListTab } from '../campaign/ApplicantListTab';
import { fetchApplicants, type ApplicantDto } from '../../services/notionApi';

interface CampaignTabProps {
  influencers: Influencer[] | null;
  seedingList: SeedingItem[] | null;
  contentList: ContentItem[] | null;
  aiAnalysis: AIAnalysis | null;
  loading: boolean;
}

// 참여 인플루언서 상태 상수 (API 상태값)
const PARTICIPANT_STATUS = {
  WAIT: 'WAIT',     // 대기
  ACTIVE: 'ACTIVE', // 참여
} as const;

// 캠페인 목록 타입 (Notion 데이터와 호환)
interface CampaignListItem {
  id: string;
  name: string;
  category: string;
  campaignType: '협찬' | '유료';
  productType: string;
  participants: number;
  startDate: string;
  endDate: string;
  manager: string;
  status: string; // Notion에서 '진행중', '완료' 등 한국어 상태값이 올 수 있음
}

// ApplicantListTab 컴포넌트를 재사용하여 참여 인플루언서 UI 구현

// Instagram URL에서 shortCode 추출
function extractShortCode(url: string | undefined): string | null {
  if (!url) return null;
  // https://www.instagram.com/p/ABC123/ → ABC123
  // https://www.instagram.com/reel/ABC123/ → ABC123
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// 캠페인 결과에서 최신 time 값 추출
function getLatestTime(results: CampaignResultDto[]): string | null {
  if (!results || results.length === 0) return null;

  const times = results.map(r => r.time).filter(Boolean);
  if (times.length === 0) return null;

  return times.sort((a, b) => b.localeCompare(a))[0];
}

// 최신 time의 데이터만 필터링 (중복 제거)
function filterByLatestTime(results: CampaignResultDto[]): CampaignResultDto[] {
  const latestTime = getLatestTime(results);
  if (!latestTime) return results;

  return results.filter(r => r.time === latestTime);
}

// Instagram 게시물 이미지 컴포넌트 (CDN 만료 대응)
function InstagramPostImage({
  originalUrl,
  shortCode,
  alt,
  className = '',
}: {
  originalUrl: string | null | undefined;
  shortCode: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasFailed(false);

      // 1. 원본 URL이 유효한 경우 시도
      const proxiedUrl = getProxiedImageUrl(originalUrl);
      if (proxiedUrl) {
        setImageSrc(proxiedUrl);
        return;
      }

      // 2. CDN 만료된 경우 → API로 새 URL 가져오기
      if (shortCode && isInstagramCdnUrl(originalUrl)) {
        try {
          const apiUrl = getInstagramPostImageUrl(shortCode);
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.imageUrl) {
              setImageSrc(data.imageUrl);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('게시물 이미지 로딩 실패:', shortCode, error);
        }
      }

      // 3. 실패 시 fallback
      setHasFailed(true);
      setIsLoading(false);
    };

    loadImage();
  }, [originalUrl, shortCode]);

  const handleImageError = async () => {
    // 이미지 로드 실패 시 API fallback 시도
    if (!hasFailed && shortCode) {
      try {
        const apiUrl = getInstagramPostImageUrl(shortCode);
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            setImageSrc(data.imageUrl);
            return;
          }
        }
      } catch (error) {
        console.warn('게시물 이미지 fallback 실패:', shortCode, error);
      }
    }
    setHasFailed(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (hasFailed || !imageSrc) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center`}>
        <span className="text-slate-400 text-xs">이미지 없음</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="w-full h-full bg-slate-200 animate-pulse absolute inset-0 rounded-lg" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
}

// 콘텐츠 카드 컴포넌트 - 이미지 그리드 형태 (인플루언서 모달 스타일)
function ContentCard({ content }: { content: ContentItem }) {
  return (
    <a
      href={content.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square"
    >
      {/* 썸네일 이미지 */}
      <InstagramPostImage
        originalUrl={content.thumbnail}
        shortCode={extractShortCode(content.originalUrl)}
        alt={content.influencerName}
        className="w-full h-full object-cover rounded-lg"
      />

      {/* 릴스/비디오인 경우 Play 아이콘 */}
      {(content.type === 'reel' || content.type === 'video') && (
        <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
          <Play size={12} fill="white" className="text-white" />
        </div>
      )}

      {/* Hover 오버레이 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <div className="text-white text-xs text-center space-y-1">
          {/* 릴스/비디오인 경우 조회수 표시 */}
          {(content.type === 'reel' || content.type === 'video') && (
            <div className="flex items-center justify-center gap-1">
              <Eye size={12} />
              <span>{formatNumber(content.views)}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1">
            <Heart size={12} fill="white" />
            <span>{formatNumber(content.likes)}</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <MessageCircle size={12} fill="white" />
            <span>{formatNumber(content.comments)}</span>
          </div>
          {content.postedAt && (
            <div className="flex items-center justify-center gap-1">
              <Calendar size={12} />
              <span>{new Date(content.postedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

function ContentGallery({ contents }: { contents: ContentItem[] }) {
  const [feedSortBy, setFeedSortBy] = useState<'popular' | 'comments' | 'latest'>('popular');
  const [reelsSortBy, setReelsSortBy] = useState<'views' | 'popular' | 'latest'>('views');

  // 피드/릴스 분류
  const feedContents = useMemo(() => contents.filter(c => c.type === 'image'), [contents]);
  const reelsContents = useMemo(() => contents.filter(c => c.type === 'reel' || c.type === 'video'), [contents]);

  // 피드 정렬
  const sortedFeedContents = useMemo(() => {
    const sorted = [...feedContents];
    switch (feedSortBy) {
      case 'popular':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'comments':
        return sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
      case 'latest':
        return sorted.sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
      default:
        return sorted;
    }
  }, [feedContents, feedSortBy]);

  // 릴스 정렬
  const sortedReelsContents = useMemo(() => {
    const sorted = [...reelsContents];
    switch (reelsSortBy) {
      case 'views':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'popular':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'latest':
        return sorted.sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
      default:
        return sorted;
    }
  }, [reelsContents, reelsSortBy]);

  // 피드 평균 통계
  const feedAvgLikes = feedContents.length > 0
    ? Math.round(feedContents.reduce((s, c) => s + (c.likes || 0), 0) / feedContents.length)
    : 0;
  const feedAvgComments = feedContents.length > 0
    ? Math.round(feedContents.reduce((s, c) => s + (c.comments || 0), 0) / feedContents.length)
    : 0;

  // 릴스 평균 통계
  const reelsAvgViews = reelsContents.length > 0
    ? Math.round(reelsContents.reduce((s, c) => s + (c.views || 0), 0) / reelsContents.length)
    : 0;
  const reelsAvgLikes = reelsContents.length > 0
    ? Math.round(reelsContents.reduce((s, c) => s + (c.likes || 0), 0) / reelsContents.length)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-primary-950">콘텐츠 갤러리</h3>
        <span className="text-sm text-slate-500">총 {contents.length}개</span>
      </div>

      {/* 피드 콘텐츠 섹션 */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-900">피드 콘텐츠</h4>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>평균 좋아요 <strong>{formatNumber(feedAvgLikes)}</strong> 개</span>
            <span>평균 댓글 <strong>{formatNumber(feedAvgComments)}</strong> 개</span>
          </div>
        </div>

        {/* 피드 정렬 탭 */}
        <div className="flex border-b border-slate-200 mb-3">
          {[
            { key: 'popular', label: '인기순' },
            { key: 'comments', label: '댓글순' },
            { key: 'latest', label: '최신순' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFeedSortBy(tab.key as typeof feedSortBy)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                feedSortBy === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 피드 이미지 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sortedFeedContents.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>

        {feedContents.length === 0 && (
          <div className="text-center py-8 text-slate-400">등록된 피드 콘텐츠가 없습니다</div>
        )}
      </div>

      {/* 릴스 콘텐츠 섹션 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-900">릴스 콘텐츠</h4>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>평균 조회수 <strong>{formatNumber(reelsAvgViews)}</strong> 회</span>
            <span>평균 좋아요 <strong>{formatNumber(reelsAvgLikes)}</strong> 개</span>
          </div>
        </div>

        {/* 릴스 정렬 탭 */}
        <div className="flex border-b border-slate-200 mb-3">
          {[
            { key: 'views', label: '조회수순' },
            { key: 'popular', label: '좋아요순' },
            { key: 'latest', label: '최신순' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReelsSortBy(tab.key as typeof reelsSortBy)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                reelsSortBy === tab.key
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 릴스 이미지 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sortedReelsContents.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>

        {reelsContents.length === 0 && (
          <div className="text-center py-8 text-slate-400">등록된 릴스 콘텐츠가 없습니다</div>
        )}
      </div>
    </div>
  );
}

// 캠페인 성과 KPI 카드 컴포넌트
function CampaignKPICard({
  title,
  value,
  change,
  isPositive,
  metricKey,
}: {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  metricKey?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow h-[100px] flex flex-col justify-between">
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">{title}</span>
        {metricKey && <InfoTooltip metricKey={metricKey} />}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
        <span>전월 대비 {change > 0 ? '+' : ''}{formatPercent(change)}</span>
      </div>
    </div>
  );
}

// 성과 데이터 타입
interface PerformanceData {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  contentCount: number;
  topInfluencers: { name: string; likes: number; comments: number }[];
  dailyData: { date: string; likes: number; comments: number; shares: number; views: number }[];
}

// 캠페인 성과 컴포넌트
function CampaignPerformance({
  campaign: _campaign,
  contents,
  loading
}: {
  campaign: CampaignListItem;
  contents: ContentItem[];
  loading: boolean;
}) {
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customDateRange, setCustomDateRange] = useState({
    start: '2024-12-01',
    end: '2024-12-14',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Notion 데이터에서 성과 집계
  const performanceData: PerformanceData = useMemo(() => {
    if (!contents || contents.length === 0) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalViews: 0,
        contentCount: 0,
        topInfluencers: [],
        dailyData: [],
      };
    }

    // 총계 계산
    const totalLikes = contents.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = contents.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = contents.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalViews = contents.reduce((sum, c) => sum + (c.views || 0), 0);

    // 인플루언서별 성과 집계
    const influencerMap = new Map<string, { likes: number; comments: number }>();
    contents.forEach((c) => {
      const name = c.influencerName || '알 수 없음';
      const existing = influencerMap.get(name) || { likes: 0, comments: 0 };
      influencerMap.set(name, {
        likes: existing.likes + (c.likes || 0),
        comments: existing.comments + (c.comments || 0),
      });
    });

    // TOP 인플루언서 (좋아요 기준 정렬)
    const topInfluencers = Array.from(influencerMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    // 일별 데이터 집계
    const dailyMap = new Map<string, { likes: number; comments: number; shares: number; views: number }>();
    contents.forEach((c) => {
      if (c.postedAt) {
        const date = new Date(c.postedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
        const existing = dailyMap.get(date) || { likes: 0, comments: 0, shares: 0, views: 0 };
        dailyMap.set(date, {
          likes: existing.likes + (c.likes || 0),
          comments: existing.comments + (c.comments || 0),
          shares: existing.shares + (c.shares || 0),
          views: existing.views + (c.views || 0),
        });
      }
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      contentCount: contents.length,
      topInfluencers,
      dailyData,
    };
  }, [contents]);

  // 기간 필터링된 데이터 생성
  const filteredChartData = useMemo(() => {
    if (!contents || contents.length === 0) {
      return { likes: [], views: [], engagement: [] };
    }

    // 실제 데이터의 날짜 범위 찾기
    const contentDates = contents
      .filter(c => c.postedAt)
      .map(c => new Date(c.postedAt!))
      .sort((a, b) => a.getTime() - b.getTime());

    if (contentDates.length === 0) {
      return { likes: [], views: [], engagement: [] };
    }

    const earliestDate = contentDates[0];
    const latestDate = contentDates[contentDates.length - 1];

    let startDate: Date;
    let endDate: Date;

    // 기간별 시작/종료일 계산
    switch (periodFilter) {
      case 'daily':
        // 최근 데이터부터 7일
        endDate = latestDate;
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        // 데이터 시작일보다 이전이면 데이터 시작일로 조정
        if (startDate < earliestDate) startDate = earliestDate;
        break;
      case 'weekly':
        // 최근 데이터부터 4주
        endDate = latestDate;
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 28);
        if (startDate < earliestDate) startDate = earliestDate;
        break;
      case 'monthly':
        // 최근 데이터부터 3개월
        endDate = latestDate;
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        if (startDate < earliestDate) startDate = earliestDate;
        break;
      case 'custom':
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
        break;
      default:
        endDate = latestDate;
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        if (startDate < earliestDate) startDate = earliestDate;
    }

    // 기간 내 콘텐츠 필터링
    const filteredContents = contents.filter((c) => {
      if (!c.postedAt) return false;
      const postedDate = new Date(c.postedAt);
      return postedDate >= startDate && postedDate <= endDate;
    });

    // 집계 방식 결정
    const aggregateByWeek = periodFilter === 'weekly' || periodFilter === 'monthly';
    const dataMap = new Map<string, { likes: number; comments: number; shares: number; views: number }>();

    filteredContents.forEach((c) => {
      if (!c.postedAt) return;

      const postedDate = new Date(c.postedAt);
      let key: string;

      if (aggregateByWeek && periodFilter === 'weekly') {
        // 주별 집계: 해당 주의 월요일 기준
        const weekStart = new Date(postedDate);
        weekStart.setDate(postedDate.getDate() - postedDate.getDay() + 1);
        key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}주`;
      } else if (periodFilter === 'monthly') {
        // 월별 집계
        key = `${postedDate.getFullYear()}.${String(postedDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // 일별 집계
        key = postedDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
      }

      const existing = dataMap.get(key) || { likes: 0, comments: 0, shares: 0, views: 0 };
      dataMap.set(key, {
        likes: existing.likes + (c.likes || 0),
        comments: existing.comments + (c.comments || 0),
        shares: existing.shares + (c.shares || 0),
        views: existing.views + (c.views || 0),
      });
    });

    // 정렬된 배열로 변환
    const sortedData = Array.from(dataMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      likes: sortedData.map((d) => ({ date: d.date, value: d.likes })),
      views: sortedData.map((d) => ({ date: d.date, value: d.views })),
      engagement: sortedData.map((d) => ({ date: d.date, shares: d.shares, comments: d.comments })),
    };
  }, [contents, periodFilter, customDateRange]);

  // 현재 선택된 기간의 데이터
  const currentData = filteredChartData;

  // 로딩 상태
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary-600" />
        <span className="text-slate-500">성과 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기간 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'daily', label: '일간' },
          { key: 'weekly', label: '주간' },
          { key: 'monthly', label: '월간' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setPeriodFilter(key as typeof periodFilter);
              setShowDatePicker(false);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              periodFilter === key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}

        {/* 직접 설정 버튼 */}
        <div className="relative">
          <button
            onClick={() => {
              setPeriodFilter('custom');
              setShowDatePicker(!showDatePicker);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              periodFilter === 'custom'
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} />
            직접 설정
          </button>

          {/* 날짜 선택 드롭다운 */}
          {showDatePicker && periodFilter === 'custom' && (
            <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-xl shadow-lg border border-slate-200 z-10">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">시작일</label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">종료일</label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="mt-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  적용
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 선택된 기간 표시 */}
        {periodFilter === 'custom' && (
          <span className="text-sm text-slate-500 ml-2">
            {customDateRange.start} ~ {customDateRange.end}
          </span>
        )}
      </div>

      {/* 주요 지표 카드 - 실제 Notion 데이터 사용 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <CampaignKPICard
          title="총 콘텐츠"
          value={formatNumber(performanceData.contentCount)}
          change={0}
          isPositive={true}
          metricKey="feedImpressions"
        />
        <CampaignKPICard
          title="총 좋아요"
          value={formatNumber(performanceData.totalLikes)}
          change={0}
          isPositive={true}
          metricKey="totalLikes"
        />
        <CampaignKPICard
          title="총 비디오 재생 수"
          value={formatNumber(performanceData.totalViews)}
          change={0}
          isPositive={true}
          metricKey="videoViews"
        />
        <CampaignKPICard
          title="총 공유 수"
          value={formatNumber(performanceData.totalShares)}
          change={0}
          isPositive={true}
          metricKey="totalShares"
        />
        <CampaignKPICard
          title="총 댓글 수"
          value={formatNumber(performanceData.totalComments)}
          change={0}
          isPositive={true}
          metricKey="totalComments"
        />
      </div>

      {/* 인플루언서별 성과 요약 - 실제 Notion 데이터 사용 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">TOP 인플루언서 성과</h4>
        <div className="space-y-2">
          {performanceData.topInfluencers.length > 0 ? (
            performanceData.topInfluencers.map((inf, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{inf.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-slate-500">
                    좋아요 <span className="font-medium text-pink-600">{formatNumber(inf.likes)}</span>
                  </div>
                  <div className="text-slate-500">
                    댓글 <span className="font-medium text-amber-600">{formatNumber(inf.comments)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-400 py-4">인플루언서 성과 데이터가 없습니다</div>
          )}
        </div>
      </div>

      {/* 지표별 추이 차트 */}
      {currentData.likes.length > 0 ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좋아요 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">총 좋아요 추이</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.likes}>
                <defs>
                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => [formatNumber(value), '좋아요']} />
                <Area type="monotone" dataKey="value" stroke="#ec4899" fillOpacity={1} fill="url(#colorLikes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 비디오 재생 수 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">총 비디오 재생 수 추이</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.views}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => [formatNumber(value), '재생']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 공유 & 댓글 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">공유 & 댓글 추이</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.engagement}>
                <defs>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name === 'shares' ? '공유' : '댓글']} />
                <Area type="monotone" dataKey="shares" stroke="#10b981" fillOpacity={1} fill="url(#colorShares)" strokeWidth={2} />
                <Area type="monotone" dataKey="comments" stroke="#f59e0b" fillOpacity={1} fill="url(#colorComments)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">공유</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">댓글</span>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="text-center text-slate-400 py-8">
            일별 추이 데이터가 없습니다. 콘텐츠에 게시일 정보가 필요합니다.
          </div>
        </div>
      )}
    </div>
  );
}

// 캠페인 목록 테이블 컴포넌트
function CampaignListTable({
  campaigns,
  loading,
  onSelectCampaign,
  pagination,
  onPageChange,
}: {
  campaigns: CampaignListItem[];
  loading: boolean;
  onSelectCampaign: (campaign: CampaignListItem) => void;
  pagination: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // 상태 매핑 (서버 상태값 처리)
  const isActive = (status: string) =>
    status === 'active' || status === 'paused' || status === '진행중' || status === '일시정지' || status === '진행' || status === '준비중';
  const isCompleted = (status: string) =>
    status === 'completed' || status === '완료' || status === '종료';

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (statusFilter === 'active') {
      return isActive(campaign.status);
    }
    return isCompleted(campaign.status);
  });

  const activeCount = campaigns.filter((c) => isActive(c.status)).length;
  const completedCount = campaigns.filter((c) => isCompleted(c.status)).length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-center h-32 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* 상태 탭 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'active'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          진행중 ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === 'completed'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          종료 ({completedCount})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">캠페인명</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">카테고리</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">캠페인 유형</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">협찬 제품</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">참여인원</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">캠페인 시작일</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">캠페인 종료일</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">담당자</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign, index) => (
              <tr
                key={campaign.id}
                onClick={() => onSelectCampaign(campaign)}
                className={`hover:bg-slate-50 cursor-pointer transition-colors ${index < filteredCampaigns.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{campaign.name}</span>
                    {campaign.name === '이너프' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">
                        <Eye size={10} /> 열기
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{campaign.category}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    campaign.campaignType === '협찬'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {campaign.campaignType}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {campaign.productType ? (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      campaign.productType === '생활용품' ? 'bg-cyan-100 text-cyan-700' :
                      campaign.productType === '뉴트리션' ? 'bg-violet-100 text-violet-700' :
                      campaign.productType === '음료' ? 'bg-amber-100 text-amber-700' :
                      campaign.productType === '식단' ? 'bg-rose-100 text-rose-700' :
                      campaign.productType === '어패럴' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {campaign.productType}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-slate-600 text-center">{campaign.participants}명</td>
                <td className="py-4 px-4 text-sm text-slate-600">{formatDateTime(campaign.startDate)}</td>
                <td className="py-4 px-4 text-sm text-slate-600">{formatDateTime(campaign.endDate)}</td>
                <td className="py-4 px-4 text-sm text-slate-400">{campaign.manager || '-'}</td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    isActive(campaign.status)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isActive(campaign.status) ? '진행중' : '완료'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            총 {pagination.totalElements}개 캠페인
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <span className="text-sm text-slate-600 px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 캠페인 결과 데이터에서 인플루언서 정보를 추출하여 SeedingItem으로 변환
function extractSeedingFromResults(results: CampaignResultDto[]): SeedingItem[] {
  const influencerMap = new Map<string, CampaignResultDto>();

  // 인플루언서별로 첫 번째 포스트만 유지 (중복 제거)
  results.forEach(result => {
    const key = result.ownerId || result.ownerUsername;
    if (key && !influencerMap.has(key)) {
      influencerMap.set(key, result);
    }
  });

  return Array.from(influencerMap.values()).map(result => ({
    id: result.ownerId || result.ownerUsername,
    campaignId: result.campaignId,
    influencer: {
      id: result.ownerId || result.ownerUsername,
      name: result.ownerFullName || result.ownerUsername,
      handle: result.ownerUsername,
      platform: 'instagram' as const,
      thumbnail: result.ownerProfilePicUrl || '',
      followers: 0,
      engagementRate: 0,
      avgLikes: 0,
      avgComments: 0,
      category: [],
      priceRange: '',
      verified: false,
    },
    type: 'free' as SeedingType,
    status: 'completed' as SeedingStatus,
    requestDate: result.postedAt || '',
    postDate: result.postedAt,
  }));
}

// 캠페인 결과 데이터를 ContentItem으로 변환
function convertCampaignResultToContent(result: CampaignResultDto): ContentItem {
  // postType에 따라 콘텐츠 타입 결정
  const getContentType = (postType: string): 'image' | 'video' | 'reel' | 'story' => {
    const type = postType?.toLowerCase() || '';
    if (type.includes('reel') || type.includes('video')) return 'reel';
    if (type.includes('story')) return 'story';
    if (type.includes('video')) return 'video';
    return 'image';
  };

  // 총 조회수 계산 (videoPlayCount + igPlayCount)
  const totalViews = (result.videoPlayCount || 0) + (result.igPlayCount || 0);

  // engagement rate 계산
  const totalEngagement = (result.likesCount || 0) + (result.commentsCount || 0) + (result.reshareCount || 0);
  const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

  return {
    id: result.id,
    influencerId: result.ownerId,
    influencerName: result.ownerFullName || result.ownerUsername,
    platform: 'instagram',
    type: getContentType(result.postType),
    thumbnail: result.displayUrl || 'https://placehold.co/300x400',
    originalUrl: result.postUrl,
    downloadUrl: result.videoUrl || result.displayUrl,
    likes: result.likesCount || 0,
    comments: result.commentsCount || 0,
    shares: result.reshareCount || 0,
    views: totalViews,
    engagementRate: Math.round(engagementRate * 100) / 100,
    postedAt: result.postedAt,
    caption: result.caption,
  };
}

// AI 분석 API 호출 함수
async function fetchAIAnalysis(
  campaignName: string,
  contents: ContentItem[],
  performanceData: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    contentCount: number;
    topInfluencers: { name: string; likes: number; comments: number }[];
  }
): Promise<AIAnalysis> {
  const API_BASE = '';
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      campaignName,
      contents: contents.map((c) => ({
        influencerName: c.influencerName,
        type: c.type,
        likes: c.likes,
        comments: c.comments,
        views: c.views,
        caption: c.caption,
        postedAt: c.postedAt,
      })),
      performanceData,
    }),
  });

  if (!response.ok) {
    throw new Error('AI 분석 요청 실패');
  }

  return response.json();
}

// 신청자와 인플루언서 매칭 함수
function matchApplicantsToInfluencers(
  applicants: ApplicantDto[],
  influencers: DashInfluencerWithDetail[]
): DashInfluencerWithDetail[] {
  console.log('[Matching] 신청자 수:', applicants.length);
  console.log('[Matching] 인플루언서 수:', influencers.length);

  // 샘플 데이터 출력 (디버깅용)
  if (applicants.length > 0) {
    console.log('[Matching] 신청자 샘플 (처음 3명):', applicants.slice(0, 3).map(a => ({
      name: a.name,
      instagramId: a.instagramId
    })));
  }
  if (influencers.length > 0) {
    console.log('[Matching] 인플루언서 샘플 (처음 3명):', influencers.slice(0, 3).map(i => ({
      name: i.dashInfluencer.name,
      username: i.dashInfluencer.username
    })));
  }

  const matchedInfluencers: DashInfluencerWithDetail[] = [];

  for (const applicant of applicants) {
    // 1순위: 인스타그램 ID 매칭
    if (applicant.instagramId) {
      const normalizedHandle = applicant.instagramId.replace('@', '').toLowerCase();
      const matched = influencers.find(inf =>
        inf.dashInfluencer.username?.toLowerCase() === normalizedHandle
      );
      if (matched && !matchedInfluencers.includes(matched)) {
        console.log('[Matching] 매칭됨 (인스타):', applicant.instagramId, '→', matched.dashInfluencer.username);
        matchedInfluencers.push(matched);
        continue;
      }
    }

    // 2순위: 이름 매칭
    const nameMatched = influencers.find(inf =>
      inf.dashInfluencer.name?.toLowerCase() === applicant.name.toLowerCase()
    );
    if (nameMatched && !matchedInfluencers.includes(nameMatched)) {
      console.log('[Matching] 매칭됨 (이름):', applicant.name, '→', nameMatched.dashInfluencer.name);
      matchedInfluencers.push(nameMatched);
    }
  }

  console.log('[Matching] 총 매칭된 수:', matchedInfluencers.length);
  return matchedInfluencers;
}

// 캠페인 상세 뷰 컴포넌트
function CampaignDetailView({
  campaign,
  initialResults,
  onBack: _onBack,
}: {
  campaign: CampaignListItem;
  initialResults?: CampaignResultDto[];
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'applicants' | 'seeding' | 'content'>('performance');
  const [_notionSeeding, setNotionSeeding] = useState<SeedingItem[]>([]);
  // 신청자 원본 데이터 (노션 API)
  const [applicantsRaw, setApplicantsRaw] = useState<ApplicantDto[]>([]);
  // 매칭된 인플루언서 (신청자 리스트에 표시)
  const [matchedInfluencers, setMatchedInfluencers] = useState<DashInfluencerWithDetail[]>([]);
  // 참여자로 추가된 인플루언서 ID 목록 (신청자 리스트에서 필터링용)
  // API에서 로드하도록 변경 (localStorage 초기화 제거)
  const [addedToSeedingIds, setAddedToSeedingIds] = useState<Set<string>>(new Set());
  // 신청자에서 참여자로 추가된 인플루언서 (상세 정보 유지)
  const [addedInfluencers, setAddedInfluencers] = useState<DashInfluencerWithDetail[]>([]);
  // API에서 조회한 참여자 목록
  const [participants, setParticipants] = useState<DashCampaignInfluencerParticipate[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [notionContent, setNotionContent] = useState<ContentItem[]>([]);
  const [_campaignResults, setCampaignResults] = useState<CampaignResultDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [influencerLoading, setInfluencerLoading] = useState(true);
  const [applicantError, setApplicantError] = useState<string | null>(null);

  // 신청자 관리 활성화 계정인지 확인 (로그인 아이디로 체크)
  const isApplicantEnabledAccount = user?.loginId && APPLICANT_ENABLED_ACCOUNTS.includes(user.loginId);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 성과 데이터 계산
  const performanceData = useMemo(() => {
    if (!notionContent || notionContent.length === 0) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalViews: 0,
        contentCount: 0,
        topInfluencers: [],
      };
    }

    const totalLikes = notionContent.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = notionContent.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = notionContent.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalViews = notionContent.reduce((sum, c) => sum + (c.views || 0), 0);

    // 인플루언서별 집계
    const influencerStats = new Map<string, { likes: number; comments: number }>();
    notionContent.forEach((c) => {
      const name = c.influencerName || 'Unknown';
      const existing = influencerStats.get(name) || { likes: 0, comments: 0 };
      influencerStats.set(name, {
        likes: existing.likes + (c.likes || 0),
        comments: existing.comments + (c.comments || 0),
      });
    });

    const topInfluencers = Array.from(influencerStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      contentCount: notionContent.length,
      topInfluencers,
    };
  }, [notionContent]);

  // AI 분석 실행
  const handleAnalyze = async () => {
    if (notionContent.length === 0) {
      alert('분석할 콘텐츠가 없습니다.');
      return;
    }

    try {
      setAiLoading(true);
      const result = await fetchAIAnalysis(campaign.name, notionContent, performanceData);
      setAiAnalysis(result);
    } catch (err) {
      console.error('[AI Analysis] 분석 실패:', err);
      alert('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  // 상세 데이터 로드 함수
  const loadDetailData = async () => {
    try {
      setDetailLoading(true);
      console.log('[CampaignDetail] Loading detail data for campaign:', campaign.id);

      // 항상 새 API로 승인된 인플루언서 결과만 조회, 실패 시 initialResults fallback
      let resultsData: CampaignResultDto[];
      console.log('[CampaignDetail] Fetching influencer result list from API');
      resultsData = await fetchInfluencerResultList(campaign.id).catch((err) => {
        console.warn('[CampaignDetail] Influencer result list fetch failed, using initial results:', err);
        return initialResults || [];
      });

      console.log('[CampaignDetail] Campaign results:', resultsData);

      // 최신 time 데이터만 필터링 (중복 제거)
      const filteredResults = filterByLatestTime(resultsData);
      console.log('[CampaignDetail] Filtered results (latest time):', filteredResults.length, '/', resultsData.length);

      // 캠페인 결과에서 인플루언서 정보 추출하여 시딩 리스트 생성
      const seedingData = extractSeedingFromResults(filteredResults);
      console.log('[CampaignDetail] Extracted seeding data:', seedingData);

      setNotionSeeding(seedingData);
      setCampaignResults(filteredResults);
      setNotionContent(filteredResults.map(convertCampaignResultToContent));
    } catch (err) {
      console.error('[CampaignDetail] 상세 데이터 로드 실패:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // 캠페인 데이터 동기화 (Apify)
  const handleSyncCampaign = async () => {
    try {
      setSyncing(true);
      console.log('[CampaignDetail] 캠페인 데이터 동기화 시작:', campaign.id);

      await syncCampaignData(campaign.id);
      console.log('[CampaignDetail] 동기화 완료, 데이터 새로고침...');

      // 동기화 후 데이터 다시 로드
      await loadDetailData();
    } catch (err) {
      console.error('[CampaignDetail] 동기화 실패:', err);
      alert('캠페인 데이터 동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadDetailData();
  }, [campaign.id]);

  // 신청자 + 인플루언서 데이터 로드 및 매칭
  const loadApplicantsAndMatch = async () => {
    try {
      setInfluencerLoading(true);
      setApplicantError(null);

      // 신청자 관리 활성화 계정이 아니면 빈 데이터로 설정
      if (!isApplicantEnabledAccount) {
        console.log('[CampaignDetail] 신청자 관리 비활성화 계정 - 신청자 데이터 로드 스킵');
        setApplicantsRaw([]);
        setMatchedInfluencers([]);
        setInfluencerLoading(false);
        return;
      }

      console.log('[CampaignDetail] Loading applicants and influencer data...');

      // 1. 노션에서 신청자 데이터 로드 (loginId로 계정별, campaignId로 캠페인별 DB 조회)
      const applicants = await fetchApplicants(user?.loginId, campaign.id);
      console.log('[CampaignDetail] Loaded applicants:', applicants.length);
      setApplicantsRaw(applicants);

      // 2. 전체 인플루언서 데이터 로드
      const result = await fetchDashInfluencersWithDetail({ page: 1, size: 1000 });
      const influencers = result.content;
      console.log('[CampaignDetail] Loaded influencers:', influencers.length);

      // 3. 신청자와 인플루언서 매칭
      const matched = matchApplicantsToInfluencers(applicants, influencers);
      console.log('[CampaignDetail] Matched influencers:', matched.length);

      setMatchedInfluencers(matched);
    } catch (err) {
      console.error('[CampaignDetail] 데이터 로드 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setApplicantError(`인플루언서 데이터를 불러오는데 실패했습니다: ${errorMessage}`);
    } finally {
      setInfluencerLoading(false);
    }
  };

  useEffect(() => {
    loadApplicantsAndMatch();
  }, [campaign.id]);

  // 캠페인 참여자 목록 API 조회
  const loadParticipants = async () => {
    try {
      setParticipantsLoading(true);
      console.log('[CampaignDetail] 참여자 목록 API 조회 시작:', campaign.id);

      const data = await fetchCampaignParticipants(campaign.id);
      setParticipants(data);

      // ACTIVE 상태인 참여자만 필터링하여 ID Set 생성
      // status가 없으면 WAIT로 간주 (신청자 탭에 표시)
      const activeParticipantIds = new Set(
        data.filter(p => (p.status || 'WAIT') === PARTICIPANT_STATUS.ACTIVE).map(p => p.dashInfluencer.id)
      );
      setAddedToSeedingIds(activeParticipantIds);

      console.log('[CampaignDetail] 참여자 조회 완료 - 전체:', data.length, '명, ACTIVE:', activeParticipantIds.size, '명');
    } catch (error) {
      console.error('[CampaignDetail] 참여자 조회 실패:', error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // 캠페인 선택 시 참여자 데이터 API로 로드
  useEffect(() => {
    loadParticipants();
  }, [campaign.id]);

  // participants 로드 후 addedInfluencers 매칭
  useEffect(() => {
    // 로딩 중이면 업데이트하지 않음 (깜빡임 방지)
    if (participantsLoading) return;

    // ACTIVE 상태인 참여자만 addedInfluencers에 설정
    // status가 없으면 WAIT로 간주 (신청자 탭에 표시)
    const activeParticipants = participants.filter(p => (p.status || 'WAIT') === PARTICIPANT_STATUS.ACTIVE);
    if (activeParticipants.length > 0) {
      // matchedInfluencers에서 매칭되는 항목 찾기, 없으면 API 응답 데이터로 구성
      const participantInfluencers = activeParticipants.map(p => {
        const matched = matchedInfluencers.find(
          m => m.dashInfluencer.id === p.dashInfluencer.id
        );
        return matched || {
          dashInfluencer: p.dashInfluencer,
          dashInfluencerDetail: null
        };
      });
      setAddedInfluencers(participantInfluencers);
      console.log('[CampaignDetail] addedInfluencers 설정:', participantInfluencers.length, '명');
    } else {
      setAddedInfluencers([]);
      console.log('[CampaignDetail] addedInfluencers 초기화: 0명');
    }
  }, [participants, matchedInfluencers, participantsLoading]);

  return (
    <div className="space-y-6">
      {/* 캠페인 요약 헤더 */}
      <CampaignSummaryHeader
        campaign={campaign}
        applicantCount={applicantsRaw.length}
        participantCount={addedInfluencers.length}
      />

      {/* Sub Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-1.5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          {[
            { key: 'performance', label: '캠페인 성과', icon: BarChart3 },
            { key: 'applicants', label: '신청자 리스트', icon: Users },
            { key: 'seeding', label: '참여 인플루언서', icon: Package },
            { key: 'content', label: '콘텐츠 갤러리', icon: Image },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSubTab(key as typeof activeSubTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSubTab === key
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSyncCampaign}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-medium rounded-lg transition-colors mr-1"
          title="캠페인 데이터 동기화"
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {syncing ? '동기화 중...' : '동기화'}
        </button>
      </div>

      {/* Sub Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeSubTab === 'performance' && (
            <CampaignPerformance campaign={campaign} contents={notionContent} loading={detailLoading} />
          )}
          {activeSubTab === 'applicants' && (
            influencerLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-orange-600" />
                <span className="text-slate-500">인플루언서 데이터 매칭 중...</span>
              </div>
            ) : applicantError ? (
              <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-slate-700 mb-4">{applicantError}</p>
                  <button
                    onClick={loadApplicantsAndMatch}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <RefreshCw size={16} />
                    다시 시도
                  </button>
                </div>
              </div>
            ) : (
              <ApplicantListTab
                matchedInfluencers={matchedInfluencers.filter(
                  item => !addedToSeedingIds.has(item.dashInfluencer.id)
                )}
                onAddToSeeding={async (newItems) => {
                  // API 호출: 각 인플루언서를 캠페인 참여자로 등록
                  try {
                    // 1. POST 호출 - 참여자 등록 (초기 상태: WAIT)
                    const apiPromises = newItems.map(item =>
                      participateCampaignInfluencer(campaign.id, item.influencer.id)
                    );
                    const results = await Promise.all(apiPromises);
                    console.log('[CampaignDetail] 참여자 등록 성공:', newItems.length, '명');

                    // 2. PUT 호출 - 상태를 ACTIVE로 변경
                    // API 응답에서 참여 레코드 ID 추출
                    const participateIds = results.flatMap(r => r.map(p => p.id)).filter(Boolean);
                    if (participateIds.length > 0) {
                      await updateParticipantStatus(participateIds, 'ACTIVE');
                      console.log('[CampaignDetail] 상태 ACTIVE로 변경:', participateIds.length, '명');
                    }

                    // 3. 참여자 목록 새로고침
                    await loadParticipants();
                  } catch (error) {
                    console.error('[CampaignDetail] 참여자 등록 실패:', error);
                  }
                }}
                campaignId={campaign.id}
              />
            )
          )}
          {activeSubTab === 'seeding' && (
            participantsLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary-600" />
                <span className="text-slate-500">참여 인플루언서 데이터 로딩 중...</span>
              </div>
            ) : (
              <ApplicantListTab
                matchedInfluencers={addedInfluencers}
                onAddToSeeding={() => {}}
                campaignId={campaign.id}
                isSeeding={true}
                participants={participants}
                onPostUrlUpdate={async (influencerId, postUrl) => {
                  // 인플루언서 ID → 참여 레코드 ID 변환
                  const participateIds = participants
                    .filter(p => p.dashInfluencer.id === influencerId)
                    .map(p => p.id);

                  if (participateIds.length > 0) {
                    await updateParticipantPostUrl(participateIds, postUrl);
                    await loadParticipants();
                  }
                }}
                onRemoveFromSeeding={async (influencerIds) => {
                  // API 호출: 상태를 WAIT로 변경하여 신청자 리스트로 되돌리기
                  try {
                    // 인플루언서 ID → 참여 레코드 ID 변환
                    const participateIds = participants
                      .filter(p => influencerIds.includes(p.dashInfluencer.id))
                      .map(p => p.id);

                    if (participateIds.length > 0) {
                      await updateParticipantStatus(participateIds, 'WAIT');
                    }

                    // 참여자 목록 새로고침
                    await loadParticipants();
                  } catch (error) {
                    console.error('[CampaignDetail] 참여자 상태 변경 실패:', error);
                  }
                }}
              />
            )
          )}
          {activeSubTab === 'content' && (
            detailLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary-600" />
                <span className="text-slate-500">콘텐츠 데이터 로딩 중...</span>
              </div>
            ) : (
              <ContentGallery contents={notionContent} />
            )
          )}
        </div>

        {/* AI Analysis Sidebar */}
        <div>
          <AIAnalysisCard
            analysis={aiAnalysis}
            onAnalyze={handleAnalyze}
            loading={aiLoading}
          />
        </div>
      </div>
    </div>
  );
}

// Notion 캠페인 데이터를 CampaignListItem 형식으로 변환
function convertNotionCampaign(campaign: NotionCampaign): CampaignListItem {
  return {
    id: campaign.id,
    name: campaign.name,
    category: campaign.category,
    campaignType: campaign.campaignType as '협찬' | '유료',
    productType: campaign.productType,
    participants: campaign.participants,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    manager: campaign.manager,
    status: campaign.status, // Notion에서 한국어 상태값 ('진행중', '완료' 등)이 직접 옴
  };
}

// Main Component
export function CampaignTab({
  influencers: _influencers,
  seedingList: _seedingList,
  contentList: _contentList,
  aiAnalysis: _aiAnalysis,
  loading: _loading,
}: CampaignTabProps) {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null);
  const [selectedCampaignResults, setSelectedCampaignResults] = useState<CampaignResultDto[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [campaignResultsMap, setCampaignResultsMap] = useState<Map<string, CampaignResultDto[]>>(new Map());
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });
  const [notionLoading, setNotionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 캠페인 데이터 로드 (통합 API 사용)
  const loadCampaigns = async (page: number = 1) => {
    try {
      setNotionLoading(true);
      setError(null);
      console.log('[CampaignTab] Starting to load campaigns with detail, page:', page);

      const result = await fetchCampaignsWithDetail({
        dashMemberId: user?.id || '',
        page,
        size: pagination.size,
        direction: 'DESC',
      });
      console.log('[CampaignTab] Loaded campaigns with detail:', result);

      // 캠페인 목록 변환
      const convertedCampaigns = result.content.map((item: CampaignWithDetail) => {
        const notionCampaign = convertCampaignWithDetailToNotionCampaign(item);
        return convertNotionCampaign(notionCampaign);
      });
      setCampaigns(convertedCampaigns);

      // 결과 데이터를 Map으로 캐싱 (최신 time만 필터링하여 중복 제거)
      const resultsMap = new Map<string, CampaignResultDto[]>();
      result.content.forEach((item: CampaignWithDetail) => {
        const filtered = filterByLatestTime(item.campaignResults);
        resultsMap.set(item.campaign.id, filtered);
      });
      setCampaignResultsMap(resultsMap);

      // 페이징 정보 업데이트
      setPagination(prev => ({
        ...prev,
        page,
        totalPages: result.totalPages,
        totalElements: result.totalElements,
      }));

      console.log('[CampaignTab] Set campaigns:', convertedCampaigns.length);
    } catch (err) {
      console.error('[CampaignTab] 캠페인 로드 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(`캠페인 데이터를 불러오는데 실패했습니다: ${errorMessage}`);
    } finally {
      setNotionLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    loadCampaigns(newPage);
  };

  // 캠페인 선택 핸들러
  const handleSelectCampaign = (campaign: CampaignListItem) => {
    const results = campaignResultsMap.get(campaign.id) || [];
    setSelectedCampaignResults(results);
    setSelectedCampaign(campaign);
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadCampaigns(1);
  }, []);

  // 에러 표시
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 캠페인 선택된 경우 상세 화면 표시
  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        initialResults={selectedCampaignResults}
        onBack={() => setSelectedCampaign(null)}
      />
    );
  }

  // 기본: 캠페인 목록 표시
  return (
    <div className="space-y-6">
      <CampaignListTable
        campaigns={campaigns}
        loading={notionLoading}
        onSelectCampaign={handleSelectCampaign}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
