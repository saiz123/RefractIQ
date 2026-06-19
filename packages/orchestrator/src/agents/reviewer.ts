import type { AgentCall } from './types.js';
import type { RequirementsArtifact, TestArtifact, ReviewArtifact } from '@agentforge/shared';
import { safeParseAgentJson } from '@agentforge/shared';
import { REVIEWER_SYSTEM } from './prompts.js';

export interface ReviewerInput {
  diff: string;
  requirements: RequirementsArtifact;
  testResult: TestArtifact;
}

export const reviewerAgent: AgentCall<ReviewerInput, ReviewArtifact> = {
  taskType: 'review',
  systemPrompt: REVIEWER_SYSTEM,
  buildUserMessage({ diff, requirements, testResult }) {
    return [
      `<diff>${diff}</diff>`,
      `<requirements>${JSON.stringify(requirements, null, 2)}</requirements>`,
      `<test_results>${JSON.stringify(testResult, null, 2)}</test_results>`,
      '',
      'Review the diff and produce the review JSON.',
    ].join('\n');
  },
  parseResponse(raw) {
    return safeParseAgentJson<ReviewArtifact>(raw, ['issues', 'verdict']);
  },
};
