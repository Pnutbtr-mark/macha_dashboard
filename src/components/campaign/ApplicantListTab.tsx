import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Heart, ExternalLink, Users, UserPlus, X, Instagram, MessageCircle, Calendar, Play, Eye, RefreshCw, Loader2, Link2, Pencil } from 'lucide-react';
import type { DashInfluencerWithDetail, DashInfluencerPost, DashInfluencer, DashInfluencerDetail, DashCampaignInfluencerParticipate } from '../../types/metaDash';
import type { SeedingItem, Influencer } from '../../types';
import { getProxiedImageUrl, isInstagramCdnUrl, getInstagramProfileImageUrl, getInstagramPostImageUrl } from '../../utils/imageProxy';
import { formatNumber as formatNumberBase, formatPercent } from '../../utils/formatters';
import { updateDashInfluencer, fetchDashInfluencerDetail } from '../../services/metaDashApi';

// 숫자 포맷팅 (null/undefined 처리 포함)
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

// Instagram 프로필 이미지 컴포넌트 (CDN 만료 대응)
function InstagramProfileImage({
  originalUrl,
  username,
  name,
  size = 'md',
}: {
  originalUrl: string | null | undefined;
  username: string | null | undefined;
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-24 h-24 text-3xl',
  };

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
      if (username && isInstagramCdnUrl(originalUrl)) {
        try {
          const apiUrl = getInstagramProfileImageUrl(username);
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
          console.warn('프로필 이미지 로딩 실패:', username, error);
        }
      }

      // 3. 실패 시 fallback
      setHasFailed(true);
      setIsLoading(false);
    };

    loadImage();
  }, [originalUrl, username]);

  const handleImageError = async () => {
    // 이미지 로드 실패 시 API fallback 시도
    if (!hasFailed && username) {
      try {
        const apiUrl = getInstagramProfileImageUrl(username);
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            setImageSrc(data.imageUrl);
            return;
          }
        }
      } catch (error) {
        console.warn('프로필 이미지 fallback 실패:', username, error);
      }
    }
    setHasFailed(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const initial = (name ?? '?').charAt(0).toUpperCase();

  if (hasFailed || !imageSrc) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold`}>
        {initial}
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {isLoading && (
        <div className="w-full h-full rounded-full bg-slate-200 animate-pulse absolute inset-0" />
      )}
      <img
        src={imageSrc}
        alt={name ?? ''}
        referrerPolicy="no-referrer"
        className={`w-full h-full rounded-full object-cover bg-slate-100 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
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

// 콘텐츠 유형 분포 차트 컴포넌트
function ContentTypeChart({ posts }: { posts: DashInfluencerPost[] }) {
  const total = posts.length;
  if (total === 0) return null;

  const carousel = posts.filter(p => p.type === 'Sidecar' || (p.childPosts && p.childPosts.length > 0)).length;
  const reels = posts.filter(p => p.type === 'Video' || p.productType === 'reels').length;
  const image = total - carousel - reels;

  const carouselPct = Math.round((carousel / total) * 100);
  const reelsPct = Math.round((reels / total) * 100);
  const imagePct = 100 - carouselPct - reelsPct;

  const gradient = `conic-gradient(
    #f97316 0% ${carouselPct}%,
    #8b5cf6 ${carouselPct}% ${carouselPct + reelsPct}%,
    #06b6d4 ${carouselPct + reelsPct}% 100%
  )`;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24">
        <div className="w-full h-full rounded-full" style={{ background: gradient }} />
        <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-slate-500">전체</div>
            <div className="font-bold text-slate-900">{total}</div>
          </div>
        </div>
      </div>
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !item) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);

    try {
      const updated = await updateDashInfluencer(item.dashInfluencer.id, item.dashInfluencer);
      if (!updated) throw new Error('갱신된 데이터를 받지 못했습니다');

      const detailResponse = await fetchDashInfluencerDetail(item.dashInfluencer.id);
      const updatedDetail = detailResponse?.dashInfluencerDetail || null;

      if (onRefresh) onRefresh(updated, updatedDetail);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (error) {
      console.error('인플루언서 데이터 갱신 실패:', error);
      setRefreshError(error instanceof Error ? error.message : '갱신 실패');
      setTimeout(() => setRefreshError(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen || !item) return null;

  const influencer = item.dashInfluencer;
  const detail = item.dashInfluencerDetail;
  const allPosts = detail?.latestPosts || [];

  const feedPosts = allPosts.filter(p => p.productType !== 'reels' && p.type !== 'Video');
  const reelsPosts = allPosts.filter(p => p.productType === 'reels' || p.type === 'Video');

  const sortedFeedPosts = [...feedPosts].sort((a, b) => {
    if (feedSortBy === 'popular') return (b.likesCount || 0) - (a.likesCount || 0);
    if (feedSortBy === 'comments') return (b.commentsCount || 0) - (a.commentsCount || 0);
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  const sortedReelsPosts = [...reelsPosts].sort((a, b) => {
    if (reelsSortBy === 'popular') return (b.likesCount || 0) - (a.likesCount || 0);
    if (reelsSortBy === 'views') return (b.videoViewCount || 0) - (a.videoViewCount || 0);
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  const avgLikes = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / allPosts.length)
    : 0;
  const avgComments = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / allPosts.length)
    : 0;

  const MAX_VALID_VIEW_COUNT = 1_000_000_000;
  const getValidViewCount = (count: number | string | undefined | null) => {
    const value = Number(count) || 0;
    if (!Number.isFinite(value) || value < 0 || value > MAX_VALID_VIEW_COUNT) return 0;
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 hover:bg-slate-100 rounded-full transition-colors">
          <X size={18} className="text-slate-500" />
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* 프로필 헤더 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <InstagramProfileImage
                  originalUrl={detail?.profilePicUrl}
                  username={influencer?.username}
                  name={influencer?.name}
                  size="md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">{influencer?.category?.join(' · ')}</div>
                <h2 className="text-xl font-bold text-slate-900">{detail?.fullName || influencer?.name || '-'}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                  <div className="flex items-center gap-1"><Instagram size={14} /><span>팔로워 {formatNumber(detail?.followersCount)}</span></div>
                  <div>게시글수 {formatNumber(detail?.postsCount)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mr-8">
                <button onClick={handleRefresh} disabled={refreshing} className={`p-2 border rounded-lg transition-colors ${refreshing ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-200 hover:bg-slate-50'}`} title="데이터 새로고침">
                  {refreshing ? <Loader2 size={20} className="text-slate-400 animate-spin" /> : <RefreshCw size={20} className="text-slate-400" />}
                </button>
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"><Heart size={20} className="text-slate-400" /></button>
                <a href={`https://instagram.com/${influencer.username?.trim()}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                  <ExternalLink size={16} /><span>프로필 바로가기</span>
                </a>
              </div>
            </div>
            {refreshSuccess && <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">데이터가 성공적으로 갱신되었습니다.</div>}
            {refreshError && <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">갱신 실패: {refreshError}</div>}
            {detail?.biography && <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 whitespace-pre-line">{detail.biography}</div>}
          </div>

          {/* 성과 지표 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">인플루언서와 얼마나 잘 맞는지 확인해 보세요</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-3">• 성과 지표</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-xs text-slate-500">평균 댓글</div><div className="font-bold text-slate-900">{formatNumber(avgComments)}개</div></div>
                  <div><div className="text-xs text-slate-500">평균 좋아요</div><div className="font-bold text-slate-900">{formatNumber(avgLikes)}</div></div>
                  <div><div className="text-xs text-slate-500">릴스 평균 조회수</div><div className="font-bold text-slate-900">{formatNumber(avgReelsViews)}회</div></div>
                  <div><div className="text-xs text-slate-500">릴스 평균 참여율</div><div className="font-bold text-slate-900">{formatPercent(reelsEngagement)}</div></div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-3">• 콘텐츠 매칭 점수</div>
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">AI 추천에서만 제공해요</div>
              </div>
            </div>
          </div>

          {/* 콘텐츠 분석 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">최근 콘텐츠를 분석해 봤어요</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500 mb-3">• 콘텐츠 유형 분포</div>
                <ContentTypeChart posts={allPosts} />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-3">• 브랜드 협업 비율</div>
                <div className="flex items-center justify-center h-24">
                  <div className="text-center text-slate-400 text-sm">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-2xl">?</div>
                    데이터가 충분하지 않아요
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 피드 콘텐츠 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">피드 콘텐츠</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>평균 좋아요 <strong>{formatNumber(feedPosts.length > 0 ? Math.round(feedPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / feedPosts.length) : 0)}</strong> 개</span>
                <span>평균 댓글 <strong>{formatNumber(feedPosts.length > 0 ? Math.round(feedPosts.reduce((s, p) => s + (p.commentsCount || 0), 0) / feedPosts.length) : 0)}</strong> 개</span>
              </div>
            </div>
            <div className="flex border-b border-slate-200 mb-3">
              {[{ key: 'popular', label: '인기순' }, { key: 'comments', label: '댓글순' }, { key: 'latest', label: '최신순' }].map((tab) => (
                <button key={tab.key} onClick={() => setFeedSortBy(tab.key as typeof feedSortBy)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${feedSortBy === tab.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sortedFeedPosts.slice(0, 15).map((post, idx) => (
                <a key={post.id || idx} href={post.url || `https://instagram.com/p/${post.shortCode}`} target="_blank" rel="noopener noreferrer" className="group relative aspect-square">
                  <InstagramPostImage
                    originalUrl={post.displayUrl || post.images?.[0]}
                    shortCode={post.shortCode}
                    alt={`Post ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="text-white text-xs text-center space-y-1">
                      <div className="flex items-center justify-center gap-1"><Heart size={12} fill="white" /><span>{formatNumber(post.likesCount || 0)}</span></div>
                      <div className="flex items-center justify-center gap-1"><MessageCircle size={12} fill="white" /><span>{formatNumber(post.commentsCount || 0)}</span></div>
                      {post.timestamp && <div className="flex items-center justify-center gap-1"><Calendar size={12} /><span>{new Date(post.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span></div>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {sortedFeedPosts.length === 0 && <div className="text-center py-8 text-slate-400">등록된 피드 콘텐츠가 없어요</div>}
          </div>

          {/* 릴스 콘텐츠 */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">릴스 콘텐츠</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>평균 조회수 <strong>{formatNumber(avgReelsViews)}</strong> 회</span>
                <span>평균 좋아요 <strong>{formatNumber(reelsPosts.length > 0 ? Math.round(reelsPosts.reduce((s, p) => s + (p.likesCount || 0), 0) / reelsPosts.length) : 0)}</strong> 개</span>
              </div>
            </div>
            <div className="flex border-b border-slate-200 mb-3">
              {[{ key: 'views', label: '조회수순' }, { key: 'popular', label: '좋아요순' }, { key: 'latest', label: '최신순' }].map((tab) => (
                <button key={tab.key} onClick={() => setReelsSortBy(tab.key as typeof reelsSortBy)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reelsSortBy === tab.key ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sortedReelsPosts.slice(0, 15).map((post, idx) => (
                <a key={post.id || idx} href={post.url || `https://instagram.com/p/${post.shortCode}`} target="_blank" rel="noopener noreferrer" className="group relative aspect-square">
                  <InstagramPostImage
                    originalUrl={post.displayUrl || post.images?.[0]}
                    shortCode={post.shortCode}
                    alt={`Reels ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1"><Play size={12} fill="white" className="text-white" /></div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="text-white text-xs text-center space-y-1">
                      <div className="flex items-center justify-center gap-1"><Eye size={12} /><span>{formatNumber(post.videoViewCount || 0)}</span></div>
                      <div className="flex items-center justify-center gap-1"><Heart size={12} fill="white" /><span>{formatNumber(post.likesCount || 0)}</span></div>
                      <div className="flex items-center justify-center gap-1"><MessageCircle size={12} fill="white" /><span>{formatNumber(post.commentsCount || 0)}</span></div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {sortedReelsPosts.length === 0 && <div className="text-center py-8 text-slate-400">등록된 릴스 콘텐츠가 없어요</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ApplicantListTabProps {
  // 매칭된 인플루언서 목록 (DashInfluencerWithDetail)
  matchedInfluencers: DashInfluencerWithDetail[];
  // 선택된 인플루언서를 참여자로 추가
  onAddToSeeding: (seedingItems: SeedingItem[]) => void;
  campaignId: string;
  // 참여 인플루언서 모드 (되돌리기 버튼 표시)
  isSeeding?: boolean;
  // 되돌리기 콜백 (isSeeding 모드에서 사용)
  onRemoveFromSeeding?: (influencerIds: string[]) => void;
  // 참여자 목록 (게시물 URL 조회용)
  participants?: DashCampaignInfluencerParticipate[];
  // 게시물 URL 업데이트 콜백
  onPostUrlUpdate?: (influencerId: string, postUrl: string) => Promise<void>;
}

const PAGE_SIZE = 15;

// 정렬 필드 타입
type SortField = 'followerCount' | 'postsCount' | 'avgLikes' | 'avgComments' | 'engagementRate' | 'latestPost';
type SortDirection = 'asc' | 'desc';

// 테이블 헤더 컴포넌트 (InfluencersTab UI 기반 + 체크박스)
function TableHeader({
  sortField,
  sortDirection,
  onSort,
  isAllSelected,
  onSelectAll,
  isSeeding = false,
}: {
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  isAllSelected: boolean;
  onSelectAll: () => void;
  isSeeding?: boolean;
}) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-orange-500" />
      : <ChevronDown size={14} className="text-orange-500" />;
  };

  const headerBaseClass = "px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 select-none whitespace-nowrap";

  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {/* 체크박스 */}
        <th className="px-4 py-3 w-10">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-48">
          프로필
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-36">
          활동분야
        </th>
        {isSeeding && (
          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-24">
            링크
          </th>
        )}
        <th className={`${headerBaseClass} w-24`} onClick={() => onSort('followerCount')}>
          <div className="flex items-center justify-end gap-1 w-full">
            팔로워수 <SortIcon field="followerCount" />
          </div>
        </th>
        <th className={`${headerBaseClass} w-20`} onClick={() => onSort('postsCount')}>
          <div className="flex items-center justify-end gap-1 w-full">
            게시물수 <SortIcon field="postsCount" />
          </div>
        </th>
        <th className={`${headerBaseClass} w-24`} onClick={() => onSort('avgLikes')}>
          <div className="flex items-center justify-end gap-1 w-full">
            평균좋아요 <SortIcon field="avgLikes" />
          </div>
        </th>
        <th className={`${headerBaseClass} w-20`} onClick={() => onSort('avgComments')}>
          <div className="flex items-center justify-end gap-1 w-full">
            평균댓글 <SortIcon field="avgComments" />
          </div>
        </th>
        <th className={`${headerBaseClass} w-20`} onClick={() => onSort('engagementRate')}>
          <div className="flex items-center justify-end gap-1 w-full">
            참여율 <SortIcon field="engagementRate" />
          </div>
        </th>
        <th className={`${headerBaseClass} w-24`} onClick={() => onSort('latestPost')}>
          <div className="flex items-center justify-center gap-1 w-full">
            최근활동 <SortIcon field="latestPost" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap w-56">
          콘텐츠
        </th>
      </tr>
    </thead>
  );
}

// 테이블 행 컴포넌트 (InfluencersTab UI 기반 + 체크박스)
function TableRow({
  item,
  isSelected,
  onSelect,
  onClick,
  isSeeding = false,
  postUrl,
  onLinkClick,
}: {
  item: DashInfluencerWithDetail;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  isSeeding?: boolean;
  postUrl?: string;
  onLinkClick?: () => void;
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

  // 참여율 계산
  const followerCount = detail?.followersCount || influencer.followerCount || 0;
  const engagementRate = followerCount > 0 && avgLikes !== null && avgComments !== null
    ? ((avgLikes + avgComments) / followerCount) * 100
    : null;

  // 최근 활동
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
      className={`border-b border-slate-100 hover:bg-orange-50/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-orange-50' : ''
      }`}
      onClick={onClick}
    >
      {/* 체크박스 */}
      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
        />
      </td>

      {/* 프로필 */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0">
            <InstagramProfileImage
              originalUrl={detail?.profilePicUrl || influencer?.profileImageUrl}
              username={influencer?.username}
              name={influencer?.name}
              size="sm"
            />
          </div>

          {/* 이름 + 카테고리 */}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{influencer?.name ?? '-'}</div>
            {influencer?.category && influencer.category.length > 0 && (
              <div className="text-xs text-slate-500 truncate">
                {influencer.category.join(' · ')}
              </div>
            )}
            {/* 하트 + 인스타 버튼 */}
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

      {/* 링크 (참여 인플루언서 모드에서만 표시) */}
      {isSeeding && (
        <td className="px-4 py-4 w-24" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            {postUrl ? (
              <>
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  <Link2 size={12} />
                  링크
                </a>
                <button
                  onClick={() => onLinkClick?.()}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="링크 수정"
                >
                  <Pencil size={12} className="text-slate-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onLinkClick?.()}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Link2 size={12} />
                링크 입력
              </button>
            )}
          </div>
        </td>
      )}

      {/* 팔로워수 */}
      <td className="px-4 py-4 text-sm text-slate-700 font-medium w-24">
        <div className="flex items-center justify-end gap-1 w-full">
          <span className="tabular-nums">{formatNumber(detail?.followersCount || influencer.followerCount)}</span>
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 게시물수 */}
      <td className="px-4 py-4 text-sm text-slate-700 w-20">
        <div className="flex items-center justify-end gap-1 w-full">
          <span className="tabular-nums">{formatNumber(detail?.postsCount)}</span>
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 평균 좋아요 */}
      <td className="px-4 py-4 text-sm text-slate-700 w-24">
        <div className="flex items-center justify-end gap-1 w-full">
          <span className="tabular-nums">{formatNumber(avgLikes)}</span>
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 평균 댓글 */}
      <td className="px-4 py-4 text-sm text-slate-700 w-20">
        <div className="flex items-center justify-end gap-1 w-full">
          <span className="tabular-nums">{formatNumber(avgComments)}</span>
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 참여율 */}
      <td className="px-4 py-4 text-sm text-slate-700 w-20">
        <div className="flex items-center justify-end gap-1 w-full">
          <span className="tabular-nums">{engagementRate !== null ? formatPercent(engagementRate, 2) : '-'}</span>
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 최근 활동 */}
      <td className="px-4 py-4 text-sm text-slate-700 w-24">
        <div className="flex items-center justify-center gap-1 w-full">
          {formatDate(latestPostDate)}
          <span className="w-[14px]" />
        </div>
      </td>

      {/* 콘텐츠 썸네일 */}
      <td className="px-4 py-4 w-56">
        <div className="flex gap-1">
          {latestPosts.map((post, idx) => (
            <InstagramPostImage
              key={post.id || idx}
              originalUrl={post.displayUrl || post.images?.[0]}
              shortCode={post.shortCode}
              alt={`Post ${idx + 1}`}
              className="w-16 h-16 object-cover rounded-lg"
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

// 액션 바 컴포넌트
function ActionBar({
  selectedCount,
  onAddToSeeding,
  onClearSelection,
  isSeeding = false,
  onRemoveFromSeeding,
}: {
  selectedCount: number;
  onAddToSeeding: () => void;
  onClearSelection: () => void;
  isSeeding?: boolean;
  onRemoveFromSeeding?: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className={`${isSeeding ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isSeeding ? 'text-red-700' : 'text-orange-700'}`}>
            <span className={`${isSeeding ? 'text-red-900' : 'text-orange-900'} font-bold`}>{selectedCount}명</span> 선택됨
          </span>

          {isSeeding ? (
            /* 신청자로 되돌리기 버튼 */
            <button
              onClick={onRemoveFromSeeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <X size={14} />
              신청자로 되돌리기
            </button>
          ) : (
            /* 참여자로 추가 버튼 */
            <button
              onClick={onAddToSeeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <UserPlus size={14} />
              참여자로 추가
            </button>
          )}
        </div>

        {/* 선택 취소 */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <X size={14} />
          선택 취소
        </button>
      </div>
    </div>
  );
}

// 게시물 URL 입력 모달
function PostUrlModal({
  isOpen,
  onClose,
  onSave,
  initialUrl,
  influencerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
  initialUrl: string;
  influencerName: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setError(null);
    }
  }, [isOpen, initialUrl]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(url.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-full transition-colors">
          <X size={18} className="text-slate-500" />
        </button>
        <h3 className="text-lg font-bold text-slate-900 mb-1">게시물 링크</h3>
        <p className="text-sm text-slate-500 mb-4">{influencerName}의 게시물 URL을 입력해주세요.</p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/p/..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 mb-2"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// DashInfluencerWithDetail을 SeedingItem으로 변환
function convertInfluencerToSeeding(item: DashInfluencerWithDetail, campaignId: string): SeedingItem {
  const inf = item.dashInfluencer;
  const detail = item.dashInfluencerDetail;

  const influencer: Influencer = {
    id: inf.id,
    name: inf.name || '',
    handle: inf.username || '',
    platform: 'instagram',
    thumbnail: detail?.profilePicUrl || inf.profileImageUrl || '',
    followers: detail?.followersCount || inf.followerCount || 0,
    engagementRate: 0,
    avgLikes: 0,
    avgComments: 0,
    category: inf.category || [],
    priceRange: '',
    verified: false,
  };

  return {
    id: `seeding-${inf.id}`,
    campaignId,
    influencer,
    type: 'free',
    status: 'confirmed',
    requestDate: new Date().toISOString(),
    notes: `신청자에서 전환됨 (${inf.name})`,
  };
}

// 메인 컴포넌트
export function ApplicantListTab({
  matchedInfluencers,
  onAddToSeeding,
  campaignId,
  isSeeding = false,
  onRemoveFromSeeding,
  participants,
  onPostUrlUpdate,
}: ApplicantListTabProps) {
  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // 정렬 상태 (기본: 팔로워수 내림차순)
  const [sortField, setSortField] = useState<SortField | null>('followerCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 상세 모달 상태
  const [selectedInfluencer, setSelectedInfluencer] = useState<DashInfluencerWithDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 게시물 URL 모달 상태
  const [postUrlModalOpen, setPostUrlModalOpen] = useState(false);
  const [postUrlTarget, setPostUrlTarget] = useState<{ influencerId: string; name: string } | null>(null);

  // 인플루언서 ID로 게시물 URL 조회
  const getPostUrl = useCallback((influencerId: string): string | undefined => {
    return participants?.find(p => p.dashInfluencer.id === influencerId)?.postUrl;
  }, [participants]);

  // 링크 버튼 클릭
  const handleLinkClick = useCallback((influencerId: string, name: string) => {
    setPostUrlTarget({ influencerId, name });
    setPostUrlModalOpen(true);
  }, []);

  // 게시물 URL 저장
  const handlePostUrlSave = useCallback(async (url: string) => {
    if (!postUrlTarget || !onPostUrlUpdate) return;
    await onPostUrlUpdate(postUrlTarget.influencerId, url);
  }, [postUrlTarget, onPostUrlUpdate]);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 필터링
  const filteredInfluencers = useMemo(() => {
    if (!searchQuery) return matchedInfluencers;

    const query = searchQuery.toLowerCase();
    return matchedInfluencers.filter(item => {
      const inf = item.dashInfluencer;
      return (
        (inf.name?.toLowerCase().includes(query) ?? false) ||
        (inf.username?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [matchedInfluencers, searchQuery]);

  // 정렬
  const sortedInfluencers = useMemo(() => {
    if (!sortField) return filteredInfluencers;

    return [...filteredInfluencers].sort((a, b) => {
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
    });
  }, [filteredInfluencers, sortField, sortDirection]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedInfluencers.length / PAGE_SIZE);
  const paginatedInfluencers = sortedInfluencers.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  // 전체 선택 상태
  const isAllSelected = paginatedInfluencers.length > 0 &&
    paginatedInfluencers.every(item => selectedIds.has(item.dashInfluencer.id));

  // 선택 핸들러
  const handleSelectInfluencer = useCallback((influencerId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(influencerId)) {
        newSet.delete(influencerId);
      } else {
        newSet.add(influencerId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInfluencers.map(item => item.dashInfluencer.id)));
    }
  }, [isAllSelected, paginatedInfluencers]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 참여자로 추가
  const handleAddToSeeding = useCallback(() => {
    const selectedInfluencers = matchedInfluencers.filter(item =>
      selectedIds.has(item.dashInfluencer.id)
    );
    const seedingItems = selectedInfluencers.map(item =>
      convertInfluencerToSeeding(item, campaignId)
    );
    onAddToSeeding(seedingItems);
    setSelectedIds(new Set());
  }, [matchedInfluencers, selectedIds, campaignId, onAddToSeeding]);

  // 신청자로 되돌리기
  const handleRemoveFromSeeding = useCallback(() => {
    if (onRemoveFromSeeding) {
      onRemoveFromSeeding(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, onRemoveFromSeeding]);

  // 행 클릭 (현재는 아무 동작 없음 - 필요 시 상세 모달 추가 가능)
  const handleRowClick = useCallback((item: DashInfluencerWithDetail) => {
    setSelectedInfluencer(item);
    setIsDetailModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isSeeding ? '참여 인플루언서' : '신청자 리스트'}
            </h2>
            <p className="text-sm text-slate-500">
              {isSeeding
                ? '캠페인에 참여하는 인플루언서 목록입니다.'
                : '캠페인에 신청한 인플루언서 중 웰링크에 가입된 목록입니다.'}
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {sortedInfluencers.length > 0
              ? `${sortedInfluencers.length}명 중 ${currentPage * PAGE_SIZE + 1}-${Math.min((currentPage + 1) * PAGE_SIZE, sortedInfluencers.length)}`
              : '0명'}
          </div>
        </div>

        {/* 검색 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름 또는 핸들 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
        </div>
      </div>

      {/* 액션 바 */}
      <ActionBar
        selectedCount={selectedIds.size}
        onAddToSeeding={handleAddToSeeding}
        onClearSelection={handleClearSelection}
        isSeeding={isSeeding}
        onRemoveFromSeeding={handleRemoveFromSeeding}
      />

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {sortedInfluencers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHeader
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                isAllSelected={isAllSelected}
                onSelectAll={handleSelectAll}
                isSeeding={isSeeding}
              />
              <tbody>
                {paginatedInfluencers.map((item) => (
                  <TableRow
                    key={item.dashInfluencer.id}
                    item={item}
                    isSelected={selectedIds.has(item.dashInfluencer.id)}
                    onSelect={() => handleSelectInfluencer(item.dashInfluencer.id)}
                    onClick={() => handleRowClick(item)}
                    isSeeding={isSeeding}
                    postUrl={getPostUrl(item.dashInfluencer.id)}
                    onLinkClick={() => handleLinkClick(item.dashInfluencer.id, item.dashInfluencer.name || '-')}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <div className="text-lg font-semibold text-slate-700 mb-1">
              {isSeeding ? '참여 인플루언서가 없습니다' : '매칭된 신청자가 없습니다'}
            </div>
            <div className="text-sm text-slate-500">
              {isSeeding
                ? '신청자 리스트에서 인플루언서를 추가해주세요.'
                : '신청자 중 웰링크에 가입된 인플루언서가 없습니다.'}
            </div>
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
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        currentPage === page
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

      {/* 인플루언서 상세 모달 */}
      <InfluencerDetailModal
        item={selectedInfluencer}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInfluencer(null);
        }}
      />

      {/* 게시물 URL 입력 모달 */}
      <PostUrlModal
        isOpen={postUrlModalOpen}
        onClose={() => {
          setPostUrlModalOpen(false);
          setPostUrlTarget(null);
        }}
        onSave={handlePostUrlSave}
        initialUrl={postUrlTarget ? (getPostUrl(postUrlTarget.influencerId) || '') : ''}
        influencerName={postUrlTarget?.name || ''}
      />
    </div>
  );
}
