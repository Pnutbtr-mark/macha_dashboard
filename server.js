import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';

const app = express();
app.use(cors());
app.use(express.json());

// Notion 클라이언트 초기화
const notion = new Client({ auth: (process.env.NOTION_TOKEN || '').trim() });

// 데이터베이스 ID (prj_matcha 레포지토리 참조)
const DB_IDS = {
  influencers: '94d490dd-8b65-4351-a6eb-eb32a965134f',
  brands: '2b708b1c-348f-812b-a282-e385a1b2a5b9',
  campaigns: '2b708b1c-348f-8141-999f-f77b91095543',
  dailyReport: '2c308b1c348f808bacd0e465c92773aa',
  mentions: '2bd08b1c348f8023bf04fa37fc57d0b6',
};

// ============================================
// 캠페인 API
// ============================================

// 캠페인 목록 조회
app.get('/api/campaigns', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_IDS.campaigns,
      filter: {
        property: 'archived',
        checkbox: { equals: false },
      },
    });

    const campaigns = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props['캠페인명']?.title?.[0]?.plain_text || '',
        category: props['카테고리']?.select?.name || '',
        campaignType: props['캠페인유형']?.select?.name || '협찬',
        productType: props['협찬제품']?.select?.name || '',
        participants: props['참여인원']?.number || 0,
        startDate: props['시작일']?.date?.start || '',
        endDate: props['종료일']?.date?.start || '',
        manager: props['담당자']?.rich_text?.[0]?.plain_text || '',
        status: props['상태']?.select?.name || 'active',
        budget: props['예산']?.number || 0,
        spent: props['집행금액']?.number || 0,
      };
    });

    res.json(campaigns);
  } catch (error) {
    console.error('캠페인 목록 조회 에러:', error);
    res.status(500).json({ error: '캠페인 목록을 불러오는데 실패했습니다.' });
  }
});

