import { Client } from '@notionhq/client';
import { ApifyClient } from 'apify-client';

const notion = new Client({ auth: (process.env.NOTION_TOKEN || '').trim() });
const apify = new ApifyClient({ token: (process.env.APIFY_API_TOKEN || '').trim() });

const INFLUENCER_DB_ID = '94d490dd8b654351a6ebeb32a965134f';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Notion에서 모든 인플루언서 가져오기
    console.log('[Sync] Fetching influencers from Notion...');
    let allInfluencers = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: INFLUENCER_DB_ID,
        page_size: 100,
        start_cursor: startCursor,
      });

      allInfluencers = allInfluencers.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`[Sync] Found ${allInfluencers.length} influencers`);

    // Instagram 핸들 추출 (Formula 필드 'username' 사용)
    const influencersWithHandles = allInfluencers
      .map((page) => {
        const props = page.properties;
        // Formula 필드는 formula.string으로 접근
        const username = props['username']?.formula?.string || '';
        const handle = username.replace('@', '').trim();

        return {
          pageId: page.id,
          handle: handle,
          name: props['이름']?.title?.[0]?.plain_text || '',
        };
      })
      .filter((inf) => inf.handle); // 핸들이 있는 것만

    console.log(`[Sync] ${influencersWithHandles.length} influencers with Instagram handles`);

    if (influencersWithHandles.length === 0) {
      return res.status(200).json({
        message: 'No influencers with Instagram handles found',
        updated: 0,
      });
    }

    // Apify Instagram Profile Scraper 실행
    const usernames = influencersWithHandles.map((inf) => inf.handle);

    console.log('[Sync] Starting Apify Instagram scraper...');
    const run = await apify.actor('apify/instagram-profile-scraper').call({
      usernames: usernames,
      resultsLimit: usernames.length,
    });

    console.log('[Sync] Waiting for Apify results...');
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    console.log(`[Sync] Retrieved ${items.length} profiles from Instagram`);

    // Notion DB 업데이트
    let updatedCount = 0;
    const updatePromises = [];

    for (const item of items) {
      const influencer = influencersWithHandles.find(
        (inf) => inf.handle.toLowerCase() === item.username.toLowerCase()
      );

      if (!influencer) continue;

      // 최근 12개 게시물의 평균 좋아요/댓글 계산
      const recentPosts = item.latestPosts?.slice(0, 12) || [];
      const avgLikes = recentPosts.length > 0
        ? Math.round(recentPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0) / recentPosts.length)
        : 0;
      const avgComments = recentPosts.length > 0
        ? Math.round(recentPosts.reduce((sum, post) => sum + (post.commentsCount || 0), 0) / recentPosts.length)
        : 0;

      // 참여율 계산 (평균 좋아요 + 댓글) / 팔로워 * 100
      const followers = item.followersCount || 0;
      const engagementRate = followers > 0
        ? ((avgLikes + avgComments) / followers * 100)
        : 0;

      // Notion 업데이트 (프로필 이미지 URL이 없으면 필드 자체를 제외)
      const properties = {
        '팔로워 수': {
          rich_text: [{
            text: { content: followers.toLocaleString() },
          }],
        },
        '평균 좋아요': {
          number: avgLikes,
        },
        '평균 댓글': {
          number: avgComments,
        },
        '참여율': {
          number: parseFloat(engagementRate.toFixed(2)),
        },
      };

      // 프로필 이미지 URL이 있을 때만 추가
      if (item.profilePicUrl) {
        properties['프로필 이미지 URL'] = { url: item.profilePicUrl };
      }

      const updatePromise = notion.pages.update({
        page_id: influencer.pageId,
        properties: properties,
      }).then(() => {
        console.log(`[Sync] Updated ${influencer.name} (@${influencer.handle})`);
        updatedCount++;
      }).catch((error) => {
        console.error(`[Sync] Failed to update ${influencer.name}:`, error.message);
      });

      updatePromises.push(updatePromise);
    }

    await Promise.all(updatePromises);

    console.log(`[Sync] Successfully updated ${updatedCount} influencers`);

    res.status(200).json({
      message: 'Instagram data sync completed',
      total: influencersWithHandles.length,
      updated: updatedCount,
      failed: influencersWithHandles.length - updatedCount,
    });

  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({
      error: 'Failed to sync Instagram data',
      details: error.message,
    });
  }
}
