import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import type { AdPerformance, DailyAdData, CampaignPerformance, ProfileInsight } from '../../types';

interface AdsTabProps {
  adData: AdPerformance | null;
  dailyData: DailyAdData[] | null;
  campaignData: CampaignPerformance[];
  profileData: ProfileInsight | null;
  loading: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const formatCurrency = (num: number): string => {
  if (num >= 100000000) return '₩' + (num / 100000000).toFixed(1) + '억';
  if (num >= 10000000) return '₩' + (num / 10000).toFixed(0) + '만';
  if (num >= 10000) return '₩' + (num / 10000).toFixed(0) + '만';
  return '₩' + num.toLocaleString();
};

// 광고 AI 분석 데이터
const adAIAnalysis = {
  summary: '이번 캠페인은 전월 대비 ROAS가 23% 상승하며 우수한 성과를 기록하고 있습니다. 특히 리타게팅 캠페인의 전환율이 기대 이상입니다.',
  insights: [
    '리타게팅 캠페인이 ROAS 6.8x로 가장 높은 수익률을 기록 중입니다.',
    '주말(토-일) 광고 효율이 평일 대비 35% 높게 나타났습니다.',
    '25-34세 여성 타겟층에서 가장 높은 전환이 발생했습니다.',
    'CPC가 전월 대비 12% 감소하여 비용 효율이 개선되었습니다.',
    '브랜드 인지도 캠페인은 도달은 높으나 전환율 개선이 필요합니다.',
  ],
  recommendation: '리타게팅 캠페인 예산을 20% 증액하고, 브랜드 인지도 캠페인의 크리에이티브를 교체하는 것을 권장합니다. 주말 집중 노출 전략도 검토해 주세요.',
  generatedAt: '2024-12-14T15:30:00Z',
};

// KPI 카드 컴포넌트 (로컬) - 컴팩트 버전
function AdKPICard({
  title,
  value,
  subValue,
  change,
  isPositive,
  metricKey,
  loading,
}: {
  title: string;
  value: string;
  subValue?: string;
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
        {subValue && <div className="text-xs text-slate-400">{subValue}</div>}
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>전일 대비 {change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// 파이 차트 컴포넌트
function SourcePieChart({
  title,
  data,
  metricKey,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  metricKey?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        {metricKey && <InfoTooltip metricKey={metricKey} />}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-slate-600">
              {item.name}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: item.color }}
            >
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdsTab({ adData, dailyData, campaignData, profileData, loading }: AdsTabProps) {
  // 캠페인 테이블 페이지네이션
  const [campaignPage, setCampaignPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(campaignData.length / ITEMS_PER_PAGE);
  const paginatedCampaigns = campaignData.slice(
    (campaignPage - 1) * ITEMS_PER_PAGE,
    campaignPage * ITEMS_PER_PAGE
  );

  // 유기적 vs 광고 데이터 계산
  const organicReach = profileData?.reach || 0;
  const adReach = adData?.reach || 0;
  const totalReach = organicReach + adReach;
  const adReachPercent = totalReach > 0 ? Math.round((adReach / totalReach) * 100) : 0;
  const organicReachPercent = totalReach > 0 ? 100 - adReachPercent : 0;

  const organicEngagement = (profileData?.profileViews || 0) + (profileData?.websiteClicks || 0);
  const adEngagement = adData?.clicks || 0;
  const totalEngagement = organicEngagement + adEngagement;
  const organicEngagementPercent = totalEngagement > 0 ? Math.round((organicEngagement / totalEngagement) * 100) : 0;
  const adEngagementPercent = totalEngagement > 0 ? 100 - organicEngagementPercent : 0;

  const reachSourceData = [
    { name: '광고 도달', value: adReachPercent, color: '#f59e0b' },
    { name: '유기적 도달', value: organicReachPercent, color: '#6366f1' },
  ];

  const engagementSourceData = [
    { name: '유기적 참여', value: organicEngagementPercent, color: '#ec4899' },
    { name: '광고 참여', value: adEngagementPercent, color: '#8b5cf6' },
  ];
  if (!adData) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 메인 콘텐츠 영역 */}
      <div className="lg:col-span-2 space-y-6">
        {/* KPI Cards - 3개씩 2열 */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AdKPICard
          title="총 광고 지출"
          value={formatCurrency(adData.spend)}
          change={adData.spendGrowth}
          isPositive={true}
          metricKey="spend"
          loading={loading}
        />
        <AdKPICard
          title="ROAS"
          value={adData.roas.toFixed(1) + 'x'}
          change={adData.roasGrowth}
          isPositive={adData.roasGrowth >= 0}
          metricKey="roas"
          loading={loading}
        />
        <AdKPICard
          title="광고 도달"
          value={formatNumber(adData.reach)}
          change={adData.reachGrowth}
          isPositive={adData.reachGrowth >= 0}
          metricKey="reach"
          loading={loading}
        />
        <AdKPICard
          title="광고 클릭"
          value={formatNumber(adData.clicks)}
          change={adData.clicksGrowth}
          isPositive={adData.clicksGrowth >= 0}
          metricKey="clicks"
          loading={loading}
        />
        <AdKPICard
          title="CTR"
          value={adData.ctr.toFixed(1) + '%'}
          change={adData.ctrGrowth}
          isPositive={adData.ctrGrowth >= 0}
          metricKey="ctr"
          loading={loading}
        />
        <AdKPICard
          title="CPC"
          value={'₩' + Math.round(adData.cpc).toLocaleString()}
          change={adData.cpcGrowth}
          isPositive={adData.cpcGrowth <= 0}
          metricKey="cpc"
          loading={loading}
        />
      </section>

      {/* 광고 캠페인별 성과 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">광고 캠페인별 성과</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">캠페인명</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">광고 지출</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">ROAS</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">광고 도달</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">광고 클릭</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">CTR</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">CPC</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.map((campaign, index) => (
                <tr key={campaign.id} className={index < paginatedCampaigns.length - 1 ? 'border-b border-slate-100' : ''}>
                  <td className="py-4 px-4 text-sm text-slate-700">{campaign.name}</td>
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">₩{campaign.spend.toLocaleString()}</td>
                  <td className="py-4 px-4 text-sm font-semibold text-emerald-600 text-right">{campaign.roas}x</td>
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{formatNumber(campaign.reach)}</td>
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{formatNumber(campaign.clicks)}</td>
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">{campaign.ctr.toFixed(1)}%</td>
                  <td className="py-4 px-4 text-sm text-slate-600 text-right">₩{Math.round(campaign.cpc).toLocaleString()}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : campaign.status === 'paused'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {campaign.status === 'active' ? '진행중' : campaign.status === 'paused' ? '일시정지' : '완료'}
                    </span>
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
              총 {campaignData.length}개 중 {(campaignPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(campaignPage * ITEMS_PER_PAGE, campaignData.length)}개 표시
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCampaignPage(p => Math.max(1, p - 1))}
                disabled={campaignPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCampaignPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    campaignPage === page
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCampaignPage(p => Math.min(totalPages, p + 1))}
                disabled={campaignPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Main Performance Chart */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">일별 광고 성과</h3>
            <InfoTooltip metricKey="spend" />
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-violet-300" />
              <span className="text-slate-600">지출</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary-500" />
              <span className="text-slate-600">클릭</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₩' + (v / 1000).toFixed(0) + 'K'} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  padding: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === '지출') return [formatCurrency(value), name];
                  return [formatNumber(value), name];
                }}
              />
              <Bar yAxisId="left" dataKey="spend" fill="#a78bfa" name="지출" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clicks"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', r: 5, strokeWidth: 2, stroke: '#fff' }}
                name="클릭"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CTR Trend */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-slate-900">CTR 추이</h3>
            <InfoTooltip metricKey="ctr" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => v + '%'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [value.toFixed(2) + '%', 'CTR']}
                />
                <Line
                  type="monotone"
                  dataKey="ctr"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Clicks */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-slate-900">일별 클릭</h3>
            <InfoTooltip metricKey="clicks" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData || []}>
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
                  formatter={(value: number) => [formatNumber(value), '클릭']}
                />
                <Bar dataKey="clicks" fill="#2563eb" name="clicks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 유기적 vs 광고 성과 비교 */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">유기적 vs 광고 성과 비교</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SourcePieChart title="도달 출처" data={reachSourceData} metricKey="reachSource" />
          <SourcePieChart title="참여 출처" data={engagementSourceData} metricKey="engagementSource" />
        </div>
      </section>

      </div>

      {/* AI 분석 사이드바 */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles size={20} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">AI 광고 분석</h3>
          </div>

          <p className="text-primary-100 text-sm leading-relaxed mb-5 pb-5 border-b border-primary-800">
            {adAIAnalysis.summary}
          </p>

          <div className="space-y-3 mb-5">
            {adAIAnalysis.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary-300">{index + 1}</span>
                </div>
                <p className="text-sm text-primary-200 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-400 mb-1">💡 추천 액션</div>
            <p className="text-sm text-amber-100/90 leading-relaxed">{adAIAnalysis.recommendation}</p>
          </div>

          <div className="mt-4 text-xs text-primary-400">
            마지막 업데이트: {new Date(adAIAnalysis.generatedAt).toLocaleString('ko-KR')}
          </div>
        </div>
      </div>
    </div>
  );
}
