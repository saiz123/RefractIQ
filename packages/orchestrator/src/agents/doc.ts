import type { AgentCall } from './types.js';
import type { RequirementsArtifact, ArchitectureArtifact, TestArtifact, DocArtifact } from '@agentforge/shared';
import { safeParseAgentJson } from '@agentforge/shared';
import { DOC_SYSTEM } from './prompts.js';

export interface DocInput {
  requirements: RequirementsArtifact;
  architecture: ArchitectureArtifact;
  fileTree: string[];
  testResult: TestArtifact;
}

export const docAgent: AgentCall<DocInput, DocArtifact> = {
  taskType: 'doc',
  systemPrompt: DOC_SYSTEM,
  buildUserMessage({ requirements, architecture, fileTree, testResult }) {
    return [
      `<requirements>${JSON.stringify(requirements, null, 2)}</requirements>`,
      `<architecture>${JSON.stringify(architecture, null, 2)}</architecture>`,
      `<file_tree>${JSON.stringify(fileTree, null, 2)}</file_tree>`,
      `<test_results>${JSON.stringify(testResult, null, 2)}</test_results>`,
      '',
      'Produce the documentation JSON.',
    ].join('\n');
  },
  parseResponse(raw) {
    return safeParseAgentJson<DocArtifact>(raw);
  },
};
