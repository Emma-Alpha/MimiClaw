import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'className'
>;

export interface SearchInputProps extends NativeInputProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearable?: boolean;
  clearButtonClassName?: string;
  clearIconClassName?: string;
  iconSize?: number;
  clearIconSize?: number;
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onValueChange,
      className,
      inputClassName,
      iconClassName,
      clearable = false,
      clearButtonClassName,
      clearIconClassName,
      iconSize = 16,
      clearIconSize = 14,
      onClear,
      disabled,
      readOnly,
      ...inputProps
    },
    ref
  ) => {
    return (
      <div className={cn('relative flex items-center gap-2', className)}>
        <Search
          className={cn('shrink-0 text-muted-foreground', iconClassName)}
          size={iconSize}
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            'flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground',
            inputClassName
          )}
          disabled={disabled}
          readOnly={readOnly}
          {...inputProps}
        />
        {clearable && value ? (
          <button
            type="button"
            aria-label="Clear search"
            className={cn(
              'shrink-0 text-muted-foreground transition-colors hover:text-foreground',
              clearButtonClassName
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled || readOnly) return;
              onClear?.();
              onValueChange('');
            }}
          >
            <X
              className={cn('h-3.5 w-3.5', clearIconClassName)}
              size={clearIconSize}
            />
          </button>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
