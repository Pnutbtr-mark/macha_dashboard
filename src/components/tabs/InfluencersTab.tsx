import { useState, useEffect } from 'react';
import { Loader2, Search, Filter, Users, Instagram, ExternalLink, Heart, MessageCircle, X, Mail, Tag } from 'lucide-react';
import { fetchDashInfluencers, fetchDashInfluencerDetail } from '../../services/metaDashApi';
import type { DashInfluencer, DashInfluencerDetailResponse } from '../../types/metaDash';

// 숫자 포맷팅 (null 처리 포함)
const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// 인플루언서 카드 컴포넌트 (간소화 - 목록 API 데이터만 사용)
function InfluencerCard({ influencer, onClick }: { influencer: DashInfluencer; onClick: () => void }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* 프로필 이미지 (이름 첫 글자) */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold ring-2 ring-slate-100">
              {influencer.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* 프로필 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate">{influencer.name}</h3>

            {/* 인스타그램 핸들 */}
            {influencer.username && (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Instagram size={14} />
                <span>@{influencer.username.trim()}</span>
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 태그 */}
        {influencer.category && influencer.category.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {influencer.category.map((cat, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* 활동 분야 */}
        {influencer.activityField && influencer.activityField.length > 0 && (
          <div className="mt-2 flex items-start gap-1.5">
            <Tag size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 line-clamp-2">
              {influencer.activityField.join(', ')}
            </p>
          </div>
        )}

        {/* 이메일 */}
        {influencer.email && (
          <div className="mt-2 flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500 truncate">{influencer.email}</span>
          </div>
        )}
      </div>

      {/* 하단: 클릭 안내 */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <div className="text-xs text-slate-400 text-center">
          클릭하여 상세 정보 보기
        </div>
      </div>
    </div>
  );
}

// 인플루언서 상세 모달 컴포넌트
function InfluencerDetailModal({
  influencer,
  isOpen,
  onClose
}: {
  influencer: DashInfluencer | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DashInfluencerDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && influencer) {
      const loadDetail = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchDashInfluencerDetail(influencer.id);
          setDetail(data);
        } catch (err) {
          console.error('[InfluencerDetailModal] 상세 로드 실패:', err);
          setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
        } finally {
          setLoading(false);
        }
      };
      loadDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [isOpen, influencer]);

  if (!isOpen || !influencer) return null;

  const detailData = detail?.dashInfluencerDetail;
  const latestPosts = detailData?.latestPosts?.slice(0, 10) || [];

  // 평균 좋아요/댓글 계산
  const avgLikes = latestPosts.length > 0
    ? latestPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / latestPosts.length
    : null;
  const avgComments = latestPosts.length > 0
    ? latestPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / latestPosts.length
    : null;

  // 참여율 계산
  const engagementRate = detailData?.followersCount && avgLikes != null && avgComments != null
    ? ((avgLikes + avgComments) / detailData.followersCount) * 100
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">인플루언서 상세 정보</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="ml-3 text-slate-500">데이터 로딩 중...</span>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-500 font-semibold mb-2">데이터 로드 실패</div>
              <div className="text-slate-500 text-sm">{error}</div>
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* 프로필 영역 */}
              <div className="flex items-start gap-4">
                {/* 프로필 이미지 */}
                <div className="flex-shrink-0">
                  {detailData?.profilePicUrl ? (
                    <img
                      src={detailData.profilePicUrl}
                      alt={influencer.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover bg-slate-100 ring-2 ring-slate-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-slate-100 ${detailData?.profilePicUrl ? 'hidden' : ''}`}
                  >
                    {influencer.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* 프로필 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-xl">{detailData?.fullName || influencer.name}</h3>
                    {detailData?.verified && (
                      <span className="text-blue-500 text-lg">✓</span>
                    )}
                  </div>

                  {/* 인스타그램 링크 */}
                  <a
                    href={detailData?.url || `https://instagram.com/${influencer.username?.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-pink-600 transition-colors"
                  >
                    <Instagram size={14} />
                    <span>@{detailData?.username || influencer.username?.trim()}</span>
                    <ExternalLink size={12} />
                  </a>

                  {/* 소개글 */}
                  {detailData?.biography && (
                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">
                      {detailData.biography}
                    </p>
                  )}
                </div>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">팔로워</div>
                  <div className="font-bold text-lg text-slate-900">
                    {formatNumber(detailData?.followersCount)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">팔로잉</div>
                  <div className="font-bold text-lg text-slate-900">
                    {formatNumber(detailData?.followsCount)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">게시물</div>
                  <div className="font-bold text-lg text-slate-900">
                    {formatNumber(detailData?.postsCount)}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-emerald-600 mb-1">참여율</div>
                  <div className="font-bold text-lg text-emerald-700">
                    {engagementRate != null ? `${engagementRate.toFixed(2)}%` : '-'}
                  </div>
                </div>
              </div>

              {/* 평균 지표 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
                  <Heart size={24} className="text-red-500" />
                  <div>
                    <div className="text-xs text-red-600">평균 좋아요</div>
                    <div className="font-bold text-lg text-red-700">{formatNumber(Math.round(avgLikes || 0))}</div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <MessageCircle size={24} className="text-blue-500" />
                  <div>
                    <div className="text-xs text-blue-600">평균 댓글</div>
                    <div className="font-bold text-lg text-blue-700">{formatNumber(Math.round(avgComments || 0))}</div>
                  </div>
                </div>
              </div>

              {/* 최근 게시물 */}
              {latestPosts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">최근 게시물</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {latestPosts.map((post, idx) => (
                      <a
                        key={post.id || idx}
                        href={post.url || `https://instagram.com/p/${post.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square"
                      >
                        <img
                          src={post.displayUrl || post.images?.[0]}
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
                          <div className="text-white text-xs text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Heart size={12} fill="white" />
                              <span>{formatNumber(post.likesCount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <MessageCircle size={12} fill="white" />
                              <span>{formatNumber(post.commentsCount || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 기본 정보 */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">기본 정보</h4>
                <div className="space-y-2 text-sm">
                  {influencer.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      <span className="text-slate-600">{influencer.email}</span>
                    </div>
                  )}
                  {influencer.category && influencer.category.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag size={14} className="text-slate-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {influencer.category.map((cat, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {influencer.activityField && influencer.activityField.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-xs mt-0.5">활동분야</span>
                      <span className="text-slate-600">{influencer.activityField.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 메인 컴포넌트
export function InfluencersTab() {
  const [influencers, setInfluencers] = useState<DashInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 모달 상태
  const [selectedInfluencer, setSelectedInfluencer] = useState<DashInfluencer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 카드 클릭 핸들러
  const handleCardClick = (influencer: DashInfluencer) => {
    setSelectedInfluencer(influencer);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInfluencer(null);
  };

  useEffect(() => {
    const loadInfluencers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashInfluencers();
        setInfluencers(data);
      } catch (err) {
        console.error('[InfluencersTab] 데이터 로드 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    loadInfluencers();
  }, []);

  // 검색 및 필터링
  const filteredInfluencers = influencers.filter((inf) => {
    const matchesSearch =
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inf.username ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || inf.category.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  // 카테고리 목록 추출
  const allCategories = Array.from(
    new Set(influencers.flatMap((inf) => inf.category))
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary-600" />
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-950">인플루언서 리스트</h2>
            <p className="text-sm text-slate-500">총 {influencers.length}명의 인플루언서</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름 또는 핸들로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">전체 카테고리</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Influencers Grid (Card View) */}
      {filteredInfluencers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer) => (
            <InfluencerCard
              key={influencer.id}
              influencer={influencer}
              onClick={() => handleCardClick(influencer)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <div className="text-lg font-semibold text-slate-700 mb-1">인플루언서가 없습니다</div>
          <div className="text-sm text-slate-500">검색 조건을 변경해보세요</div>
        </div>
      )}

      {/* 상세 모달 */}
      <InfluencerDetailModal
        influencer={selectedInfluencer}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
