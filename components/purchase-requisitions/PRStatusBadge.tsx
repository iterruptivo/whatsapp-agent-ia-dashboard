'use client';

import type {
  PRStatus,
  PRStatusBadgeProps,
} from '@/lib/types/purchase-requisitions';
import { PR_STATUS_COLORS, PR_STATUS_LABELS } from '@/lib/types/purchase-requisitions';

export default function PRStatusBadge({
  status,
  size = 'md',
  className = '',
}: PRStatusBadgeProps) {
  const config = PR_STATUS_COLORS[status];
  const label = PR_STATUS_LABELS[status];

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
