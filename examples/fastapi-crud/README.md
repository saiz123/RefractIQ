# Example: FastAPI CRUD API

RefractIQ building a Python backend REST API from scratch.

## Prompt

```
A FastAPI CRUD API for managing a todo list with SQLite storage, Pydantic v2 models, and pytest tests. Include endpoints: GET /todos, POST /todos, PUT /todos/{id}, DELETE /todos/{id}. Use httpx for testing.
```

## Provider Configuration

| Stage | Recommended | Est. Cost |
|---|---|---|
| Intake | Gemini Flash | ~$0.001 |
| Architect | Claude Haiku or GPT-4o-mini | ~$0.005 |
| Build | Claude Sonnet or GPT-4o | ~$0.025 |
| Review | Different provider | ~$0.008 |
| Doc | Gemini Flash | ~$0.001 |
| **Total** | | **~$0.040** |

## Commands

```bash
node apps/cli/dist/bin/cli.js build "$(cat examples/fastapi-crud/prompt.txt)" \
  --budget 0.10 \
  --test-command "python -m pytest"
```

## Expected Output

```
output/<run-id>/
  main.py           # FastAPI app with lifespan, router
  models.py         # Pydantic v2 models (Todo, TodoCreate, TodoUpdate)
  database.py       # SQLite connection and setup
  test_todos.py     # pytest + httpx tests
  requirements.txt
  README.md
```

## Estimated cost: ~$0.040 with mixed provider routing
