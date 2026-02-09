import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Users, Instagram, Heart, MessageCircle, X, Eye, ExternalLink, ChevronUp, ChevronDown, Calendar, Play, RefreshCw } from 'lucide-react';
import { fetchAllDashInfluencersWithDetail, updateDashInfluencer, fetchDashInfluencerDetail } from '../../services/metaDashApi';
import type { DashInfluencerWithDetail, DashInfluencerPost, DashInfluencer, DashInfluencerDetail } from '../../types/metaDash';
import { getProxiedImageUrl } from '../../utils/imageProxy';
import { formatNumber as formatNumberBase, formatPercent } from '../../utils/formatters';

// 숫자 포맷팅 (null/undefined 처리 포함 래퍼)
const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return '-';
  return formatNumberBase(num);
};

// 활동분야별 배지 색상 매핑
const getActivityFieldColor = (field: string): string => {
  const colorMap: Record<string, string> = {
    '헬스': 'bg-red-100 text-red-800',
    '러닝': 'bg-orange-100 text-orange-800',
    '요가': 'bg-purple-100 text-purple-800',
    '필라테스': 'bg-pink-100 text-pink-800',
    '바레': 'bg-indigo-100 text-indigo-800',
    '크로스핏': 'bg-blue-100 text-blue-800',
    '하이록스': 'bg-cyan-100 text-cyan-800',
    'F45': 'bg-green-100 text-green-800',
    '헬스/웨이트': 'bg-yellow-100 text-yellow-800',
    '기타': 'bg-gray-100 text-gray-800',
  };
  return colorMap[field] || 'bg-gray-100 text-gray-800';
};

// 정렬 타입
type SortField = 'followerCount' | 'postsCount' | 'avgLikes' | 'avgComments' | 'engagementRate' | 'latestPost';
type SortDirection = 'asc' | 'desc';

// 테이블 헤더 컴포넌트
function TableHeader({
  sortField,
  sortDirection,
  onSort
}: {
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-orange-500" />
      : <ChevronDown size={14} className="text-orange-500" />;
  };

  const headerClass = "px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 select-none whitespace-nowrap";

  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-52">
          프로필
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-36">
          활동분야
        </th>
        <th className={headerClass} onClick={() => onSort('followerCount')}>
          <div className="flex items-center gap-1">
            팔로워수 <SortIcon field="followerCount" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('postsCount')}>
          <div className="flex items-center gap-1">
            게시물수 <SortIcon field="postsCount" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('avgLikes')}>
          <div className="flex items-center gap-1">
            평균 좋아요 <SortIcon field="avgLikes" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('avgComments')}>
          <div className="flex items-center gap-1">
            평균 댓글 <SortIcon field="avgComments" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('engagementRate')}>
          <div className="flex items-center gap-1">
            참여율 <SortIcon field="engagementRate" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('latestPost')}>
          <div className="flex items-center gap-1">
            최근 활동 <SortIcon field="latestPost" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
          콘텐츠
        </th>
      </tr>
    </thead>
  );
}

