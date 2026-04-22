import { Center, Flexbox, Icon, Popover } from '@lobehub/ui';
import { Divider } from 'antd';
import { cssVar } from 'antd-style';
import { CoinsIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import InfoTooltip from '@/components/InfoTooltip';

import type { ModelPerformance, ModelUsage } from '../../types';
import AnimatedNumber from './AnimatedNumber';
import type { TokenProgressItem } from './TokenProgress';
import TokenProgress from './TokenProgress';
import { getDetailsToken } from './tokens';

const formatNumber = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', { maximumFractionDigits: decimals });

interface TokenDetailProps {
  model: string;
  performance?: ModelPerformance;
  usage: ModelUsage;
}

const TokenDetail = memo<TokenDetailProps>(({ usage, performance }) => {
  const { t } = useTranslation('chat');

  const detailTokens = getDetailsToken(usage);

  const inputDetails = [
    !!detailTokens.inputAudio && {
      color: cssVar.cyan9,
      id: 'inputAudio',
      title: t('tokenDetails.inputAudio'),
      value: detailTokens.inputAudio,
    },
    !!detailTokens.inputCitation && {
      color: cssVar.orange,
      id: 'inputCitation',
      title: t('tokenDetails.inputCitation'),
      value: detailTokens.inputCitation,
    },
    !!detailTokens.inputText && {
      color: cssVar.green,
      id: 'inputText',
      title: t('tokenDetails.inputText'),
      value: detailTokens.inputText,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const outputDetails = [
    !!detailTokens.outputReasoning && {
      color: cssVar.pink,
      id: 'outputReasoning',
      title: t('tokenDetails.reasoning'),
      value: detailTokens.outputReasoning,
    },
    !!detailTokens.outputImage && {
      color: cssVar.purple,
      id: 'outputImage',
      title: t('tokenDetails.outputImage'),
      value: detailTokens.outputImage,
    },
    !!detailTokens.outputAudio && {
      color: cssVar.cyan9,
      id: 'outputAudio',
      title: t('tokenDetails.outputAudio'),
      value: detailTokens.outputAudio,
    },
    !!detailTokens.outputText && {
      color: cssVar.green,
      id: 'outputText',
      title: t('tokenDetails.outputText'),
      value: detailTokens.outputText,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const totalDetail = [
    !!detailTokens.inputCacheMiss && {
      color: cssVar.colorFill,
      id: 'uncachedInput',
      title: t('tokenDetails.inputUncached'),
      value: detailTokens.inputCacheMiss,
    },
    !!detailTokens.inputCached && {
      color: cssVar.orange,
      id: 'inputCached',
      title: t('tokenDetails.inputCached'),
      value: detailTokens.inputCached,
    },
    !!detailTokens.inputCachedWrite && {
      color: cssVar.yellow,
      id: 'cachedWriteInput',
      title: t('tokenDetails.inputWriteCached'),
      value: detailTokens.inputCachedWrite,
    },
    !!detailTokens.inputTool && {
      color: cssVar.geekblue,
      id: 'inputTool',
      title: t('tokenDetails.inputTool'),
      value: detailTokens.inputTool,
    },
    !!detailTokens.totalOutput && {
      color: cssVar.colorSuccess,
      id: 'output',
      title: t('tokenDetails.output'),
      value: detailTokens.totalOutput,
    },
  ].filter(Boolean) as TokenProgressItem[];

  const totalCount = usage.totalTokens ?? 0;
  const detailTotal = formatNumber(totalCount);

  const tps = performance?.tps ? formatNumber(performance.tps, 2) : undefined;
  const ttft = performance?.ttft ? formatNumber(performance.ttft / 1000, 2) : undefined;

  return (
    <Popover
      placement={'top'}
      trigger="hover"
      content={
        <Flexbox gap={8} style={{ minWidth: 200 }}>
          <Flexbox gap={20}>
            {inputDetails.length > 1 && (
              <Flexbox gap={4}>
                <Flexbox
                  horizontal
                  align={'center'}
                  gap={4}
                  justify={'space-between'}
                  width={'100%'}
                >
                  <div style={{ color: cssVar.colorTextDescription, fontSize: 12 }}>
                    {t('tokenDetails.inputTitle')}
                  </div>
                </Flexbox>
                <TokenProgress showIcon data={inputDetails} />
              </Flexbox>
            )}
            {outputDetails.length > 1 && (
              <Flexbox gap={4}>
                <Flexbox
                  horizontal
                  align={'center'}
                  gap={4}
                  justify={'space-between'}
                  width={'100%'}
                >
                  <div style={{ color: cssVar.colorTextDescription, fontSize: 12 }}>
                    {t('tokenDetails.outputTitle')}
                  </div>
                </Flexbox>
                <TokenProgress showIcon data={outputDetails} />
              </Flexbox>
            )}
            <Flexbox>
              <TokenProgress showIcon data={totalDetail} />
              <Divider style={{ marginBlock: 8 }} />
              <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                <div style={{ color: cssVar.colorTextSecondary }}>
                  {t('tokenDetails.total')}
                </div>
                <div style={{ fontWeight: 500 }}>{detailTotal}</div>
              </Flexbox>
              {tps && (
                <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                  <Flexbox horizontal gap={8}>
                    <div style={{ color: cssVar.colorTextSecondary }}>
                      {t('tokenDetails.speed.tps.title')}
                    </div>
                    <InfoTooltip title={t('tokenDetails.speed.tps.tooltip')} />
                  </Flexbox>
                  <div style={{ fontWeight: 500 }}>{tps}</div>
                </Flexbox>
              )}
              {ttft && (
                <Flexbox horizontal align={'center'} gap={4} justify={'space-between'}>
                  <Flexbox horizontal gap={8}>
                    <div style={{ color: cssVar.colorTextSecondary }}>
                      {t('tokenDetails.speed.ttft.title')}
                    </div>
                    <InfoTooltip title={t('tokenDetails.speed.ttft.tooltip')} />
                  </Flexbox>
                  <div style={{ fontWeight: 500 }}>{ttft}s</div>
                </Flexbox>
              )}
            </Flexbox>
          </Flexbox>
        </Flexbox>
      }
    >
      <Center horizontal gap={2} style={{ cursor: 'pointer' }}>
        <Icon icon={CoinsIcon} />
        <AnimatedNumber
          duration={1500}
          key={'token'}
          value={totalCount}
          formatter={(value) => new Intl.NumberFormat('en-US').format(Math.round(value))}
        />
      </Center>
    </Popover>
  );
});

TokenDetail.displayName = 'TokenDetail';

export default TokenDetail;
