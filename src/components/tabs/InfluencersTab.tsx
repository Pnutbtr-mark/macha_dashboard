import { useState, useEffect } from 'react';
import { Loader2, Search, Filter, Users, Instagram } from 'lucide-react';

interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  category: string[];
  followers: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  email: string;
  phone: string;
  notes: string;
  status: string;
  profileImage: string;
  createdAt: string;
  lastModified: string;
}

export function InfluencersTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000';
        const response = await fetch(`${API_BASE}/api/influencers-list`);

        if (!response.ok) {
          throw new Error('인플루언서 데이터를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setInfluencers(data);
      } catch (err) {
        console.error('[InfluencersTab] 데이터 로드 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencers();
  }, []);

  // 검색 및 필터링
  const filteredInfluencers = influencers.filter((inf) => {
    const matchesSearch =
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.handle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || inf.category.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  // 카테고리 목록 추출
  const allCategories = Array.from(
    new Set(influencers.flatMap((inf) => inf.category))
  );

  // 숫자 포맷팅
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

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
          <div className="p-2 bg-primary-100 rounded-xl">
            <Users size={24} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-950">인플루언서 리스트</h2>
            <p className="text-sm text-slate-500">총 {influencers.length}명</p>
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
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-400"
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

      {/* Influencers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead className="bg-gradient-to-r from-primary-600 to-primary-700 border-b-2 border-primary-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">
                  인플루언서
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">
                  카테고리
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">
                  팔로워
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">
                  참여율
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">
                  평균 반응
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInfluencers.map((influencer, index) => (
                <tr
                  key={influencer.id}
                  className={`hover:bg-primary-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  {/* 인플루언서 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {influencer.profileImage ? (
                        <img
                          src={influencer.profileImage}
                          alt={influencer.name}
                          className="w-10 h-10 rounded-full object-cover bg-slate-100 flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${influencer.profileImage ? 'hidden' : ''}`}
                      >
                        {influencer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{influencer.name}</div>
                        {influencer.handle && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                            <Instagram size={11} className="flex-shrink-0" />
                            <span className="truncate">@{influencer.handle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 카테고리 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {influencer.category.length > 0 ? (
                        influencer.category.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded whitespace-nowrap"
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </div>
                  </td>

                  {/* 팔로워 */}
                  <td className="px-4 py-3 text-center">
                    <div className="font-bold text-slate-900 text-sm">{formatNumber(influencer.followers)}</div>
                  </td>

                  {/* 참여율 */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded">
                      {influencer.engagementRate.toFixed(1)}%
                    </span>
                  </td>

                  {/* 평균 반응 (좋아요 + 댓글 합산) */}
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      <div className="flex items-center justify-center gap-1">
                        <span>❤️ {formatNumber(influencer.avgLikes)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                        <span>💬 {formatNumber(influencer.avgComments)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredInfluencers.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <div className="text-lg font-semibold text-slate-700 mb-1">인플루언서가 없습니다</div>
          <div className="text-sm text-slate-500">검색 조건을 변경해보세요</div>
        </div>
      )}
    </div>
  );
}