// 테이블 행 컴포넌트
function TableRow({
  item,
  onClick
}: {
  item: DashInfluencerWithDetail;
  onClick: () => void;
}) {
  const influencer = item.dashInfluencer;
  const detail = item.dashInfluencerDetail;
  const latestPosts = detail?.latestPosts?.slice(0, 3) || [];

  // 평균 좋아요/댓글 계산
  const allPosts = detail?.latestPosts || [];
  const avgLikes = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / allPosts.length)
    : null;
  const avgComments = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / allPosts.length)
    : null;

  // 참여율율 계산 (평균 좋아요+댓글 / 팔로워수 * 100)
  const followerCount = detail?.followersCount || influencer.followerCount || 0;
  const engagementRate = followerCount > 0 && avgLikes !== null && avgComments !== null
    ? ((avgLikes + avgComments) / followerCount) * 100
    : null;

  // 최근 활동 (가장 최근 게시물 날짜)
  const postsWithTimestamp = allPosts.filter(p => p.timestamp);
  const latestPostDate = postsWithTimestamp.length > 0
    ? new Date(Math.max(...postsWithTimestamp.map(p => new Date(p.timestamp).getTime())))
    : null;
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

  return (
    <tr
      className="border-b border-slate-100 hover:bg-orange-50/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* 프로필 */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0 relative">
            {(detail?.profilePicUrl || influencer.profileImageUrl) ? (
              <>
                <img
                  src={getProxiedImageUrl(detail?.profilePicUrl || influencer?.profileImageUrl)}
                  alt={influencer?.name ?? ''}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover bg-slate-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 items-center justify-center text-white text-lg font-bold hidden">
                  {(influencer?.name ?? '?').charAt(0).toUpperCase()}
                </div>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                {(influencer?.name ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* 이름 + 카테고리 */}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{influencer?.name ?? '-'}</div>
            {influencer?.category && influencer.category.length > 0 && (
              <div className="text-xs text-slate-500 truncate">
                {influencer.category.join(' · ')}
              </div>
            )}
            {/* 하트 + DM 버튼 */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <Heart size={16} className="text-slate-400 hover:text-red-500" />
              </button>
              <a
                href={`https://instagram.com/${influencer.username?.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md transition-colors"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </td>

      {/* 활동분야 */}
      <td className="px-4 py-4 w-36">
        {influencer.activityField && influencer.activityField.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {influencer.activityField.flatMap((field, idx) =>
              field.split(',').map((item, subIdx) => (
                <span key={`${idx}-${subIdx}`} className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${getActivityFieldColor(item.trim())}`}>
                  {item.trim()}
                </span>
              ))
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* 팔로워수 */}
      <td className="px-4 py-4 text-sm text-slate-700 font-medium">
        {formatNumber(detail?.followersCount || influencer.followerCount)}
      </td>

      {/* 게시물수 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {formatNumber(detail?.postsCount)}
      </td>

      {/* 평균 좋아요 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {formatNumber(avgLikes)}
      </td>

      {/* 평균 댓글 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {formatNumber(avgComments)}
      </td>

      {/* 참여율율 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {engagementRate !== null ? formatPercent(engagementRate, 2) : '-'}
      </td>

      {/* 최근 활동 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {formatDate(latestPostDate)}
      </td>

      {/* 콘텐츠 썸네일 */}
      <td className="px-4 py-4">
        <div className="flex gap-1">
          {latestPosts.map((post, idx) => (
            <img
              key={post.id || idx}
              src={getProxiedImageUrl(post.displayUrl || post.images?.[0])}
              alt={`Post ${idx + 1}`}
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-cover rounded-lg bg-slate-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="%23e2e8f0"><rect width="64" height="64"/></svg>';
              }}
            />
          ))}
          {latestPosts.length === 0 && (
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
              없음
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// 상세 모달 - 콘텐츠 유형 도넛 차트
function ContentTypeChart({ posts }: { posts: DashInfluencerPost[] }) {
  const total = posts.length;
  if (total === 0) return null;

  // 콘텐츠 유형 분류
  const carousel = posts.filter(p => p.type === 'Sidecar' || p.childPosts && p.childPosts.length > 0).length;
  const reels = posts.filter(p => p.type === 'Video' || p.productType === 'reels').length;
  const image = total - carousel - reels;

  const carouselPct = Math.round((carousel / total) * 100);
  const reelsPct = Math.round((reels / total) * 100);
  const imagePct = 100 - carouselPct - reelsPct;

  // CSS conic-gradient로 도넛 차트 구현
  const gradient = `conic-gradient(
    #f97316 0% ${carouselPct}%,
    #8b5cf6 ${carouselPct}% ${carouselPct + reelsPct}%,
    #06b6d4 ${carouselPct + reelsPct}% 100%
  )`;

  return (
    <div className="flex items-center gap-6">
      {/* 도넛 차트 */}
      <div className="relative w-24 h-24">
        <div
          className="w-full h-full rounded-full"
          style={{ background: gradient }}
        />
        <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-slate-500">전체</div>
            <div className="font-bold text-slate-900">{total}</div>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600">캐러셀</span>
          <span className="text-slate-900 font-medium">{carousel} ({carouselPct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-slate-600">릴스</span>
          <span className="text-slate-900 font-medium">{reels} ({reelsPct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-slate-600">이미지</span>
          <span className="text-slate-900 font-medium">{image} ({imagePct}%)</span>
        </div>
      </div>
    </div>
  );
}

// 인플루언서 상세 모달 컴포넌트
function InfluencerDetailModal({
  item,
  isOpen,
  onClose,
  onRefresh
}: {
  item: DashInfluencerWithDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: (updatedInfluencer: DashInfluencer, updatedDetail: DashInfluencerDetail | null) => void;
}) {
  const [feedSortBy, setFeedSortBy] = useState<'popular' | 'comments' | 'latest'>('popular');
  const [reelsSortBy, setReelsSortBy] = useState<'popular' | 'views' | 'latest'>('popular');

  // 새로고침 상태
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // 새로고침 핸들러
  const handleRefresh = async () => {
    if (refreshing || !item) return;

    setRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);

    try {
      // 1. PUT API 호출 (기본 정보 갱신)
      const updated = await updateDashInfluencer(
        item.dashInfluencer.id,
        item.dashInfluencer
      );

      if (!updated) {
        throw new Error('갱신된 데이터를 받지 못했습니다');
      }

      // 2. 상세 정보도 새로 조회
      const detailResponse = await fetchDashInfluencerDetail(item.dashInfluencer.id);
      const updatedDetail = detailResponse?.dashInfluencerDetail || null;

      // 3. 콜백으로 부모 컴포넌트에 알림
      if (onRefresh) {
        onRefresh(updated, updatedDetail);
      }

      setRefreshSuccess(true);
      // 3초 후 성공 메시지 숨김
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (error) {
      console.error('인플루언서 데이터 갱신 실패:', error);
      setRefreshError(error instanceof Error ? error.message : '갱신 실패');
      // 5초 후 에러 메시지 숨김
      setTimeout(() => setRefreshError(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen || !item) return null;

  const influencer = item.dashInfluencer;
  const detail = item.dashInfluencerDetail;
  const allPosts = detail?.latestPosts || [];

  // 피드 (이미지/캐러셀) 게시물
  const feedPosts = allPosts.filter(p =>
    p.productType !== 'reels' && p.type !== 'Video'
  );

  // 릴스 게시물
  const reelsPosts = allPosts.filter(p =>
    p.productType === 'reels' || p.type === 'Video'
  );

  // 피드 정렬
  const sortedFeedPosts = [...feedPosts].sort((a, b) => {
    if (feedSortBy === 'popular') return (b.likesCount || 0) - (a.likesCount || 0);
    if (feedSortBy === 'comments') return (b.commentsCount || 0) - (a.commentsCount || 0);
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  // 릴스 정렬
  const sortedReelsPosts = [...reelsPosts].sort((a, b) => {
    if (reelsSortBy === 'popular') return (b.likesCount || 0) - (a.likesCount || 0);
    if (reelsSortBy === 'views') return (b.videoViewCount || 0) - (a.videoViewCount || 0);
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  // 통계 계산
  const avgLikes = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / allPosts.length)
    : 0;
  const avgComments = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / allPosts.length)
    : 0;

  // 릴스 통계 (위에서 선언한 reelsPosts 사용)
  // 비정상적으로 큰 조회수 값 필터링 (10억 이상은 데이터 오류로 간주)
  const MAX_VALID_VIEW_COUNT = 1_000_000_000;
  const getValidViewCount = (count: number | string | undefined | null) => {
    // 숫자로 명시적 변환 (문자열 대응)
    const value = Number(count) || 0;
    // NaN, Infinity, 비정상적으로 큰 값 필터링
    if (!Number.isFinite(value) || value < 0 || value > MAX_VALID_VIEW_COUNT) {
      return 0;
    }
    return value;
  };

  const avgReelsViews = reelsPosts.length > 0
    ? Math.round(reelsPosts.reduce((sum, p) => sum + getValidViewCount(p.videoViewCount), 0) / reelsPosts.length)
    : 0;
  const reelsEngagement = detail?.followersCount && avgReelsViews > 0
    ? (avgReelsViews / detail.followersCount) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} className="text-slate-500" />
        </button>

        {/* 본문 */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* 섹션 1: 프로필 헤더 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                {detail?.profilePicUrl ? (
                  <img
                    src={getProxiedImageUrl(detail.profilePicUrl)}
                    alt={influencer?.name ?? ''}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-full object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {(influencer?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  {influencer?.category?.join(' · ')}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{detail?.fullName || influencer?.name || '-'}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Instagram size={14} />
                    <span>팔로워 {formatNumber(detail?.followersCount)}</span>
                  </div>
                  <div>게시글수 {formatNumber(detail?.postsCount)}</div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex items-center gap-2 mr-8">
                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`p-2 border rounded-lg transition-colors ${refreshing
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  title="인플루언서 데이터 새로고침"
                >
                  {refreshing ? (
                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                  ) : (
                    <RefreshCw size={20} className="text-slate-400" />
                  )}
                </button>
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Heart size={20} className="text-slate-400" />
                </button>
                <a
                  href={`https://instagram.com/${influencer.username?.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>프로필 바로가기</span>
                </a>
              </div>
            </div>

            {/* 새로고침 상태 메시지 */}
            {refreshSuccess && (
              <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                데이터가 성공적으로 갱신되었습니다.
              </div>
            )}
            {refreshError && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                갱신 실패: {refreshError}
              </div>
            )}

            {/* 바이오 */}
            {detail?.biography && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 whitespace-pre-line">
                {detail.biography}
              </div>
            )}
          </div>

          {/* 섹션 2: 성과 지표 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">인플루언서와 얼마나 잘 맞는지 확인해 보세요</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 성과 지표 */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-3">• 성과 지표</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">평균 댓글</div>
                    <div className="font-bold text-slate-900">{formatNumber(avgComments)}개</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">평균 좋아요</div>
                    <div className="font-bold text-slate-900">{formatNumber(avgLikes)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">릴스 평균 조회수</div>
                    <div className="font-bold text-slate-900">{formatNumber(avgReelsViews)}회</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">릴스 평균 참여율</div>
                    <div className="font-bold text-slate-900">{formatPercent(reelsEngagement)}</div>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 분석은 없으면 placeholder */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-3">• 콘텐츠 매칭 점수</div>
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                  AI 추천에서만 제공해요
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 3: 콘텐츠 분석 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">최근 콘텐츠를 분석해 봤어요</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 콘텐츠 유형 분포 */}
              <div>
                <div className="text-sm text-slate-500 mb-3">• 콘텐츠 유형 분포</div>
                <ContentTypeChart posts={allPosts} />
              </div>

              {/* 브랜드 협업 비율 */}
              <div>
                <div className="text-sm text-slate-500 mb-3">• 브랜드 협업 비율</div>
                <div className="flex items-center justify-center h-24">
                  <div className="text-center text-slate-400 text-sm">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                      ?
                    </div>
                    데이터가 충분하지 않아요
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 4-1: 피드 콘텐츠 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">피드 콘텐츠</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>평균 좋아요 <strong>{formatNumber(feedPosts.length > 0 ? Math.round(feedPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / feedPosts.length) : 0)}</strong> 개</span>
                <span>평균 댓글 <strong>{formatNumber(feedPosts.length > 0 ? Math.round(feedPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / feedPosts.length) : 0)}</strong> 개</span>
              </div>
            </div>

            {/* 피드 정렬 탭 */}
            <div className="flex border-b border-slate-200 mb-3">
              {[
                { key: 'popular', label: '인기순' },
                { key: 'comments', label: '댓글순' },
                { key: 'latest', label: '최신순' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFeedSortBy(tab.key as typeof feedSortBy)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${feedSortBy === tab.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 피드 게시물 그리드 */}
            <div className="grid grid-cols-5 gap-2">
              {sortedFeedPosts.slice(0, 15).map((post, idx) => (
                <a
                  key={post.id || idx}
                  href={post.url || `https://instagram.com/p/${post.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square"
                >
                  <img
                    src={getProxiedImageUrl(post.displayUrl || post.images?.[0])}
                    alt={`Post ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-lg bg-slate-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e2e8f0"><rect width="100" height="100"/></svg>';
                    }}
                  />
                  {/* 호버 시 정보 */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="text-white text-xs text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Heart size={12} fill="white" />
                        <span>{formatNumber(post.likesCount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <MessageCircle size={12} fill="white" />
                        <span>{formatNumber(post.commentsCount || 0)}</span>
                      </div>
                      {post.timestamp && (
                        <div className="flex items-center justify-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(post.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {sortedFeedPosts.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                등록된 피드 콘텐츠가 없어요
              </div>
            )}
          </div>

          {/* 섹션 4-2: 릴스 콘텐츠 */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">릴스 콘텐츠</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>평균 조회수 <strong>{formatNumber(avgReelsViews)}</strong> 회</span>
                <span>평균 좋아요 <strong>{formatNumber(reelsPosts.length > 0 ? Math.round(reelsPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / reelsPosts.length) : 0)}</strong> 개</span>
                <span>평균 댓글 <strong>{formatNumber(reelsPosts.length > 0 ? Math.round(reelsPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / reelsPosts.length) : 0)}</strong> 개</span>
              </div>
            </div>

            {/* 릴스 정렬 탭 */}
            <div className="flex border-b border-slate-200 mb-3">
              {[
                { key: 'views', label: '조회수순' },
                { key: 'popular', label: '좋아요순' },
                { key: 'latest', label: '최신순' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReelsSortBy(tab.key as typeof reelsSortBy)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reelsSortBy === tab.key
                    ? 'border-violet-500 text-violet-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 릴스 게시물 그리드 */}
            <div className="grid grid-cols-5 gap-2">
              {sortedReelsPosts.slice(0, 15).map((post, idx) => (
                <a
                  key={post.id || idx}
                  href={post.url || `https://instagram.com/p/${post.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square"
                >
                  <img
                    src={getProxiedImageUrl(post.displayUrl || post.images?.[0])}
                    alt={`Reels ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-lg bg-slate-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e2e8f0"><rect width="100" height="100"/></svg>';
                    }}
                  />
                  {/* 릴스 아이콘 표시 */}
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                    <Play size={12} fill="white" className="text-white" />
                  </div>
                  {/* 호버 시 정보 */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="text-white text-xs text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Eye size={12} />
                        <span>{formatNumber(post.videoViewCount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Heart size={12} fill="white" />
                        <span>{formatNumber(post.likesCount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <MessageCircle size={12} fill="white" />
                        <span>{formatNumber(post.commentsCount || 0)}</span>
                      </div>
                      {post.timestamp && (
                        <div className="flex items-center justify-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(post.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {sortedReelsPosts.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                등록된 릴스 콘텐츠가 없어요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 메인 컴포넌트
export function InfluencersTab() {
  // 전체 데이터 (클라이언트 정렬/페이징용)
  const [allData, setAllData] = useState<DashInfluencerWithDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 임시 필터 상태 (UI에 바인딩)
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>('all');
  const [tempFollowerFilter, setTempFollowerFilter] = useState<string>('all');
  const [tempEngagementFilter, setTempEngagementFilter] = useState<string>('all');
  const [tempActivityFilter, setTempActivityFilter] = useState<string>('all');

  // 적용된 필터 상태 (실제 필터링에 사용)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category: 'all',
    follower: 'all',
    engagement: 'all',
    activity: 'all'
  });

  // 정렬 상태 (기본: 팔로워수 내림차순)
  const [sortField, setSortField] = useState<SortField | null>('followerCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<DashInfluencerWithDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 페이지네이션 상태 (0-based로 변경하여 서버와 일치)
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 15;



  // 행 클릭 핸들러
  const handleRowClick = (item: DashInfluencerWithDetail) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  // 인플루언서 갱신 후 로컬 상태 업데이트
  const handleInfluencerRefresh = useCallback((
    updatedInfluencer: DashInfluencer,
    updatedDetail: DashInfluencerDetail | null
  ) => {
    // 전체 목록에서 해당 인플루언서 업데이트
    setAllData(prev =>
      prev.map(item =>
        item.dashInfluencer.id === updatedInfluencer.id
          ? {
            ...item,
            dashInfluencer: updatedInfluencer,
            dashInfluencerDetail: updatedDetail ?? item.dashInfluencerDetail
          }
          : item
      )
    );

    // 선택된 아이템도 업데이트
    setSelectedItem(prev =>
      prev && prev.dashInfluencer.id === updatedInfluencer.id
        ? {
          ...prev,
          dashInfluencer: updatedInfluencer,
          dashInfluencerDetail: updatedDetail ?? prev.dashInfluencerDetail
        }
        : prev
    );
  }, []);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 검색 핸들러 - 임시 필터를 적용 상태로 복사
  const handleSearch = () => {
    // 로딩 상태로 전환
    setAllData([]);
    setLoading(true);

    setAppliedFilters({
      search: tempSearchQuery,
      category: tempCategoryFilter,
      follower: tempFollowerFilter,
      engagement: tempEngagementFilter,
      activity: tempActivityFilter
    });
    setCurrentPage(0);
  };

  // 초기화 핸들러 - 임시 상태와 적용 상태 모두 초기화
  const handleReset = () => {
    // 로딩 상태로 전환
    setAllData([]);
    setLoading(true);

    setTempSearchQuery('');
    setTempCategoryFilter('all');
    setTempFollowerFilter('all');
    setTempEngagementFilter('all');
    setTempActivityFilter('all');
    setAppliedFilters({
      search: '',
      category: 'all',
      follower: 'all',
      engagement: 'all',
      activity: 'all'
    });
    setCurrentPage(0);
  };

  // 팔로워 필터 → followerMin/Max 변환
  const getFollowerRange = (filter: string): { followerMin?: number; followerMax?: number } => {
    switch (filter) {
      case 'under1k': return { followerMax: 999 };
      case '1k-10k': return { followerMin: 1000, followerMax: 9999 };
      case '10k-50k': return { followerMin: 10000, followerMax: 49999 };
      case '50k-100k': return { followerMin: 50000, followerMax: 99999 };
      case 'over100k': return { followerMin: 100000 };
      default: return {};
    }
  };

  // 활동 필터 → activityWithin 변환
  const getActivityDays = (filter: string): number | undefined => {
    switch (filter) {
      case 'week': return 7;
      case 'month': return 30;
      case '3months': return 90;
      default: return undefined;
    }
  };

  // 참여율 필터 → engagementMin 변환
  const getEngagementMin = (filter: string): number | undefined => {
    switch (filter) {
      case 'over1': return 1;
      case 'over3': return 3;
      case 'over5': return 5;
      case 'over10': return 10;
      default: return undefined;
    }
  };



  // ---------------------------------------------------------------------------
  // [Client-Side Filter Helpers]
  // API가 base followerCount(오래된 값) 기준으로 필터링하는 경우가 있어,
  // 최신 detail 정보를 기준으로 클라이언트에서 2차 필터링 수행
  // ---------------------------------------------------------------------------

  const checkFollowerFilter = (item: DashInfluencerWithDetail, filter: string): boolean => {
    if (filter === 'all') return true;
    const detail = item.dashInfluencerDetail;
    const base = item.dashInfluencer;
    // UI와 동일한 우선순위: detail -> base -> 0
    const count = detail?.followersCount ?? base.followerCount ?? 0;

    switch (filter) {
      case 'under1k': return count < 1000;
      case '1k-10k': return count >= 1000 && count < 10000;
      case '10k-50k': return count >= 10000 && count < 50000;
      case '50k-100k': return count >= 50000 && count < 100000;
      case 'over100k': return count >= 100000;
      default: return true;
    }
  };

  const checkEngagementFilter = (item: DashInfluencerWithDetail, filter: string): boolean => {
    if (filter === 'all') return true;
    const detail = item.dashInfluencerDetail;
    const base = item.dashInfluencer;

    // UI 로직 복사: (avgLikes + avgComments) / followerCount * 100
    const allPosts = detail?.latestPosts || [];
    const avgLikes = allPosts.length > 0
      ? Math.round(allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / allPosts.length)
      : 0;
    const avgComments = allPosts.length > 0
      ? Math.round(allPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / allPosts.length)
      : 0;

    const followerCount = detail?.followersCount ?? base.followerCount ?? 0;
    const engagementRate = followerCount > 0
      ? ((avgLikes + avgComments) / followerCount) * 100
      : 0;

    switch (filter) {
      case 'over1': return engagementRate >= 1;
      case 'over3': return engagementRate >= 3;
      case 'over5': return engagementRate >= 5;
      case 'over10': return engagementRate >= 10;
      default: return true;
    }
  };

  const checkActivityFilter = (item: DashInfluencerWithDetail, filter: string): boolean => {
    if (filter === 'all') return true;

    // UI 로직: 가장 최근 게시물 날짜 비교
    const allPosts = item.dashInfluencerDetail?.latestPosts || [];
    const postsWithTimestamp = allPosts.filter(p => p.timestamp);
    if (postsWithTimestamp.length === 0) return false; // 활동 기록 없으면 제외 (엄격 모드)

    const latestPostDate = new Date(Math.max(...postsWithTimestamp.map(p => new Date(p.timestamp).getTime())));
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - latestPostDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (filter) {
      case 'week': return diffDays <= 7;
      case 'month': return diffDays <= 30;
      case '3months': return diffDays <= 90;
      default: return true;
    }
  };


  // 참여율 필터 적용 시 자동으로 참여율 순 정렬 (내림차순)
  useEffect(() => {
    if (appliedFilters.engagement !== 'all') {
      setSortField('engagementRate');
      setSortDirection('desc');
    }
  }, [appliedFilters.engagement]);

  // 데이터 로드: 항상 전체 데이터를 가져와서 클라이언트에서 처리
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const followerRange = getFollowerRange(appliedFilters.follower);
        const activityWithin = getActivityDays(appliedFilters.activity);
        const engagementMin = getEngagementMin(appliedFilters.engagement);

        // 1. API 호출 (1차 필터링 - 서버 사이드)
        // 주의: 서버는 'followerCount'(base) 기준으로 필터링할 수 있음 -> 오차 발생 가능
        // 페이지네이션 없이 전체 데이터 로드 (최대 1000건)
        let result = await fetchAllDashInfluencersWithDetail({
          keyword: appliedFilters.search || undefined,
          category: appliedFilters.category !== 'all' ? appliedFilters.category : undefined,
          ...followerRange,
          activityWithin,
          engagementMin,
        });

        // 2. 클라이언트 필터링 (2차 필터링 - 보정)
        // API가 반환한 데이터 중, 최신 detail 정보 기준으로 조건에 맞지 않는 항목 제거
        if (appliedFilters.follower !== 'all') {
          result = result.filter(item => checkFollowerFilter(item, appliedFilters.follower));
        }
        if (appliedFilters.engagement !== 'all') {
          result = result.filter(item => checkEngagementFilter(item, appliedFilters.engagement));
        }
        if (appliedFilters.activity !== 'all') {
          result = result.filter(item => checkActivityFilter(item, appliedFilters.activity));
        }

        setAllData(result);
      } catch (err) {
        console.error('[InfluencersTab] 전체 데이터 로드 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [
    appliedFilters.search,
    appliedFilters.category,
    appliedFilters.follower,
    appliedFilters.engagement,
    appliedFilters.activity,
  ]);

  // 데이터 소스: 전체 데이터
  const dataSource = allData;

  // 정렬 (sortField 있으면 항상 적용, dataSource 전체 대상)
  const sortedData = sortField
    ? [...dataSource].sort((a, b) => {
      const aDetail = a.dashInfluencerDetail;
      const bDetail = b.dashInfluencerDetail;
      const aPosts = aDetail?.latestPosts || [];
      const bPosts = bDetail?.latestPosts || [];

      let aVal = 0;
      let bVal = 0;

      switch (sortField) {
        case 'followerCount':
          aVal = aDetail?.followersCount || a.dashInfluencer.followerCount || 0;
          bVal = bDetail?.followersCount || b.dashInfluencer.followerCount || 0;
          break;
        case 'postsCount':
          aVal = aDetail?.postsCount || 0;
          bVal = bDetail?.postsCount || 0;
          break;
        case 'avgLikes':
          aVal = aPosts.length > 0 ? aPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / aPosts.length : 0;
          bVal = bPosts.length > 0 ? bPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / bPosts.length : 0;
          break;
        case 'avgComments':
          aVal = aPosts.length > 0 ? aPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / aPosts.length : 0;
          bVal = bPosts.length > 0 ? bPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / bPosts.length : 0;
          break;
        case 'engagementRate': {
          const aFollowers = aDetail?.followersCount || a.dashInfluencer.followerCount || 0;
          const bFollowers = bDetail?.followersCount || b.dashInfluencer.followerCount || 0;
          const aAvgLikes = aPosts.length > 0 ? aPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / aPosts.length : 0;
          const bAvgLikes = bPosts.length > 0 ? bPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / bPosts.length : 0;
          const aAvgComments = aPosts.length > 0 ? aPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / aPosts.length : 0;
          const bAvgComments = bPosts.length > 0 ? bPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / bPosts.length : 0;
          aVal = aFollowers > 0 ? ((aAvgLikes + aAvgComments) / aFollowers) * 100 : 0;
          bVal = bFollowers > 0 ? ((bAvgLikes + bAvgComments) / bFollowers) * 100 : 0;
          break;
        }
        case 'latestPost': {
          const aLatest = aPosts.length > 0 ? Math.max(...aPosts.map(p => new Date(p.timestamp).getTime())) : 0;
          const bLatest = bPosts.length > 0 ? Math.max(...bPosts.map(p => new Date(p.timestamp).getTime())) : 0;
          aVal = aLatest;
          bVal = bLatest;
          break;
        }
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    })
    : dataSource;

  // 페이징
  const paginatedInfluencers = sortedData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // totalPages/totalElements
  const totalElements = allData.length;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE);

  // 카테고리 목록 추출
  const allCategories = Array.from(
    new Set(allData.flatMap((item) => item?.dashInfluencer?.category || []))
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-orange-500" />
        <span className="text-slate-500">인플루언서 데이터 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">데이터 로드 실패</div>
          <div className="text-slate-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">인플루언서 탐색</h2>
            <p className="text-sm text-slate-500">자유롭게 인플루언서를 탐색해 보세요.</p>
          </div>
          <div className="text-sm text-slate-500">
            {totalElements > 0
              ? `${totalElements}명 중 ${currentPage * PAGE_SIZE + 1}-${Math.min((currentPage + 1) * PAGE_SIZE, totalElements)}`
              : '0명'}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 카테고리 */}
          <select
            value={tempCategoryFilter}
            onChange={(e) => setTempCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="all">전체 카테고리</option>
            {allCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* 팔로워수 */}
          <select
            value={tempFollowerFilter}
            onChange={(e) => setTempFollowerFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="all">전체 팔로워</option>
            <option value="under1k">1K 미만</option>
            <option value="1k-10k">1K - 10K</option>
            <option value="10k-50k">10K - 50K</option>
            <option value="50k-100k">50K - 100K</option>
            <option value="over100k">100K 이상</option>
          </select>

          {/* 참여율 */}
          <select
            value={tempEngagementFilter}
            onChange={(e) => setTempEngagementFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="all">전체 참여율</option>
            <option value="over1">1% 이상</option>
            <option value="over3">3% 이상</option>
            <option value="over5">5% 이상</option>
            <option value="over10">10% 이상</option>
          </select>

          {/* 최근 활동 */}
          <select
            value={tempActivityFilter}
            onChange={(e) => setTempActivityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="all">전체 활동</option>
            <option value="week">1주 이내</option>
            <option value="month">1달 이내</option>
            <option value="3months">3달 이내</option>
          </select>

          {/* 검색 입력창 */}
          <div className="flex-1 relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름 또는 핸들 검색..."
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            검색
          </button>

          {/* 초기화 */}
          {(appliedFilters.search !== '' || appliedFilters.category !== 'all' || appliedFilters.follower !== 'all' || appliedFilters.engagement !== 'all' || appliedFilters.activity !== 'all') && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {paginatedInfluencers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHeader
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <tbody>
                {paginatedInfluencers.map((item) => (
                  <TableRow
                    key={item.dashInfluencer.id}
                    item={item}
                    onClick={() => handleRowClick(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <div className="text-lg font-semibold text-slate-700 mb-1">인플루언서가 없습니다</div>
            <div className="text-sm text-slate-500">검색 조건을 변경해보세요</div>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(page => {
                if (totalPages <= 7) return true;
                if (page === 0 || page === totalPages - 1) return true;
                if (Math.abs(page - currentPage) <= 2) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <span key={page} className="flex items-center gap-2">
                    {showEllipsis && <span className="text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === page
                        ? 'bg-orange-500 text-white'
                        : 'border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {page + 1}
                    </button>
                  </span>
                );
              })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      <InfluencerDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRefresh={handleInfluencerRefresh}
      />
    </div>
  );
}
