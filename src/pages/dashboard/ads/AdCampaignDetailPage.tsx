import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdStore } from '../../../stores/adStore';

export function AdCampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaignHierarchy, loading, fetchAllData } = useAdStore();

  // 초기 데이터 로드
  useEffect(() => {
    if (user?.id) {
      fetchAllData(user.id);
    }
  }, [user?.id, fetchAllData]);

  // 캠페인 데이터 찾기
  const campaign = campaignHierarchy.find(
    (c) => c.campaignId === campaignId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">캠페인을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/dashboard/ads')}
          className="text-primary-600 hover:text-primary-700"
        >
          광고 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/ads')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{campaign.campaignName}</h1>
          <p className="text-slate-500 text-sm">캠페인 ID: {campaignId}</p>
        </div>
      </div>

      {/* 캠페인 정보 카드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">캠페인 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">목표</p>
            <p className="font-medium">{campaign.objective || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">상태</p>
            <p className="font-medium">{campaign.status || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">광고세트 수</p>
            <p className="font-medium">{campaign.adSets?.length || 0}개</p>
          </div>
        </div>
      </div>

      {/* 광고세트 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">광고세트 목록</h2>
        {campaign.adSets && campaign.adSets.length > 0 ? (
          <div className="space-y-3">
            {campaign.adSets.map((adSet) => (
              <Link
                key={adSet.id}
                to={`/dashboard/ads/campaigns/${campaignId}/adsets/${adSet.id}`}
                className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{adSet.name}</p>
                    <p className="text-sm text-slate-500">상태: {adSet.status || '-'}</p>
                  </div>
                  <div className="text-sm text-slate-500">
                    소재 {adSet.ads?.length || 0}개
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">광고세트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
