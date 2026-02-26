import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdStore } from '../../../stores/adStore';

export function AdSetDetailPage() {
  const { campaignId, adSetId } = useParams<{ campaignId: string; adSetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaignHierarchy, loading, fetchAllData } = useAdStore();

  // 초기 데이터 로드
  useEffect(() => {
    if (user?.id) {
      fetchAllData(user.id);
    }
  }, [user?.id, fetchAllData]);

  // 캠페인 찾기
  const campaign = campaignHierarchy.find(
    (c) => c.campaignId === campaignId
  );

  // 광고세트 찾기
  const adSet = campaign?.adSets?.find((as) => as.id === adSetId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!adSet) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">광고세트를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate(`/dashboard/ads/campaigns/${campaignId}`)}
          className="text-primary-600 hover:text-primary-700"
        >
          캠페인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/dashboard/ads/campaigns/${campaignId}`)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-sm text-slate-500">{campaign?.campaignName}</p>
          <h1 className="text-2xl font-bold text-slate-900">{adSet.name}</h1>
        </div>
      </div>

      {/* 광고세트 정보 카드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">광고세트 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">상태</p>
            <p className="font-medium">{adSet.status || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">일일 예산</p>
            <p className="font-medium">
              {adSet.dailyBudget ? `₩${Number(adSet.dailyBudget).toLocaleString()}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">소재 수</p>
            <p className="font-medium">{adSet.ads?.length || 0}개</p>
          </div>
        </div>
      </div>

      {/* 소재 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">소재 목록</h2>
        {adSet.ads && adSet.ads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adSet.ads.map((ad) => (
              <div
                key={ad.id}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                {ad.thumbnailUrl && (
                  <img
                    src={ad.thumbnailUrl}
                    alt={ad.adName}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <p className="font-medium truncate">{ad.adName}</p>
                  <p className="text-sm text-slate-500">상태: {ad.status || '-'}</p>
                  {ad.message && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{ad.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">소재가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
