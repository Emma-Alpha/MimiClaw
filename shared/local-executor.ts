export type LocalSkillFieldType = 'string' | 'textarea' | 'directory' | 'boolean' | 'number';
export type LocalSkillRiskLevel = 'low' | 'medium' | 'high';
export type LocalSkillSource = 'bundled' | 'user';
export type LocalSkillApprovalMode = 'never' | 'mutating_only' | 'always';

export interface LocalSkillField {
  key: string;
  label: string;
  description?: string;
  type: LocalSkillFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | boolean | number;
}

export interface LocalSkillDefinition {
  id: string;
  title: string;
  summary: string;
  description: string;
  emoji: string;
  category: string;
  source: LocalSkillSource;
  baseDir: string;
  riskLevel: LocalSkillRiskLevel;
  requiresApproval: boolean;
  approvalMode: LocalSkillApprovalMode;
  capabilities: string[];
  fields: LocalSkillField[];
}

export interface LocalSkillManifest {
  id: string;
  title: string;
  summary: string;
  description: string;
  emoji: string;
  category: string;
  riskLevel: LocalSkillRiskLevel;
  approvalMode: LocalSkillApprovalMode;
  capabilities: string[];
  fields: LocalSkillField[];
  handler: string;
}

export interface LocalSkillRunRequest {
  input?: Record<string, unknown>;
  confirmDangerousAction?: boolean;
}

export interface LocalSkillRunRecord {
  runId: string;
  skillId: string;
  skillTitle: string;
  status: 'success' | 'error';
  source: LocalSkillSource;
  riskLevel: LocalSkillRiskLevel;
  approved: boolean;
  startedAt: string;
  finishedAt: string;
  summary: string;
  warnings: string[];
  requiresApproval: boolean;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export interface LocalExecutorMeta {
  bundledSkillsDir: string;
  userSkillsDir: string;
  auditLogPath: string;
}