// 캠페인 상세 조회
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const page = await notion.pages.retrieve({ page_id: req.params.id });
    const props = page.properties;

    const campaign = {
      id: page.id,
      name: props['캠페인명']?.title?.[0]?.plain_text || '',
      category: props['카테고리']?.select?.name || '',
      campaignType: props['캠페인유형']?.select?.name || '협찬',
      productType: props['협찬제품']?.select?.name || '',
      participants: props['참여인원']?.number || 0,
      startDate: props['시작일']?.date?.start || '',
      endDate: props['종료일']?.date?.start || '',
      manager: props['담당자']?.rich_text?.[0]?.plain_text || '',
      status: props['상태']?.select?.name || 'active',
      budget: props['예산']?.number || 0,
      spent: props['집행금액']?.number || 0,
    };

    res.json(campaign);
  } catch (error) {
    console.error('캠페인 상세 조회 에러:', error);
    res.status(500).json({ error: '캠페인 정보를 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 인플루언서 API
// ============================================

// 인플루언서 목록 조회
app.get('/api/influencers', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DB_IDS.influencers,
      filter: {
        property: 'archived',
        checkbox: { equals: false },
      },
    });

    const influencers = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props['이름']?.title?.[0]?.plain_text || '',
        handle: props['핸들']?.rich_text?.[0]?.plain_text || '',
        platform: props['플랫폼']?.select?.name || 'instagram',
        thumbnail: props['프로필이미지']?.url || '',
        followers: props['팔로워']?.number || 0,
        engagementRate: props['참여율']?.number || 0,
        avgLikes: props['평균좋아요']?.number || 0,
        avgComments: props['평균댓글']?.number || 0,
        category: props['카테고리']?.multi_select?.map((s) => s.name) || [],
        priceRange: props['단가']?.rich_text?.[0]?.plain_text || '',
        verified: props['인증']?.checkbox || false,
        status: props['상태']?.select?.name || '',
        email: props['이메일']?.email || '',
        phone: props['연락처']?.phone_number || '',
      };
    });

    res.json(influencers);
  } catch (error) {
    console.error('인플루언서 목록 조회 에러:', error);
    res.status(500).json({ error: '인플루언서 목록을 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 멘션 (콘텐츠 성과) API
// ============================================

// 멘션 데이터 조회
app.get('/api/mentions', async (req, res) => {
  try {
    const { campaignId } = req.query;

    const filter = {
      property: 'archived',
      checkbox: { equals: false },
    };

    // 캠페인 ID로 필터링 (옵션)
    const queryOptions = {
      database_id: DB_IDS.mentions,
      filter: campaignId
        ? {
            and: [
              filter,
              {
                property: '캠페인',
                relation: { contains: campaignId },
              },
            ],
          }
        : filter,
      page_size: 100,
    };

    const response = await notion.databases.query(queryOptions);

    const mentions = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        influencerName: props['크리에이터']?.rich_text?.[0]?.plain_text || '',
        platform: props['플랫폼']?.select?.name || 'instagram',
        type: props['콘텐츠유형']?.select?.name || 'post',
        likes: props['좋아요']?.number || 0,
        comments: props['댓글']?.number || 0,
        shares: props['공유']?.number || 0,
        views: props['조회수']?.number || 0,
        reach: props['도달']?.number || 0,
        impressions: props['노출']?.number || 0,
        engagementRate: props['참여율']?.number || 0,
        postUrl: props['게시물URL']?.url || '',
        postedAt: props['게시일']?.date?.start || '',
        caption: props['캡션']?.rich_text?.[0]?.plain_text || '',
      };
    });

    res.json(mentions);
  } catch (error) {
    console.error('멘션 조회 에러:', error);
    res.status(500).json({ error: '멘션 데이터를 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 일일 리포트 API
// ============================================

// 일별 성과 데이터 조회
app.get('/api/daily-report', async (req, res) => {
  try {
    const { campaignId, startDate, endDate } = req.query;

    const filters = [
      {
        property: 'archived',
        checkbox: { equals: false },
      },
    ];

    if (campaignId) {
      filters.push({
        property: '캠페인',
        relation: { contains: campaignId },
      });
    }

    if (startDate) {
      filters.push({
        property: '날짜',
        date: { on_or_after: startDate },
      });
    }

    if (endDate) {
      filters.push({
        property: '날짜',
        date: { on_or_before: endDate },
      });
    }

    const response = await notion.databases.query({
      database_id: DB_IDS.dailyReport,
      filter: filters.length > 1 ? { and: filters } : filters[0],
      sorts: [{ property: '날짜', direction: 'ascending' }],
    });

    const dailyData = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        date: props['날짜']?.date?.start || '',
        reach: props['도달']?.number || 0,
        impressions: props['노출']?.number || 0,
        likes: props['좋아요']?.number || 0,
        comments: props['댓글']?.number || 0,
        shares: props['공유']?.number || 0,
        views: props['조회수']?.number || 0,
        followers: props['팔로워']?.number || 0,
        engagement: props['참여율']?.number || 0,
      };
    });

    res.json(dailyData);
  } catch (error) {
    console.error('일일 리포트 조회 에러:', error);
    res.status(500).json({ error: '일일 리포트를 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 대시보드 통계 API
// ============================================

app.get('/api/dashboard', async (req, res) => {
  try {
    const { campaignId } = req.query;

    // 캠페인 데이터 조회
    const campaignsRes = await notion.databases.query({
      database_id: DB_IDS.campaigns,
      filter: campaignId
        ? { property: 'ID', rich_text: { equals: campaignId } }
        : { property: 'archived', checkbox: { equals: false } },
    });

    // 인플루언서 수 조회
    const influencersRes = await notion.databases.query({
      database_id: DB_IDS.influencers,
      filter: { property: 'archived', checkbox: { equals: false } },
    });

    // 멘션 데이터 조회 (성과 집계용)
    const mentionsRes = await notion.databases.query({
      database_id: DB_IDS.mentions,
      filter: { property: 'archived', checkbox: { equals: false } },
      page_size: 100,
    });

    // 통계 계산
    const totalCampaigns = campaignsRes.results.length;
    const totalInfluencers = influencersRes.results.length;

    let totalReach = 0;
    let totalImpressions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;

    mentionsRes.results.forEach((page) => {
      const props = page.properties;
      totalReach += props['도달']?.number || 0;
      totalImpressions += props['노출']?.number || 0;
      totalLikes += props['좋아요']?.number || 0;
      totalComments += props['댓글']?.number || 0;
      totalShares += props['공유']?.number || 0;
      totalViews += props['조회수']?.number || 0;
    });

    res.json({
      totalCampaigns,
      totalInfluencers,
      totalMentions: mentionsRes.results.length,
      performance: {
        reach: totalReach,
        impressions: totalImpressions,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        views: totalViews,
      },
    });
  } catch (error) {
    console.error('대시보드 통계 조회 에러:', error);
    res.status(500).json({ error: '대시보드 통계를 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 시딩 (캠페인 참여자) API
// ============================================

// 캠페인별 참여 인플루언서 조회
app.get('/api/seeding', async (req, res) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: '캠페인 ID가 필요합니다.' });
    }

    // 캠페인에 연결된 인플루언서 조회
    const response = await notion.databases.query({
      database_id: DB_IDS.influencers,
      filter: {
        and: [
          { property: 'archived', checkbox: { equals: false } },
          { property: '캠페인', relation: { contains: campaignId } },
        ],
      },
    });

    const seedingList = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        influencer: {
          id: page.id,
          name: props['이름']?.title?.[0]?.plain_text || '',
          handle: props['핸들']?.rich_text?.[0]?.plain_text || '',
          thumbnail: props['프로필이미지']?.url || '',
          followers: props['팔로워']?.number || 0,
          engagementRate: props['참여율']?.number || 0,
        },
        type: props['시딩유형']?.select?.name === '유료' ? 'paid' : 'free',
        status: props['진행상태']?.select?.name || 'pending',
        paymentAmount: props['광고비']?.number || 0,
        productValue: props['제품가액']?.number || 0,
        notes: props['비고']?.rich_text?.[0]?.plain_text || '',
        requestDate: props['요청일']?.date?.start || '',
        postDate: props['게시일']?.date?.start || '',
      };
    });

    res.json(seedingList);
  } catch (error) {
    console.error('시딩 목록 조회 에러:', error);
    res.status(500).json({ error: '시딩 목록을 불러오는데 실패했습니다.' });
  }
});

// ============================================
// 인증 API (프록시)
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const response = await fetch(`${process.env.EXTERNAL_API_URL}/api/v1/dash-members/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({
      responseCode: -1,
      message: '로그인 처리 중 오류가 발생했습니다.',
    });
  }
});

// ============================================
// 서버 시작
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
