import { Block, Center, Icon, Text } from '@lobehub/ui';
import { PlusIcon } from 'lucide-react';
import { memo } from 'react';

interface EmptyStatusProps {
  className?: string;
  onClick: () => void;
  title: string;
}

const EmptyNavItem = memo<EmptyStatusProps>(({ title, onClick, className }) => {
  return (
    <Block
      clickable
      horizontal
      align={'center'}
      className={className}
      gap={6}
      height={30}
      paddingInline={8}
      variant={'borderless'}
      onClick={onClick}
    >
      <Center flex={'none'} height={24} width={24}>
        <Icon icon={PlusIcon} size={'small'} />
      </Center>
      <Text align={'center'} type={'secondary'}>
        {title}
      </Text>
    </Block>
  );
});

export default EmptyNavItem;
