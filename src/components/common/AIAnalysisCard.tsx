import { Sparkles, Loader2 } from 'lucide-react';
import type { AIAnalysis } from '../../types';

interface AIAnalysisCardProps {
  analysis: AIAnalysis | null;
  onAnalyze: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  recommendationLabel?: string;
}

export function AIAnalysisCard({
  analysis,
  onAnalyze,
  loading,
  title = 'AI 캠페인 분석',
  description = 'AI가 데이터를 분석하여\n인사이트와 추천 전략을 제공합니다.',
  recommendationLabel = '💡 추천 전략',
}: AIAnalysisCardProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white min-h-[200px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
          <p className="text-primary-200 text-sm">AI가 데이터를 분석하고 있습니다...</p>
          <p className="text-primary-400 text-xs mt-1">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white min-h-[200px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-primary-200 text-sm mb-4 text-center whitespace-pre-line">
            {description}
          </p>
          <button
            onClick={onAnalyze}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-primary-950 font-medium rounded-lg transition-colors"
          >
            <Sparkles size={16} />
            AI 분석 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-950 to-primary-900 rounded-2xl shadow-sm p-6 text-white min-h-[200px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <button
          onClick={onAnalyze}
          className="text-xs text-primary-300 hover:text-white transition-colors flex items-center gap-1"
        >
          <Loader2 size={12} className={loading ? 'animate-spin' : 'hidden'} />
          다시 분석
        </button>
      </div>

      <p className="text-primary-100 text-sm leading-relaxed mb-5 pb-5 border-b border-primary-800">
        {analysis.summary}
      </p>

      <div className="space-y-3 mb-5">
        {analysis.insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-primary-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary-300">{index + 1}</span>
            </div>
            <p className="text-sm text-primary-200 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="text-xs font-semibold text-amber-400 mb-1">{recommendationLabel}</div>
        <p className="text-sm text-amber-100/90 leading-relaxed">{analysis.recommendation}</p>
      </div>

      <div className="mt-4 text-xs text-primary-400">
        마지막 업데이트: {new Date(analysis.generatedAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
