import { X, UserPlus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ApplicantStatus } from '../../types';

interface ApplicantActionBarProps {
  selectedCount: number;
  onStatusChange: (status: ApplicantStatus) => void;
  onAddToSeeding: () => void;
  onClearSelection: () => void;
}

// 선택된 신청자에 대한 일괄 액션 바
export function ApplicantActionBar({
  selectedCount,
  onStatusChange,
  onAddToSeeding,
  onClearSelection,
}: ApplicantActionBarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  if (selectedCount === 0) return null;

  const statusOptions: { value: ApplicantStatus; label: string; color: string }[] = [
    { value: 'pending', label: '대기중', color: 'text-slate-600' },
    { value: 'reviewing', label: '검토중', color: 'text-amber-600' },
    { value: 'selected', label: '선택됨', color: 'text-blue-600' },
    { value: 'rejected', label: '불합격', color: 'text-red-600' },
  ];

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-primary-700">
            <span className="text-primary-900 font-bold">{selectedCount}명</span> 선택됨
          </span>

          {/* 상태 변경 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              상태 변경
              <ChevronDown size={14} />
            </button>

            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {statusOptions.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => {
                      onStatusChange(value);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 참여자로 추가 버튼 */}
          <button
            onClick={onAddToSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <UserPlus size={14} />
            참여자로 추가
          </button>
        </div>

        {/* 선택 취소 */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <X size={14} />
          선택 취소
        </button>
      </div>
    </div>
  );
}
