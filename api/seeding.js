import { Client } from '@notionhq/client';

const notion = new Client({ auth: (process.env.NOTION_TOKEN || '').trim() });

const DB_IDS = {
  mentions: '2bd08b1c348f8023bf04fa37fc57d0b6',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { campaignId } = req.query;

    const queryOptions = {
      database_id: DB_IDS.mentions,
      page_size: 100,
    };

    // 캠페인 ID로 필터링
    if (campaignId) {
      queryOptions.filter = {
        property: '캠페인 DB',
        relation: { contains: campaignId },
      };
    }

    const response = await notion.databases.query(queryOptions);

    // 멘션 데이터에서 고유한 인플루언서 추출
    const influencerMap = new Map();

    response.results.forEach((page) => {
      const props = page.properties;
      const handle = props['ownerUsername']?.rich_text?.[0]?.plain_text || '';

      if (handle && !influencerMap.has(handle)) {
        // 첫 번째 멘션 기준으로 인플루언서 정보 저장
        const thumbnailFile = props['displayUrl']?.files?.[0];
        const thumbnail = thumbnailFile?.external?.url || thumbnailFile?.file?.url || 'https://placehold.co/100';

        influencerMap.set(handle, {
          id: page.id,
          influencer: {
            id: page.id,
            name: props['ownerFulName']?.rich_text?.[0]?.plain_text || handle,
            handle: handle,
            thumbnail: thumbnail,
            followers: 0,
            engagementRate: 0,
          },
          type: 'free',
          status: 'posted',
          paymentAmount: 0,
          productValue: 0,
          notes: '',
          requestDate: '',
          postDate: props['피드게시일']?.date?.start || '',
        });
      }
    });

    const seeding = Array.from(influencerMap.values());

    res.status(200).json(seeding);
  } catch (error) {
    console.error('시딩 조회 에러:', error);
    res.status(500).json({
      error: '시딩 데이터를 불러오는데 실패했습니다.',
      details: error.message
    });
  }
}
