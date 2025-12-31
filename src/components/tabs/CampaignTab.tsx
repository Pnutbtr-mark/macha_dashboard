import { useState, useEffect } from 'react';
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
  Download,
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
import { fetchCampaigns, fetchMentions, fetchSeeding, type NotionCampaign, type NotionMention, type NotionSeeding } from '../../services/notionApi';
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
function SeedingStatusBadge({ status }: { status: SeedingStatus }) {
  const config = {
    pending: { icon: Clock, color: 'bg-slate-100 text-slate-600', label: '대기중' },
    contacted: { icon: AlertCircle, color: 'bg-amber-100 text-amber-700', label: '컨택중' },
    confirmed: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700', label: '확정' },
    completed: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: '완료' },
    cancelled: { icon: XCircle, color: 'bg-red-100 text-red-600', label: '취소' },
  };
  const { icon: Icon, color, label } = config[status];

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
                    <img
                      src={item.influencer.thumbnail}
                      alt={item.influencer.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
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

// 콘텐츠 카드 컴포넌트 - 이미지 로드 실패 처리
function ContentCard({ content, onDownload }: { content: ContentItem; onDownload: (content: ContentItem) => void }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative rounded-xl overflow-hidden bg-slate-100">
      {imageError || !content.thumbnail ? (
        // 이미지 로드 실패 시 대체 UI
        <div className="w-full aspect-[3/4] bg-gradient-to-br from-pink-100 to-purple-100 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Image size={24} className="text-white" />
          </div>
          <span className="text-xs text-slate-500 text-center px-2">{content.influencerName}</span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Heart size={10} /> {formatNumber(content.likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={10} /> {formatNumber(content.comments)}
            </span>
          </div>
        </div>
      ) : (
        <img
          src={content.thumbnail}
          alt={content.influencerName}
          className="w-full aspect-[3/4] object-cover"
          onError={() => setImageError(true)}
        />
      )}
      {/* Type Badge */}
      <div className="absolute top-2 left-2">
        {content.type === 'video' || content.type === 'reel' ? (
          <div className="p-1.5 bg-black/60 rounded-lg">
            <Video size={14} className="text-white" />
          </div>
        ) : (
          <div className="p-1.5 bg-black/60 rounded-lg">
            <Image size={14} className="text-white" />
          </div>
        )}
      </div>
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="text-white text-sm font-medium text-center px-2">{content.influencerName}</div>
        <div className="flex items-center gap-3 text-white/80 text-xs">
          <span className="flex items-center gap-1">
            <Heart size={12} /> {formatNumber(content.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} /> {formatNumber(content.comments)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <a
            href={content.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ExternalLink size={16} className="text-white" />
          </a>
          <button
            onClick={() => onDownload(content)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Download size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentGallery({ contents }: { contents: ContentItem[] }) {
  const handleDownload = (content: ContentItem) => {
    // 실제 구현 시 서명된 URL을 사용하여 다운로드
    const link = document.createElement('a');
    link.href = content.downloadUrl;
    link.download = `content-${content.id}.${content.type === 'image' ? 'jpg' : 'mp4'}`;
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-950">콘텐츠 갤러리</h3>
        <span className="text-sm text-slate-500">총 {contents.length}개</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {contents.map((content) => (
          <ContentCard key={content.id} content={content} onDownload={handleDownload} />
        ))}
      </div>
    </div>
  );
}

function AIAnalysisCard({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-white/10 rounded-xl">
          <Sparkles size={20} className="text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold">AI 캠페인 분석</h3>
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

// 캠페인 성과 컴포넌트
function CampaignPerformance({ campaign: _campaign }: { campaign: CampaignListItem }) {
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customDateRange, setCustomDateRange] = useState({
    start: '2024-12-01',
    end: '2024-12-14',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 기간별 차트 데이터
  const chartData = {
    daily: {
      impressions: [
        { date: '12/01', value: 280000 },
        { date: '12/02', value: 320000 },
        { date: '12/03', value: 450000 },
        { date: '12/04', value: 380000 },
        { date: '12/05', value: 520000 },
        { date: '12/06', value: 480000 },
        { date: '12/07', value: 550000 },
      ],
      likes: [
        { date: '12/01', value: 8500 },
        { date: '12/02', value: 12000 },
        { date: '12/03', value: 15200 },
        { date: '12/04', value: 11800 },
        { date: '12/05', value: 18500 },
        { date: '12/06', value: 14200 },
        { date: '12/07', value: 16800 },
      ],
      views: [
        { date: '12/01', value: 120000 },
        { date: '12/02', value: 180000 },
        { date: '12/03', value: 210000 },
        { date: '12/04', value: 165000 },
        { date: '12/05', value: 245000 },
        { date: '12/06', value: 195000 },
        { date: '12/07', value: 230000 },
      ],
      engagement: [
        { date: '12/01', shares: 1200, comments: 850 },
        { date: '12/02', shares: 1800, comments: 1100 },
        { date: '12/03', shares: 2100, comments: 1450 },
        { date: '12/04', shares: 1650, comments: 1200 },
        { date: '12/05', shares: 2450, comments: 1680 },
        { date: '12/06', shares: 1950, comments: 1320 },
        { date: '12/07', shares: 2300, comments: 1550 },
      ],
    },
    weekly: {
      impressions: [
        { date: '11월 1주', value: 1850000 },
        { date: '11월 2주', value: 2120000 },
        { date: '11월 3주', value: 2450000 },
        { date: '11월 4주', value: 2680000 },
        { date: '12월 1주', value: 2980000 },
        { date: '12월 2주', value: 3450000 },
      ],
      likes: [
        { date: '11월 1주', value: 52000 },
        { date: '11월 2주', value: 61000 },
        { date: '11월 3주', value: 68000 },
        { date: '11월 4주', value: 75000 },
        { date: '12월 1주', value: 82000 },
        { date: '12월 2주', value: 89500 },
      ],
      views: [
        { date: '11월 1주', value: 680000 },
        { date: '11월 2주', value: 780000 },
        { date: '11월 3주', value: 920000 },
        { date: '11월 4주', value: 1050000 },
        { date: '12월 1주', value: 1150000 },
        { date: '12월 2주', value: 1250000 },
      ],
      engagement: [
        { date: '11월 1주', shares: 7200, comments: 4800 },
        { date: '11월 2주', shares: 8400, comments: 5600 },
        { date: '11월 3주', shares: 9600, comments: 6200 },
        { date: '11월 4주', shares: 10800, comments: 7100 },
        { date: '12월 1주', shares: 11500, comments: 7800 },
        { date: '12월 2주', shares: 12300, comments: 8470 },
      ],
    },
    monthly: {
      impressions: [
        { date: '8월', value: 4200000 },
        { date: '9월', value: 5800000 },
        { date: '10월', value: 7500000 },
        { date: '11월', value: 9100000 },
        { date: '12월', value: 3450000 },
      ],
      likes: [
        { date: '8월', value: 125000 },
        { date: '9월', value: 168000 },
        { date: '10월', value: 215000 },
        { date: '11월', value: 256000 },
        { date: '12월', value: 89500 },
      ],
      views: [
        { date: '8월', value: 1800000 },
        { date: '9월', value: 2450000 },
        { date: '10월', value: 3200000 },
        { date: '11월', value: 3850000 },
        { date: '12월', value: 1250000 },
      ],
      engagement: [
        { date: '8월', shares: 18500, comments: 12400 },
        { date: '9월', shares: 25600, comments: 17200 },
        { date: '10월', shares: 34200, comments: 22800 },
        { date: '11월', shares: 42500, comments: 28600 },
        { date: '12월', shares: 12300, comments: 8470 },
      ],
    },
    custom: {
      impressions: [
        { date: '12/01', value: 280000 },
        { date: '12/02', value: 320000 },
        { date: '12/03', value: 450000 },
        { date: '12/04', value: 380000 },
        { date: '12/05', value: 520000 },
        { date: '12/06', value: 480000 },
        { date: '12/07', value: 550000 },
        { date: '12/08', value: 420000 },
        { date: '12/09', value: 380000 },
        { date: '12/10', value: 510000 },
        { date: '12/11', value: 620000 },
        { date: '12/12', value: 580000 },
        { date: '12/13', value: 640000 },
        { date: '12/14', value: 690000 },
      ],
      likes: [
        { date: '12/01', value: 8500 },
        { date: '12/02', value: 12000 },
        { date: '12/03', value: 15200 },
        { date: '12/04', value: 11800 },
        { date: '12/05', value: 18500 },
        { date: '12/06', value: 14200 },
        { date: '12/07', value: 16800 },
        { date: '12/08', value: 13500 },
        { date: '12/09', value: 11200 },
        { date: '12/10', value: 17800 },
        { date: '12/11', value: 21500 },
        { date: '12/12', value: 19200 },
        { date: '12/13', value: 22800 },
        { date: '12/14', value: 25100 },
      ],
      views: [
        { date: '12/01', value: 120000 },
        { date: '12/02', value: 180000 },
        { date: '12/03', value: 210000 },
        { date: '12/04', value: 165000 },
        { date: '12/05', value: 245000 },
        { date: '12/06', value: 195000 },
        { date: '12/07', value: 230000 },
        { date: '12/08', value: 185000 },
        { date: '12/09', value: 160000 },
        { date: '12/10', value: 220000 },
        { date: '12/11', value: 280000 },
        { date: '12/12', value: 250000 },
        { date: '12/13', value: 310000 },
        { date: '12/14', value: 340000 },
      ],
      engagement: [
        { date: '12/01', shares: 1200, comments: 850 },
        { date: '12/02', shares: 1800, comments: 1100 },
        { date: '12/03', shares: 2100, comments: 1450 },
        { date: '12/04', shares: 1650, comments: 1200 },
        { date: '12/05', shares: 2450, comments: 1680 },
        { date: '12/06', shares: 1950, comments: 1320 },
        { date: '12/07', shares: 2300, comments: 1550 },
        { date: '12/08', shares: 1850, comments: 1280 },
        { date: '12/09', shares: 1600, comments: 1100 },
        { date: '12/10', shares: 2200, comments: 1480 },
        { date: '12/11', shares: 2800, comments: 1920 },
        { date: '12/12', shares: 2500, comments: 1720 },
        { date: '12/13', shares: 3100, comments: 2150 },
        { date: '12/14', shares: 3400, comments: 2380 },
      ],
    },
  };

  // 현재 선택된 기간의 데이터
  const currentData = chartData[periodFilter];

  // 더미 성과 데이터
  const performanceData = {
    feedImpressions: { value: 3450000, change: 15.2 },
    totalLikes: { value: 89500, change: 12.8 },
    totalVideoViews: { value: 1250000, change: 18.5 },
    totalShares: { value: 12300, change: 8.3 },
    totalComments: { value: 8470, change: 10.7 },
  };

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

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <CampaignKPICard
          title="노출 피드 수"
          value={formatNumber(performanceData.feedImpressions.value)}
          change={performanceData.feedImpressions.change}
          isPositive={true}
          metricKey="feedImpressions"
        />
        <CampaignKPICard
          title="총 좋아요"
          value={formatNumber(performanceData.totalLikes.value)}
          change={performanceData.totalLikes.change}
          isPositive={true}
          metricKey="totalLikes"
        />
        <CampaignKPICard
          title="총 비디오 재생 수"
          value={formatNumber(performanceData.totalVideoViews.value)}
          change={performanceData.totalVideoViews.change}
          isPositive={true}
          metricKey="videoViews"
        />
        <CampaignKPICard
          title="총 공유 수"
          value={formatNumber(performanceData.totalShares.value)}
          change={performanceData.totalShares.change}
          isPositive={true}
          metricKey="totalShares"
        />
        <CampaignKPICard
          title="총 댓글 수"
          value={formatNumber(performanceData.totalComments.value)}
          change={performanceData.totalComments.change}
          isPositive={true}
          metricKey="totalComments"
        />
      </div>

      {/* 인플루언서별 성과 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">TOP 인플루언서 성과</h4>
        <div className="space-y-2">
          {[
            { name: '김피트니스', likes: 32000, comments: 1240 },
            { name: '헬스요정', likes: 28000, comments: 980 },
            { name: '운동하는직장인', likes: 24500, comments: 870 },
          ].map((inf, idx) => (
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
          ))}
        </div>
      </div>

      {/* 지표별 추이 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 노출 피드 수 차트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">노출 피드 수 추이</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.impressions}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => [formatNumber(value), '노출']} />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorImpressions)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

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
    views: mention.views,
    engagementRate: mention.engagementRate,
    postedAt: mention.postedAt,
    caption: mention.caption,
  };
}

// 캠페인 상세 뷰 컴포넌트
function CampaignDetailView({
  campaign,
  onBack: _onBack,
  affiliateLinks,
  aiAnalysis,
}: {
  campaign: CampaignListItem;
  onBack: () => void;
  affiliateLinks: AffiliateLink[] | null;
  aiAnalysis: AIAnalysis | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'seeding' | 'affiliate' | 'content'>('performance');
  const [notionSeeding, setNotionSeeding] = useState<SeedingItem[]>([]);
  const [notionContent, setNotionContent] = useState<ContentItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);

  // Notion에서 상세 데이터 로드
  useEffect(() => {
    const loadDetailData = async () => {
      try {
        setDetailLoading(true);
        console.log('[CampaignDetail] Loading detail data for campaign:', campaign.id);

        // 시딩과 멘션 데이터 병렬 로드
        const [seedingData, mentionsData] = await Promise.all([
          fetchSeeding(campaign.id),
          fetchMentions(campaign.id),
        ]);

        console.log('[CampaignDetail] Seeding data:', seedingData);
        console.log('[CampaignDetail] Mentions data:', mentionsData);

        setNotionSeeding(seedingData.map(convertNotionSeeding));
        setNotionContent(mentionsData.map(convertNotionMention));
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
          {activeSubTab === 'performance' && <CampaignPerformance campaign={campaign} />}
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
        <div>{aiAnalysis && <AIAnalysisCard analysis={aiAnalysis} />}</div>
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
  aiAnalysis,
  loading: _loading,
}: CampaignTabProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [notionLoading, setNotionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notion에서 캠페인 데이터 로드
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setNotionLoading(true);
        setError(null);
        console.log('[CampaignTab] Starting to load campaigns...');
        const notionCampaigns = await fetchCampaigns();
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
        onBack={() => setSelectedCampaign(null)}
        affiliateLinks={affiliateLinks}
        aiAnalysis={aiAnalysis}
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
