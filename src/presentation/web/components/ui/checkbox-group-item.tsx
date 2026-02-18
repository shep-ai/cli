'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface CheckboxGroupItemProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckboxGroupItem({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: CheckboxGroupItemProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        className="mt-0.75"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <Label htmlFor={id} className="text-muted-foreground cursor-pointer text-xs font-normal">
            {description}
          </Label>
        ) : null}
      </div>
    </div>
  );
}

export { CheckboxGroupItem };
