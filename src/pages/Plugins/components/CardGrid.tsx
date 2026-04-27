import { createStaticStyles, cx } from 'antd-style';
import type { ReactNode } from 'react';
import { memo } from 'react';

const styles = createStaticStyles(({ css }) => ({
  container: css`
    container-type: inline-size;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 12px;

    @container (width >= 581px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  singleColumn: css`
    grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
  `,
}));

interface CardGridProps {
  children: ReactNode;
  className?: string;
  singleColumn?: boolean;
}

const CardGrid = memo<CardGridProps>(
  ({ children, className, singleColumn }) => {
    return (
      <div className={cx(styles.container, className)}>
        <div
          className={cx(styles.grid, singleColumn && styles.singleColumn)}
        >
          {children}
        </div>
      </div>
    );
  },
);

export default CardGrid;
