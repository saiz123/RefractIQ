# RefractIQ vs. Competitors

RefractIQ is positioned as the orchestration and cost-control layer for developers who already use multiple AI providers. It is not trying to replace any single coding agent — it orchestrates across them.

---

## vs. Claude Code / Codex CLI / Gemini CLI

**What they do well:** Polished terminal-first coding agents from the model vendors themselves. Claude Code reads codebases, edits files, runs commands. Codex CLI runs locally. Gemini CLI uses a ReAct loop with MCP support.

**The gap:** These are vendor-specific harnesses. Each one is optimized for its own provider. There is no cross-provider routing, no structured multi-role artifact handoff, no per-step cost reporting, and no self-hosted control plane.

**When to use them instead:** You want the best possible single-model coding experience and cost doesn't matter.

**When RefractIQ is better:** You pay for multiple providers and want each task routed to the cheapest capable model. You want a full structured pipeline (Intake → Architect → Builder → Reviewer → Doc) with transparent cost tracking.

---

## vs. Aider

**What it does well:** Aider's architect/editor model split is one of the clearest examples of multi-model role separation. It assigns planning to one model and code editing to another — very close to RefractIQ's planner/builder separation.

**The gap:** Aider is a terminal pair-programming tool. It does not have a self-hosted dashboard, multi-role agent artifacts (requirements.json, architecture.json, review.json), per-step cost tracking, context pruning, or a repair loop capped by budget.

**When to use it instead:** You want fast, lightweight terminal pair programming with a known model pair.

**When RefractIQ is better:** You want a full project-building pipeline from "here's an idea" to "here's the code, tests, and docs" with a cost breakdown per stage.

---

## vs. OpenHands

**What it does well:** OpenHands is the strongest adjacent open-source platform. It has an SDK/CLI/cloud stack, software agent SDK, and sandboxed execution. It validates the category of open software-engineering agents.

**The gap:** OpenHands is broader and more agent-platform oriented. It does not primarily focus on provider-agnostic role routing, token/cost optimization, structured artifact contracts, or transparent per-step cost reports.

**When to use it instead:** You want a mature open-source agent platform with a large community and enterprise/cloud options.

**When RefractIQ is better:** You want the simplest self-hosted CLI-first tool with multi-provider cost routing, explicit token budgets, and structured JSON artifact handoffs that prevent runaway agent loops.

---

## vs. LangGraph / CrewAI / AutoGen / MetaGPT

**What they do well:** Powerful multi-agent workflow building blocks. MetaGPT frames software creation as a multi-role agent company (product manager, architect, engineer) which is architecturally the closest to RefractIQ's design.

**The gap:** These are frameworks — not finished products. You must write code to build the orchestration layer, connect providers, handle context, enforce budgets, and build the CLI and dashboard yourself. MetaGPT is research-oriented and not turnkey self-hosted.

**When to use them instead:** You are building a custom multi-agent application and need low-level control over the agent graph.

**When RefractIQ is better:** You want a ready-to-run `RefractIQ build "your idea"` product that handles orchestration, routing, context, budgets, workspace execution, and reporting out of the box.

---

## vs. LiteLLM / OpenRouter / Helicone / Portkey

**What they do well:** This is the strongest proof that provider routing and token/cost governance are real market needs. LiteLLM supports budgets by provider, model, key, user, and team. OpenRouter gives access to 100+ models. Helicone and Portkey provide AI gateways with caching, fallbacks, and observability.

**The gap:** They are infrastructure layers. They do not provide a project-building AI team workflow, workspace execution, structured agent roles, or a software-building pipeline.

**When to use them instead:** You need a unified LLM proxy with routing, fallbacks, caching, and spend tracking across your entire organization.

**When RefractIQ is better:** You want the software-building workflow on top — agents that use your registered providers to actually build, test, review, and document projects.

---

## Positioning summary

```
RefractIQ = structured agent workflow + multi-provider cost routing + transparent reports
           ≠ a single-provider coding assistant
           ≠ a bare multi-agent framework
           ≠ a pure LLM gateway
```

The gap RefractIQ fills: *an open-source self-hosted product that converts a project request into structured agent artifacts, routes each role to the best-value model/provider, runs tests, tracks token/cost usage, and outputs a final project report.*
