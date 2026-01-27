import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Heart, ExternalLink, Users, UserPlus, X } from 'lucide-react';
import type { DashInfluencerWithDetail } from '../../types/metaDash';
import type { SeedingItem, Influencer } from '../../types';
import { getProxiedImageUrl } from '../../utils/imageProxy';
import { formatNumber as formatNumberBase, formatPercent } from '../../utils/formatters';

// 숫자 포맷팅 (null/undefined 처리 포함)
const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return '-';
  return formatNumberBase(num);
};

interface ApplicantListTabProps {
  // 매칭된 인플루언서 목록 (DashInfluencerWithDetail)
  matchedInfluencers: DashInfluencerWithDetail[];
  // 선택된 인플루언서를 참여자로 추가
  onAddToSeeding: (seedingItems: SeedingItem[]) => void;
  campaignId: string;
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
}: {
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  isAllSelected: boolean;
  onSelectAll: () => void;
}) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-orange-500" />
      : <ChevronDown size={14} className="text-orange-500" />;
  };

  const headerClass = "px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 select-none";

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
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-64">
          프로필
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
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
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
  onClick
}: {
  item: DashInfluencerWithDetail;
  isSelected: boolean;
  onSelect: () => void;
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

      {/* 참여율 */}
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

// 액션 바 컴포넌트
function ActionBar({
  selectedCount,
  onAddToSeeding,
  onClearSelection,
}: {
  selectedCount: number;
  onAddToSeeding: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-orange-700">
            <span className="text-orange-900 font-bold">{selectedCount}명</span> 선택됨
          </span>

          {/* 참여자로 추가 버튼 */}
          <button
            onClick={onAddToSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <UserPlus size={14} />
            참여자로 추가
          </button>
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
}: ApplicantListTabProps) {
  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // 정렬 상태 (기본: 팔로워수 내림차순)
  const [sortField, setSortField] = useState<SortField | null>('followerCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // 행 클릭 (현재는 아무 동작 없음 - 필요 시 상세 모달 추가 가능)
  const handleRowClick = useCallback((_item: DashInfluencerWithDetail) => {
    // 인플루언서 상세 모달 열기 (추후 구현 가능)
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">신청자 리스트</h2>
            <p className="text-sm text-slate-500">캠페인에 신청한 인플루언서 중 웰링크에 가입된 목록입니다.</p>
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
              />
              <tbody>
                {paginatedInfluencers.map((item) => (
                  <TableRow
                    key={item.dashInfluencer.id}
                    item={item}
                    isSelected={selectedIds.has(item.dashInfluencer.id)}
                    onSelect={() => handleSelectInfluencer(item.dashInfluencer.id)}
                    onClick={() => handleRowClick(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <div className="text-lg font-semibold text-slate-700 mb-1">매칭된 신청자가 없습니다</div>
            <div className="text-sm text-slate-500">신청자 중 웰링크에 가입된 인플루언서가 없습니다.</div>
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
    </div>
  );
}
