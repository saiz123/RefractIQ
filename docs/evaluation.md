# Evaluation

> The evaluator package is fully implemented, including test runner, log compression, and repair loop integration.

## What the evaluator does

The `packages/evaluator` package runs the project's test command after the Build stage and produces `test-result.json`:

```json
{
  "passed": 12,
  "failed": 2,
  "errors": 0,
  "compressedLog": "FAIL src/store.test.ts > TodoStore > add\n  Expected: true\n  Received: false",
  "rawExitCode": 1,
  "testCommand": "npx vitest run"
}
```

This is a deterministic execution step — not an LLM call.

## Log compression

Before passing test results to the repair loop, the evaluator compresses output:

- Stack traces truncated to 5 frames
- Duplicate errors deduplicated
- Total output hard-capped at 2,000 tokens

This ensures the repair loop receives only actionable signal, not noise.

## Test command detection

The test command comes from `requirements.json.suggestedTestCommand` (set by the Intake Agent). If none is found, the evaluator tries common defaults in order:

1. The `test` script in `package.json`
2. `npx vitest run`
3. `npm test`
4. `python -m pytest`
5. `go test ./...`
6. `cargo test`

## Repair loop integration

After the Test stage and Review stage, if `failed > 0` or `review.verdict === 'major'`, the orchestrator enters the repair loop. The evaluator's `compressedLog` and the reviewer's `issues` are combined into a repair context and sent to the Builder agent (diff + errors only — not the full repo).

The loop exits when:
- `passed === total && review.verdict !== 'major'`
- Or the repair loop iteration cap is reached (default: 3)
