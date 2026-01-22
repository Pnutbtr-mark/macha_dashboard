import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Play, Image, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import { getProxiedImageUrl } from '../../utils/imageProxy';
import { formatNumber } from '../../utils/formatters';
import type { ProfileInsight, DailyProfileData, FollowerDemographic, ProfileContentItem } from '../../types';

interface ProfileTabProps {
  profileData: ProfileInsight | null;
  dailyData: DailyProfileData[] | null;
  followerDemographic: FollowerDemographic | null;
  contentData: ProfileContentItem[] | null;
  loading: boolean;
}

// 프로필 AI 분석 데이터
const profileAIAnalysis = {
  summary: '프로필 성장세가 전일 대비 18% 상승하며 꾸준한 팔로워 증가를 보이고 있습니다. 특히 릴스 콘텐츠의 도달률이 피드 대비 2.8배 높게 나타나고 있습니다.',
  insights: [
    '오후 6-9시 게시물의 참여율이 평균 대비 42% 높습니다.',
    '릴스 콘텐츠가 피드 대비 2.8배 높은 도달률을 기록 중입니다.',
    '스토리 링크 클릭률이 업계 평균(2.1%) 대비 1.5배 높습니다.',
    '25-34세 여성 타겟층에서 가장 높은 참여율이 발생했습니다.',
    '해시태그 #운동루틴 사용 시 노출이 35% 증가합니다.',
  ],
  recommendation: '릴스 콘텐츠 비중을 현재 40%에서 60%로 확대하고, 오후 6-9시에 집중 게시하는 것을 권장합니다. 스토리에 제품 링크를 더 적극적으로 활용하세요.',
  generatedAt: '2024-12-14T15:30:00Z',
};

const profileActions = {
  profileVisits: 8934,
  websiteClicks: 2345,
};

// 콘텐츠 성과 더미 데이터
type ContentType = 'reels' | 'feed' | 'carousel';

interface ContentItem {
  id: string;
  type: ContentType;
  uploadDate: string;
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  engagementRate: number;
}

const contentPerformanceData: ContentItem[] = [
  { id: '1', type: 'reels', uploadDate: '2024-12-14', views: 45230, reach: 38920, impressions: 52340, likes: 2341, comments: 156, saves: 423, engagementRate: 6.8 },
  { id: '2', type: 'feed', uploadDate: '2024-12-13', views: 12450, reach: 10230, impressions: 15670, likes: 1823, comments: 89, saves: 312, engagementRate: 5.2 },
  { id: '3', type: 'reels', uploadDate: '2024-12-12', views: 67890, reach: 54230, impressions: 78450, likes: 4521, comments: 234, saves: 678, engagementRate: 8.1 },
  { id: '4', type: 'feed', uploadDate: '2024-12-11', views: 8970, reach: 7650, impressions: 11230, likes: 945, comments: 67, saves: 189, engagementRate: 4.5 },
  { id: '5', type: 'reels', uploadDate: '2024-12-10', views: 34560, reach: 28970, impressions: 41230, likes: 2890, comments: 178, saves: 456, engagementRate: 7.2 },
  { id: '6', type: 'feed', uploadDate: '2024-12-09', views: 15670, reach: 12340, impressions: 19870, likes: 1456, comments: 98, saves: 267, engagementRate: 5.8 },
];

