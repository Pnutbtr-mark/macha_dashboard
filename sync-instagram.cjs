require('dotenv').config();
const { Client } = require('@notionhq/client');
const { ApifyClient } = require('apify-client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

const INFLUENCER_DB_ID = '94d490dd8b654351a6ebeb32a965134f';

async function sync() {
  console.log('📊 인플루언서 목록 가져오는 중...');

  const influencers = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: INFLUENCER_DB_ID,
      start_cursor: startCursor,
    });

    influencers.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  console.log(`✅ 총 ${influencers.length}명의 인플루언서 발견`);

  const handles = influencers
    .map(page => {
      // Formula 필드는 formula.string으로 접근
      const username = page.properties['username']?.formula?.string;
      return username;
    })
    .filter(handle => handle && handle.trim() !== '');

  console.log(`📱 Instagram 핸들: ${handles.length}개`);
  console.log(`🔄 Apify로 Instagram 데이터 수집 중... (2-3분 소요)`);

  const run = await apify.actor('apify/instagram-profile-scraper').call({
    usernames: handles,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  console.log(`✅ ${items.length}개 프로필 데이터 수집 완료`);

  let successCount = 0;
  let failCount = 0;

  for (const influencer of influencers) {
    const handle = influencer.properties['username']?.formula?.string;
    if (!handle) continue;

    const data = items.find(item => item.username === handle);
    if (!data) {
      failCount++;
      continue;
    }

    const posts = data.latestPosts || [];
    const avgLikes = posts.length > 0
      ? Math.round(posts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / posts.length)
      : 0;
    const avgComments = posts.length > 0
      ? Math.round(posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / posts.length)
      : 0;
    const followers = data.followersCount || 0;
    const engagementRate = followers > 0
      ? parseFloat(((avgLikes + avgComments) / followers * 100).toFixed(2))
      : 0;

    await notion.pages.update({
      page_id: influencer.id,
      properties: {
        '평균 좋아요': { number: avgLikes },
        '평균 댓글': { number: avgComments },
        '참여율': { number: engagementRate },
        '프로필 이미지 URL': { url: data.profilePicUrl || null },
      },
    });

    successCount++;
    console.log(`✅ ${handle}: 업데이트 완료`);
  }

  console.log(`\n🎉 동기화 완료!`);
  console.log(`   성공: ${successCount}`);
  console.log(`   실패: ${failCount}`);
}

sync().catch(console.error);
