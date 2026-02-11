// optimizationGoal → action_type 매핑 테이블
// Meta Ads Manager의 "결과" 컬럼과 동일한 기준으로 action_type을 필터링

export const OPTIMIZATION_GOAL_ACTION_MAP: Record<string, string[]> = {
  LINK_CLICKS: ['link_click'],
  LANDING_PAGE_VIEWS: ['landing_page_view'],
  OFFSITE_CONVERSIONS: [
    'offsite_conversion.fb_pixel_purchase',
    'offsite_conversion.fb_pixel_lead',
    'offsite_conversion.fb_pixel_complete_registration',
    'offsite_conversion.fb_pixel_add_to_cart',
    'offsite_conversion.fb_pixel_initiate_checkout',
    'offsite_conversion.fb_pixel_view_content',
    'offsite_conversion.fb_pixel_custom',
  ],
  REACH: ['reach'],
  POST_ENGAGEMENT: ['post_engagement'],
  THRUPLAY: ['video_view'],
  APP_INSTALLS: ['app_install', 'mobile_app_install'],
  LEAD_GENERATION: ['lead', 'leadgen.other'],
  CONVERSATIONS: ['onsite_conversion.messaging_first_reply'],
  IMPRESSIONS: ['impressions'],
  VALUE: ['offsite_conversion.fb_pixel_purchase'],
};

export function getResultActionTypes(optimizationGoal?: string): string[] | undefined {
  if (!optimizationGoal) return undefined;
  return OPTIMIZATION_GOAL_ACTION_MAP[optimizationGoal];
}
