import { X, Instagram, Phone, Mail, Calendar, ExternalLink, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { Applicant, ApplicantStatus, WellinkMatchStatus } from '../../types';
import { formatNumber, formatDateTime } from '../../utils/formatters';

interface ApplicantDetailModalProps {
  applicant: Applicant | null;
  isOpen: boolean;
  onClose: () => void;
}

// 신청자 상태 배지
function StatusBadge({ status }: { status: ApplicantStatus }) {
  const config: Record<ApplicantStatus, { color: string; label: string }> = {
    pending: { color: 'bg-slate-100 text-slate-600', label: '대기중' },
    reviewing: { color: 'bg-amber-100 text-amber-700', label: '검토중' },
    selected: { color: 'bg-blue-100 text-blue-700', label: '선택됨' },
    rejected: { color: 'bg-red-100 text-red-600', label: '불합격' },
    converted: { color: 'bg-emerald-100 text-emerald-700', label: '전환됨' },
  };

  const { color, label } = config[status];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {label}
    </span>
  );
}

// 웰링크 매칭 배지
function WellinkBadge({ status }: { status: WellinkMatchStatus }) {
  const config: Record<WellinkMatchStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
    matched: {
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      label: '웰링크 가입',
    },
    not_found: {
      icon: XCircle,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      label: '미가입',
    },
    not_checked: {
      icon: HelpCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      label: '미확인',
    },
  };

  const { icon: Icon, color, bgColor, label } = config[status];

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${bgColor}`}>
      <Icon size={20} className={color} />
      <div>
        <p className="text-xs text-slate-500">웰링크 상태</p>
        <p className={`font-medium ${color}`}>{label}</p>
      </div>
    </div>
  );
}

// 신청자 상세 모달 컴포넌트
export function ApplicantDetailModal({
  applicant,
  isOpen,
  onClose,
}: ApplicantDetailModalProps) {
  if (!isOpen || !applicant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} className="text-slate-500" />
        </button>

        {/* 본문 */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* 섹션 1: 프로필 헤더 */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                  {applicant.name.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{applicant.name}</h2>
                  <StatusBadge status={applicant.status} />
                </div>
                {applicant.category && applicant.category.length > 0 && (
                  <p className="text-sm text-slate-500 mb-2">
                    {applicant.category.join(' · ')}
                  </p>
                )}
                {applicant.instagramHandle && (
                  <a
                    href={`https://instagram.com/${applicant.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Instagram size={14} />
                    @{applicant.instagramHandle.replace('@', '')}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 섹션 2: 연락처 정보 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">연락처 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="p-2 bg-white rounded-lg">
                  <Phone size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">전화번호</p>
                  <p className="font-medium text-slate-700">{applicant.phoneNumber}</p>
                </div>
              </div>
              {applicant.email && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg">
                    <Mail size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">이메일</p>
                    <p className="font-medium text-slate-700">{applicant.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 섹션 3: 인플루언서 정보 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">인플루언서 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {applicant.followerCount ? formatNumber(applicant.followerCount) : '-'}
                </p>
                <p className="text-xs text-slate-500 mt-1">팔로워</p>
              </div>
              <WellinkBadge status={applicant.wellinkMatchStatus} />
            </div>
          </div>

          {/* 섹션 4: 자기소개 */}
          {applicant.introduction && (
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">자기소개</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">
                {applicant.introduction}
              </p>
            </div>
          )}

          {/* 섹션 5: 신청 정보 */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">신청 정보</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-500">신청일:</span>
                <span className="text-slate-700">{formatDateTime(applicant.appliedAt)}</span>
              </div>
              {applicant.selectedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-slate-500">선택일:</span>
                  <span className="text-slate-700">{formatDateTime(applicant.selectedAt)}</span>
                </div>
              )}
              {applicant.notes && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium mb-1">메모</p>
                  <p className="text-sm text-amber-700">{applicant.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
