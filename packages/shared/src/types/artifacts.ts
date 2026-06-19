export interface RequirementsArtifact {
  clarifiedGoal: string;
  targetLanguage: string;
  techStack: string[];
  constraints: string[];
  outOfScope: string[];
  suggestedTestCommand: string;
}

export interface FileTreeNode {
  path: string;
  role: string;
}

export interface ModuleSpec {
  name: string;
  responsibility: string;
}

export interface InterfaceSpec {
  name: string;
  fields: Array<{ name: string; type: string }>;
}

export interface ArchitectureArtifact {
  fileTree: FileTreeNode[];
  modules: ModuleSpec[];
  interfaces: InterfaceSpec[];
  architectureDecisions: string[];
  buildOrder: string[];
}

export interface BuildTask {
  id: string;
  description: string;
  files: string[];
  dependsOn: string[];
}

export interface TaskListArtifact {
  tasks: BuildTask[];
}

export interface FileChunk {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

export interface ContextPackArtifact {
  chunks: FileChunk[];
  totalTokenEstimate: number;
}

export type FileWriteAction = 'create' | 'update' | 'delete';

export interface FileWrite {
  path: string;
  content: string;
  action: FileWriteAction;
}

export interface CodeDiffArtifact {
  files: FileWrite[];
  explanation: string;
  assumptions: string[];
}

export interface TestArtifact {
  passed: number;
  failed: number;
  errors: number;
  compressedLog: string;
  rawExitCode: number;
  testCommand: string;
}

export type ReviewVerdict = 'pass' | 'minor' | 'major';
export type ReviewSeverity = 'info' | 'minor' | 'major' | 'critical';

export interface ReviewIssue {
  file: string;
  line?: number;
  severity: ReviewSeverity;
  category: string;
  message: string;
}

export interface ReviewArtifact {
  issues: ReviewIssue[];
  verdict: ReviewVerdict;
  suggestions: string[];
}

export interface InlineDoc {
  file: string;
  insertions: Array<{ line: number; content: string }>;
}

export interface DocArtifact {
  readme: string;
  changelog: string;
  inlineDocs: InlineDoc[];
}
