import { getMasteryDisplayInfo, type MasteryStatus } from '@/lib/mastery';

interface StatusBadgeProps {
  status: MasteryStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const masteryInfo = getMasteryDisplayInfo(status as MasteryStatus);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={`${sizeClasses[size]} rounded-full font-bold text-white`}
      style={{ backgroundColor: masteryInfo.color }}
    >
      {masteryInfo.label}
    </span>
  );
}
