export class AgentForgeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AgentForgeError';
  }
}

export class ProviderError extends AgentForgeError {
  constructor(
    message: string,
    public readonly provider: string
  ) {
    super(message, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
  }
}

export class NoCapableModelError extends AgentForgeError {
  constructor(
    public readonly taskType: string,
    public readonly tried: string[]
  ) {
    super(
      `No capable model found for task "${taskType}". Tried: ${tried.join(', ')}`,
      'NO_CAPABLE_MODEL'
    );
    this.name = 'NoCapableModelError';
  }
}

export class BudgetExceededError extends AgentForgeError {
  constructor(
    public readonly limitUsd: number,
    public readonly estimatedUsd: number
  ) {
    super(
      `Budget limit $${limitUsd} would be exceeded (estimated $${estimatedUsd.toFixed(4)})`,
      'BUDGET_EXCEEDED'
    );
    this.name = 'BudgetExceededError';
  }
}

export class WorkspaceSecurityError extends AgentForgeError {
  constructor(public readonly attemptedPath: string) {
    super(`Path traversal attempt blocked: "${attemptedPath}"`, 'WORKSPACE_SECURITY');
    this.name = 'WorkspaceSecurityError';
  }
}

export class CommandBlockedError extends AgentForgeError {
  constructor(public readonly command: string) {
    super(`Command blocked by allowlist: "${command}"`, 'COMMAND_BLOCKED');
    this.name = 'CommandBlockedError';
  }
}

export class InitError extends AgentForgeError {
  constructor(message: string) {
    super(message, 'INIT_ERROR');
    this.name = 'InitError';
  }
}