// KPI 카드 컴포넌트 (로컬) - 광고 성과와 동일한 스타일
function ProfileKPICard({
  title,
  value,
  change,
  isPositive,
  metricKey,
  loading,
}: {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  metricKey?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-[100px]">
        <div className="h-3 bg-slate-200 rounded w-16 mb-2" />
        <div className="h-6 bg-slate-200 rounded w-24 mb-1" />
        <div className="h-3 bg-slate-200 rounded w-20" />
      </div>
    );
  }

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
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>전일 대비 {change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function ProfileTab({ profileData, dailyData, followerDemographic, contentData, loading }: ProfileTabProps) {
  const [contentFilter, setContentFilter] = useState<'all' | ContentType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // API 데이터가 없으면 더미 데이터 사용
  const contentList = contentData && contentData.length > 0 ? contentData : contentPerformanceData;

  const filteredContent = contentFilter === 'all'
    ? contentList
    : contentList.filter(item => item.type === contentFilter);

  // 게시일 최신순으로 정렬
  const sortedContent = [...filteredContent].sort((a, b) =>
    new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );

  // 페이지네이션 계산
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedContent.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedContent = sortedContent.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 필터 변경 핸들러
  const handleFilterChange = (filter: 'all' | ContentType) => {
    setContentFilter(filter);
    setCurrentPage(1);
  };

  // 프로필 행동 데이터 (API 데이터 우선 사용)
  const profileActionsData = {
    profileVisits: profileData?.profileViews || profileActions.profileVisits,
    websiteClicks: profileData?.websiteClicks || profileActions.websiteClicks,
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 메인 레이아웃: 콘텐츠 + AI 분석 사이드바 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽 메인 콘텐츠 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. 핵심 KPI 카드 - 2열 x 2행 */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ProfileKPICard
              title="팔로워"
              value={formatNumber(profileData.followers)}
              change={profileData.followersGrowth}
              isPositive={profileData.followersGrowth >= 0}
              metricKey="followers"
              loading={loading}
            />
            <ProfileKPICard
              title="도달"
              value={formatNumber(profileData.reach)}
              change={profileData.reachGrowth}
              isPositive={profileData.reachGrowth >= 0}
              metricKey="reach"
              loading={loading}
            />
            <ProfileKPICard
              title="참여율"
              value={profileData.engagementRate.toFixed(1) + '%'}
              change={profileData.engagementRateGrowth}
              isPositive={profileData.engagementRateGrowth >= 0}
              metricKey="engagementRate"
              loading={loading}
            />
            <ProfileKPICard
              title="노출"
              value={formatNumber(profileData.impressions)}
              change={profileData.impressionsGrowth}
              isPositive={profileData.impressionsGrowth >= 0}
              metricKey="impressions"
              loading={loading}
            />
          </section>

      {/* 2. 프로필 행동 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow h-[100px] flex flex-col justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">프로필 방문</span>
            <InfoTooltip metricKey="profileVisits" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{profileActionsData.profileVisits.toLocaleString()}</div>
          <div className={`flex items-center gap-1 text-xs font-medium ${profileData.profileViewsGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {profileData.profileViewsGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>전일 대비 {profileData.profileViewsGrowth > 0 ? '+' : ''}{profileData.profileViewsGrowth.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow h-[100px] flex flex-col justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">웹사이트 클릭</span>
            <InfoTooltip metricKey="websiteClicks" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{profileActionsData.websiteClicks.toLocaleString()}</div>
          <div className={`flex items-center gap-1 text-xs font-medium ${profileData.websiteClicksGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {profileData.websiteClicksGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>전일 대비 {profileData.websiteClicksGrowth > 0 ? '+' : ''}{profileData.websiteClicksGrowth.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow h-[100px] flex flex-col justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">클릭률</span>
            <InfoTooltip metricKey="clickRate" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {profileActionsData.profileVisits > 0 ? ((profileActionsData.websiteClicks / profileActionsData.profileVisits) * 100).toFixed(1) : 0}%
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <TrendingUp size={12} />
            <span>전일 대비 -</span>
          </div>
        </div>
      </section>

      {/* 3. 성장 추이 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 팔로워 성장 추이 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-primary-950">팔로워 성장 추이</h3>
            <InfoTooltip metricKey="followers" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData || []}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={formatNumber}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [formatNumber(value), '팔로워']}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#colorFollowers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 도달 & 노출 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-primary-950">도달 & 노출</h3>
            <InfoTooltip metricKey="impressions" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name === 'reach' ? '도달' : '노출',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="reach"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  name="reach"
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="impressions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-600">도달</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span className="text-sm text-slate-600">노출</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3.5 팔로워 분석 (성별, 나이, 지역) */}
      {followerDemographic && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-primary-950 mb-6">팔로워 분석</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 성별 분포 */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">성별</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">남성</span>
                    <span className="text-sm font-medium">{followerDemographic.gender.malePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${followerDemographic.gender.malePercent}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">여성</span>
                    <span className="text-sm font-medium">{followerDemographic.gender.femalePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full"
                      style={{ width: `${followerDemographic.gender.femalePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 나이대 분포 */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">나이대</h4>
              <div className="space-y-2">
                {followerDemographic.age.slice(0, 5).map(item => (
                  <div key={item.range} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item.range}세</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 국가 분포 */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">국가</h4>
              <div className="space-y-2">
                {followerDemographic.country.slice(0, 5).map(item => (
                  <div key={item.code} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. 콘텐츠 성과 */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-primary-950">콘텐츠 성과</h3>

          <div className="flex items-center gap-4">
            {/* 필터 탭 */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'reels', label: 'Reels' },
                { key: 'carousel', label: 'Carousel' },
                { key: 'feed', label: 'Feed' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key as 'all' | ContentType)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    contentFilter === key
                      ? 'bg-white text-primary-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 정렬 옵션 */}
            <div className="text-sm text-slate-500">
              게시일 최신순
            </div>
          </div>
        </div>

        {/* 콘텐츠 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">썸네일</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">유형</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">업로드 날짜</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">조회수</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">도달</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">노출</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">좋아요</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">댓글</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">저장</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">참여율</th>
              </tr>
            </thead>
            <tbody>
              {paginatedContent.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    if ('permalink' in item && item.permalink) {
                      window.open(item.permalink, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                    index < paginatedContent.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  {/* 썸네일 */}
                  <td className="py-4 px-4">
                    {'thumbnailUrl' in item && item.thumbnailUrl ? (
                      <img
                        src={getProxiedImageUrl(item.thumbnailUrl)}
                        alt="썸네일"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center ${'thumbnailUrl' in item && item.thumbnailUrl ? 'hidden' : ''}`}>
                      {item.type === 'reels' ? (
                        <Play size={20} className="text-slate-400" />
                      ) : (
                        <Image size={20} className="text-slate-400" />
                      )}
                    </div>
                  </td>
                  {/* 유형 */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.type === 'reels'
                        ? 'bg-blue-100 text-blue-700'
                        : item.type === 'feed'
                        ? 'bg-slate-100 text-slate-700'
                        : item.type === 'carousel'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'reels' ? 'Reels' : item.type === 'feed' ? 'Feed' : item.type === 'carousel' ? 'Carousel' : 'Story'}
                    </span>
                  </td>
                  {/* 업로드 날짜 */}
                  <td className="py-4 px-4 text-sm text-slate-600">{item.uploadDate}</td>
                  {/* 조회수 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{(item.views || 0).toLocaleString()}</td>
                  {/* 도달 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{item.reach.toLocaleString()}</td>
                  {/* 노출 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{item.impressions.toLocaleString()}</td>
                  {/* 좋아요 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{item.likes.toLocaleString()}</td>
                  {/* 댓글 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{item.comments.toLocaleString()}</td>
                  {/* 저장 */}
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{item.saves.toLocaleString()}</td>
                  {/* 참여율 */}
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-medium text-emerald-600">{item.engagementRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              총 {sortedContent.length}개 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedContent.length)}개 표시
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

        </div>

        {/* 오른쪽 AI 분석 사이드바 */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-white/10 rounded-xl">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">AI 프로필 분석</h3>
            </div>

            <p className="text-primary-100 text-sm leading-relaxed mb-5 pb-5 border-b border-primary-800">
              {profileAIAnalysis.summary}
            </p>

            <div className="space-y-3 mb-5">
              {profileAIAnalysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-300">{index + 1}</span>
                  </div>
                  <p className="text-sm text-primary-200 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-400 mb-1">💡 추천 전략</div>
              <p className="text-sm text-amber-100/90 leading-relaxed">{profileAIAnalysis.recommendation}</p>
            </div>

            <div className="mt-4 text-xs text-primary-400">
              마지막 업데이트: {new Date(profileAIAnalysis.generatedAt).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
