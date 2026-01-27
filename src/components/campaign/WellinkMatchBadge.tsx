import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { WellinkMatchStatus } from '../../types';

interface WellinkMatchBadgeProps {
  status: WellinkMatchStatus;
}

// 웰링크 가입 여부를 표시하는 배지 컴포넌트
export function WellinkMatchBadge({ status }: WellinkMatchBadgeProps) {
  const config: Record<WellinkMatchStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
    matched: {
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-700',
      label: '웰링크 가입',
    },
    not_found: {
      icon: XCircle,
      color: 'bg-slate-100 text-slate-600',
      label: '미가입',
    },
    not_checked: {
      icon: HelpCircle,
      color: 'bg-amber-100 text-amber-700',
      label: '미확인',
    },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
