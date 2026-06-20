# Example: Reverse String CLI

A minimal example showing RefractIQ building a TypeScript CLI from scratch.

## Prompt

```
A CLI tool that takes a string argument and prints it reversed, written in TypeScript with Commander.js. Include a --uppercase flag to also convert to uppercase. Add vitest tests.
```

## Provider Configuration

This example works with any registered provider. Recommended for lowest cost:

| Stage | Recommended | Approx. Cost |
|---|---|---|
| Intake | Gemini Flash or GPT-4o-mini | ~$0.001 |
| Architect | Claude Haiku or GPT-4o-mini | ~$0.003 |
| Build | Claude Sonnet or GPT-4o | ~$0.015 |
| Review | Different provider from Build | ~$0.005 |
| Doc | Gemini Flash or GPT-4o-mini | ~$0.001 |
| **Total** | | **~$0.025** |

## Commands to Reproduce

```bash
# Initialize (first time only)
node apps/cli/dist/bin/cli.js init
node apps/cli/dist/bin/cli.js providers add

# Run the build
node apps/cli/dist/bin/cli.js build "$(cat examples/reverse-string-cli/prompt.txt)"

# View cost breakdown
node apps/cli/dist/bin/cli.js report
```

## Expected Output Structure

```
output/<run-id>/
  src/
    index.ts          # CLI entry point with Commander.js
    reverse.ts        # Core string reversal logic
    reverse.test.ts   # Vitest tests
  package.json
  tsconfig.json
  README.md
```

## Expected Test Output

```
✓ reverses a string (2ms)
✓ reverses with --uppercase flag (1ms)
✓ handles empty string (0ms)

Test Files  1 passed (1)
Tests       3 passed (3)
```

## Notes

- The exact output may vary depending on which provider and model is used
- Budget for this example: $0.05 (set with `--budget 0.05`)
- With Ollama (local): free, but output quality depends on model size
