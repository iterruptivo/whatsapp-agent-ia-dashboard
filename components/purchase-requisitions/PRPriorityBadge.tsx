'use client';

import type {
  PRPriority,
  PRPriorityBadgeProps,
} from '@/lib/types/purchase-requisitions';
import { PR_PRIORITY_COLORS, PR_PRIORITY_LABELS } from '@/lib/types/purchase-requisitions';

export default function PRPriorityBadge({
  priority,
  size = 'md',
  className = '',
}: PRPriorityBadgeProps) {
  const config = PR_PRIORITY_COLORS[priority];
  const label = PR_PRIORITY_LABELS[priority];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]} ${className}`}
    >
      <span className="leading-none">{config.icon}</span>
      <span>{label}</span>
    </span>
  );
}
