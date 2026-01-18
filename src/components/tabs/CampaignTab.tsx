import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  ExternalLink,
  Plus,
  Copy,
  Check,
  Link2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Image,
  Video,
  X,
  Eye,
  Heart,
  TrendingUp,
  BarChart3,
  Calendar,
  Loader2,
} from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import { fetchCampaigns, fetchMentions, fetchSeeding, fetchCampaignResults, type NotionCampaign, type NotionMention, type NotionSeeding, type CampaignResultDto } from '../../services/notionApi';
import type {
  Influencer,
  SeedingItem,
  AffiliateLink,
  ContentItem,
  AIAnalysis,
  SeedingStatus,
} from '../../types';

interface CampaignTabProps {
  influencers: Influencer[] | null;
  seedingList: SeedingItem[] | null;
  affiliateLinks: AffiliateLink[] | null;
  contentList: ContentItem[] | null;
  aiAnalysis: AIAnalysis | null;
  loading: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const formatCurrency = (num: number): string => {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
  if (num >= 10000) return (num / 10000).toFixed(0) + '만';
  return num.toLocaleString() + '원';
};

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

// Seeding Status Badge
function SeedingStatusBadge({ status }: { status: SeedingStatus | string }) {
  const config: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    // 영어 상태값
    pending: { icon: Clock, color: 'bg-slate-100 text-slate-600', label: '대기중' },
    contacted: { icon: AlertCircle, color: 'bg-amber-100 text-amber-700', label: '컨택중' },
    confirmed: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700', label: '확정' },
    completed: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: '완료' },
    cancelled: { icon: XCircle, color: 'bg-red-100 text-red-600', label: '취소' },
    // 한국어 상태값 (Notion에서 올 수 있음)
    '대기중': { icon: Clock, color: 'bg-slate-100 text-slate-600', label: '대기중' },
    '컨택중': { icon: AlertCircle, color: 'bg-amber-100 text-amber-700', label: '컨택중' },
    '확정': { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700', label: '확정' },
    '완료': { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: '완료' },
    '취소': { icon: XCircle, color: 'bg-red-100 text-red-600', label: '취소' },
    '진행중': { icon: Clock, color: 'bg-emerald-100 text-emerald-700', label: '진행중' },
    '진행': { icon: Clock, color: 'bg-emerald-100 text-emerald-700', label: '진행중' },
  };

  // fallback for unknown status
  const statusConfig = config[status] || { icon: Clock, color: 'bg-slate-100 text-slate-600', label: status || '알 수 없음' };
  const { icon: Icon, color, label } = statusConfig;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// Sub-components
function SeedingManagement({ seedingList }: { seedingList: SeedingItem[] }) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'free' | 'paid'>('all');

  const filteredList = seedingList.filter((item) => typeFilter === 'all' || item.type === typeFilter);

