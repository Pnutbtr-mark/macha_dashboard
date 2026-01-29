import 'dotenv/config';
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
  applicants: '2b708b1c348f81b0a367e99677c3c0da', // 사계단백연구소 캠페인 접수 리스트 (기본값)
};

// 계정별 신청자 DB 매핑
const ACCOUNT_APPLICANTS_DB = {
  'w365299': '2b708b1c348f81b0a367e99677c3c0da',      // 사계단백
  'ehddls5151@': '2b708b1c348f81b0a367e99677c3c0da',  // 사계단백
  'sweatif': '2f508b1c348f808a86b1d5596fcf0cfe',      // sweatif
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
// 신청자 API
// ============================================

// 신청자 목록 조회 (노션 DB에서)
app.get('/api/applicants', async (req, res) => {
  try {
    // loginId로 해당 계정의 DB 조회
    const { loginId } = req.query;
    const dbId = ACCOUNT_APPLICANTS_DB[loginId] || DB_IDS.applicants;
    console.log(`[ApplicantAPI] loginId: ${loginId}, dbId: ${dbId}`);

    // 페이지네이션으로 모든 결과 수집 (Notion API는 최대 100개씩 반환)
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: dbId,
        sorts: [
          {
            property: '접수 일시',
            direction: 'descending',
          },
        ],
        start_cursor: nextCursor,
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }

    console.log(`[ApplicantAPI] 총 ${allResults.length}명 조회됨`);

    const applicants = allResults.map((page) => {
      const props = page.properties;

      // 접수 일시 추출
      const appliedAt = props['접수 일시']?.date?.start || '';

      // 이름 추출 (title 타입)
      const name = props['이름']?.title?.[0]?.plain_text || '';

      // 연락처 추출
      const phoneNumber = props['연락처']?.phone_number || '';

      // 인스타그램 ID 추출 (rich_text 타입)
      const instagramId = props['인스타그램 ID']?.rich_text?.[0]?.plain_text || '';

      // 한 줄 기대평 추출
      const expectation = props['한 줄 기대평']?.rich_text?.[0]?.plain_text || '';

      // 콘텐츠 2차 활용 동의 추출
      const marketingConsent = props['콘텐츠 2차 활용 및 마케팅 이용 동의']?.checkbox || false;

      return {
        id: page.id,
        name,
        phoneNumber,
        instagramId,
        appliedAt,
        expectation,
        marketingConsent,
      };
    });

    res.json({ applicants });
  } catch (error) {
    console.error('신청자 목록 조회 에러:', error);
    res.status(500).json({
      error: '신청자 목록을 불러오는데 실패했습니다.',
      details: error.message
    });
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
// Instagram 이미지 추출 API (CDN 만료 대응)
// ============================================

// 메모리 캐시 (24시간)
const imageCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

// 캐시 정리 (1시간마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// og:image 메타태그 추출 함수
function extractOgImage(html) {
  // og:image 메타태그 패턴 (더 유연하게)
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  }
  return null;
}

// Instagram 프로필 이미지 API
app.get('/api/instagram-profile', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'username이 필요합니다.' });
    }

    const cacheKey = `profile:${username}`;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ imageUrl: cached.imageUrl, cached: true });
    }

    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: '프로필을 불러올 수 없습니다.' });
    }

    const html = await response.text();
    console.log('[Profile] HTML length:', html.length, 'has og:image:', html.includes('og:image'));
    const imageUrl = extractOgImage(html);
    console.log('[Profile] Extracted:', imageUrl ? imageUrl.substring(0, 80) + '...' : null);

    if (!imageUrl) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }

    // 캐시 저장
    imageCache.set(cacheKey, { imageUrl, timestamp: Date.now() });

    res.json({ imageUrl, cached: false });
  } catch (error) {
    console.error('Instagram 프로필 이미지 에러:', error);
    res.status(500).json({ error: 'Instagram 프로필 이미지 추출 실패' });
  }
});

// Instagram 게시물 이미지 API
app.get('/api/instagram-post', async (req, res) => {
  try {
    const { shortCode } = req.query;

    if (!shortCode) {
      return res.status(400).json({ error: 'shortCode가 필요합니다.' });
    }

    const cacheKey = `post:${shortCode}`;
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ imageUrl: cached.imageUrl, cached: true });
    }

    const response = await fetch(`https://www.instagram.com/p/${shortCode}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: '게시물을 불러올 수 없습니다.' });
    }

    const html = await response.text();
    const imageUrl = extractOgImage(html);

    if (!imageUrl) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }

    // 캐시 저장
    imageCache.set(cacheKey, { imageUrl, timestamp: Date.now() });

    res.json({ imageUrl, cached: false });
  } catch (error) {
    console.error('Instagram 게시물 이미지 에러:', error);
    res.status(500).json({ error: 'Instagram 게시물 이미지 추출 실패' });
  }
});

// ============================================
// 이미지 프록시 API
// ============================================

app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send('이미지를 불러올 수 없습니다.');
    }

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐시

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('이미지 프록시 에러:', error);
    res.status(500).json({ error: '이미지 프록시 오류' });
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
