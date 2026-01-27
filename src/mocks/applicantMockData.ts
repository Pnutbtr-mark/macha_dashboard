// 신청자 원본 데이터 타입 (우피에서 접수된 데이터)
export interface ApplicantRaw {
  id: string;
  campaignId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  instagramHandle?: string;
  appliedAt: string;
}

// 테스트용 Mock 신청자 원본 데이터
// 실제 인플루언서 DB의 username과 매칭되도록 설정
export const mockApplicants: ApplicantRaw[] = [
  {
    id: 'app-001',
    campaignId: 'campaign-001',
    name: '김인플',
    phoneNumber: '010-1234-5678',
    email: 'kim.influencer@example.com',
    instagramHandle: 'kim_influencer',
    appliedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'app-002',
    campaignId: 'campaign-001',
    name: '이크리',
    phoneNumber: '010-2345-6789',
    email: 'lee.creator@example.com',
    instagramHandle: 'lee_creator',
    appliedAt: '2024-01-15T11:45:00Z',
  },
  {
    id: 'app-003',
    campaignId: 'campaign-001',
    name: '박소셜',
    phoneNumber: '010-3456-7890',
    email: 'park.social@example.com',
    instagramHandle: 'park_social',
    appliedAt: '2024-01-14T09:00:00Z',
  },
  {
    id: 'app-004',
    campaignId: 'campaign-001',
    name: '최트래블',
    phoneNumber: '010-4567-8901',
    email: 'choi.travel@example.com',
    instagramHandle: 'choi_travel',
    appliedAt: '2024-01-13T15:20:00Z',
  },
  {
    id: 'app-005',
    campaignId: 'campaign-001',
    name: '정헬시',
    phoneNumber: '010-5678-9012',
    instagramHandle: 'jung_healthy',
    appliedAt: '2024-01-16T08:30:00Z',
  },
  {
    id: 'app-006',
    campaignId: 'campaign-001',
    name: '강리빙',
    phoneNumber: '010-6789-0123',
    email: 'kang.living@example.com',
    instagramHandle: 'kang_living',
    appliedAt: '2024-01-12T11:00:00Z',
  },
  {
    id: 'app-007',
    campaignId: 'campaign-001',
    name: '윤테크',
    phoneNumber: '010-7890-1234',
    instagramHandle: 'yoon_tech',
    appliedAt: '2024-01-11T14:00:00Z',
  },
  {
    id: 'app-008',
    campaignId: 'campaign-001',
    name: '서맘스',
    phoneNumber: '010-8901-2345',
    email: 'seo.moms@example.com',
    instagramHandle: 'seo_moms',
    appliedAt: '2024-01-16T09:15:00Z',
  },
  {
    id: 'app-009',
    campaignId: 'campaign-001',
    name: '한펫',
    phoneNumber: '010-9012-3456',
    instagramHandle: 'han_pet',
    appliedAt: '2024-01-16T10:45:00Z',
  },
  {
    id: 'app-010',
    campaignId: 'campaign-001',
    name: '오쿡',
    phoneNumber: '010-0123-4567',
    email: 'oh.cook@example.com',
    instagramHandle: 'oh_cook',
    appliedAt: '2024-01-13T13:30:00Z',
  },
];

// 캠페인 ID로 신청자 필터링
export function getApplicantsByCampaignId(campaignId: string): ApplicantRaw[] {
  return mockApplicants.filter(applicant => applicant.campaignId === campaignId);
}
