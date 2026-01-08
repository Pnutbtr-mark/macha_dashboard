import { Client } from '@notionhq/client';

const notion = new Client({ auth: (process.env.NOTION_TOKEN || '').trim() });

const INFLUENCER_DB_ID = '94d490dd8b654351a6ebeb32a965134f';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await notion.databases.query({
      database_id: INFLUENCER_DB_ID,
      page_size: 100,
    });

    const influencers = response.results.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        name: props['이름']?.title?.[0]?.plain_text || props['Name']?.title?.[0]?.plain_text || '',
        handle: props['핸들']?.rich_text?.[0]?.plain_text || props['Handle']?.rich_text?.[0]?.plain_text || '',
        platform: props['플랫폼']?.select?.name || props['Platform']?.select?.name || 'instagram',
        category: props['카테고리']?.multi_select?.map(s => s.name) || props['Category']?.multi_select?.map(s => s.name) || [],
        followers: props['팔로워']?.number || props['Followers']?.number || 0,
        engagementRate: props['참여율']?.number || props['Engagement Rate']?.number || 0,
        avgLikes: props['평균 좋아요']?.number || props['Avg Likes']?.number || 0,
        avgComments: props['평균 댓글']?.number || props['Avg Comments']?.number || 0,
        email: props['이메일']?.email || props['Email']?.email || '',
        phone: props['전화번호']?.phone_number || props['Phone']?.phone_number || '',
        notes: props['비고']?.rich_text?.[0]?.plain_text || props['Notes']?.rich_text?.[0]?.plain_text || '',
        status: props['상태']?.select?.name || props['Status']?.select?.name || '',
        profileImage: props['프로필 이미지']?.files?.[0]?.file?.url || props['프로필 이미지']?.files?.[0]?.external?.url ||
                      props['Profile Image']?.files?.[0]?.file?.url || props['Profile Image']?.files?.[0]?.external?.url || '',
        createdAt: page.created_time,
        lastModified: page.last_edited_time,
      };
    });

    res.status(200).json(influencers);
  } catch (error) {
    console.error('인플루언서 목록 조회 에러:', error);
    res.status(500).json({
      error: '인플루언서 데이터를 불러오는데 실패했습니다.',
      details: error.message
    });
  }
}