  const freeCount = seedingList.filter((s) => s.type === 'free').length;
  const paidCount = seedingList.filter((s) => s.type === 'paid').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-950">참여 인플루언서</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              typeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            전체 ({seedingList.length})
          </button>
          <button
            onClick={() => setTypeFilter('free')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              typeFilter === 'free' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            무료 ({freeCount})
          </button>
          <button
            onClick={() => setTypeFilter('paid')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              typeFilter === 'paid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            유료 ({paidCount})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">인플루언서</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">타입</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">상태</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">비용</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.influencer.thumbnail && item.influencer.thumbnail !== 'https://via.placeholder.com/100' ? (
                      <img
                        src={item.influencer.thumbnail}
                        alt={item.influencer.name}
                        className="w-8 h-8 rounded-full object-cover bg-slate-100"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold ${item.influencer.thumbnail && item.influencer.thumbnail !== 'https://via.placeholder.com/100' ? 'hidden' : ''}`}>
                      {item.influencer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-primary-950">{item.influencer.name}</div>
                      <div className="text-xs text-slate-500">{item.influencer.handle}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.type === 'free' ? '무료 협찬' : '유료 광고'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SeedingStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {item.paymentAmount
                    ? formatCurrency(item.paymentAmount)
                    : item.productValue
                    ? `제품 ${formatCurrency(item.productValue)}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AffiliateLinkManager({ links }: { links: AffiliateLink[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCopy = (link: AffiliateLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-950">제휴 링크 관리</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          새 링크 생성
        </button>
      </div>

      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Link2 size={18} className="text-primary-600" />
                </div>
                <div>
                  <div className="font-semibold text-primary-950">{link.influencerName}</div>
                  <div className="text-sm text-slate-500 font-mono">{link.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(link)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    copiedId === link.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedId === link.id ? '복사됨' : '복사'}
                </button>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    link.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {link.isActive ? '활성' : '비활성'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500">클릭</div>
                <div className="font-semibold text-primary-950">{formatNumber(link.clicks)}</div>
              </div>
              <div>
                <div className="text-slate-500">전환</div>
                <div className="font-semibold text-primary-950">{formatNumber(link.conversions)}</div>
              </div>
              <div>
                <div className="text-slate-500">매출</div>
                <div className="font-semibold text-emerald-600">{formatCurrency(link.revenue)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal - 간단한 예시 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">새 제휴 링크 생성</h4>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">인플루언서</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option>인플루언서 선택...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">링크 코드</label>
                <input
                  type="text"
                  placeholder="예: INFLUENCER_2024"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <button className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 콘텐츠 카드 컴포넌트 - Instagram CDN 만료로 썸네일 대신 카드 UI 사용
function ContentCard({ content }: { content: ContentItem }) {
  return (
    <a
      href={content.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
    >
      {/* 상단: 콘텐츠 타입 & 인플루언서 정보 */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            content.type === 'video' ? 'bg-purple-100' : 'bg-pink-100'
          }`}>
            {content.type === 'video' ? (
              <Video size={14} className="text-purple-600" />
            ) : (
              <Image size={14} className="text-pink-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{content.influencerName}</div>
            <div className="text-xs text-slate-400">
              {content.postedAt ? new Date(content.postedAt).toLocaleDateString('ko-KR') : 'Instagram'}
            </div>
          </div>
        </div>
      </div>

      {/* 중앙: 성과 지표 */}
      <div className="p-4 bg-gradient-to-br from-slate-50 to-white">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-pink-500 mb-1">
              <Heart size={14} />
            </div>
            <div className="text-lg font-bold text-slate-800">{formatNumber(content.likes)}</div>
            <div className="text-xs text-slate-400">좋아요</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <MessageCircle size={14} />
            </div>
            <div className="text-lg font-bold text-slate-800">{formatNumber(content.comments)}</div>
            <div className="text-xs text-slate-400">댓글</div>
          </div>
          {(content.views ?? 0) > 0 && (
            <>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                  <Eye size={14} />
                </div>
                <div className="text-lg font-bold text-slate-800">{formatNumber(content.views ?? 0)}</div>
                <div className="text-xs text-slate-400">조회수</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                  <TrendingUp size={14} />
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {(content.views ?? 0) > 0 ? ((content.likes / (content.views ?? 1)) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-xs text-slate-400">참여율</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 하단: Instagram 링크 */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1 text-xs text-slate-500 group-hover:text-primary-600 transition-colors">
          <ExternalLink size={12} />
          <span>Instagram에서 보기</span>
        </div>
      </div>
    </a>
  );
}

function ContentGallery({ contents }: { contents: ContentItem[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-950">콘텐츠 갤러리</h3>
        <span className="text-sm text-slate-500">총 {contents.length}개</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {contents.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>
    </div>
  );
}

function AIAnalysisCard({
  analysis,
  onAnalyze,
  loading,
}: {
  analysis: AIAnalysis | null;
  onAnalyze: () => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">AI 캠페인 분석</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
          <p className="text-primary-200 text-sm">AI가 캠페인을 분석하고 있습니다...</p>
          <p className="text-primary-400 text-xs mt-1">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">AI 캠페인 분석</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-primary-200 text-sm mb-4 text-center">
            AI가 캠페인 데이터를 분석하여<br />
            인사이트와 추천 전략을 제공합니다.
          </p>
          <button
            onClick={onAnalyze}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-primary-950 font-medium rounded-lg transition-colors"
          >
            <Sparkles size={16} />
            AI 분석 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">AI 캠페인 분석</h3>
        </div>
        <button
          onClick={onAnalyze}
          className="text-xs text-primary-300 hover:text-white transition-colors flex items-center gap-1"
        >
          <Loader2 size={12} className={loading ? 'animate-spin' : 'hidden'} />
          다시 분석
        </button>
      </div>

      <p className="text-primary-100 text-sm leading-relaxed mb-5 pb-5 border-b border-primary-800">
        {analysis.summary}
      </p>

      <div className="space-y-3 mb-5">
        {analysis.insights.map((insight, index) => (
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
        <p className="text-sm text-amber-100/90 leading-relaxed">{analysis.recommendation}</p>
      </div>

      <div className="mt-4 text-xs text-primary-400">
        마지막 업데이트: {new Date(analysis.generatedAt).toLocaleString('ko-KR')}
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
        <span>전월 대비 {change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
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
  onSelectCampaign
}: {
  campaigns: CampaignListItem[];
  loading: boolean;
  onSelectCampaign: (campaign: CampaignListItem) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // 상태 매핑 (Notion 한국어 상태값 처리)
  const isActive = (status: string) =>
    status === 'active' || status === 'paused' || status === '진행중' || status === '일시정지' || status === '진행';
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
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Notion에서 캠페인 데이터를 불러오는 중...
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
                <td className="py-4 px-4 text-sm text-slate-600">{campaign.startDate}</td>
                <td className="py-4 px-4 text-sm text-slate-600">{campaign.endDate}</td>
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
    </div>
  );
}

// Notion 시딩 데이터를 SeedingItem으로 변환
function convertNotionSeeding(seeding: NotionSeeding): SeedingItem {
  return {
    id: seeding.id,
    campaignId: '',
    influencer: {
      id: seeding.influencer.id,
      name: seeding.influencer.name,
      handle: seeding.influencer.handle,
      platform: 'instagram',
      thumbnail: seeding.influencer.thumbnail,
      followers: seeding.influencer.followers,
      engagementRate: seeding.influencer.engagementRate,
      avgLikes: 0,
      avgComments: 0,
      category: [],
      priceRange: '',
      verified: false,
    },
    type: seeding.type,
    status: seeding.status as SeedingStatus,
    requestDate: seeding.requestDate || '',
    postDate: seeding.postDate,
    paymentAmount: seeding.paymentAmount,
    productValue: seeding.productValue,
    notes: seeding.notes,
  };
}

// Notion 멘션 데이터를 ContentItem으로 변환
function convertNotionMention(mention: NotionMention): ContentItem {
  return {
    id: mention.id,
    influencerId: '',
    influencerName: mention.influencerName || mention.handle,
    platform: 'instagram',
    type: (mention.type as 'image' | 'video' | 'reel' | 'story') || 'image',
    thumbnail: mention.thumbnail || 'https://via.placeholder.com/300x400',
    originalUrl: mention.postUrl,
    downloadUrl: mention.postUrl,
    likes: mention.likes,
    comments: mention.comments,
    shares: mention.shares,
    views: mention.views,
    engagementRate: mention.engagementRate,
    postedAt: mention.postedAt,
    caption: mention.caption,
  };
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
    thumbnail: result.displayUrl || 'https://via.placeholder.com/300x400',
    originalUrl: result.postUrl,
    downloadUrl: result.videoUrl || result.displayUrl,
    likes: result.likesCount,
    comments: result.commentsCount,
    shares: result.reshareCount,
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
  const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000';
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

// 캠페인 상세 뷰 컴포넌트
function CampaignDetailView({
  campaign,
  onBack: _onBack,
  affiliateLinks,
}: {
  campaign: CampaignListItem;
  onBack: () => void;
  affiliateLinks: AffiliateLink[] | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'seeding' | 'affiliate' | 'content'>('performance');
  const [notionSeeding, setNotionSeeding] = useState<SeedingItem[]>([]);
  const [notionContent, setNotionContent] = useState<ContentItem[]>([]);
  const [_campaignResults, setCampaignResults] = useState<CampaignResultDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  // 상세 데이터 로드
  useEffect(() => {
    const loadDetailData = async () => {
      try {
        setDetailLoading(true);
        console.log('[CampaignDetail] Loading detail data for campaign:', campaign.id);

        // 시딩, 멘션, 캠페인 결과 데이터 병렬 로드
        const [seedingData, mentionsData, resultsData] = await Promise.all([
          fetchSeeding(campaign.id).catch(() => []),
          fetchMentions(campaign.id).catch(() => []),
          fetchCampaignResults(campaign.id).catch(() => []),
        ]);

        console.log('[CampaignDetail] Seeding data:', seedingData);
        console.log('[CampaignDetail] Mentions data:', mentionsData);
        console.log('[CampaignDetail] Campaign results:', resultsData);

        setNotionSeeding(seedingData.map(convertNotionSeeding));
        setCampaignResults(resultsData);

        // 캠페인 결과가 있으면 우선 사용, 없으면 멘션 데이터 사용
        if (resultsData.length > 0) {
          setNotionContent(resultsData.map(convertCampaignResultToContent));
        } else {
          setNotionContent(mentionsData.map(convertNotionMention));
        }
      } catch (err) {
        console.error('[CampaignDetail] 상세 데이터 로드 실패:', err);
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetailData();
  }, [campaign.id]);

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-slate-100">
        {[
          { key: 'performance', label: '캠페인 성과', icon: BarChart3 },
          { key: 'seeding', label: '참여 인플루언서', icon: Package },
          { key: 'content', label: '콘텐츠 갤러리', icon: Image },
          { key: 'affiliate', label: '제휴 링크', icon: Link2 },
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

      {/* Sub Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeSubTab === 'performance' && (
            <CampaignPerformance campaign={campaign} contents={notionContent} loading={detailLoading} />
          )}
          {activeSubTab === 'seeding' && (
            detailLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary-600" />
                <span className="text-slate-500">인플루언서 데이터 로딩 중...</span>
              </div>
            ) : (
              <SeedingManagement seedingList={notionSeeding} />
            )
          )}
          {activeSubTab === 'affiliate' && affiliateLinks && <AffiliateLinkManager links={affiliateLinks} />}
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
  affiliateLinks,
  contentList: _contentList,
  aiAnalysis: _aiAnalysis,
  loading: _loading,
}: CampaignTabProps) {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [notionLoading, setNotionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 캠페인 데이터 로드
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!user?.igUserNickName) {
        setNotionLoading(false);
        return;
      }

      try {
        setNotionLoading(true);
        setError(null);
        console.log('[CampaignTab] Starting to load campaigns for:', user.igUserNickName);
        const notionCampaigns = await fetchCampaigns(user.igUserNickName);
        console.log('[CampaignTab] Loaded campaigns:', notionCampaigns);
        const convertedCampaigns = notionCampaigns.map(convertNotionCampaign);
        setCampaigns(convertedCampaigns);
        console.log('[CampaignTab] Set campaigns:', convertedCampaigns.length);
      } catch (err) {
        console.error('[CampaignTab] 캠페인 로드 실패:', err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(`캠페인 데이터를 불러오는데 실패했습니다: ${errorMessage}`);
      } finally {
        setNotionLoading(false);
      }
    };

    loadCampaigns();
  }, [user?.igUserNickName]);

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
        onBack={() => setSelectedCampaign(null)}
        affiliateLinks={affiliateLinks}
      />
    );
  }

  // 기본: 캠페인 목록 표시
  return (
    <div className="space-y-6">
      <CampaignListTable
        campaigns={campaigns}
        loading={notionLoading}
        onSelectCampaign={setSelectedCampaign}
      />
    </div>
  );
}
