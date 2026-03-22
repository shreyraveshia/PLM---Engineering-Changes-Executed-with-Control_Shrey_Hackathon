import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';

export default function StagePipeline({ stages, currentStageId, ecoStatus }) {
  if (!stages || stages.length === 0) return null;

  const currentIndex = stages.findIndex(s => s.id === currentStageId);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => {
        const isActive = stage.id === currentStageId;
        const isPast = i < currentIndex;
        const isApplied = ecoStatus === 'applied' && stage.is_final;

        return (
          <div key={stage.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isApplied ? 'bg-green-500 text-white' :
              isActive ? 'bg-brand-500 text-white shadow-sm' :
              isPast ? 'bg-green-100 text-green-700 border border-green-200' :
              'bg-gray-100 text-gray-400'
            }`}>
              {isPast || isApplied ? (
                <CheckCircle2 size={14} className="flex-shrink-0" />
              ) : (
                <Circle size={14} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-300'}`} />
              )}
              <span>{stage.name}</span>
              {stage.requires_approval && !isPast && !isApplied && (
                <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                  (approval)
                </span>
              )}
            </div>
            {i < stages.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
