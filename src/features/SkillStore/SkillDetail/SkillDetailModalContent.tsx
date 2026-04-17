import { Text } from '@lobehub/ui';
import { memo, useEffect, useMemo, useState } from 'react';
import type { Skill } from '@/types/skill';
import { hostApiFetch } from '@/lib/host-api';
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

interface SkillDetailModalContentProps {
  skill: Skill;
}

const SkillDetailModalContent = memo<SkillDetailModalContentProps>(({ skill }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [skillContent, setSkillContent] = useState('');
  const [resourceTree, setResourceTree] = useState<SkillResourceTreeNode[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await hostApiFetch<SkillDetailApiResponse>('/api/skills/detail', {
          method: 'POST',
          body: JSON.stringify({
            baseDir: skill.baseDir,
            skillKey: skill.id,
            slug: skill.slug,
          }),
        });
        if (!active) return;
        if (!result.success || !result.detail) {
          throw new Error(result.error || 'Failed to load skill detail');
        }
        setSkillContent(result.detail.readmeContent || '');
        setResourceTree(result.detail.resourceTree || []);
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
  }, [skill.baseDir, skill.id, skill.slug]);

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

  const label = extractFrontmatterField(skillContent, 'name') || skill.name;
  const readmeDescription = extractFrontmatterField(skillContent, 'description');
  const author = extractFrontmatterField(skillContent, 'author') || skill.author || 'Unknown';
  const localizedDescription = readmeDescription || skill.description || '';

  const value = useMemo(
    () => ({
      author,
      contentMap,
      description: skill.description || '',
      error,
      icon: skill.icon,
      identifier: skill.id,
      label,
      loading,
      localizedDescription,
      localizedReadme: skillContent,
      readme: skillContent,
      resourceTree,
      skill,
      skillContent,
    }),
    [
      author,
      contentMap,
      error,
      label,
      loading,
      localizedDescription,
      resourceTree,
      skill,
      skillContent,
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
});

SkillDetailModalContent.displayName = 'SkillDetailModalContent';

export default SkillDetailModalContent;
