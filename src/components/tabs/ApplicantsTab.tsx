import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCampaignsWithDetail, fetchApplicants, type CampaignDto, type ApplicantDto } from '../../services/notionApi';
import { fetchDashInfluencersWithDetail } from '../../services/metaDashApi';
import type { DashInfluencerWithDetail } from '../../types/metaDash';
import type { ApplicantStatus } from '../../types';
import { getProxiedImageUrl } from '../../utils/imageProxy';
import { formatNumber as formatNumberBase, formatPercent } from '../../utils/formatters';

// 숫자 포맷팅 (null/undefined 처리)
const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return '-';
  return formatNumberBase(num);
};

// 신청자 + 캠페인 + 매칭 정보 결합 타입
interface ApplicantWithCampaign extends ApplicantDto {
  campaignName: string;
  status: ApplicantStatus;
  matchedInfluencer?: DashInfluencerWithDetail;
}

// 정렬 필드 타입
type SortField = 'appliedAt' | 'followerCount';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 15;

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: ApplicantStatus }) {
  const config: Record<ApplicantStatus, { label: string; className: string; icon: typeof Clock }> = {
    pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
    reviewing: { label: '검토중', className: 'bg-blue-100 text-blue-700', icon: Clock },
    selected: { label: '선택됨', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    rejected: { label: '불합격', className: 'bg-red-100 text-red-700', icon: XCircle },
    converted: { label: '전환됨', className: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// 웰링크 가입 여부 배지
function WellinkBadge({ matched }: { matched: boolean }) {
  return matched ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle2 size={12} />
      가입
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      <XCircle size={12} />
      미가입
    </span>
  );
}

// 테이블 헤더 컴포넌트
function TableHeader({
  sortField,
  sortDirection,
  onSort,
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

  const headerClass = "px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 select-none";

  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-64">
          프로필
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
          캠페인
        </th>
        <th className={headerClass} onClick={() => onSort('followerCount')}>
          <div className="flex items-center gap-1">
            팔로워수 <SortIcon field="followerCount" />
          </div>
        </th>
        <th className={headerClass} onClick={() => onSort('appliedAt')}>
          <div className="flex items-center gap-1">
            신청일 <SortIcon field="appliedAt" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
          상태
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
          웰링크 가입
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
          콘텐츠
        </th>
      </tr>
    </thead>
  );
}

// 테이블 행 컴포넌트
function TableRow({ item }: { item: ApplicantWithCampaign }) {
  const matched = item.matchedInfluencer;
  const influencer = matched?.dashInfluencer;
  const detail = matched?.dashInfluencerDetail;
  const latestPosts = detail?.latestPosts?.slice(0, 3) || [];

  // 팔로워 수
  const followerCount = detail?.followersCount || influencer?.followerCount || null;

  // 참여율 계산
  const allPosts = detail?.latestPosts || [];
  const avgLikes = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / allPosts.length)
    : null;
  const avgComments = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / allPosts.length)
    : null;
  const engagementRate = followerCount && followerCount > 0 && avgLikes !== null && avgComments !== null
    ? ((avgLikes + avgComments) / followerCount) * 100
    : null;

  // 신청일 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-orange-50/50 transition-colors">
      {/* 프로필 */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0">
            {(detail?.profilePicUrl || influencer?.profileImageUrl) ? (
              <img
                src={getProxiedImageUrl(detail?.profilePicUrl || influencer?.profileImageUrl)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover bg-slate-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                {item.name.charAt(0)}
              </div>
            )}
          </div>

          {/* 이름 + 핸들 */}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{item.name}</div>
            {item.instagramId && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                @{item.instagramId}
                <a
                  href={`https://instagram.com/${item.instagramId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
            {matched && engagementRate !== null && (
              <div className="text-xs text-slate-400">
                참여율 {formatPercent(engagementRate, 2)}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 캠페인 */}
      <td className="px-4 py-4">
        <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium truncate max-w-32">
          {item.campaignName}
        </span>
      </td>

      {/* 팔로워수 */}
      <td className="px-4 py-4 text-sm text-slate-700 font-medium">
        {formatNumber(followerCount)}
      </td>

      {/* 신청일 */}
      <td className="px-4 py-4 text-sm text-slate-700">
        {formatDate(item.appliedAt)}
      </td>

      {/* 상태 */}
      <td className="px-4 py-4">
        <StatusBadge status={item.status} />
      </td>

      {/* 웰링크 가입 */}
      <td className="px-4 py-4">
        <WellinkBadge matched={!!matched} />
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
              className="w-12 h-12 object-cover rounded-lg bg-slate-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="%23e2e8f0"><rect width="48" height="48"/></svg>';
              }}
            />
          ))}
          {latestPosts.length === 0 && (
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
              -
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// 메인 컴포넌트
export function ApplicantsTab() {
  const { user } = useAuth();

  // 데이터 상태
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [applicants, setApplicants] = useState<ApplicantWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 정렬 상태
  const [sortField, setSortField] = useState<SortField | null>('appliedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(0);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. 캠페인 목록 조회
        const campaignsResult = await fetchCampaignsWithDetail({ page: 1, size: 100, dashMemberId: user?.id });
        const campaignList = campaignsResult.content.map(c => c.campaign);
        setCampaigns(campaignList);

        // 2. 인플루언서 목록 조회 (매칭용)
        const influencersResult = await fetchDashInfluencersWithDetail({ page: 0, size: 1000 });
        const infMap = new Map<string, DashInfluencerWithDetail>();
        influencersResult.content.forEach(inf => {
          const username = inf.dashInfluencer.username?.toLowerCase().trim();
          const name = inf.dashInfluencer.name?.toLowerCase().trim();
          if (username) infMap.set(username, inf);
          if (name) infMap.set(name, inf);
        });

        // 3. 노션 신청자 데이터 조회
        const applicantsRaw = await fetchApplicants();

        // 4. 신청자 데이터 + 인플루언서 매칭
        const applicantsWithCampaign: ApplicantWithCampaign[] = applicantsRaw.map(app => {
          // 인플루언서 매칭 (인스타그램 ID로)
          let matchedInf: DashInfluencerWithDetail | undefined;
          if (app.instagramId) {
            const handle = app.instagramId.toLowerCase().replace('@', '').trim();
            matchedInf = infMap.get(handle);
          }
          if (!matchedInf && app.name) {
            matchedInf = infMap.get(app.name.toLowerCase().trim());
          }

          // 기본 상태: pending (추후 노션에서 상태 필드 추가 시 연동)
          const status: ApplicantStatus = 'pending';

          return {
            ...app,
            campaignName: '사계단백연구소', // 현재 단일 캠페인
            status,
            matchedInfluencer: matchedInf,
          };
        });

        setApplicants(applicantsWithCampaign);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  // 검색 적용
  const handleSearch = useCallback(() => {
    setSearchQuery(pendingSearchQuery);
    setCurrentPage(0);
  }, [pendingSearchQuery]);

  // 필터 초기화
  const handleResetFilters = useCallback(() => {
    setPendingSearchQuery('');
    setSearchQuery('');
    setCampaignFilter('all');
    setStatusFilter('all');
    setCurrentPage(0);
  }, []);

  // 필터링
  const filteredApplicants = useMemo(() => {
    return applicants.filter(app => {
      // 검색 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(query);
        const matchHandle = app.instagramId?.toLowerCase().includes(query);
        if (!matchName && !matchHandle) return false;
      }

      // 캠페인 필터 (현재 단일 캠페인이므로 항상 통과)
      // if (campaignFilter !== 'all' && app.campaignId !== campaignFilter) {
      //   return false;
      // }

      // 상태 필터
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [applicants, searchQuery, statusFilter]);

  // 정렬
  const sortedApplicants = useMemo(() => {
    if (!sortField) return filteredApplicants;

    return [...filteredApplicants].sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;

      switch (sortField) {
        case 'appliedAt':
          aVal = new Date(a.appliedAt).getTime();
          bVal = new Date(b.appliedAt).getTime();
          break;
        case 'followerCount': {
          const aFollowers = a.matchedInfluencer?.dashInfluencerDetail?.followersCount ||
            a.matchedInfluencer?.dashInfluencer?.followerCount || 0;
          const bFollowers = b.matchedInfluencer?.dashInfluencerDetail?.followersCount ||
            b.matchedInfluencer?.dashInfluencer?.followerCount || 0;
          aVal = aFollowers;
          bVal = bFollowers;
          break;
        }
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredApplicants, sortField, sortDirection]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedApplicants.length / PAGE_SIZE);
  const paginatedApplicants = sortedApplicants.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  // 상태 옵션
  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'pending', label: '대기중' },
    { value: 'reviewing', label: '검토중' },
    { value: 'selected', label: '선택됨' },
    { value: 'rejected', label: '불합격' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-2 text-slate-500">데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">캠페인 신청자 리스트</h2>
            <p className="text-sm text-slate-500">전체 캠페인에 신청한 인플루언서 목록입니다.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            총 {sortedApplicants.length}명
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 캠페인 필터 */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={campaignFilter}
              onChange={(e) => {
                setCampaignFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            >
              <option value="all">전체 캠페인</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* 검색 */}
          <div className="flex-1 relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름 또는 핸들 검색..."
              value={pendingSearchQuery}
              onChange={(e) => setPendingSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            검색
          </button>

          {/* 초기화 버튼 */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={14} />
            초기화
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {sortedApplicants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHeader
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <tbody>
                {paginatedApplicants.map((item) => (
                  <TableRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <div className="text-lg font-semibold text-slate-700 mb-1">신청자가 없습니다</div>
            <div className="text-sm text-slate-500">조건에 맞는 신청자가 없습니다.</div>
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
