import React from 'react';

interface GoalProgressBarProps {
  progressPercent: number;
  color?: string;
  className?: string;
}

export const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  progressPercent,
  color = '#D4F684',
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div className="w-full h-2 bg-[#161C24] border border-[#1F2937] rounded-full overflow-hidden p-[1px]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`,
          }}
        />
      </div>
    </div>
  );
};
