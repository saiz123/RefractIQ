import type { AgentCall } from './types.js';
import type { RequirementsArtifact } from '@agentforge/shared';
import { INTAKE_SYSTEM } from './prompts.js';

export const intakeAgent: AgentCall<{ userPrompt: string }, RequirementsArtifact> = {
  taskType: 'intake',
  systemPrompt: INTAKE_SYSTEM,
  buildUserMessage({ userPrompt }) {
    return `<user_input>${userPrompt}</user_input>\n\nProduce the requirements JSON.`;
  },
  parseResponse(raw) {
    return JSON.parse(raw) as RequirementsArtifact;
  },
};
