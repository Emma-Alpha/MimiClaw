export interface PublicMcpConnectionSnapshot {
  fileExists: boolean;
  filePath: string;
  statuses: Record<string, boolean>;
  workspaceResolved: boolean;
  workspaceRoot: string;
}
