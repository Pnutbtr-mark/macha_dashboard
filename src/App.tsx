import { useState, useCallback, useEffect } from 'react';
import {
  BarChart3,
  User,
  TrendingUp,
  Megaphone,
  RefreshCw,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Instagram,
  LogOut,
  Loader2,
} from 'lucide-react';
import type { PeriodType, SeedingItem } from './types';
import { PeriodFilter } from './components/common/PeriodFilter';
import { ProfileTab } from './components/tabs/ProfileTab';
import { AdsTab } from './components/tabs/AdsTab';
import { CampaignTab } from './components/tabs/CampaignTab';
import { InfluencersTab } from './components/tabs/InfluencersTab';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';
import {
  useProfileInsight,
  useDailyProfileData,
  useAdPerformance,
  useDailyAdData,
  useInfluencers,
  useSeedingList,
  useAffiliateLinks,
  useContentList,
  useAIAnalysis,
} from './hooks/useApi';

// 탭 타입
type TabType = 'profile' | 'ads' | 'campaign' | 'influencers';

// ============================================
// 메인 App 컴포넌트
// ============================================
function App() {
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();

  // 로딩 중이면 로딩 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // 로그인 안되어 있으면 로그인 페이지 표시
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard user={user!} logout={logout} />;
}

// ============================================
// 대시보드 컴포넌트
// ============================================
function Dashboard({ user, logout }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; logout: () => void }) {
  // 상태
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [customDateRange, setCustomDateRange] = useState({
    start: '2024-12-01',
    end: '2024-12-14',
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localSeedingList, setLocalSeedingList] = useState<SeedingItem[]>([]);

  // API 데이터 (Custom Hooks)
  const { data: profileData, loading: profileLoading, refetch: refetchProfile, lastUpdated } = useProfileInsight();
  const { data: dailyProfileData, loading: dailyProfileLoading, refetch: refetchDailyProfile } = useDailyProfileData(period);
  const { data: adData, loading: adLoading, refetch: refetchAd } = useAdPerformance();
  const { data: dailyAdData, loading: dailyAdLoading, refetch: refetchDailyAd } = useDailyAdData(period);
  const { data: influencers, loading: influencersLoading, refetch: refetchInfluencers } = useInfluencers();
  const { data: seedingList, loading: seedingLoading, refetch: refetchSeeding } = useSeedingList();

  // seedingList가 로드되면 localSeedingList 초기화
  useEffect(() => {
    if (seedingList) {
      setLocalSeedingList(seedingList);
    }
  }, [seedingList]);

  const { data: affiliateLinks, loading: affiliateLoading, refetch: refetchAffiliate } = useAffiliateLinks();
  const { data: contentList, loading: contentLoading, refetch: refetchContent } = useContentList();
  const { data: aiAnalysis, loading: aiLoading, refetch: refetchAI } = useAIAnalysis();

  // 전체 새로고침
  const handleRefreshAll = useCallback(() => {
    refetchProfile();
    refetchDailyProfile();
    refetchAd();
    refetchDailyAd();
    refetchInfluencers();
    refetchSeeding();
    refetchAffiliate();
    refetchContent();
    refetchAI();
  }, [refetchProfile, refetchDailyProfile, refetchAd, refetchDailyAd, refetchInfluencers, refetchSeeding, refetchAffiliate, refetchContent, refetchAI]);

  // 공유 링크 생성
  const shareLink = `${window.location.origin}/dashboard/${user.brand.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 탭 설정
  const tabs: { key: TabType; label: string; icon: typeof User }[] = [
    { key: 'profile', label: '프로필 인사이트', icon: User },
    { key: 'ads', label: '광고 성과', icon: TrendingUp },
    { key: 'campaign', label: '캠페인 관리', icon: Megaphone },
    { key: 'influencers', label: '인플루언서 리스트', icon: User },
  ];

  // 로딩 상태 계산
  const isLoading = {
    profile: profileLoading || dailyProfileLoading,
    ads: adLoading || dailyAdLoading,
    campaign: influencersLoading || seedingLoading || affiliateLoading || contentLoading || aiLoading,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-primary-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo & Campaign Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <BarChart3 size={22} className="text-white" />
                </div>
                <span className="font-bold text-xl">Macha</span>
              </div>
              <div className="h-8 w-px bg-primary-700" />
              <div>
                <div className="text-primary-300 text-sm">{user.brand.client}</div>
                <div className="font-semibold">{user.brand.name}</div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-4">
              {/* Live Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-emerald-300">실시간 연동</span>
              </div>

              {/* Instagram Connect Button */}
              <button
                onClick={() => {
                  const url =
                    'https://www.facebook.com/v24.0/dialog/oauth' +
                    '?client_id=742315354931014' +
                    '&redirect_uri=https://matcha.pnutbutter.kr/api-meta/auth/callback' +
                    '&scope=' +
                    [
                      'public_profile',
                      'pages_show_list',
                      'pages_read_engagement',
                      'instagram_basic',
                      'instagram_manage_insights',
                      'business_management',
                      'ads_read',
                      'ads_management',
                    ].join(',') +
                    '&response_type=code';
                  window.location.href = url;
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-white text-xs transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)',
                }}
              >
                <Instagram size={14} />
                Instagram 연결
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefreshAll}
                className="p-2 text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                title="새로고침"
              >
                <RefreshCw size={18} />
              </button>

              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Share2 size={16} />
                <span className="text-sm font-medium">공유</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium hidden md:inline">{user.name}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="mt-6 flex items-center gap-1 bg-primary-900/50 rounded-xl p-1.5">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-white text-primary-950 shadow-sm'
                    : 'text-primary-300 hover:text-white hover:bg-primary-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar - 캠페인 탭에서는 숨김 */}
        {activeTab !== 'campaign' && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <PeriodFilter
              period={period}
              onChange={setPeriod}
              customDateRange={customDateRange}
              onCustomDateChange={(start, end) => setCustomDateRange({ start, end })}
            />

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-sm text-slate-500">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <ProfileTab
            profileData={profileData}
            dailyData={dailyProfileData}
            loading={isLoading.profile}
          />
        )}

        {activeTab === 'ads' && (
          <AdsTab
            adData={adData}
            dailyData={dailyAdData}
            loading={isLoading.ads}
          />
        )}

        {activeTab === 'campaign' && (
          <CampaignTab
            influencers={influencers}
            seedingList={localSeedingList}
            affiliateLinks={affiliateLinks}
            contentList={contentList}
            aiAnalysis={aiAnalysis}
            loading={isLoading.campaign}
          />
        )}

        {activeTab === 'influencers' && <InfluencersTab />}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div>
            © 2024 Macha Dashboard. 데이터는 Instagram Graph API, Meta Ads API, 내부 DB와 실시간 연동됩니다.
          </div>
          <div className="flex items-center gap-4">
            <span>문의: support@macha.io</span>
          </div>
        </div>
      </footer>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-950">대시보드 공유</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              아래 링크를 통해 이 대시보드를 팀원 또는 고객사에 공유할 수 있습니다.
            </p>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-4">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  copiedLink
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? '복사됨' : '복사'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={14} />
                새 탭에서 열기
              </a>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs font-medium text-amber-700 mb-1">참고</div>
              <p className="text-xs text-amber-600">
                공유 링크에 접근하려면 별도의 인증이 필요합니다.
                실제 운영 시에는 접근 권한을 설정해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
