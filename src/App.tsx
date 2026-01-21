import { useState, useCallback, useEffect } from 'react';
import {
  BarChart3,
  User,
  TrendingUp,
  Megaphone,
  RefreshCw,
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
import { RegisterPage } from './components/RegisterPage';
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
  useFollowerDemographic,
  useProfileContent,
} from './hooks/useApi';
import { syncDashMember, syncDashAd } from './services/metaDashApi';

// 탭 타입
type TabType = 'profile' | 'ads' | 'campaign' | 'influencers';

// ============================================
// 메인 App 컴포넌트
// ============================================
function App() {
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // 로딩 중이면 로딩 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // 로그인 안되어 있으면 로그인/회원가입 페이지 표시
  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterPage onBackToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onRegister={() => setShowRegister(true)} />;
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
  const [localSeedingList, setLocalSeedingList] = useState<SeedingItem[]>([]);

  // API 데이터 (Custom Hooks)
  const { data: profileData, loading: profileLoading, refetch: refetchProfile, lastUpdated } = useProfileInsight();
  const { data: dailyProfileData, loading: dailyProfileLoading, refetch: refetchDailyProfile } = useDailyProfileData(period);
  const { data: adData, loading: adLoading, refetch: refetchAd } = useAdPerformance(user.id);
  const { data: dailyAdData, loading: dailyAdLoading, refetch: refetchDailyAd } = useDailyAdData(period, user.id);
  const { data: influencers, loading: influencersLoading } = useInfluencers();
  const { data: seedingList, loading: seedingLoading } = useSeedingList();

  // seedingList가 로드되면 localSeedingList 초기화
  useEffect(() => {
    if (seedingList) {
      setLocalSeedingList(seedingList);
    }
  }, [seedingList]);

  const { loading: affiliateLoading } = useAffiliateLinks();
  const { data: contentList, loading: contentLoading } = useContentList();
  const { data: aiAnalysis, loading: aiLoading } = useAIAnalysis();

  // 신규 hooks (Meta Dash API)
  const { data: followerDemographic, loading: followerDemographicLoading, refetch: refetchFollowerDemographic } = useFollowerDemographic();
  const { data: profileContent, loading: profileContentLoading, refetch: refetchProfileContent } = useProfileContent();

  // 프로필 인사이트 동기화
  const handleRefreshProfile = useCallback(async () => {
    console.log('프로필 데이터 동기화 시작...');

    // Sync API 호출 (Meta Dash)
    if (user?.id) {
      try {
        const syncResult = await syncDashMember(user.id);
        console.log('프로필 동기화 결과:', syncResult);
      } catch (error) {
        console.error('프로필 동기화 실패:', error);
      }
    }

    // 프로필 관련 데이터만 새로고침
    refetchProfile();
    refetchDailyProfile();
    refetchFollowerDemographic();
    refetchProfileContent();

    console.log('프로필 데이터 새로고침 완료');
  }, [user?.id, refetchProfile, refetchDailyProfile, refetchFollowerDemographic, refetchProfileContent]);

  // 광고 성과 동기화
  const handleRefreshAds = useCallback(async () => {
    console.log('광고 데이터 동기화 시작...');

    // Sync API 호출 (광고 전용)
    if (user?.id) {
      try {
        const syncResult = await syncDashAd(user.id);
        console.log('광고 동기화 결과:', syncResult);
      } catch (error) {
        console.error('광고 동기화 실패:', error);
      }
    }

    // 광고 관련 데이터만 새로고침
    refetchAd();
    refetchDailyAd();

    console.log('광고 데이터 새로고침 완료');
  }, [user?.id, refetchAd, refetchDailyAd]);

  // 탭 설정
  const tabs: { key: TabType; label: string; icon: typeof User }[] = [
    { key: 'profile', label: '프로필 인사이트', icon: User },
    { key: 'ads', label: '광고 성과', icon: TrendingUp },
    { key: 'campaign', label: '캠페인 관리', icon: Megaphone },
    { key: 'influencers', label: '인플루언서 리스트', icon: User },
  ];

  // 로딩 상태 계산
  const isLoading = {
    profile: profileLoading || dailyProfileLoading || followerDemographicLoading || profileContentLoading,
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
                <span className="font-bold text-xl">Wellink</span>
              </div>
              <div className="h-8 w-px bg-primary-700" />
              <div>
                <div className="text-primary-300 text-sm">{user.brand?.client || user.name}</div>
                <div className="font-semibold">{user.brand?.name || user.email}</div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-4">
              {/* Instagram Connect Button */}
              <button
                onClick={() => {
                  const stateObj = {
                    redirectUrl: window.location.origin,
                    dashMemberId: user.id,
                  };
                  const encodedState = encodeURIComponent(JSON.stringify(stateObj));

                  const url =
                    'https://www.facebook.com/v24.0/dialog/oauth' +
                    '?client_id=742315354931014' +
                    '&redirect_uri=https://matcha.pnutbutter.kr/api-meta/auth/callback' +
                    '&state=' +
                    encodedState +
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
                    '&response_type=code' +
                    '&auth_type=rerequest' +
                    '&enable_profile_selector=true';
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

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">로그아웃</span>
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

            {/* Last Updated & Sync Button - 프로필/광고 탭에서만 표시 */}
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="text-sm text-slate-500">
                  마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
                </div>
              )}
              {(activeTab === 'profile' || activeTab === 'ads') && (
                <button
                  onClick={activeTab === 'profile' ? handleRefreshProfile : handleRefreshAds}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                  title="데이터 동기화"
                >
                  <RefreshCw size={14} />
                  동기화
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <ProfileTab
            profileData={profileData}
            dailyData={dailyProfileData}
            followerDemographic={followerDemographic}
            contentData={profileContent}
            loading={isLoading.profile}
          />
        )}

        {activeTab === 'ads' && (
          <AdsTab
            adData={adData?.adPerformance || null}
            dailyData={dailyAdData}
            campaignData={adData?.campaignData || []}
            campaignHierarchy={adData?.campaignHierarchy || []}
            profileData={profileData}
            loading={isLoading.ads}
          />
        )}

        {activeTab === 'campaign' && (
          <CampaignTab
            influencers={influencers}
            seedingList={localSeedingList}
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
            © 2024 Wellink Dashboard. 데이터는 Instagram Graph API, Meta Ads API, 내부 DB와 실시간 연동됩니다.
          </div>
          <div className="flex items-center gap-4">
            <span>문의: support@macha.io</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
