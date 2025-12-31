import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { campaignName, contents, performanceData } = req.body;

    if (!contents || contents.length === 0) {
      return res.status(400).json({ error: '분석할 콘텐츠가 없습니다.' });
    }

    // 분석을 위한 데이터 요약
    const contentSummary = contents.slice(0, 20).map(c => ({
      influencer: c.influencerName,
      type: c.type,
      likes: c.likes,
      comments: c.comments,
      views: c.views,
      caption: c.caption?.substring(0, 200),
      postedAt: c.postedAt,
    }));

    const prompt = `당신은 인플루언서 마케팅 전문가입니다. 다음 캠페인 데이터를 분석하고 인사이트를 제공해주세요.

캠페인명: ${campaignName || '미정'}

성과 요약:
- 총 좋아요: ${performanceData?.totalLikes?.toLocaleString() || 0}
- 총 댓글: ${performanceData?.totalComments?.toLocaleString() || 0}
- 총 공유: ${performanceData?.totalShares?.toLocaleString() || 0}
- 총 조회수: ${performanceData?.totalViews?.toLocaleString() || 0}
- 콘텐츠 수: ${performanceData?.contentCount || 0}

TOP 인플루언서:
${performanceData?.topInfluencers?.map((inf, i) => `${i + 1}. ${inf.name}: 좋아요 ${inf.likes}, 댓글 ${inf.comments}`).join('\n') || '없음'}

최근 콘텐츠 샘플:
${JSON.stringify(contentSummary, null, 2)}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "캠페인 전체 성과에 대한 2-3문장 요약",
  "insights": [
    "인사이트 1 (구체적인 수치와 함께)",
    "인사이트 2 (구체적인 수치와 함께)",
    "인사이트 3 (구체적인 수치와 함께)"
  ],
  "recommendation": "향후 캠페인 전략에 대한 구체적인 추천"
}

반드시 JSON 형식으로만 응답하고, 마크다운이나 다른 텍스트 없이 순수 JSON만 반환해주세요.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 인플루언서 마케팅 캠페인 분석 전문가입니다. 항상 JSON 형식으로만 응답합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // JSON 파싱 시도
    let analysis;
    try {
      // JSON 블록 추출 시도
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('JSON 파싱 에러:', parseError, 'Response:', responseText);
      // 파싱 실패 시 기본 응답
      analysis = {
        summary: '캠페인 분석을 완료했습니다.',
        insights: [
          `총 ${performanceData?.contentCount || 0}개의 콘텐츠가 게시되었습니다.`,
          `총 ${performanceData?.totalLikes?.toLocaleString() || 0}개의 좋아요를 획득했습니다.`,
          `평균 참여율 분석이 필요합니다.`
        ],
        recommendation: '더 많은 데이터가 수집되면 정확한 분석이 가능합니다.'
      };
    }

    res.status(200).json({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI 분석 에러:', error);
    res.status(500).json({
      error: 'AI 분석 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
