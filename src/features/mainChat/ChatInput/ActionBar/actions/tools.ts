import { toast } from 'sonner';
import type { ActionHandlerContext } from '../context';

export async function handleToolsAction({ skills, toggleSkillEnabled }: ActionHandlerContext) {
  const target = skills.find((skill) => !skill.isCore) ?? skills[0];
  if (!target) {
    toast.info('No installed skills found');
    return;
  }
  await toggleSkillEnabled(target.id);
}
