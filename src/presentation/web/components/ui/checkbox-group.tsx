'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckboxGroupItem } from '@/components/ui/checkbox-group-item';

export interface CheckboxGroupOption {
  id: string;
  label: string;
  description?: string;
}

export interface CheckboxGroupProps {
  /** Visible group label rendered next to the parent checkbox. */
  label: string;
  /** Optional description rendered below the parent label. */
  description?: string;
  /** Accessible name for the parent checkbox (used as aria-label). */
  parentAriaLabel?: string;
  options: CheckboxGroupOption[];
  /** Record mapping option id → checked state. */
  value: Record<string, boolean>;
  onValueChange: (value: Record<string, boolean>) => void;
  disabled?: boolean;
}

function CheckboxGroup({
  label,
  description,
  parentAriaLabel,
  options,
  value,
  onValueChange,
  disabled,
}: CheckboxGroupProps) {
  const selectedCount = options.filter((o) => value[o.id]).length;
  const parentChecked = selectedCount === options.length;
  const parentIndeterminate = selectedCount > 0 && !parentChecked;

  const handleParentToggle = () => {
    const target = selectedCount < options.length;
    const next: Record<string, boolean> = {};
    for (const o of options) {
      next[o.id] = target;
    }
    onValueChange(next);
  };

  const handleItemChange = (id: string, checked: boolean) => {
    onValueChange({ ...value, [id]: checked });
  };

  const parentId = `${label.toLowerCase().replace(/\s+/g, '-')}-group`;

  return (
    <div className="flex flex-col gap-3">
      {/* Parent checkbox */}
      <div className="flex items-start gap-2">
        <Checkbox
          id={parentId}
          className="mt-0.75"
          checked={parentIndeterminate ? 'indeterminate' : parentChecked}
          onCheckedChange={handleParentToggle}
          disabled={disabled}
          aria-label={parentAriaLabel ?? `${label} select all`}
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={parentId} className="cursor-pointer text-sm font-medium">
            {label}
          </Label>
          {description ? (
            <Label
              htmlFor={parentId}
              className="text-muted-foreground cursor-pointer text-xs font-normal"
            >
              {description}
            </Label>
          ) : null}
        </div>
      </div>

      {/* Child checkboxes */}
      <div className="flex flex-col gap-3 pl-6">
        {options.map((option) => (
          <CheckboxGroupItem
            key={option.id}
            id={option.id}
            label={option.label}
            description={option.description}
            checked={value[option.id] ?? false}
            onCheckedChange={(checked) => handleItemChange(option.id, checked)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export { CheckboxGroup };
