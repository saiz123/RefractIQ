import type { AgentCall } from './types.js';
import type { RequirementsArtifact, ArchitectureArtifact } from '@refractiq/shared';
import { safeParseAgentJson } from '@refractiq/shared';
import { ARCHITECT_SYSTEM } from './prompts.js';

export const architectAgent: AgentCall<RequirementsArtifact, ArchitectureArtifact> = {
  taskType: 'architect',
  systemPrompt: ARCHITECT_SYSTEM,
  buildUserMessage(requirements) {
    return `<requirements>${JSON.stringify(requirements, null, 2)}</requirements>\n\nProduce the architecture JSON.`;
  },
  parseResponse(raw) {
    return safeParseAgentJson<ArchitectureArtifact>(raw, ['fileTree', 'buildOrder']);
  },
};
