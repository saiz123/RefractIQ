# Token Optimization

> Status: Phase 0 stub — implementation begins in Phase 3 (router) and Phase 4 (engine).

Token optimization is the primary design constraint of AgentForge — not an afterthought.

## Mechanisms (in priority order)

### 1. Cross-provider cheap-model-first routing (PRIMARY)

The model router scores all models across all registered providers and picks the cheapest one that meets capability requirements. A user with Gemini Flash ($0.075/1M input), GPT-4o-mini ($0.15/1M), and Claude Haiku registered will automatically route cheap tasks to Gemini Flash.

Default tier assignments:

| Stage | Tier | Rationale |
|---|---|---|
| Intake | Cheap/fast | Simple extraction, structured JSON output |
| Summarization | Cheap/fast | Compression, not reasoning |
| Documentation | Cheap/fast | Template-like output |
| Architecture | Mid/reasoning | Coherent design, no code context |
| Review | Mid (cross-provider) | Second-opinion value from different model |
| Build | Strong coding | Code quality is highest priority here |
| Repair | Strong coding | Same as Build |

### 2. Context pruning — never send the full repo

The `context-engine` is called before every agent invocation. It returns only the top-K relevant file chunks within a per-stage token budget cap. The Builder agent for a single task never receives more than ~8,000 input tokens of file context.

### 3. Diff-only review

The Reviewer agent receives `git diff HEAD~1 HEAD` only — never full file contents. This reduces review input by 60–90%.

### 4. Structured JSON artifacts

Agents produce compact JSON, not verbose prose. The orchestrator passes only the specific artifact fields needed for each stage — not the entire run history.

### 5. File summarization cache

Files exceeding per-file token budget are summarized by a cheap model call (~200 tokens). Summaries are cached in `.agentforge/cache/summaries/` keyed by content hash. Repeat builds reuse cached summaries at zero cost.

### 6. Error log compression

Before the repair loop, the evaluator:
- Truncates stack traces to 5 frames
- Deduplicates identical errors
- Hard-caps output at 2,000 tokens

### 7. Prompt caching layout

For Anthropic (`cache_control`) and OpenAI (Predicted Outputs), the `token-engine` provides a `CacheAwareMessageBuilder` that places stable system prompts and architecture context in the cacheable prefix to maximize cache hits across repair loop iterations.

### 8. Three-layer budget enforcement

| Layer | Effect |
|---|---|
| Per-call token limit | Hard-caps `maxTokens` before provider call |
| Per-stage budget | Skips stage + adds warning if exceeded |
| Per-run USD limit | Aborts run if cumulative cost exceeds limit |

Default per-run budget: **$0.50** (configurable via `--budget`).

### 9. Repair loop cap

Hard limit of 3 iterations (configurable). The orchestrator exits after the cap rather than burning tokens indefinitely.

## Tracking

Every `ChatResponse` carries `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`. The `cost-engine` converts these to USD. All totals are stored in SQLite and displayed by `agentforge report`.
