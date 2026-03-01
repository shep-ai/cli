import { Badge } from '@/components/ui/badge';

export interface ColumnHeaderProps {
  label: string;
  count: number;
}

export function ColumnHeader({ label, count }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      <Badge variant={count === 0 ? 'secondary' : 'default'} className="text-xs">
        {count}
      </Badge>
    </div>
  );
}
