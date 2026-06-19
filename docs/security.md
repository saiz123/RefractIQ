# Security

> Status: Phase 0 stub — implementation begins in Phase 1 (key handling) and Phase 7 (workspace sandbox).

## API key handling

- Keys are read from environment variables or `.env` file only
- Keys are **never** written to `.agentforge/config.json`, SQLite, or log files
- The `SecretRedactor` in `packages/shared/src/logger.ts` strips known key patterns from all log output before writing

Patterns redacted:
```
sk-[A-Za-z0-9-]{20,}          OpenAI keys
sk-ant-[A-Za-z0-9-]{20,}      Anthropic keys
AIza[A-Za-z0-9_-]{35}         Google keys
```

## Path traversal prevention

All file operations in `packages/workspace-engine/src/workspace.ts` normalize and validate paths before I/O. Any path resolving outside `rootDir` throws `WorkspaceSecurityError` immediately — no file is written or read.

## Command allowlist

`CommandRunner` validates commands against an allowlist before execution. Default allowed commands:

```
npm  npx  pnpm  node  python  python3  pytest  go  cargo  make  vitest  jest
```

Blocked unconditionally (pre-allowlist, regex-based):
- Shell metacharacters: `;`, `&&`, `||`, `|`, `>`, `` ` ``
- Absolute paths outside workspace
- `rm -rf` patterns
- Network tools: `curl`, `wget`

Users can extend the allowlist in `.agentforge/config.json` under `security.allowedCommands`.

## Prompt injection mitigation

User inputs and file contents inserted into prompts are wrapped in delimiters:

```
<user_input>...</user_input>
<file path="src/index.ts">...</file>
```

Agent system prompts instruct the model to treat these sections as untrusted content.

## No network access from agents

Agents do not make HTTP calls. Network access is only through the `providers` package making structured API calls to known provider endpoints.

## Output isolation

Generated files go to `./output/<run-id>/`. The user's working directory is never modified unless they pass `--write-here`.
