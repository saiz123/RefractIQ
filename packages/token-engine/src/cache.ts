import type { Message } from '@agentforge/shared';

export interface CacheableSection {
  content: string;
  /** True = this section changes per call; false = stable, should be in cached prefix */
  isVariable: boolean;
}

/**
 * Builds a messages array structured to maximize prompt cache hits.
 *
 * Strategy: place stable content (system prompt, architecture spec, project constraints)
 * BEFORE variable content (current task, file chunks, error logs).
 *
 * The resulting messages array has stable sections first (cache-friendly prefix)
 * followed by variable sections (the part that changes per call).
 */
export class CacheAwareMessageBuilder {
  private sections: CacheableSection[] = [];

  addStable(content: string): this {
    this.sections.push({ content, isVariable: false });
    return this;
  }

  addVariable(content: string): this {
    this.sections.push({ content, isVariable: true });
    return this;
  }

  /**
   * Build the final messages array.
   * Stable sections are merged into the system message.
   * Variable sections become user message content.
   */
  build(systemPrompt: string): { systemPrompt: string; messages: Message[] } {
    const stableParts = this.sections
      .filter((s) => !s.isVariable)
      .map((s) => s.content);

    const variableParts = this.sections
      .filter((s) => s.isVariable)
      .map((s) => s.content);

    const fullSystem = [systemPrompt, ...stableParts].filter(Boolean).join('\n\n---\n\n');

    const userContent = variableParts.join('\n\n');

    return {
      systemPrompt: fullSystem,
      messages: userContent ? [{ role: 'user' as const, content: userContent }] : [],
    };
  }

  /** Estimate total token count of the built output */
  estimateTokens(): number {
    return Math.ceil(
      this.sections.reduce((sum, s) => sum + s.content.length, 0) / 4
    );
  }
}
