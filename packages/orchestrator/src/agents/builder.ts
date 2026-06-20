import type { AgentCall } from './types.js';
import type { BuildTask, CodeDiffArtifact } from '@refractiq/shared';
import { safeParseAgentJson } from '@refractiq/shared';
import { BUILDER_SYSTEM } from './prompts.js';

export interface BuilderInput {
  task: BuildTask;
  contextSummary: string;
  /** Formatted context pack string from ContextEngine.formatForPrompt(). If provided, used instead of contextSummary. */
  contextPack?: string;
  repairContext?: string;
}

export const builderAgent: AgentCall<BuilderInput, CodeDiffArtifact> = {
  taskType: 'build',
  systemPrompt: BUILDER_SYSTEM,
  buildUserMessage({ task, contextSummary, contextPack, repairContext }) {
    if (repairContext !== undefined) {
      return [
        `<repair_context>\n${repairContext}\n</repair_context>`,
        '',
        `<task>\n${task.description}\n</task>`,
      ].join('\n');
    }
    const ctx = contextPack ?? contextSummary;
    return [
      `<context>\n${ctx}\n</context>`,
      '',
      `<task>\n${task.description}\n</task>`,
      '',
      'Write the files for this task. Return JSON only.',
    ].join('\n');
  },
  parseResponse(raw) {
    return safeParseAgentJson<CodeDiffArtifact>(raw, ['files', 'explanation']);
  },
};
