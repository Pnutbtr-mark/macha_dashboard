import { Calendar, User, Package, Users, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CampaignSummaryHeaderProps {
  campaign: {
    id: string;
    name: string;
    category: string;
    campaignType: '협찬' | '유료';
    productType: string;
    participants: number;
    startDate: string;
    endDate: string;
    manager: string;
    status: string;
  };
  applicantCount?: number;
  budget?: number;
}

// 캠페인 요약 헤더 컴포넌트
export function CampaignSummaryHeader({
  campaign,
  applicantCount = 0,
  budget,
}: CampaignSummaryHeaderProps) {
  // 상태 배지 스타일
  const getStatusStyle = (status: string) => {
    const statusMap: Record<string, string> = {
      '진행중': 'bg-emerald-100 text-emerald-700',
      '진행': 'bg-emerald-100 text-emerald-700',
      'active': 'bg-emerald-100 text-emerald-700',
      '완료': 'bg-slate-100 text-slate-600',
      'completed': 'bg-slate-100 text-slate-600',
      '대기중': 'bg-amber-100 text-amber-700',
      'pending': 'bg-amber-100 text-amber-700',
      '중단': 'bg-red-100 text-red-600',
      'paused': 'bg-red-100 text-red-600',
    };
    return statusMap[status] || 'bg-slate-100 text-slate-600';
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* 상단: 캠페인명 + 상태 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-primary-950">{campaign.name}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(campaign.status)}`}>
            {campaign.status}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            campaign.campaignType === '협찬'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {campaign.campaignType}
          </span>
        </div>
      </div>

      {/* 하단: 상세 정보 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 기간 */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Calendar size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">기간</p>
            <p className="text-sm font-medium text-slate-700">
              {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
            </p>
          </div>
        </div>

        {/* 담당자 */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <User size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">담당자</p>
            <p className="text-sm font-medium text-slate-700">{campaign.manager || '-'}</p>
          </div>
        </div>

        {/* 제품 */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Package size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">제품</p>
            <p className="text-sm font-medium text-slate-700">{campaign.productType || '-'}</p>
          </div>
        </div>

        {/* 신청자/참여자 */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Users size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">신청자 / 참여자</p>
            <p className="text-sm font-medium text-slate-700">
              <span className="text-primary-600">{applicantCount}명</span>
              {' / '}
              <span className="text-emerald-600">{campaign.participants}명</span>
            </p>
          </div>
        </div>

        {/* 예산 (있는 경우만) */}
        {budget !== undefined && (
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Wallet size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">예산</p>
              <p className="text-sm font-medium text-slate-700">{formatCurrency(budget)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
