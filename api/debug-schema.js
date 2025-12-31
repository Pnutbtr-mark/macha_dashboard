import { Client } from '@notionhq/client';

const notion = new Client({ auth: (process.env.NOTION_TOKEN || '').trim() });

const DB_IDS = {
  influencers: '94d490dd-8b65-4351-a6eb-eb32a965134f',
  campaigns: '2b708b1c-348f-8141-999f-f77b91095543',
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
    const { db } = req.query;
    const dbId = DB_IDS[db] || DB_IDS.mentions;

    // 데이터베이스 스키마 조회
    const database = await notion.databases.retrieve({
      database_id: dbId,
    });

    // 속성 목록 추출
    const properties = Object.entries(database.properties).map(([name, prop]) => ({
      name,
      type: prop.type,
      id: prop.id,
    }));

    // 샘플 데이터 1개 조회
    const sampleData = await notion.databases.query({
      database_id: dbId,
      page_size: 1,
    });

    const sampleProperties = sampleData.results[0]?.properties || {};

    res.status(200).json({
      databaseId: dbId,
      databaseName: database.title?.[0]?.plain_text || 'Unknown',
      properties,
      sampleData: sampleProperties,
    });
  } catch (error) {
    console.error('스키마 조회 에러:', error);
    res.status(500).json({
      error: '스키마를 불러오는데 실패했습니다.',
      details: error.message
    });
  }
}
