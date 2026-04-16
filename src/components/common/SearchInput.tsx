import * as React from 'react';
import { Search, X } from 'lucide-react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  wrapper: css`
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  icon: css`
    flex-shrink: 0;
    color: ${token.colorTextSecondary};
  `,
  input: css`
    flex: 1;
    background: transparent;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    outline: none;
    border: none;
    padding: 0;
    &::placeholder {
      color: ${token.colorTextQuaternary};
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  clearButton: css`
    flex-shrink: 0;
    color: ${token.colorTextSecondary};
    transition: color 0.2s;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
      color: ${token.colorText};
    }
  `,
}));

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
    const { styles, cx } = useStyles();
    return (
      <div className={cx(styles.wrapper, className)}>
        <Search
          className={cn(styles.icon, iconClassName)}
          size={iconSize}
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(styles.input, inputClassName)}
          disabled={disabled}
          readOnly={readOnly}
          {...inputProps}
        />
        {clearable && value ? (
          <button
            type="button"
            aria-label="Clear search"
            className={cn(styles.clearButton, clearButtonClassName)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled || readOnly) return;
              onClear?.();
              onValueChange('');
            }}
          >
            <X
              className={clearIconClassName}
              size={clearIconSize}
            />
          </button>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
