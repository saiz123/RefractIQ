# Example: Next.js Todo App

RefractIQ building a React frontend from scratch.

## Prompt

```
A Next.js 15 todo app with TypeScript, Tailwind CSS v4, and localStorage persistence. Include add, complete, delete, and filter (all/active/completed) features. Use the App Router and server components where appropriate.
```

## Provider Configuration

| Stage | Recommended | Est. Cost |
|---|---|---|
| Intake | Gemini Flash | ~$0.001 |
| Architect | GPT-4o-mini | ~$0.005 |
| Build | Claude Sonnet | ~$0.030 |
| Review | GPT-4o-mini | ~$0.008 |
| Doc | Gemini Flash | ~$0.001 |
| **Total** | | **~$0.045** |

## Commands

```bash
node apps/cli/dist/bin/cli.js build "$(cat examples/nextjs-todo/prompt.txt)" \
  --budget 0.10 \
  --test-command "npx next build"
```

## Expected Output

```
output/<run-id>/
  src/app/
    page.tsx          # Main todo page (server component)
    layout.tsx        # Root layout with Tailwind
    globals.css       # Tailwind v4 import
  src/components/
    TodoList.tsx      # Client component with localStorage
    TodoItem.tsx
    TodoFilter.tsx
  package.json
  tsconfig.json
  next.config.ts
  README.md
```

## Estimated cost: ~$0.045 with mixed provider routing
