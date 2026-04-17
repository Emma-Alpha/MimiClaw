import { Text } from '@lobehub/ui';
import { memo, useEffect, useMemo, useState } from 'react';
import { hostApiFetch } from '@/lib/host-api';
import type { MarketplaceSkill, Skill } from '@/types/skill';
import { DetailContext } from './DetailContext';
import SkillDetailInner from './SkillDetailInner';
import type { SkillDetailApiResponse, SkillResourceTreeNode } from './types';

function extractFrontmatterField(markdown: string, key: string): string | undefined {
  const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return undefined;
  const body = frontmatterMatch[1];
  const matcher = new RegExp(`^\\s*${key}\\s*:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm');
  const matched = body.match(matcher);
  return matched?.[1]?.trim();
}

type SkillPreviewDetailApiResponse = {
  success: boolean;
  error?: string;
  baseDir?: string;
  resolvedSlug?: string;
  detail?: SkillDetailApiResponse['detail'];
};

interface MarketSkillDetailModalContentProps {
  marketSkill: MarketplaceSkill;
}

const MarketSkillDetailModalContent = memo<MarketSkillDetailModalContentProps>(
  ({ marketSkill }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();
    const [skillContent, setSkillContent] = useState('');
    const [resourceTree, setResourceTree] = useState<SkillResourceTreeNode[]>([]);
    const [resolvedSlug, setResolvedSlug] = useState(marketSkill.slug);
    const [baseDir, setBaseDir] = useState<string | undefined>(undefined);

    useEffect(() => {
      let active = true;

      const run = async () => {
        setLoading(true);
        setError(undefined);

        try {
          const result = await hostApiFetch<SkillPreviewDetailApiResponse>(
            '/api/skills/preview-detail',
            {
              method: 'POST',
              body: JSON.stringify({ slug: marketSkill.slug }),
            },
          );

          if (!active) return;
          if (!result.success || !result.detail) {
            throw new Error(result.error || 'Failed to load market skill detail');
          }

          setSkillContent(result.detail.readmeContent || '');
          setResourceTree(result.detail.resourceTree || []);
          setResolvedSlug(result.resolvedSlug || marketSkill.slug);
          setBaseDir(result.baseDir);
        } catch (err) {
          if (!active) return;
          setError(String(err));
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void run();
      return () => {
        active = false;
      };
    }, [marketSkill.slug]);

    const contentMap = useMemo(() => {
      const map: Record<string, string> = {};
      const walk = (nodes: SkillResourceTreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'file') {
            map[node.path] = node.content || '';
          } else if (node.children) {
            walk(node.children);
          }
        }
      };
      walk(resourceTree);
      return map;
    }, [resourceTree]);

    const label = extractFrontmatterField(skillContent, 'name') || marketSkill.name;
    const readmeDescription = extractFrontmatterField(skillContent, 'description');
    const author = extractFrontmatterField(skillContent, 'author') || marketSkill.author || 'Unknown';
    const localizedDescription = readmeDescription || marketSkill.description || '';

    const virtualSkill: Skill = useMemo(
      () => ({
        id: resolvedSlug,
        slug: resolvedSlug,
        name: marketSkill.name,
        description: marketSkill.description,
        enabled: false,
        version: marketSkill.version,
        author: marketSkill.author,
        icon: '🧩',
        source: 'openclaw-managed',
        baseDir,
      }),
      [baseDir, marketSkill, resolvedSlug],
    );

    const value = useMemo(
      () => ({
        author,
        contentMap,
        description: marketSkill.description || '',
        error,
        icon: virtualSkill.icon,
        identifier: resolvedSlug,
        label,
        loading,
        localizedDescription,
        localizedReadme: skillContent,
        readme: skillContent,
        resourceTree,
        skill: virtualSkill,
        skillContent,
      }),
      [
        author,
        contentMap,
        error,
        label,
        loading,
        localizedDescription,
        marketSkill.description,
        resolvedSlug,
        resourceTree,
        skillContent,
        virtualSkill,
      ],
    );

    return (
      <DetailContext.Provider value={value}>
        {error && (
          <Text style={{ color: 'var(--ant-color-error)', marginBottom: 12 }} type="danger">
            {error}
          </Text>
        )}
        <SkillDetailInner />
      </DetailContext.Provider>
    );
  },
);

MarketSkillDetailModalContent.displayName = 'MarketSkillDetailModalContent';

export default MarketSkillDetailModalContent;

