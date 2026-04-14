import { STATUS_COLOR, STATUS_LABEL, type ProjectStatus } from '@/schemas/proyecto';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?:  'xs' | 'sm';
}

export function StatusBadge({ status, size = 'xs' }: StatusBadgeProps) {
  const sizeClass = size === 'xs'
    ? 'text-[11px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-block rounded-full font-bold shrink-0 ${sizeClass} ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
