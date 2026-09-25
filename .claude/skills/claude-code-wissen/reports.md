

<!-- FILE: reports/claude-advanced-tool-use.md -->

# Claude Advanced Tool Use Patterns

API-level features (now GA) that reduce token consumption, latency, and improve tool accuracy. Released with Opus/Sonnet 4.6.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Table of Contents

1. [Overview](#overview)
2. [Programmatic Tool Calling (PTC)](#programmatic-tool-calling-ptc)
3. [Dynamic Filtering for Web Search/Fetch](#dynamic-filtering-for-web-searchfetch)
4. [Tool Search Tool](#tool-search-tool)
5. [Tool Use Examples](#tool-use-examples)
6. [Claude Code Relevance](#claude-code-relevance)

---

## Overview

| Feature | Problem Solved | Token Savings | Availability |
|---------|---------------|---------------|--------------|
| Programmatic Tool Calling | Multi-step agent loops burn tokens on round trips | ~37% reduction | API, Foundry (GA) |
| Dynamic Filtering | Web search/fetch results bloat context with irrelevant content | ~24% fewer input tokens | API, Foundry (GA) |
| Tool Search Tool | Too many tool definitions bloat context | ~85% reduction | API, Foundry (GA) |
| Tool Use Examples | Schema alone can't express usage patterns | 72% → 90% accuracy | API, Foundry (GA) |

All features are **generally available** as of February 18, 2026.

**Strategic layering** — start with your biggest bottleneck:
- Context bloat from tool definitions → Tool Search Tool
- Large intermediate results → Programmatic Tool Calling
- Web search noise → Dynamic Filtering
- Parameter errors → Tool Use Examples

---

## Programmatic Tool Calling (PTC)

<img src="assets/programmatic-tool-calling-diagram.svg" alt="PTC Diagram — Traditional vs Programmatic Tool Calling" width="100%" />

### The Paradigm Shift

**Before (Traditional Tool Calling):**
```
User prompt → Claude → Tool call 1 → Response 1 → Claude → Tool call 2 → Response 2 → Claude → Tool call 3 → Response 3 → Claude → Final answer
```
Each tool call requires a full model round trip. 3 tools = 3 inference passes.

**After (Programmatic Tool Calling):**
```
User prompt → Claude → writes Python script → Script calls Tool 1, Tool 2, Tool 3 internally → stdout → Claude → Final answer
```
Claude writes code that orchestrates all tools. Only the final `stdout` enters the context window. 3 tools = 1 inference pass.

### How It Works

1. You define tools with `allowed_callers: ["code_execution_20250825"]`
2. Claude writes Python that calls those tools as async functions inside a sandbox
3. When a tool function is called, the sandbox pauses and the API returns a `tool_use` block
4. You provide the tool result — it goes to the **running code**, not Claude's context
5. Code resumes, processes results, calls more tools if needed
6. Only `stdout` from the final execution reaches Claude

### Key Configuration

```json
{
  "tools": [
    {
      "type": "code_execution_20250825",
      "name": "code_execution"
    },
    {
      "name": "query_database",
      "description": "Execute a SQL query. Returns rows as JSON objects with fields: id (str), name (str), revenue (float).",
      "input_schema": {
        "type": "object",
        "properties": {
          "sql": { "type": "string", "description": "SQL query to execute" }
        },
        "required": ["sql"]
      },
      "allowed_callers": ["code_execution_20250825"]
    }
  ]
}
```

### The `allowed_callers` Field

| Value | Behavior |
|-------|----------|
| `["direct"]` | Traditional tool calling only (default if omitted) |
| `["code_execution_20250825"]` | Only callable from Python sandbox |
| `["direct", "code_execution_20250825"]` | Both modes available |

**Recommendation:** Choose one mode per tool, not both. This gives Claude clearer guidance.

### The `caller` Field in Responses

Every tool use block includes a `caller` field so you know how it was invoked:

```json
// Direct (traditional)
{ "caller": { "type": "direct" } }

// Programmatic (from code execution)
{ "caller": { "type": "code_execution_20250825", "tool_id": "srvtoolu_abc123" } }
```

### Advanced Patterns

**Batch processing** — process N items in 1 inference pass:
```python
regions = ["West", "East", "Central", "North", "South"]
results = {}
for region in regions:
    data = await query_database(f"SELECT SUM(revenue) FROM sales WHERE region='{region}'")
    results[region] = data[0]["revenue"]

top = max(results.items(), key=lambda x: x[1])
print(f"Top region: {top[0]} with ${top[1]:,}")
```

**Early termination** — stop as soon as success criteria are met:
```python
endpoints = ["us-east", "eu-west", "apac"]
for endpoint in endpoints:
    status = await check_health(endpoint)
    if status == "healthy":
        print(f"Found healthy endpoint: {endpoint}")
        break
```

**Conditional tool selection:**
```python
file_info = await get_file_info(path)
if file_info["size"] < 10000:
    content = await read_full_file(path)
else:
    content = await read_file_summary(path)
print(content)
```

**Data filtering** — reduce what Claude sees:
```python
logs = await fetch_logs(server_id)
errors = [log for log in logs if "ERROR" in log]
print(f"Found {len(errors)} errors")
for error in errors[-10:]:
    print(error)
```

### Model Compatibility

| Model | Supported |
|-------|-----------|
| Claude Opus 4.6 | Yes |
| Claude Sonnet 4.6 | Yes |
| Claude Sonnet 4.5 | Yes |
| Claude Opus 4.5 | Yes |

### Constraints

| Constraint | Detail |
|-----------|--------|
| **Not on Bedrock/Vertex** | API and Foundry only |
| **No MCP tools** | MCP connector tools cannot be called programmatically |
| **No web search/fetch** | Web tools not supported in PTC |
| **No structured outputs** | `strict: true` tools incompatible |
| **No forced tool choice** | `tool_choice` cannot force PTC |
| **Container lifetime** | ~4.5 minutes before expiry |
| **ZDR** | Not covered by Zero Data Retention |
| **Tool results as strings** | Validate external results for code injection risks |

### When to Use PTC

| Good Use Cases | Less Ideal |
|----------------|------------|
| Processing large datasets needing aggregates | Single tool calls with simple responses |
| 3+ dependent tool calls in sequence | Tools needing immediate user feedback |
| Filtering/transforming results before Claude sees them | Very fast operations (overhead > benefit) |
| Parallel operations across many items | |
| Conditional logic based on intermediate results | |

### Token Efficiency

- Tool results from programmatic calls are **not added to Claude's context** — only final `stdout`
- Intermediate processing happens in code, not model tokens
- 10 tools programmatically ≈ 1/10th the tokens of 10 direct calls

---

## Dynamic Filtering for Web Search/Fetch

### The Problem

Web search and fetch tools dump full HTML pages into Claude's context window. Most of that content is irrelevant — navigation, ads, boilerplate. Claude then reasons over all of it, wasting tokens and reducing accuracy.

### The Solution

Claude now **writes and executes Python code to filter web results** before they enter the context window. Instead of reasoning over raw HTML, Claude filters, parses, and extracts only relevant content in a sandbox.

### How It Works

**Before:**
```
Query → Search results → Fetch full HTML × N pages → All content enters context → Claude reasons over everything
```

**After:**
```
Query → Search results → Claude writes filtering code → Code extracts relevant content only → Filtered results enter context
```

### API Configuration

Uses updated tool type versions with a beta header:

```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 4096,
  "tools": [
    {
      "type": "web_search_20260209",
      "name": "web_search"
    },
    {
      "type": "web_fetch_20260209",
      "name": "web_fetch"
    }
  ]
}
```

**Header required:** `anthropic-beta: code-execution-web-tools-2026-02-09`

**Enabled by default** when using the new tool type versions with Sonnet 4.6 and Opus 4.6.

### Benchmark Results

**BrowseComp** (finding specific information on websites):

| Model | Without Filtering | With Filtering | Improvement |
|-------|-------------------|----------------|-------------|
| Sonnet 4.6 | 33.3% | **46.6%** | +13.3 pp |
| Opus 4.6 | 45.3% | **61.6%** | +16.3 pp |

**DeepsearchQA** (multi-step research, F1 score):

| Model | Without Filtering | With Filtering | Improvement |
|-------|-------------------|----------------|-------------|
| Sonnet 4.6 | 52.6% | **59.4%** | +6.8 pp |
| Opus 4.6 | 69.8% | **77.3%** | +7.5 pp |

**Token efficiency:** Average 24% fewer input tokens. Sonnet 4.6 sees cost reduction; Opus 4.6 may increase slightly due to more complex filtering code.

### Use Cases

- Sifting through technical documentation
- Verifying citations across multiple sources
- Cross-referencing search results
- Multi-step research queries
- Finding specific data points buried in large pages

---

## Tool Search Tool

### The Problem

Loading all tool definitions upfront wastes context. If you have 50 MCP tools at ~1.5K tokens each, that's 75K tokens before the user even asks a question.

### The Solution

Mark infrequently-used tools with `defer_loading: true`. They're excluded from the initial context. Claude discovers them on-demand via a Tool Search Tool.

### Configuration

```json
{
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "google-drive",
      "default_config": { "defer_loading": true },
      "configs": {
        "search_files": { "defer_loading": false }
      }
    }
  ]
}
```

### Best Practices

- Keep 3-5 most-used tools always loaded, defer the rest
- Write clear, descriptive tool names and descriptions (search relies on them)
- Document available capabilities in the system prompt

### When to Use

- Tool definitions consuming > 10K tokens
- 10+ tools available
- Multiple MCP servers
- Tool selection accuracy issues from too many options

### Token Savings

~85% reduction in tool definition tokens (77K → 8.7K in Anthropic's benchmarks).

### Claude Code Equivalent

Claude Code has **MCP tool search auto mode** (enabled by default since v2.1.7). When MCP tool descriptions exceed 10% of context, they're deferred and discovered via `MCPSearch`. Configure the threshold with `ENABLE_TOOL_SEARCH=auto:N` where N is the context percentage (0-100).

---

## Tool Use Examples

### The Problem

JSON schemas define structure but can't express:
- When to include optional parameters
- Which parameter combinations make sense
- Format conventions (date formats, ID patterns)
- Nested structure usage

### The Solution

Add `input_examples` to tool definitions — concrete usage patterns beyond the schema.

### Configuration

```json
{
  "name": "create_ticket",
  "description": "Create a support ticket",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "priority": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
      "assignee": { "type": "string" },
      "labels": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["title"]
  },
  "input_examples": [
    {
      "title": "Login page returns 500 error",
      "priority": "critical",
      "assignee": "oncall-team",
      "labels": ["bug", "auth", "production"]
    },
    {
      "title": "Add dark mode support",
      "priority": "low",
      "labels": ["feature-request", "ui"]
    },
    {
      "title": "Update API docs for v2 endpoints"
    }
  ]
}
```

### Best Practices

- Use **realistic data**, not placeholder strings like "example_value"
- Show **variety**: minimal, partial, and full specifications
- Keep concise: **1-5 examples per tool**
- Focus on resolving ambiguity — target behavioral clarity over schema completeness
- Show parameter correlations (e.g., `priority: "critical"` tends to have `assignee`)

### Results

72% → 90% accuracy on complex parameter handling in Anthropic's benchmarks.

---

## Claude Code Relevance

### What applies directly to Claude Code users

| Feature | Claude Code Status | Action |
|---------|-------------------|--------|
| Tool Search | Built-in since v2.1.7 as MCPSearch auto mode | Tune `ENABLE_TOOL_SEARCH=auto:N` if you have many MCP tools |
| Dynamic Filtering | Not available in CLI (API-level web tools) | Relevant for Agent SDK users doing web research |
| PTC | Not available in CLI | Relevant for Agent SDK users building custom agents |
| Tool Use Examples | Not configurable in CLI | Relevant for custom MCP server authors |

### For Agent SDK developers

If you're building agents with `@anthropic-ai/claude-agent-sdk`, PTC is immediately actionable:

1. Add `code_execution_20250825` to your tools array
2. Set `allowed_callers` on tools that benefit from batching/filtering
3. Implement the tool result loop (pause → provide result → resume)
4. Return structured data (JSON) from tools for easier programmatic parsing

### For MCP server authors

If you're building custom MCP servers, Tool Use Examples can improve how Claude uses your tools:
- Add `input_examples` to tool schemas
- Document return formats clearly in descriptions (PTC needs to parse them)

---

## Sources

- [Anthropic Engineering: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Programmatic Tool Calling Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Code Execution Tool Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)
- [Improved Web Search with Dynamic Filtering](https://claude.com/blog/improved-web-search-with-dynamic-filtering)


<!-- FILE: reports/claude-agent-command-skill.md -->

# Agents vs Commands vs Skills — When to Use What

A comparison of the three extension mechanisms in Claude Code: subagents, commands, and skills.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

![Slash menu showing time-skill, time-command, and time-agent](assets/agent-command-skill-1.jpg)

---

## At a Glance

| | Agent | Command | Skill |
|---|---|---|---|
| **Location** | `.claude/agents/<name>.md` | `.claude/commands/<name>.md` | `.claude/skills/<name>/SKILL.md` |
| **Context** | Separate subagent process | Inline (main conversation) | Inline (main conversation) |
| **User-invocable** | No `/` menu — invoked by Claude or via Agent tool | Yes — `/command-name` | Yes — `/skill-name` (unless `user-invocable: false`) |
| **Auto-invoked by Claude** | Yes — via `description` field | No | Yes — via `description` field (unless `disable-model-invocation: true`) |
| **Accepts arguments** | Via `prompt` parameter | `$ARGUMENTS`, `$0`, `$1` | `$ARGUMENTS`, `$0`, `$1` |
| **Dynamic context injection** | No | Yes — `` !`command` `` | Yes — `` !`command` `` |
| **Own context window** | Yes — isolated | No — shares main | No — shares main (unless `context: fork`) |
| **Model override** | `model:` frontmatter | `model:` frontmatter | `model:` frontmatter |
| **Tool restrictions** | `tools:` / `disallowedTools:` | `allowed-tools:` | `allowed-tools:` |
| **Hooks** | `hooks:` frontmatter | — | `hooks:` frontmatter |
| **Memory** | `memory:` frontmatter (user/project/local) | — | — |
| **Can preload skills** | Yes — `skills:` frontmatter | — | — |
| **MCP servers** | `mcpServers:` frontmatter | — | — |

---

## When to Use Each

### Use an Agent when:

- The task is **autonomous and multi-step** — the agent needs to explore, decide, and act without constant guidance
- You need **context isolation** — the work shouldn't pollute the main conversation window
- The agent needs **persistent memory** across sessions (e.g., a code reviewer that learns patterns)
- You want to **preload domain knowledge** via skills without cluttering the main context
- The task benefits from **running in the background** or in a **git worktree**
- You need **tool restrictions** or a **different permission mode** (e.g., `acceptEdits`, `plan`)

**Example**: `weather-agent` — autonomously fetches weather data using its preloaded `weather-fetcher` skill, runs in a separate context with restricted tools.

### Use a Command when:

- You need a **user-initiated entry point** — a workflow the user explicitly triggers
- The workflow involves **orchestrating** other agents or skills
- You want to **keep context lean** — command content is not injected into the session context until the user triggers it

**Example**: `weather-orchestrator` — the user triggers it, it asks for C/F preference, invokes the agent, then invokes the SVG skill.

### Use a Skill when:

- You want **Claude to auto-invoke** based on user intent — skill descriptions are injected into the session context for semantic matching
- The task is a **reusable procedure** that can be invoked from multiple places (commands, agents, or Claude itself)
- You need **agent preloading** — baking domain knowledge into a specific agent at startup

**Example**: `weather-svg-creator` — Claude auto-invokes it when the user asks for a weather card; also callable from commands.

---

## The Command → Agent → Skill Architecture

This repository demonstrates a layered orchestration pattern:

```
User triggers /command
    ↓
Command orchestrates the workflow
    ↓
Command invokes Agent (separate context, autonomous)
    ↓
Agent uses preloaded Skill (domain knowledge)
    ↓
Command invokes Skill (inline, for output generation)
```

**Concrete example** — the weather system:

```
/weather-orchestrator (command — entry point, asks C/F)
    ↓
weather-agent (agent — fetches temperature autonomously)
    ├── weather-fetcher (agent skill — preloaded API instructions)
    ↓
weather-svg-creator (skill — creates SVG inline)
```

---

## Frontmatter Comparison

### Agent Frontmatter

```yaml
---
name: my-agent
description: Use this agent PROACTIVELY when...
tools: Read, Write, Edit, Bash
model: sonnet
maxTurns: 10
permissionMode: acceptEdits
memory: user
skills:
  - my-skill
---
```

### Command Frontmatter

```yaml
---
description: Do something useful
argument-hint: [issue-number]
allowed-tools: Read, Edit, Bash(gh *)
model: sonnet
---
```

### Skill Frontmatter

```yaml
---
name: my-skill
description: Do something when the user asks for...
argument-hint: [file-path]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
model: sonnet
context: fork
agent: general-purpose
---
```

---

## Key Distinctions

### Auto-invocation

| Mechanism | Can Claude auto-invoke? | How to prevent |
|-----------|------------------------|----------------|
| Agent | Yes — via `description` (use "PROACTIVELY" to encourage it) | Remove or soften the description |
| Command | No — always user-initiated via `/` | N/A |
| Skill | Yes — via `description` | Set `disable-model-invocation: true` |

### Visibility in `/` menu

| Mechanism | Appears in `/` menu? | How to hide |
|-----------|---------------------|-------------|
| Agent | No | N/A |
| Command | Yes — always | Cannot be hidden |
| Skill | Yes — by default | Set `user-invocable: false` |

### Context isolation

| Mechanism | Runs in own context? | How to configure |
|-----------|---------------------|-----------------|
| Agent | Always | Built-in behavior |
| Command | Never | N/A |
| Skill | Optional | Set `context: fork` |

---

## Worked Example: "What is the current time?"

This repository has all three mechanisms defined for the same task — displaying the current time in PKT. Here's what happens when a user types **"What is the current time?"** without explicitly invoking any `/` command:

| Mechanism | Will it fire? | Why / Why not |
|-----------|--------------|---------------|
| `time-command` | No | Commands are **never auto-invoked**. The user would need to explicitly type `/time-command` for it to run. Commands have no auto-discovery pathway — they are strictly user-initiated. |
| `time-agent` | **Yes** (possible) | The agent's `description` says *"Use this agent to display the current time in Pakistan Standard Time"*. Claude matches this against the user's intent and may spawn it via the Agent tool. However, agents run in a **separate context window**, making them heavier than necessary for this simple task. |
| `time-skill` | **Yes** (most likely) | The skill's `description` says *"Display the current time in Pakistan Standard Time (PKT, UTC+5). Use when the user asks for the current time, Pakistan time, or PKT."* Claude matches this and invokes it via the Skill tool. Since it runs **inline** with no context overhead, it's the most efficient match. |

### Resolution order

When multiple mechanisms match the same intent, Claude prefers the **lightest-weight option** that satisfies the request:

```
1. Skill (inline, no context overhead)     ← preferred
2. Agent (separate context, autonomous)    ← used if skill is unavailable or task is complex
3. Command (never — requires explicit /)   ← only if user types /time-command
```

### What if `disable-model-invocation: true` were set on the skill?

Then Claude **cannot** auto-invoke the skill. The agent becomes the only auto-invocable option, so Claude would spawn `time-agent` instead — at the cost of a separate context window for a one-liner bash command.

### What if both skill and agent had auto-invocation disabled?

Then **nothing fires automatically**. Claude would fall back to its own general knowledge and likely just run `TZ='Asia/Karachi' date` directly — no extension mechanism involved. The user would need to explicitly type `/time-command` or `/time-skill` to use one.

![Claude auto-invoking time-skill when user asks "What is the current time?"](assets/agent-command-skill-2.png)

---

## Sources

- [Claude Code Skills — Docs](https://code.claude.com/docs/en/skills)
- [Claude Code Sub-agents — Docs](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Slash Commands — Docs](https://code.claude.com/docs/en/slash-commands)
- [Skills Best Practice](../best-practice/claude-skills.md)
- [Commands Best Practice](../best-practice/claude-commands.md)
- [Sub-agents Best Practice](../best-practice/claude-subagents.md)


<!-- FILE: reports/claude-agent-memory.md -->

# Claude Code: Agent Memory Frontmatter

Persistent memory for subagents — enabling agents to learn, remember, and build knowledge across sessions.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Overview

Introduced in **Claude Code v2.1.33** (February 2026), the `memory` frontmatter field gives each subagent its own persistent markdown-based knowledge store. Before this, every agent invocation started from scratch.

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Write, Edit, Bash
model: sonnet
memory: user
---

You are a code reviewer. As you review code, update your agent memory with
patterns, conventions, and recurring issues you discover.
```

---

## Memory Scopes

| Scope | Storage Location | Version Controlled | Shared | Best For |
|-------|-----------------|-------------------|--------|----------|
| `user` | `~/.claude/agent-memory/<agent-name>/` | No | No | Cross-project knowledge (recommended default) |
| `project` | `.claude/agent-memory/<agent-name>/` | Yes | Yes | Project-specific knowledge the team should share |
| `local` | `.claude/agent-memory-local/<agent-name>/` | No (git-ignored) | No | Project-specific knowledge that's personal |

These scopes mirror the settings hierarchy (`~/.claude/settings.json` → `.claude/settings.json` → `.claude/settings.local.json`).

---

## How It Works

1. **On startup**: First 200 lines of `MEMORY.md` are injected into the agent's system prompt
2. **Tool access**: `Read`, `Write`, `Edit` are auto-enabled so the agent can manage its memory
3. **During execution**: The agent reads/writes to its memory directory freely
4. **Curation**: If `MEMORY.md` exceeds 200 lines, the agent moves details into topic-specific files

```
~/.claude/agent-memory/code-reviewer/     # user scope example
├── MEMORY.md                              # Primary file (first 200 lines loaded)
├── react-patterns.md                      # Topic-specific file
└── security-checklist.md                  # Topic-specific file
```

---

## Agent Memory vs Other Memory Systems

| System | Who Writes | Who Reads | Scope |
|--------|-----------|-----------|-------|
| **CLAUDE.md** | You (manually) | Main Claude + all agents | Project |
| **Auto-memory** | Main Claude (auto) | Main Claude only | Per-project per-user |
| **`/memory` command** | You (via editor) | Main Claude only | Per-project per-user |
| **Agent memory** | The agent itself | That specific agent only | Configurable (user/project/local) |

These systems are **complementary** — an agent reads both CLAUDE.md (project context) and its own memory (agent-specific knowledge).

---

## Practical Example

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
tools: Read, Write, Edit, Bash
model: sonnet
memory: project
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions from your preloaded skills.
As you work, save architectural decisions and patterns to your memory.
```

This combines **skills** (static knowledge at startup) with **memory** (dynamic knowledge built over time).

---

## Tips

- **Prompt memory usage** — Include explicit instructions: `"Before starting, review your memory. After completing, update your memory with what you learned."`
- **Request memory checks** when invoking agents: `"Review this PR, and check your memory for patterns you've seen before."`
- **Choose the right scope** — `user` for cross-project, `project` for team-shared, `local` for personal

---

## Sources

- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Manage Claude's memory — Claude Code Docs](https://code.claude.com/docs/en/memory)
- [Claude Code v2.1.33 Release Notes](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)


<!-- FILE: reports/claude-agent-sdk-vs-cli-system-prompts.md -->

# Claude Agent SDK vs Claude CLI: System Prompts and Output Consistency

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

![SDK vs CLI System Prompts Diagram](assets/sdk-vs-cli-diagram.svg)

---

## Executive Summary

When sending the same message (e.g., "What is the capital of Norway?") through the **Claude Agent SDK** versus the **Claude CLI (Claude Code)**, the system prompts accompanying these messages are fundamentally different. The CLI uses a **modular system prompt architecture** (~269 base tokens with additional context conditionally loaded based on features), while the SDK uses a minimal prompt by default. **There is no guarantee of identical output between the two**, even with matching configurations, due to the absence of a seed parameter and inherent non-determinism in Claude's architecture.

---

## 1. System Prompt Comparison

### Claude CLI (Claude Code)

The Claude CLI uses a **modular system prompt architecture** with a ~269-token base prompt, with additional context conditionally loaded:

| Component | Description | Loading |
|-----------|-------------|---------|
| **Base System Prompt** | Core instructions and behavior | Always (~269 tokens) |
| **Tool Instructions** | 18+ builtin tools (Write, Read, Edit, Bash, TodoWrite, etc.) | Always |
| **Coding Guidelines** | Code style, formatting rules, security practices | Always |
| **Safety Rules** | Refusal rules, injection defense, harm prevention | Always |
| **Response Style** | Tone, verbosity, explanation depth, emoji usage | Always |
| **Environment Context** | Working directory, git status, platform info | Always |
| **Project Context** | CLAUDE.md content, settings, hooks configuration | Conditional |
| **Subagent Prompts** | Plan mode, Explore agent, Task agent | Conditional |
| **Security Review** | Extended security instructions (~2,610 tokens) | Conditional |

**Key Characteristics:**
- **Modular architecture** with 110+ system prompt strings loaded conditionally
- Base prompt is modest (~269 tokens), total varies by features activated
- Includes extensive security and injection defense layers
- Automatically loads CLAUDE.md files in the working directory
- Session-persistent context in interactive mode

### Claude Agent SDK

The Agent SDK uses a **minimal system prompt by default** containing:

| Component | Description | Token Impact |
|-----------|-------------|--------------|
| **Essential Tool Instructions** | Only tools explicitly provided | Minimal |
| **Basic Safety** | Minimal safety instructions | Minimal |

**Key Characteristics:**
- No coding guidelines or style preferences by default
- No project context unless explicitly configured
- No extensive tool descriptions
- Requires explicit configuration to match CLI behavior

---

## 2. What Each Interface Sends

### Example: "What is the capital of Norway?"

#### Via Claude CLI

```
System Prompt: [modular, ~269+ base tokens]
├── Base system prompt (~269 tokens)
├── Tool instructions (Write, Read, Edit, Bash, Grep, Glob, etc.)
├── Git safety protocols
├── Code reference guidelines
├── Professional objectivity instructions
├── Security and injection defense rules
├── Environment context (OS, directory, date)
├── CLAUDE.md content (if present) [conditional]
├── MCP tool descriptions (if configured) [conditional]
├── Plan/Explore mode prompts [conditional]
└── Session/conversation context

User Message: "What is the capital of Norway?"
```

#### Via Claude Agent SDK (Default)

```
System Prompt: [minimal]
├── Essential tool instructions (if any tools provided)
└── Basic operational context

User Message: "What is the capital of Norway?"
```

#### Via Agent SDK (with `claude_code` preset)

```typescript
const response = await query({
  prompt: "What is the capital of Norway?",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code"
    }
  }
});
```

```
System Prompt: [modular, matches CLI]
├── Full Claude Code system prompt
├── Tool instructions
├── Coding guidelines
└── Safety rules

// NOTE: Still does NOT include CLAUDE.md unless settingSources is configured
```

---

## 3. Customization Methods

### Claude CLI Customization

| Method | Command | Effect |
|--------|---------|--------|
| **Append to prompt** | `claude -p "..." --append-system-prompt "..."` | Adds instructions while preserving defaults |
| **Replace prompt** | `claude -p "..." --system-prompt "..."` | Completely replaces the system prompt |
| **Project context** | CLAUDE.md file | Automatically loaded, persistent |
| **Output styles** | `/output-style [name]` | Apply predefined response styles |

### Agent SDK Customization

| Method | Configuration | Effect |
|--------|---------------|--------|
| **Custom prompt** | `systemPrompt: "..."` | Replaces default entirely (loses tools) |
| **Preset with append** | `systemPrompt: { type: "preset", preset: "claude_code", append: "..." }` | Preserves CLI functionality + custom instructions |
| **CLAUDE.md loading** | `settingSources: ["project"]` | Loads project-level instructions |
| **Output styles** | `settingSources: ["user"]` or `settingSources: ["project"]` | Loads saved output styles |

### Configuration Comparison Table

| Feature | CLI Default | SDK Default | SDK with Preset |
|---------|-------------|-------------|-----------------|
| Tool instructions | ✅ Full | ❌ Minimal | ✅ Full |
| Coding guidelines | ✅ Yes | ❌ No | ✅ Yes |
| Safety rules | ✅ Yes | ❌ Basic | ✅ Yes |
| CLAUDE.md auto-load | ✅ Yes | ❌ No | ❌ No* |
| Project context | ✅ Automatic | ❌ No | ❌ No* |

*Requires explicit `settingSources: ["project"]` configuration

---

## 4. Output Consistency Guarantees

### Critical Finding: NO Determinism Guaranteed

**The Claude Messages API does not provide a seed parameter for reproducibility.** This is a fundamental architectural limitation.

### Factors Preventing Identical Output

| Factor | Description | Controllable? |
|--------|-------------|---------------|
| **Different system prompts** | CLI vs SDK have different defaults | ✅ Yes (with configuration) |
| **Floating-point arithmetic** | Parallel hardware quirks | ❌ No |
| **MoE routing** | Mixture-of-Experts architecture variations | ❌ No |
| **Batching/scheduling** | Cloud infrastructure differences | ❌ No |
| **Numeric precision** | Inference engine variations | ❌ No |
| **Model snapshots** | Version updates/changes | ❌ No |

### Temperature and Sampling

Even with `temperature=0.0` (greedy decoding):
- Full determinism is **NOT guaranteed**
- Minor variations can still occur due to infrastructure factors
- Known bug: [Claude CLI produces non-deterministic output for identical inputs](https://github.com/anthropics/claude-code/issues/3370)

---

## 5. Achieving Maximum Consistency

To get the **closest possible** identical outputs between SDK and CLI:

### Agent SDK Configuration

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Option 1: Use claude_code preset
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  // Match CLI system prompt as closely as possible
  system: "Your exact system prompt matching CLI",
  messages: [
    { role: "user", content: "What is the capital of Norway?" }
  ],
  // Use greedy decoding for maximum consistency
  temperature: 0
});

// Option 2: With Agent SDK query function
import { query } from "@anthropic-ai/agent-sdk";

for await (const message of query({
  prompt: "What is the capital of Norway?",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code"
    },
    temperature: 0,
    model: "claude-sonnet-4-20250514",
    // Load project context like CLI does
    settingSources: ["project"]
  }
})) {
  // Process response
}
```

### CLI Configuration

```bash
# Match the SDK configuration as closely as possible
claude -p "What is the capital of Norway?" \
  --model claude-sonnet-4-20250514 \
  --temperature 0
```

### Still Not Guaranteed

Even with perfectly matching configurations:
- Output may differ between runs
- Output may differ between SDK and CLI
- No seed parameter exists to force reproducibility

---

## 6. Practical Implications

### When to Use Each Interface

| Use Case | Recommended Interface | Reason |
|----------|----------------------|--------|
| Interactive development | Claude CLI | Full tool suite, project context |
| Programmatic integration | Agent SDK | Fine-grained control, embedding |
| Consistent API responses | Agent SDK + custom prompt | More control over system prompt |
| Batch processing | Agent SDK | Better for automation pipelines |
| One-off tasks | Claude CLI | Faster setup, immediate context |

### Design Recommendations

1. **Don't rely on bit-perfect reproducibility**
   - Build applications robust to minor output variations
   - Use structured outputs and validation

2. **For production pipelines requiring consistency:**
   - Cache results when possible
   - Use structured outputs with JSON schema validation
   - Combine with deterministic logic and validation
   - Consider multiple generations with consensus

3. **For matching CLI behavior in SDK:**
   ```typescript
   systemPrompt: {
     type: "preset",
     preset: "claude_code",
     append: "Your additional instructions"
   },
   settingSources: ["project", "user"]
   ```

---

## 7. System Prompt Token Impact

| Configuration | Architecture | Notes |
|---------------|-------------|-------|
| SDK (minimal) | Minimal default | Only essential tool instructions |
| SDK (claude_code preset) | Modular (~269+ base) | Matches CLI, varies by features |
| CLI (default) | Modular (~269+ base) | Additional context loaded conditionally |
| CLI (with MCP tools) | Modular + MCP | MCP tool descriptions add significant tokens |

**Note:** Claude Code uses a modular architecture with 110+ system prompt strings. The base prompt is ~269 tokens, with individual components ranging from 18 to 2,610 tokens depending on features activated.

**Implication:** The SDK's minimal default gives you more context for your actual task, but at the cost of Claude Code's full capabilities.

---

## 8. Summary Table

| Aspect | Claude CLI | Agent SDK (Default) | Agent SDK (Preset) |
|--------|------------|--------------------|--------------------|
| **System prompt** | Modular (~269+ base) | Minimal | Modular (matches CLI) |
| **Tools included** | 18+ builtin | Only if provided | 18+ builtin |
| **CLAUDE.md auto-load** | Yes | No | No (needs config) |
| **Coding guidelines** | Yes | No | Yes |
| **Safety rules** | Full | Basic | Full |
| **Temperature control** | Yes | Yes | Yes |
| **Determinism guarantee** | No | No | No |
| **Identical outputs?** | N/A | No (vs CLI) | Closer, but no |

---

## 9. Conclusion

**Q: What system prompts accompany the same message in SDK vs CLI?**

The CLI uses a **modular system prompt architecture** with a ~269-token base prompt and 110+ conditionally-loaded components (tool instructions, coding guidelines, safety rules, project context). The SDK uses a **minimal default** with only essential tool instructions, though it can be configured to match CLI behavior using the `claude_code` preset.

**Q: Is there a guarantee of identical output?**

**No.** Even with matching system prompts, identical inputs, and `temperature=0`, there is no guarantee of identical outputs due to:
- Absence of a seed parameter in Claude's API
- Floating-point arithmetic variations
- Infrastructure-level non-determinism
- Model architecture (Mixture-of-Experts) routing variations

**Recommendation:** Design systems to be robust to output variations rather than relying on deterministic behavior. For consistency-critical applications, use structured outputs, caching, and validation layers.

---

## Sources

- [Modifying System Prompts - Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/sdk#modifying-system-prompts)
- [Claude Code CLI Reference](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/cli)
- [Claude Code Headless Mode](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/headless)
- [Claude Code Best Practices - Anthropic Engineering](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Messages API Reference](https://docs.anthropic.com/en/api/messages)
- [GitHub Issue #3370: Non-deterministic output](https://github.com/anthropics/claude-code/issues/3370)
- [Claude Code System Prompts Repository](https://github.com/Piebald-AI/claude-code-system-prompts) - Analysis of modular prompt architecture
- [Why Deterministic Output from LLMs is Nearly Impossible](https://unstract.com/blog/understanding-why-deterministic-output-from-llms-is-nearly-impossible/)

---

*This report was generated by Claude Code using the Opus 4.5 model on February 3, 2026.*


<!-- FILE: reports/claude-global-vs-project-settings.md -->

# Claude Code: Global vs Project-Level Features

A comprehensive comparison of which Claude Code features are global-only (`~/.claude/`) versus which have both global and project-level (`.claude/`) equivalents.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Table of Contents

1. [Overview](#overview)
2. [Global-Only Features](#global-only-features)
3. [Dual-Scope Features](#dual-scope-features)
4. [Settings Precedence](#settings-precedence)
5. [Directory Structure Comparison](#directory-structure-comparison)
6. [Tasks System](#tasks-system)
7. [Agent Teams](#agent-teams)
8. [Design Principles](#design-principles)
9. [Sources](#sources)

---

## Overview

Claude Code uses a **scope hierarchy** where some features exist at both the global (`~/.claude/`) and project (`.claude/`) levels, while others are exclusively global. The design principle: things that are *personal state* or *cross-project coordination* live globally; things that are *team-shareable project config* can live at the project level.

- `~/.claude/` is your **user-level home** (global, all projects)
- `.claude/` inside a repo is your **project-level home** (scoped to that project)

---

## Global-Only Features

These live **only** under `~/.claude/` and cannot be scoped to a project:

| Feature | Location | Purpose |
|---------|----------|---------|
| **Tasks** | `~/.claude/tasks/` | Persistent task lists across sessions and agents |
| **Agent Teams** | `~/.claude/teams/` | Multi-agent coordination configs (experimental, Feb 2026) |
| **Auto Memory** | `~/.claude/projects/<hash>/memory/` | Claude's self-written learnings per project (personal, never shared) |
| **Credentials & OAuth** | System keychain + `~/.claude.json` | API keys, OAuth tokens (never in project files) |
| **Keybindings** | `~/.claude/keybindings.json` | Custom keyboard shortcuts |
| **MCP User Servers** | `~/.claude.json` (`mcpServers` key) | Personal MCP servers across all projects |
| **Preferences/Cache** | `~/.claude.json` | Theme, model, output style, session state |

---

## Dual-Scope Features

These exist at both levels, with **project-level taking precedence** over global:

| Feature | Global (`~/.claude/`) | Project (`.claude/`) | Precedence |
|---------|----------------------|---------------------|------------|
| **CLAUDE.md** | `~/.claude/CLAUDE.md` | `./CLAUDE.md` or `.claude/CLAUDE.md` | Project overrides global |
| **Settings** | `~/.claude/settings.json` | `.claude/settings.json` + `.claude/settings.local.json` | Project > Global |
| **Rules** | `~/.claude/rules/*.md` | `.claude/rules/*.md` | Project overrides |
| **Agents/Subagents** | `~/.claude/agents/*.md` | `.claude/agents/*.md` | Project overrides |
| **Commands** | `~/.claude/commands/*.md` | `.claude/commands/*.md` | Both available |
| **Skills** | `~/.claude/skills/` | `.claude/skills/` | Both available |
| **Hooks** | `~/.claude/hooks/` | `.claude/hooks/` | Both execute |
| **MCP Servers** | `~/.claude.json` (user scope) | `.mcp.json` (project scope) | Three scopes: local > project > user |

---

## Settings Precedence

User-writable settings apply in this override order (highest to lowest):

| Priority | Location | Scope | Version Control | Purpose |
|----------|----------|-------|-----------------|---------|
| 1 | Command line flags | Session | N/A | Single-session overrides |
| 2 | `.claude/settings.local.json` | Project | No (git-ignored) | Personal project-specific |
| 3 | `.claude/settings.json` | Project | Yes (committed) | Team-shared settings |
| 4 | `~/.claude/settings.local.json` | User | N/A | Personal global overrides |
| 5 | `~/.claude/settings.json` | User | N/A | Global personal settings |

Policy layer: `managed-settings.json` is organization-enforced and cannot be overridden by local files.

**Important**: `deny` rules have the highest safety precedence and cannot be overridden by lower-priority allow/ask rules.

---

## Directory Structure Comparison

### Global Scope (`~/.claude/`)

```
~/.claude/
├── settings.json              # User-level settings (all projects)
├── settings.local.json        # Personal overrides
├── CLAUDE.md                  # User memory (all projects)
├── agents/                    # User subagents (available to all projects)
│   └── *.md
├── rules/                     # User-level modular rules
│   └── *.md
├── commands/                  # User-level commands
│   └── *.md
├── skills/                    # User-level skills
│   └── */SKILL.md
├── tasks/                     # GLOBAL-ONLY: Task lists
│   └── {task-list-id}/
├── teams/                     # GLOBAL-ONLY: Agent team configs
│   └── {team-name}/
│       └── config.json
├── projects/                  # GLOBAL-ONLY: Per-project auto-memory
│   └── {project-hash}/
│       └── memory/
│           ├── MEMORY.md
│           └── *.md
├── keybindings.json           # GLOBAL-ONLY: Keyboard shortcuts
└── hooks/                     # User-level hooks
    ├── scripts/
    └── config/

~/.claude.json                 # GLOBAL-ONLY: MCP servers, OAuth, preferences, caches
```

### Project Scope (`.claude/`)

```
.claude/
├── settings.json              # Team-shared settings
├── settings.local.json        # Personal project overrides (git-ignored)
├── CLAUDE.md                  # Project memory (alternative to ./CLAUDE.md)
├── agents/                    # Project subagents
│   └── *.md
├── rules/                     # Project-level modular rules
│   └── *.md
├── commands/                  # Custom slash commands
│   └── *.md
├── skills/                    # Custom skills
│   └── {skill-name}/
│       ├── SKILL.md
│       └── supporting-files/
├── hooks/                     # Project-level hooks
│   ├── scripts/
│   └── config/
└── plugins/                   # Installed plugins

.mcp.json                      # Project-scoped MCP servers (repo root)
```

---

## Tasks System

Introduced in **Claude Code v2.1.16** (January 22, 2026), replacing the deprecated TodoWrite system.

### Storage

Tasks are stored at `~/.claude/tasks/` on the local filesystem (not in a cloud database). This makes task state auditable, version-controllable, and crash-recoverable.

### Tools

| Tool | Purpose |
|------|---------|
| **TaskCreate** | Create a new task with `subject`, `description`, and `activeForm` |
| **TaskGet** | Retrieve full details of a specific task by ID |
| **TaskUpdate** | Change status, set owner, add dependencies, or delete |
| **TaskList** | List all tasks with their current status |

### Task Lifecycle

```
pending  →  in_progress  →  completed
```

### Dependency Management

Tasks can block other tasks via `addBlockedBy`/`addBlocks`, creating dependency graphs that prevent premature execution.

### Multi-Session Collaboration

```bash
CLAUDE_CODE_TASK_LIST_ID=my-project-tasks claude
```

All sessions sharing the same ID see task updates in real-time, enabling parallel workstreams and session resumption.

### Key Differences from Old Todos

| Feature | Old Todos | New Tasks |
|---------|-----------|-----------|
| Scope | Single session | Cross-session, cross-agent |
| Dependencies | None | Full dependency graph |
| Storage | In-memory only | File system (`~/.claude/tasks/`) |
| Persistence | Lost on session end | Survives restarts and crashes |
| Multi-session | Not possible | Via `CLAUDE_CODE_TASK_LIST_ID` |

---

## Agent Teams

Announced **February 5, 2026** as an experimental feature. Agent Teams allow multiple Claude Code sessions to coordinate on shared work.

### Enabling

```json
// In ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Configuration

Team configs live at `~/.claude/teams/{team-name}/` and support modes:

| Mode | Description | Requirements |
|------|-------------|--------------|
| **In-process** (default) | All teammates run inside your terminal | None |
| **Split panes** | Each teammate gets its own pane | tmux or iTerm2 (not VS Code terminal) |

---

## Design Principles

The global-only vs dual-scope split follows a clear pattern:

| Category | Scope | Rationale |
|----------|-------|-----------|
| **Coordination state** (tasks, teams) | Global-only | Needs to persist beyond any single project |
| **Security state** (credentials, OAuth) | Global-only | Prevents accidental commits to version control |
| **Personal learning** (auto-memory) | Global-only | User-specific, not team-shareable |
| **Input preferences** (keybindings) | Global-only | User muscle memory, not project-specific |
| **Configuration** (settings, rules, agents) | Both levels | Teams need to share project-specific behavior |
| **Workflow definitions** (commands, skills) | Both levels | Can be personal or team-shared |

Auto-memory (`~/.claude/projects/<hash>/memory/`) is a notable hybrid: it's *about* a specific project but stored *globally* because it represents personal learning rather than team-shareable configuration.

---

## Sources

- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Orchestrate Teams of Claude Code Sessions](https://code.claude.com/docs/en/agent-teams)
- [What are Tasks in Claude Code - ClaudeLog](https://claudelog.com/faqs/what-are-tasks-in-claude-code/)
- [Claude Code Task Management - ClaudeFast](https://claudefa.st/blog/guide/development/task-management)
- [Claude Code Tasks Update - VentureBeat](https://venturebeat.com/orchestration/claude-codes-tasks-update-lets-agents-work-longer-and-coordinate-across)
- [Where Are Claude Code Global Settings - ClaudeLog](https://claudelog.com/faqs/where-are-claude-code-global-settings/)
- [Claude Opus 4.6 Agent Teams - VentureBeat](https://venturebeat.com/technology/anthropics-claude-opus-4-6-brings-1m-token-context-and-agent-teams-to-take)
- [How to Set Up Claude Code Agent Teams (Full Walkthrough) - r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/comments/1qz8tyy/how_to_set_up_claude_code_agent_teams_full/)
- [Anthropic replaced Claude Code's old 'Todos' with Tasks - r/ClaudeAI](https://www.reddit.com/r/ClaudeAI/comments/1qkjznp/anthropic_replaced_claude_codes_old_todos_with/)


<!-- FILE: reports/claude-in-chrome-v-chrome-devtools-mcp.md -->

# Comprehensive Browser Automation MCP Comparison Report

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Executive Summary

Based on extensive research, I've analyzed the two tools from your screenshots plus a third major contender. Here's my comprehensive breakdown to help you choose the best option for automated testing of your work.

---

## 1. The Three Contenders

### **A. Chrome DevTools MCP** (Your Screenshot #1)
- **Source:** Official Google Chrome team
- **Released:** Public preview September 2025
- **Architecture:** Built on Chrome DevTools Protocol (CDP) + Puppeteer
- **Token Usage:** ~19.0k tokens (9.5% of context)
- **Tools:** 26 specialized tools across 6 categories

### **B. Claude in Chrome** (Your Screenshot #2)
- **Source:** Official Anthropic extension
- **Released:** Beta, rolling out to all paid plans (Pro, Max, Team, Enterprise)
- **Architecture:** Browser extension with computer-use capabilities
- **Token Usage:** ~15.4k tokens (7.7% of context)
- **Tools:** 16 tools including computer use capabilities

### **C. Playwright MCP** (Strong Alternative)
- **Source:** Microsoft (official + community implementations)
- **Architecture:** Accessibility tree-based automation
- **Token Usage:** ~13.7k tokens (6.8% of context)
- **Tools:** 21 tools

---

## 2. Detailed Feature Comparison

| Feature | Chrome DevTools MCP | Claude in Chrome | Playwright MCP |
|---------|---------------------|------------------|----------------|
| **Primary Purpose** | Debugging & Performance | General browser automation | UI Testing & E2E |
| **Browser Support** | Chrome only | Chrome only | Chromium, Firefox, WebKit |
| **Token Efficiency** | 19.0k (9.5%) | 15.4k (7.7%) | 13.7k (6.8%) |
| **Element Selection** | CSS/XPath selectors | Visual + DOM | Accessibility tree (semantic) |
| **Performance Traces** | ✅ Excellent | ❌ No | ⚠️ Limited |
| **Network Inspection** | ✅ Deep analysis | ⚠️ Basic | ⚠️ Basic |
| **Console Logs** | ✅ Full access | ✅ Full access | ⚠️ Limited |
| **Cross-browser** | ❌ No | ❌ No | ✅ Yes |
| **CI/CD Integration** | ✅ Excellent | ❌ Poor (requires login) | ✅ Excellent |
| **Headless Mode** | ✅ Yes | ❌ No | ✅ Yes |
| **Authentication** | Requires setup | Uses your session | Requires setup |
| **Scheduled Tasks** | ❌ No | ✅ Yes | ❌ No |
| **Cost** | Free | Requires paid plan | Free |
| **Local Setup** | Node.js required | Browser extension | Node.js required |

---

## 3. Tool Breakdown

### Chrome DevTools MCP (26 Tools)

```
INPUT AUTOMATION (8):     click, drag, fill, fill_form, handle_dialog,
                          hover, press_key, upload_file

NAVIGATION (6):           close_page, list_pages, navigate_page,
                          new_page, select_page, wait_for

EMULATION (2):            emulate, resize_page

PERFORMANCE (3):          performance_analyze_insight,
                          performance_start_trace, performance_stop_trace

NETWORK (2):              get_network_request, list_network_requests

DEBUGGING (5):            evaluate_script, get_console_message,
                          list_console_messages, take_screenshot,
                          take_snapshot
```

### Claude in Chrome (16 Tools)

```
BROWSER CONTROL:          navigate, read_page, find, computer
                          (click, type, scroll)

FORM INTERACTION:         form_input, javascript_tool

MEDIA:                    upload_image, get_page_text, gif_creator

TAB MANAGEMENT:           tabs_context_mcp, tabs_create_mcp

DEVELOPMENT:              read_console_messages, read_network_requests

UTILITIES:                shortcuts_list, shortcuts_execute,
                          resize_window, update_plan
```

### Playwright MCP (21 Tools)

```
NAVIGATION:               navigate, goBack, goForward, reload

INTERACTION:              click, fill, select, hover, press,
                          drag, uploadFile

ELEMENT QUERIES:          getElement, getElements, waitForSelector

ASSERTIONS:               assertVisible, assertText, assertTitle

PAGE STATE:               screenshot, getAccessibilityTree,
                          evaluateScript

BROWSER MGMT:             newPage, closePage
```

---

## 4. Use Case Analysis for Automated Testing

### **Chrome DevTools MCP is BEST for:**

✅ **Performance Testing**
- Recording performance traces with Core Web Vitals
- Identifying render bottlenecks and layout shifts
- Memory leak detection and CPU profiling

✅ **Deep Debugging**
- Network request inspection (headers, payloads, timing)
- Console error analysis and stack traces
- Real-time DOM inspection

✅ **CI/CD Pipelines**
- Headless execution support
- Stable, script-based automation
- No authentication state dependencies

**Ideal workflow:** "Find why this page is slow" or "Debug this API call"

---

### **Claude in Chrome is BEST for:**

✅ **Manual Testing Assistance**
- Testing while logged into your accounts
- Exploratory testing with visual context
- Recording workflows you can replay

✅ **Quick Verification**
- Design verification (comparing Figma to output)
- Spot-checking new features
- Reading console errors during development

✅ **Recurring Browser Tasks**
- Scheduled automated checks
- Multi-tab workflow management
- Learning from your recorded actions

**Ideal workflow:** "Check if my changes look right" or "Test this form with my login"

---

### **Playwright MCP is BEST for:**

✅ **E2E Test Automation**
- Cross-browser testing (Chrome, Firefox, Safari)
- Generating reusable test scripts
- Page Object Model generation

✅ **Reliable UI Testing**
- Accessibility tree = no flaky selectors
- Deterministic interactions
- Less prone to breaking from UI changes

✅ **CI/CD Integration**
- Headless mode for pipelines
- Generate Playwright test files from natural language
- Integration with test management tools

**Ideal workflow:** "Write E2E tests for this user flow" or "Test this across browsers"

---

## 5. Token Efficiency Analysis

| Tool | Token Usage | % of Context | Efficiency Rating |
|------|-------------|--------------|-------------------|
| Playwright MCP | ~13.7k | 6.8% | ⭐⭐⭐⭐⭐ Best |
| Claude in Chrome | ~15.4k | 7.7% | ⭐⭐⭐⭐ Good |
| Chrome DevTools MCP | ~19.0k | 9.5% | ⭐⭐⭐ Acceptable |

**Impact:** With 200k token context:
- Playwright leaves 186.3k tokens for your work
- Claude in Chrome leaves 184.6k tokens
- Chrome DevTools leaves 181k tokens

The ~5.3k token difference between Playwright and Chrome DevTools could matter for complex sessions with lots of code context.

---

## 6. Security Considerations

### Chrome DevTools MCP
- ✅ Isolated browser profile by default
- ✅ No cloud dependencies
- ✅ Full local control
- ⚠️ Remote debugging port security (use isolated profiles)

### Claude in Chrome
- ⚠️ **23.6% attack success rate** without mitigations (reduced to 11.2% with defenses)
- ⚠️ Uses your actual browser session (cookie exposure risk)
- ⚠️ Blocked from financial/adult/pirated sites
- ⚠️ Still in beta with known vulnerabilities

### Playwright MCP
- ✅ Isolated browser contexts
- ✅ No cloud dependencies
- ✅ Mature security model (Microsoft backing)
- ✅ Can handle authentication safely

---

## 7. Installation Commands

### Chrome DevTools MCP

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

### Claude in Chrome

```
Install from Chrome Web Store (requires Pro/Max/Team/Enterprise plan)
```

### Playwright MCP (Recommended)

```bash
# First, install browsers
npx playwright install

# Then add to Claude Code (user scope = all projects)
claude mcp add playwright -s user -- npx @playwright/mcp@latest
```

---

## 8. Recommendations

### **For Your Automated Testing Workflow:**

#### 🥇 **Primary Tool: Playwright MCP**

**Use for:** Day-to-day E2E testing, cross-browser verification, generating test scripts

**Why:**
- Lowest token usage (more context for your code)
- Cross-browser support (Chrome, Firefox, Safari)
- Accessibility tree approach = more reliable selectors
- Excellent CI/CD integration
- Can generate actual Playwright test files
- Free, no subscription required

#### 🥈 **Secondary Tool: Chrome DevTools MCP**

**Use for:** Performance debugging, network analysis, Core Web Vitals

**Why:**
- Unmatched for performance traces and debugging
- Deep network request inspection
- Official Google tooling with long-term support
- Essential when you need to answer "why is this slow?"

#### 🥉 **Situational: Claude in Chrome**

**Use for:** Quick manual verification while logged in, exploratory testing, design verification

**Why:**
- Good for quick visual checks during development
- Can read your logged-in state
- Useful for "does this look right?" verification
- Skip for CI/CD or serious test automation

---

## 9. Recommended Setup

```bash
# Install both Playwright and Chrome DevTools MCP
npx playwright install
claude mcp add playwright -s user -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -s user -- npx chrome-devtools-mcp@latest
```

### Suggested Workflow

```
1. DEVELOP      → Claude Code (terminal)
2. TEST         → Playwright MCP (E2E, cross-browser)
3. DEBUG        → Chrome DevTools MCP (performance, network)
4. VERIFY       → Claude in Chrome (quick visual checks)
5. CI/CD        → Playwright MCP (headless, automated)
```

---

## 10. Final Verdict

| If You Need... | Use This |
|----------------|----------|
| Cross-browser E2E tests | **Playwright MCP** |
| Performance analysis | **Chrome DevTools MCP** |
| Network debugging | **Chrome DevTools MCP** |
| Quick visual verification | **Claude in Chrome** |
| CI/CD automation | **Playwright MCP** |
| Test script generation | **Playwright MCP** |
| Lowest token usage | **Playwright MCP** |
| Logged-in session testing | **Claude in Chrome** |
| Console log debugging | **Chrome DevTools MCP** |

### **TL;DR Recommendation:**

**Install both Playwright MCP and Chrome DevTools MCP.** Use Playwright as your primary testing tool (it's more token-efficient, cross-browser, and better for E2E). Use Chrome DevTools when you need deep performance analysis or network debugging. Use Claude in Chrome only for quick manual verifications where you need your logged-in session.

---

## Sources

- [Chrome DevTools MCP - GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Anthropic - Piloting Claude in Chrome](https://claude.com/blog/claude-for-chrome)
- [Claude in Chrome Help Center](https://support.claude.com/en/articles/12012173-getting-started-with-claude-in-chrome)
- [Playwright MCP - GitHub](https://github.com/microsoft/playwright-mcp)
- [Simon Willison - Using Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
- [Testomat.io - Playwright MCP Claude Code](https://testomat.io/blog/playwright-mcp-claude-code/)
- [MCP Integration Guide - Scrapeless](https://www.scrapeless.com/en/blog/mcp-integration-guide)
- [Chrome DevTools MCP Guide - Vladimir Siedykh](https://vladimirsiedykh.com/blog/chrome-devtools-mcp-ai-browser-debugging-complete-guide-2025)
- [Addy Osmani - Give your AI eyes](https://addyosmani.com/blog/devtools-mcp/)

---

*This report was generated by Claude Code using the Opus 4.5 model on December 19, 2025.*


<!-- FILE: reports/claude-skills-for-larger-mono-repos.md -->

# Understanding Claude Skills Discovery in Large Monorepos

When working with Claude Code in a monorepo, understanding how skills are discovered and loaded into context is crucial for organizing your project-specific capabilities effectively.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Important Difference from CLAUDE.md

**Skills do NOT have the same loading behavior as CLAUDE.md files.** While CLAUDE.md files walk UP the directory tree (ancestor loading), skills use a different discovery mechanism focused on nested directories within your project.

## How Skills Are Discovered

### 1. Standard Skill Locations

Skills are loaded from these fixed locations based on scope:

| Location | Path | Applies to |
|----------|------|------------|
| Enterprise | Managed settings | All users in organization |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

### 2. Automatic Discovery from Nested Directories

When you work with files in subdirectories, Claude Code automatically discovers skills from nested `.claude/skills/` directories. For example, if you're editing a file in `packages/frontend/`, Claude Code also looks for skills in `packages/frontend/.claude/skills/`.

This supports monorepo setups where packages have their own skills.

## Example Monorepo Structure

Consider a typical monorepo with separate packages:

```
/mymonorepo/
├── .claude/
│   └── skills/
│       └── shared-conventions/SKILL.md    # Project-level skill
├── packages/
│   ├── frontend/
│   │   ├── .claude/
│   │   │   └── skills/
│   │   │       └── react-patterns/SKILL.md  # Frontend-specific skill
│   │   └── src/
│   │       └── App.tsx
│   ├── backend/
│   │   ├── .claude/
│   │   │   └── skills/
│   │   │       └── api-design/SKILL.md      # Backend-specific skill
│   │   └── src/
│   └── shared/
│       ├── .claude/
│       │   └── skills/
│       │       └── utils-patterns/SKILL.md  # Shared utilities skill
│       └── src/
```

## Scenario 1: Just Started Claude at Root (No Files Edited Yet)

When you run Claude Code from `/mymonorepo/` and haven't edited any files yet:

```bash
cd /mymonorepo
claude
# Just started - no files edited yet
```

| Skill | In Context? | Reason |
|-------|-------------|--------|
| `shared-conventions` | **Yes** | Project-level skill in root `.claude/skills/` |
| `react-patterns` | **No** | Not discovered - haven't worked with files in `packages/frontend/` |
| `api-design` | **No** | Not discovered - haven't worked with files in `packages/backend/` |
| `utils-patterns` | **No** | Not discovered - haven't worked with files in `packages/shared/` |

## Scenario 2: After Editing Files in a Package

After you ask Claude to edit `packages/frontend/src/App.tsx`:

| Skill | In Context? | Reason |
|-------|-------------|--------|
| `shared-conventions` | **Yes** | Project-level skill in root `.claude/skills/` |
| `react-patterns` | **Yes** | Discovered when editing files in `packages/frontend/` |
| `api-design` | **No** | Still not discovered - haven't worked with files in `packages/backend/` |
| `utils-patterns` | **No** | Still not discovered - haven't worked with files in `packages/shared/` |

**Key insight**: Nested skills are discovered **on-demand** when you work with files in those directories. They are not preloaded at session start.

## Key Behavior: Description vs Full Content

Skill descriptions are loaded into context so Claude knows what's available, but **full skill content only loads when invoked**. This is an important optimization:

- **Descriptions**: Always in context (within character budget)
- **Full content**: Loaded on-demand when skill is invoked

> Note: Subagents with preloaded skills work differently - the full skill content is injected at startup.

## Priority Order (When Skills Share Names)

When skills share the same name across levels, higher-priority locations win:

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | Enterprise | Organization-wide |
| 2 | Personal (`~/.claude/skills/`) | All your projects |
| 3 (lowest) | Project (`.claude/skills/`) | This project only |

Plugin skills use a `plugin-name:skill-name` namespace, so they cannot conflict with other levels.

## Why This Design Works for Monorepos

- **Package-specific skills stay isolated** - Frontend developers working in `packages/frontend/` get frontend-specific skills without backend skills cluttering context.

- **Automatic discovery reduces configuration** - No need to explicitly register package-level skills; they're discovered when you work in those directories.

- **Context is optimized** - Only skill descriptions load initially, and nested skills are discovered on-demand.

- **Teams can maintain their own skills** - Each package team can define skills specific to their domain without coordinating with other teams.

## Character Budget Considerations

Skill descriptions are loaded into context up to a character budget (default 15,000 characters). In large monorepos with many packages and skills, you may hit this limit.

- Run `/context` to check for warnings about excluded skills
- Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to increase the limit

## Best Practices

1. **Put shared workflows in root `.claude/skills/`** - Repository-wide conventions, commit workflows, and shared patterns.

2. **Put package-specific skills in package `.claude/skills/`** - Framework-specific patterns, component conventions, testing utilities unique to that package.

3. **Use `disable-model-invocation: true` for dangerous skills** - Deployment or destructive skills should require explicit user invocation.

4. **Keep skill descriptions concise** - Descriptions are always in context (up to the character budget), so verbose descriptions waste context space.

5. **Use namespacing in skill names** - Consider prefixing with package names (e.g., `frontend-review`, `backend-deploy`) to avoid confusion.

## Comparison: Skills vs CLAUDE.md Loading

| Behavior | CLAUDE.md | Skills |
|----------|-----------|--------|
| Ancestor loading (UP directory tree) | Yes | No |
| Nested/descendant discovery (DOWN directory tree) | Yes (lazy) | Yes (automatic discovery) |
| Global location | `~/.claude/CLAUDE.md` | `~/.claude/skills/` |
| Project location | `.claude/` or repo root | `.claude/skills/` |
| Content loading | Full content | Description only (full on invocation) |

---

## Sources

- [Claude Code Documentation - Extend Claude with Skills](https://code.claude.com/docs/en/skills)
- [Claude Code Documentation - Automatic Discovery from Nested Directories](https://code.claude.com/docs/en/skills#automatic-discovery-from-nested-directories)


<!-- FILE: reports/claude-spinner-verbs-and-tips.md -->

# Claude Code: The Spinner

The rotating words and tips shown under Claude Code's spinner. Extracted from `~/.local/share/claude/versions/2.1.121`.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Spinner words

| # | Verb | # | Verb | # | Verb | # | Verb |
|---:|---|---:|---|---:|---|---:|---|
| 1 | Accomplishing | 48 | Discombobulating | 95 | Levitating | 142 | Sketching |
| 2 | Actioning | 49 | Doing | 96 | Lollygagging | 143 | Slithering |
| 3 | Actualizing | 50 | Doodling | 97 | Manifesting | 144 | Smooshing |
| 4 | Architecting | 51 | Drizzling | 98 | Marinating | 145 | Sock-hopping |
| 5 | Baking | 52 | Ebbing | 99 | Meandering | 146 | Spelunking |
| 6 | Beaming | 53 | Effecting | 100 | Metamorphosing | 147 | Spinning |
| 7 | Beboppin' | 54 | Elucidating | 101 | Misting | 148 | Sprouting |
| 8 | Befuddling | 55 | Embellishing | 102 | Moonwalking | 149 | Stewing |
| 9 | Billowing | 56 | Enchanting | 103 | Moseying | 150 | Sublimating |
| 10 | Blanching | 57 | Envisioning | 104 | Mulling | 151 | Swirling |
| 11 | Bloviating | 58 | Evaporating | 105 | Mustering | 152 | Swooping |
| 12 | Boogieing | 59 | Fermenting | 106 | Musing | 153 | Symbioting |
| 13 | Boondoggling | 60 | Fiddle-faddling | 107 | Nebulizing | 154 | Synthesizing |
| 14 | Booping | 61 | Finagling | 108 | Nesting | 155 | Tempering |
| 15 | Bootstrapping | 62 | Flambéing | 109 | Newspapering | 156 | Thinking |
| 16 | Brewing | 63 | Flibbertigibbeting | 110 | Noodling | 157 | Thundering |
| 17 | Bunning | 64 | Flowing | 111 | Nucleating | 158 | Tinkering |
| 18 | Burrowing | 65 | Flummoxing | 112 | Orbiting | 159 | Tomfoolering |
| 19 | Calculating | 66 | Fluttering | 113 | Orchestrating | 160 | Topsy-turvying |
| 20 | Canoodling | 67 | Forging | 114 | Osmosing | 161 | Transfiguring |
| 21 | Caramelizing | 68 | Forming | 115 | Perambulating | 162 | Transmuting |
| 22 | Cascading | 69 | Frolicking | 116 | Percolating | 163 | Twisting |
| 23 | Catapulting | 70 | Frosting | 117 | Perusing | 164 | Undulating |
| 24 | Cerebrating | 71 | Gallivanting | 118 | Philosophising | 165 | Unfurling |
| 25 | Channeling | 72 | Galloping | 119 | Photosynthesizing | 166 | Unravelling |
| 26 | Channelling | 73 | Garnishing | 120 | Pollinating | 167 | Vibing |
| 27 | Choreographing | 74 | Generating | 121 | Pondering | 168 | Waddling |
| 28 | Churning | 75 | Gesticulating | 122 | Pontificating | 169 | Wandering |
| 29 | Clauding | 76 | Germinating | 123 | Pouncing | 170 | Warping |
| 30 | Coalescing | 77 | Gitifying | 124 | Precipitating | 171 | Whatchamacalliting |
| 31 | Cogitating | 78 | Grooving | 125 | Prestidigitating | 172 | Whirlpooling |
| 32 | Combobulating | 79 | Gusting | 126 | Processing | 173 | Whirring |
| 33 | Composing | 80 | Harmonizing | 127 | Proofing | 174 | Whisking |
| 34 | Computing | 81 | Hashing | 128 | Propagating | 175 | Wibbling |
| 35 | Concocting | 82 | Hatching | 129 | Puttering | 176 | Working |
| 36 | Considering | 83 | Herding | 130 | Puzzling | 177 | Wrangling |
| 37 | Contemplating | 84 | Honking | 131 | Quantumizing | 178 | Zesting |
| 38 | Cooking | 85 | Hullaballooing | 132 | Razzle-dazzling | 179 | Zigzagging |
| 39 | Crafting | 86 | Hyperspacing | 133 | Razzmatazzing | | |
| 40 | Creating | 87 | Ideating | 134 | Recombobulating | | |
| 41 | Crunching | 88 | Imagining | 135 | Reticulating | | |
| 42 | Crystallizing | 89 | Improvising | 136 | Roosting | | |
| 43 | Cultivating | 90 | Incubating | 137 | Ruminating | | |
| 44 | Deciphering | 91 | Inferring | 138 | Sautéing | | |
| 45 | Deliberating | 92 | Infusing | 139 | Scampering | | |
| 46 | Determining | 93 | Ionizing | 140 | Schlepping | | |
| 47 | Dilly-dallying | 94 | Jitterbugging | 141 | Scurrying | | |

## Tips

| ID | Text |
|---|---|
| new-user-warmup | Start with small features or bug fixes, tell Claude to propose a plan, and verify its suggested edits |
| default-permission-mode-config | Use /config to change your default permission mode (including Plan Mode) |
| git-worktrees | Use git worktrees to run multiple Claude sessions in parallel. |
| color-when-multi-clauding | Running multiple Claude sessions? Use /color and /rename to tell them apart at a glance. |
| memory-command | Use /memory to view and manage Claude memory |
| theme-command | Use /theme to change the color theme |
| colorterm-truecolor | Try setting environment variable COLORTERM=truecolor for richer colors |
| powershell-tool-env | Set CLAUDE_CODE_USE_POWERSHELL_TOOL=1 to enable the PowerShell tool (preview) |
| status-line | Use /statusline to set up a custom status line that will display beneath the input box |
| prompt-queue | Hit Enter to queue up additional messages while Claude is working. |
| enter-to-steer-in-relatime | Send messages to Claude while it works to steer Claude in real-time |
| todo-list | Ask Claude to create a todo list when working on complex tasks to track progress and remain on track |
| ide-upsell-external-terminal | Connect Claude to your IDE · /ide |
| install-github-app | Run /install-github-app to tag @claude right from your Github issues and PRs |
| install-slack-app | Run /install-slack-app to use Claude in Slack |
| permissions | Use /permissions to pre-approve and pre-deny bash, edit, and MCP tools |
| drag-and-drop-images | Did you know you can drag and drop image files into your terminal? |
| paste-images-mac | Paste images into Claude Code using control+v (not cmd+v!) |
| double-esc | Double-tap esc to rewind the conversation to a previous point in time |
| double-esc-code-restore | Double-tap esc to rewind the code and/or conversation to a previous point in time |
| continue | Run claude --continue or claude --resume to resume a conversation |
| rename-conversation | Name your conversations with /rename to find them easily in /resume later |
| custom-commands | Create skills by adding .md files to .claude/skills/ in your project or ~/.claude/skills/ for skills that work in any project |
| custom-agents | Use /agents to optimize specific tasks. Eg. Software Architect, Code Writer, Code Reviewer |
| agent-flag | Use --agent <agent_name> to directly start a conversation with a subagent |
| desktop-app | Run Claude Code locally or remotely using the Claude desktop app: clau.de/desktop |
| web-app | Run tasks in the cloud while you keep coding locally · clau.de/web |
| voice-mode | Use /voice to enable push-to-talk dictation |
| no-flicker | Try flicker-free rendering, now with mouse support · /tui fullscreen |
| team-artifacts | Surfaces team artifact suggestions from team-discovery state |
| plan-mode-for-complex-tasks | Use Plan Mode to prepare for a complex request before making changes. Press &lt;cycle-mode key&gt; |
| terminal-setup | Run /terminal-setup to enable convenient terminal integration like Option+Enter for new line and more |
| shift-enter | Press Option+Enter (Apple Terminal) or Shift+Enter to send a multi-line message |
| shift-enter-setup | Run /terminal-setup to enable Option+Enter (Apple Terminal) or Shift+Enter for new lines |
| vscode-command-install | Open the Command Palette (Cmd+Shift+P) and run "Shell Command: Install '&lt;editor&gt;' command in PATH" to enable IDE integration |
| shift-tab | Hit &lt;cycle-mode key&gt; to switch chat modes |
| image-paste | Use &lt;image-paste key&gt; to paste images |
| desktop-shortcut | Continue your session in Claude Code Desktop with &lt;suggested shortcut&gt; |
| remote-control | Pair this session to your phone via remote control |
| push-notif | Get pinged on your phone when long tasks finish — enable push notifications in &lt;settings menu&gt; |
| opusplan-mode-reminder | Your default model setting is Opus Plan Mode. Press &lt;cycle-mode key&gt; |
| frontend-design-plugin | Working with HTML/CSS? Install the frontend-design plugin |


<!-- FILE: reports/claude-usage-and-rate-limits.md -->

# Claude Code: Usage, Rate Limits & Extra Usage

Understanding how usage limits work in Claude Code and how to keep working when you hit them.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Overview

Claude Code on subscription plans (Pro, Max 5x, Max 20x) has usage limits that reset on a rolling window. Three built-in slash commands help you monitor and manage usage:

| Command | Description | Available To |
|---------|-------------|--------------|
| `/usage` | Check plan limits and rate limit status | Pro, Max 5x, Max 20x |
| `/extra-usage` | Configure pay-as-you-go overflow when limits are hit | Pro, Max 5x, Max 20x |
| `/cost` | Show token usage and spending for the current session | API key users |

---

## `/usage` — Check Your Limits

Shows your current plan's usage limits and rate limit status. Useful for checking how much capacity you have left before hitting a limit.

---

## `/extra-usage` — Keep Working Past Limits

The `/extra-usage` command configures **pay-as-you-go overflow billing** so Claude Code continues working seamlessly when you hit your plan's rate limits, instead of blocking you.

### How It Works

1. You hit your plan's rate limit (limits reset every 5 hours)
2. If extra usage is enabled with available funds, Claude Code continues without interruption
3. Overflow tokens are billed at **standard API rates**, separate from your subscription fee

### Setting It Up

The `/extra-usage` command in the CLI will guide you through configuration. You can also configure it on the web at **Settings > Usage** on claude.ai:

1. Enable extra usage
2. Add a payment method
3. Set a **monthly spending cap** (or choose unlimited)
4. Optionally add **prepaid funds** with auto-reload when balance drops below a threshold

### Key Details

| Detail | Value |
|--------|-------|
| Daily redemption limit | $2,000/day |
| Billing | Separate from subscription, at standard API rates |
| Limit reset window | Every 5 hours |

### Known Issue

As of February 2026, the `/extra-usage` CLI command is [undocumented](https://github.com/anthropics/claude-code/issues/12396) and may open a sign-in window without clear configuration options. Configuring through the **claude.ai web interface** is the more reliable path for now.

---

## `/cost` — Session Spending (API Users)

For users authenticating with an API key (not a subscription plan), `/cost` shows:

- Total cost for the current session
- API duration and wall time
- Token usage breakdown
- Code changes made

This command is not relevant for Pro/Max subscription users.

---

## Fast Mode and Extra Usage

Fast mode (`/fast`) uses Claude Opus 4.6 with faster output. It has a special billing relationship with extra usage:

- Fast mode usage is **always billed to extra usage** from the first token
- This applies even if you have remaining usage on your subscription plan
- Fast mode does not consume your plan's included rate limits

This means you need extra usage enabled and funded to use `/fast`.

---

## CLI Startup Flags

Two startup flags relate to usage budgets (API key users only, print mode):

| Flag | Description |
|------|-------------|
| `--max-budget-usd <AMOUNT>` | Maximum dollar amount for API calls before stopping |
| `--max-turns <NUMBER>` | Limit number of agentic turns |

See [CLI Startup Flags Reference](claude-cli-startup-flags.md) for the full list.

---

## Sources

- [Extra usage for paid Claude plans — Claude Help Center](https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans)
- [Using Claude Code with your Pro or Max plan — Claude Help Center](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [/extra-usage slash command is undocumented — GitHub Issue #12396](https://github.com/anthropics/claude-code/issues/12396)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)


<!-- FILE: reports/learning-journey-weather-reporter-redesign.md -->

# Learning Journey — Weather Reporter Redesign Plan

← Back to [README](../README.md)

## Overview

Redesign all slides from slide 7 onward around a single running example: the **weather reporter agent**. The narrative arc matches the TOC visible order (Agents → Skills → Context → CLAUDE.md → Commands+Workflow), letting the audience meet the weather reporter first, then understand what they know, how they think, what rules they follow, and finally how to trigger them with one command.

---

## 1. Current → New Section Map

| Current section | Current slides | Action | New position |
|---|---|---|---|
| Topic 1: Context | 7-11 (section at 7) | Move to Topic 3 | slides 17-21 |
| Topic 2: CLAUDE.md | 12-17 (section at 12) | Move to Topic 4 | slides 22-27 |
| Topic 3: Agents | 18-23 (section at 18) | Move to Topic 1 | slides 7-12 |
| Topic 4: Skills | 24-29 (section at 24) | Move to Topic 2 | slides 13-18 |
| Topic 5: Commands | 30-32 (section at 30) | Merge with Workflow into Topic 5 | slides 28-32 |
| Topic 6: Workflow | 33-36 (section at 33) | Merged into Commands section | (no separate section slide) |
| Closing slide | 37 | Keep, update subtitle | slide 33 |

**New total: 33 slides** (same as current 37 minus the Workflow section slide and 3 Workflow content slides that merge into the Commands section, which grows by those 3 slides).

Wait — let me recount:

Current: slides 7-37 = 31 slides.
- Agents section: 6 slides (18-23) → becomes Topic 1 (7-12)
- Skills section: 6 slides (24-29) → becomes Topic 2 (13-18)
- Context section: 5 slides (7-11) → becomes Topic 3 (19-23)
- CLAUDE.md section: 6 slides (12-17) → becomes Topic 4 (24-29)
- Commands+Workflow merged: 3 + 1 section + 4 content = Commands (3) + Workflow (1 section + 3 content) = 7 slides → becomes Topic 5 (30-36)
- Closing: 1 slide (37)

**New total: 37 slides.** (No slides are dropped; the Workflow section slide becomes part of the merged Commands+Workflow section — we keep it as a sub-section or drop its `data-level` to avoid a second section divider.)

**Decision**: Keep all 37 slides. Drop `data-level` on the old Workflow section divider (slide 33) so it's treated as a content slide, not a section divider. Commands section covers 30-36. The Workflow section divider becomes a visual "chapter header" inside the Commands section.

Actually, simpler: keep the Workflow section divider as a content slide with no `data-level`. The journey bar stays at `commands` level. The section number text changes from "Topic 6" to just a sub-heading.

---

## 2. New LEVELS Map (no change to keys or colors)

The new section order is: **Agents → Skills → Context → CLAUDE.md → Commands**. The `workflow` level key is retired from `data-level` use (section divider loses `data-level`). The `LEVELS` map still carries `workflow` for the journey-bar history display, but no slide triggers it.

**Revised approach**: Drop `workflow` level entirely from the LEVELS map since no slide carries `data-level="workflow"`. The journey bar tops out at `commands` (83%). That's fine — the Workflow section is presented as the climax *inside* the Commands section, not a separate topic.

Actually the journey bar filling to 83% rather than 100% for a closing section is unsatisfying. Better plan: **merge Commands+Workflow into a single section called "Commands & Workflow"** with `data-level="commands"`. Keep `workflow` level in LEVELS at 100% and assign `data-level="workflow"` to the *old* workflow section-divider slide — it becomes a visual transition inside the Commands section. This way the bar fills to 100% at the workflow slides.

**Final decision**: Keep both `commands` (83%) and `workflow` (100%) in LEVELS. Assign `data-level="commands"` to the Commands section divider and `data-level="workflow"` to the Workflow sub-section slide. Journey ticks stay as-is. This matches the current structure exactly — just the content slides reorder.

---

## 3. Slide-by-Slide Content Outline

### Slides 1-6 (unchanged)

Slides 1 (title), 2 (Boris GIF), 3 (Vibe→Agentic), 4 (What is Vibe Coding), 5 (Good vs Bad Prompts), 6 (TOC — update goToSlide targets only).

**TOC updates on slide 6:**
- Agents row: `goToSlide(7)` (was 18)
- Skills row: `goToSlide(13)` (was 24)
- Context row: `goToSlide(19)` (was 7)
- CLAUDE.md row: `goToSlide(25)` (was 12)
- Commands row: `goToSlide(30)` (was 30 — no change)

---

### Section 1: Agents (slides 7-12) — "The Person"

**Slide 7** — Section divider (`data-level="agents"`, Topic 1)
- Title: "Agents — The Weather Reporter"
- Desc: "An agent is Claude playing a specific role. Meet the weather reporter — a specialist hired to fetch and report weather data for Dubai."

**Slide 8** — "The Restaurant Kitchen" (current slide 19)
- Content: same analogy (plain prompting = shouting in a random kitchen; agent = specific specialist)
- Update the agent example to use "weather reporter" framing throughout
- Keep the two-col card comparing plain prompting vs weather-agent

**Slide 9** — "Prompting vs. Agent — Side by Side" (current slide 20)
- Keep table intact. Already uses weather example well.

**Slide 10** — "Agents Get Their Own Brain" (current slide 21)
- Keep tip from Thariq. Tie it to: "the weather reporter works in their own brain — all that web fetching stays out of yours."

**Slide 11** — "How to Create Your Own Agent" (current slide 22)
- Keep `/agents` how-to pattern
- Update code-block to show real `weather-agent.md` path

**Slide 12** — "Agent Config Fields" (current slide 23)
- Keep field-row table. Add a callout box showing the `skills: [weather-fetcher]` field in context.

---

### Section 2: Skills (slides 13-18) — "What the Reporter Knows"

**Slide 13** — Section divider (`data-level="skills"`, Topic 2)
- Title: "Skills — What the Weather Reporter Knows"
- Desc: "Skills are the specific things the reporter has been trained to do. Our reporter has two: fetch the data, and render it as a card."

**Slide 14** — "The Training Manual" (current slide 25)
- Reframe: the weather reporter has two skills: weather-fetcher (go get the temperature) and weather-svg-creator (create the visual card).
- Replace "Shayan" example with the weather reporter's two skills.

**Slide 15** — "When to Turn Something Into a Skill" (current slide 26)
- Keep Boris tip. Add weather-fetcher and weather-svg-creator as two of the examples.

**Slide 16** — "Why Separate Agents and Skills?" (current slide 27)
- Keep two-col. Update to emphasize: weather-agent = the person, weather-fetcher = their training.

**Slide 17** — "How to Create Your Own Skill" (current slide 28)
- Keep. The code-block already shows the real `weather-fetcher` SKILL.md content — perfect.

**Slide 18** — "Skill Config Fields" (current slide 29)
- Keep. Add note: `user-invocable: false` is set on weather-fetcher because it's agent-only.

---

### Section 3: Context (slides 19-23) — "The Reporter's Brain"

**Slide 19** — Section divider (`data-level="context"`, Topic 3)
- Title: "Context — The Reporter's Brain"
- Desc: "Now that you've met the reporter and know their skills, let's understand what they can actually hold in mind at once."

**Slide 20** — "Claude's Brain" (current slide 8)
- Keep. Add one sentence tying to weather reporter: "When the weather-agent is dispatched, it gets its own fresh brain — and weather-fetcher is pinned into it at startup."
- Keep both diagrams (context-window.jpeg stays here).

**Slide 21** — "What Loads at Session Start" (current slide 9)
- Keep. Tie to weather reporter: "At startup, Claude knows *about* weather-fetcher (description only). When the command runs, the full skill content is loaded into the agent's brain."
- Keep context.jpg here.

**Slide 22** — "Keep the Brain Clear" (current slide 10)
- Keep branching-point table.

**Slide 23** — "How to Manage Your Context" (current slide 11)
- Keep `/context`, `/compact`, `/clear` how-to.

---

### Section 4: CLAUDE.md (slides 24-29) — "The Pocket Rulebook"

**Slide 24** — Section divider (`data-level="claude-md"`, Topic 4)
- Title: "CLAUDE.md — The Reporter's Pocket Rulebook"
- Desc: "The reporter consults this at the start of every shift — even though their brain resets overnight."

**Slide 25** — "The Employee Handbook" (current slide 13)
- Keep. Update to weather-reporter framing: CLAUDE.md is the rulebook the reporter reads before going on air — "always report in Celsius unless asked, always cite the source."

**Slide 26** — "How to Create Your CLAUDE.md" (current slide 14)
- Keep `/init` how-to.

**Slide 27** — "Grow CLAUDE.md With Every Mistake" (current slide 15)
- Keep Boris tip.

**Slide 28** — "What Goes in CLAUDE.md" (current slide 16)
- Keep code-block. Weather reporter touch: add a comment showing weather-specific rules.

**Slide 29** — "How CLAUDE.md Loads" (current slide 17)
- Keep.

---

### Section 5: Commands + Workflow (slides 30-36) — "The Trigger"

**Slide 30** — Section divider (`data-level="commands"`, Topic 5)
- Title: "Commands — The Trigger"
- Desc: "One word kicks off the whole chain. `/weather-orchestrator` → agent → skill → SVG card."

**Slide 31** — "Commands — The Entry Point" (current slide 31)
- Keep. Good intro. Already references weather-orchestrator.

**Slide 32** — "How to Create Your Own Command" (current slide 32)
- Keep. Code-block already shows weather-orchestrator.md.

**Slide 33** — Workflow sub-section (was slide 33, `data-level="workflow"`)
- Change section-number text from "Topic 6" to "Putting It All Together"
- Keep `data-level="workflow"` so bar fills to 100%.
- Update title to: "Workflow — All Five Pieces Together"
- Desc: "Watch the weather reporter example run from one keystroke to SVG card output."

**Slide 34** — "Command → Agent → Skill" (current slide 34)
- Keep code-block flow diagram. It's already perfect.

**Slide 35** — "Two Ways Skills Are Used" (current slide 35)
- Keep two-col comparing preloaded vs direct invocation.

**Slide 36** — "How to Wire Your Own Workflow" (current slide 36)
- Keep. Already uses weather workflow as the example.

**Slide 37** — Closing (current slide 37)
- Keep. Update subtitle to: "Five concepts, one running example"
- Update body text to reference the weather reporter arc.

---

## 4. Asset Reuse Inventory

| Asset | Current location | New location | Action |
|---|---|---|---|
| `context-window.jpeg` | Slide 8 (Claude's Brain) | Slide 20 (same content, renumbered) | Survives — no change needed |
| `context.jpg` | Slide 9 (What Loads at Session Start) | Slide 21 (same content, renumbered) | Survives — no change needed |
| `../../!/claude-jumping.svg` | Slides 1, header | Unchanged | No action |
| `../../!/root/boris-slider.gif` | Slide 2 | Unchanged | No action |

Both context diagrams are preserved exactly where they are — the slides that contain them simply get renumbered (8→20, 9→21).

---

## 5. Bookkeeping Impact

### New section-divider positions and `data-level` assignments

| Slide | Topic | `data-level` |
|---|---|---|
| 7 | Agents | `agents` |
| 13 | Skills | `skills` |
| 19 | Context | `context` |
| 25 | CLAUDE.md | `claude-md` |
| 30 | Commands | `commands` |
| 33 | Workflow sub-section | `workflow` |

### TOC `goToSlide` targets on slide 6

| Row | Topic | Old target | New target |
|---|---|---|---|
| Row 1 | Agents | 18 | 7 |
| Row 2 | Skills | 24 | 13 |
| Row 3 | Context | 7 | 19 |
| Row 4 | CLAUDE.md | 12 | 25 |
| Row 5 | Commands | 30 | 30 |

### Journey ticks (no change)

The journey tick rail is already ordered top→bottom as: Workflow, Commands, Skills, Agents, CLAUDE.md, Context. This is the *reverse* of the arc order (top = highest level = last achieved). No change needed.

### LEVELS map (no change)

All 6 level keys (`context`, `claude-md`, `agents`, `skills`, `commands`, `workflow`) remain. No keys added or removed.

---

## 6. Implementation Approach

The HTML is one large file. The slides are in the wrong order for the new arc. The cleanest implementation is to:

1. Cut the slide divs and paste them in new order (7-12 = old 18-23, 13-18 = old 24-29, 19-23 = old 7-11, 24-29 = old 12-17, 30-37 unchanged).
2. Re-number all `data-slide` attributes sequentially.
3. Update the section-slide `data-level` attributes.
4. Update the section-number text and h1 on section dividers.
5. Update TOC `goToSlide` targets on slide 6.
6. Update the Workflow section-slide (old 33) section-number text.
7. Make targeted content edits to weather-reporter framing where called for.

Total slide count: **37** (unchanged).

---

## 7. Ambiguities — None Load-Bearing

All ambiguities have been resolved above. Proceeding directly to implementation.


<!-- FILE: reports/llm-day-to-day-degradation.md -->

# LLM Day-to-Day Degradation: Myth vs Reality

Can a deployed LLM's performance change day-to-day even though the model weights are frozen? A deep-dive into proven causes, infrastructure bugs, and psychological factors.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

<table width="100%">
<tr>
<td width="50%"><a href="https://x.com/nicksdot/status/2029520949176049704"><img src="assets/llm-degradation.png" alt="Twitter users reporting day-to-day Claude quality degradation" width="100%" /></a></td>
<td width="50%"><a href="https://x.com/levelsio/status/2029369159893569680"><img src="assets/llm-degradation-2.png" alt="Twitter users reporting day-to-day Claude quality degradation" width="100%" /></a></td>
</tr>
</table>

---
---

# 🔥 Claude Code Ops 4.6 Analysis. High Reasoning

When Anthropic launches a model like Opus 4.6, the **model weights** — billions of learned parameters — are frozen. Training is enormously expensive (millions of dollars, weeks of compute). Nobody is retraining the model overnight.

But weights are only one layer of a much larger system. Research reveals at least **7 distinct mechanisms** that can cause real or perceived quality changes, even when model weights are frozen.

| Question | Answer |
|----------|--------|
| Do model weights change after launch? | **No** — confirmed by all providers |
| Can the model behave differently day-to-day? | **Yes** — proven with ±8-14% variance |
| Is it intentional "nerfing"? | **No** — no evidence of deliberate degradation |
| Are infrastructure bugs real? | **Yes** — Anthropic confirmed 3 bugs affecting up to 16% of requests |
| Is some of it psychological? | **Yes** — confirmation bias and honeymoon effects are real |
| Can system prompts/post-training change? | **Yes** — documented across providers |
| Should users trust their perception? | **Partially** — real causes exist, but perception amplifies them |

---

## The Full Inference Stack

The model weights are frozen, but **nine layers above them** can independently affect what you experience:

```
┌──────────────────────────────────────────────┐
│  YOUR SESSION CONTEXT                        │  ← Degrades within session
│  (accumulated errors, long conversations)    │
├──────────────────────────────────────────────┤
│  SYSTEM PROMPT                               │  ← Updated regularly
│  (safety rules, behavior instructions)       │
├──────────────────────────────────────────────┤
│  POST-TRAINING (RLHF / Fine-tuning)         │  ← Can be updated quietly
│  (instruction following, safety alignment)   │
├──────────────────────────────────────────────┤
│  SAMPLING PARAMETERS                         │  ← Can be tuned server-side
│  (temperature, top-p, top-k)                 │
├──────────────────────────────────────────────┤
│  SPECULATIVE DECODING                        │  ← Draft model quality varies
│  (draft model predictions + verification)    │
├──────────────────────────────────────────────┤
│  MoE ROUTING / BATCH COMPOSITION             │  ← ±8-14% variance proven
│  (which experts activate per request)        │
├──────────────────────────────────────────────┤
│  HARDWARE ROUTING                            │  ← TPU vs GPU vs Trainium
│  (which cluster serves your request)         │
├──────────────────────────────────────────────┤
│  QUANTIZATION LEVEL                          │  ← May vary under load
│  (FP16 vs INT8 vs INT4 precision)            │
├──────────────────────────────────────────────┤
│  COMPILER & RUNTIME                          │  ← XLA bugs proven real
│  (XLA:TPU, CUDA, hardware-specific code)     │
├──────────────────────────────────────────────┤
│  MODEL WEIGHTS (FROZEN)                      │  ← These DON'T change
│  (billions of learned parameters)            │
└──────────────────────────────────────────────┘
```

The key mental model: **frozen weights ≠ frozen behavior**. This is like saying "same engine = same driving experience" while ignoring the tires, road conditions, fuel quality, and driver fatigue.

---

## Proven Causes: Infrastructure Bugs

### Anthropic's September 2025 Postmortem

In September 2025, Anthropic published a detailed postmortem revealing **three separate infrastructure bugs** that degraded Claude's quality between August and September 2025. Their official statement:

> "We never reduce model quality due to demand, time of day, or server load. The problems our users reported were due to infrastructure bugs alone."

### Bug #1 — Context Window Routing Error

Sonnet 4 requests were accidentally routed to servers configured for 1M token context windows instead of standard servers.

- **Timeline**: Introduced August 5, worsened August 29 after a load balancing change
- **Peak impact**: 16% of Sonnet 4 requests affected at worst hour (August 31)
- **User impact**: ~30% of Claude Code users had at least one degraded message
- **Insidious detail**: Routing was "sticky" — once you hit a bad server, subsequent requests kept going there
- **Fixed**: September 4–18 (rolled out across platforms)

### Bug #2 — TPU Output Corruption

A misconfiguration on TPU servers caused errors during token generation, assigning high probability to tokens that should rarely appear.

- **Symptoms**: Thai or Chinese characters appearing mid-English response, obvious code syntax errors
- **Affected**: Opus 4.1 and Opus 4 (August 25–28), Sonnet 4 (August 25–September 2)
- **Scope**: Only Claude API; third-party platforms unaffected
- **Fixed**: Rolled back September 2

### Bug #3 — XLA:TPU Compiler Miscompilation (the nastiest)

A code change to fix precision issues accidentally exposed a **latent compiler bug** in Google's XLA:TPU.

- **Root cause**: The approximate top-k operation (used to pick the most likely next tokens) "sometimes returned completely wrong results, but only for certain batch sizes and model configurations"
- **Why it was hard to find**: It changed behavior depending on what operations ran before or after it, and whether debugging tools were enabled
- **Hidden for months**: A previous workaround from December 2024 had been accidentally masking this deeper bug
- **Affected**: Haiku 3.5 confirmed; subset of Sonnet 4 and Opus 3 suspected
- **Resolution**: Switched from approximate to exact top-k; accepted "minor efficiency impact" because "Model quality is non-negotiable"

### Why Detection Was Difficult

Anthropic's own automated evaluations didn't catch the degradation users reported, "in part because Claude often recovers well from isolated mistakes." Each bug produced different symptoms on different platforms at different rates, creating "a confusing mix of reports that didn't point to any single cause."

Key context: Claude runs on **three different hardware platforms** (AWS Trainium, NVIDIA GPUs, Google TPUs), each with different failure modes, compilers, and precision behaviors. Your request might hit different hardware on different days.

---

## Proven Causes: MoE Routing Variance

Modern large models often use a **Mixture-of-Experts (MoE)** architecture, where only a subset of the model's parameters ("experts") activate for each input. A learned router decides which experts to use.

Scale AI's research revealed a critical finding:

> "The combination of Sparse MoE and batched inference creates unpredictable results because the composition of a batch can determine which expert your query gets routed to, and the mix of queries from other users in the same batch is not deterministic."

### Measured Day-to-Day Variance Across Providers

| Provider | Day-to-Day Score Variance |
|----------|--------------------------|
| OpenAI (GPT-4 variants) | ±10–12% |
| Anthropic (Claude variants) | ±8–11% |
| Google (Gemini variants) | ±9–14% |

Concrete example: the same model scored **77% on jailbreak resistance one day and 63% the next**. Same model, same weights, same test — 14 percentage points of swing from infrastructure alone.

This means even with zero bugs and zero changes, the same model can produce noticeably different quality outputs on different days purely due to how requests are batched and routed. An A/B test cannot reliably detect a 5% quality signal when the day-to-day noise is 10–15%.

---

## Proven Causes: System Prompt & Post-Training Updates

### System Prompt Changes

The model weights don't change, but the **system prompt** wrapping those weights can be updated at any time. Analysis of Claude's system prompt evolution shows dozens of iterations, with "hot-fixes" — short instructions added to patch undesired behavior — being added and removed regularly.

Claude 3.7's system prompt contained multiple hot-fix instructions targeting common LLM "gotchas." Claude 4.0's system prompt removed all of them, with the behaviors addressed during post-training through reinforcement learning instead.

### The Post-Training Theory

The most plausible theory for unexplained quality shifts: companies can update **fine-tuning and RLHF** (reinforcement learning from human feedback) without changing the base model weights. This would technically make it truthful to say "the model hasn't changed" while still altering behavior through updated safety guardrails and instruction-following adjustments.

---

## Proven Causes: Silent Model Swaps

OpenAI has been documented multiple times silently changing which model users interact with:

- Removing the model picker overnight, forcing users from GPT-4o to GPT-5
- Making GPT-4o a hidden "legacy model" requiring a manual toggle in settings, with no in-app notification
- An "autoswitcher" bug routing users to wrong models
- Plus subscribers reported models switching to a "restricted version" without consent

Sam Altman acknowledged the rollout was "a little more bumpy than we hoped for." Reddit threads received thousands of upvotes calling the new model a "disaster" and a "downgrade."

This demonstrates that model swaps **do happen** in the industry — sometimes intentionally (product decisions) and sometimes accidentally (routing bugs).

---

## Contributing Factors

### Quantization Under Load

To serve millions of users cost-effectively, companies may serve **quantized** versions of models — reducing precision from FP16 to INT8 or INT4. This can reduce memory usage by 2–4x and accelerate inference, but introduces subtle quality loss. Whether providers dynamically switch quantization levels under load is debated, but the technical capability exists and is well-documented in serving frameworks like vLLM and TensorRT.

### Speculative Decoding

Modern serving stacks use a smaller "draft" model to predict multiple tokens ahead, then have the real model verify them. Theoretically this preserves the same output distribution, but in practice acceptance rates vary by domain and context. Out-of-the-box draft models may work fine in some cases but often struggle with domain-specific tasks or very long contexts.

### Context Window Pollution

In a long coding session, earlier mistakes accumulate in context. The model sees its own errors and may perpetuate them. This is the most common cause of "Claude got dumber" within a single session — it's not the model degrading, it's context contamination.

**Practical tip**: Use `/compact` or start fresh sessions when quality feels off. This is the single most actionable thing you can do.

---

## The Stanford Study — And Why It's Complicated

The landmark 2023 study by Stanford and UC Berkeley (Chen, Zaharia, Zou) — "How is ChatGPT's Behavior Changing Over Time?" — is frequently cited as proof that LLMs degrade. The headline finding:

> GPT-4's accuracy on "Is this number prime? Think step by step" fell from **97.6% to 2.4%** between March and June 2023.

### What the Study Proved

- The behavior of the "same" LLM service **can change substantially** in a short period
- Different capabilities can move in opposite directions (GPT-4 got worse at math, GPT-3.5 got better)
- Code generation quality dropped (GPT-4 executable code: 52% → 10%)
- The study coined the term **"LLM drift"**

### Methodological Critiques

- The March version used **temperature 0.0** while the June version used **temperature 1.0** — a fundamental confounding variable that increases randomness
- Only **500 queries per task** — too small for definitive statistical claims
- The "math questions" were actually yes/no questions where the model's guessing pattern changed, not its mathematical ability
- Changes likely reflected intentional **post-training safety updates**, not degradation

The study proved something important — LLM behavior changes over time — but the mechanism was likely intentional updates, not unintentional degradation.

---

## The Psychology

### Confirmation Bias

Once someone tweets "Claude is dumb today," you start noticing every mistake. On days when nobody complains, you brush off the same errors. Social media amplifies this effect.

### The Honeymoon Effect

Users experience an initial honeymoon period with new models, then gradually discover limitations. The model didn't change — expectations adjusted upward faster than capabilities warranted.

### Task Difficulty Variance

Your tasks vary day to day. A day of hard problems feels like the model got worse, even when it hasn't.

### The "Weekend Claude" Myth

Despite many users believing in day-of-week patterns, rigorous analysis found **no consistent evidence** for day-of-week quality patterns. One analysis titled "AI is Dumber on Mondays" came up empty.

### Stochastic Nature of LLMs

LLMs are probabilistic. The same prompt can produce different outputs each time. On a bad luck streak, you might get several poor responses in a row — pure randomness, not degradation.

---

## Bottom Line

The phenomenon users describe is **real but misattributed**:

- **Correct**: their experience degraded on certain days
- **Incorrect**: the model was intentionally "nerfed"

The actual causes are a combination of:

1. **Infrastructure bugs** — proven by Anthropic's postmortem (up to 16% of requests affected)
2. **MoE routing variance** — ±8-14% quality swing measured by Scale AI, even with zero changes
3. **System prompt and post-training updates** — documented across providers
4. **Hardware heterogeneity** — TPU vs GPU vs Trainium, each with different failure modes
5. **Context pollution** — long sessions degrade within-session quality
6. **Confirmation bias** — social media amplifies perceived patterns
7. **Stochastic variance** — same model, same prompt, different output every time

The measurement problem is severe: day-to-day variance of ±8-14% means you cannot distinguish a real 5% quality change from noise. This is why both the "it's all in your head" and "they nerfed it" camps feel confident — the signal-to-noise ratio makes it impossible to tell from individual experience alone.

---

## Sources

- [Anthropic: A Postmortem of Three Recent Issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) — Official postmortem detailing three infrastructure bugs (September 2025)
- [Anthropic Reveals Three Infrastructure Bugs — InfoQ](https://www.infoq.com/news/2025/10/anthropic-infrastructure-bugs/) — Technical analysis of the postmortem
- [How is ChatGPT's Behavior Changing Over Time? — Stanford/UC Berkeley](https://arxiv.org/abs/2307.09009) — Landmark study on LLM drift (2023)
- [The Truth About ChatGPT's Degrading Capabilities — TechTalks](https://bdtechtalks.com/2023/07/24/chatgpt-capabilities-degrading-study/) — Methodological critique of the Stanford study
- [LLMs Are Getting Dumber and We Have No Idea Why — Ignorance.ai](https://www.ignorance.ai/p/llms-are-getting-dumber-and-we-have) — Five theories for perceived degradation
- [When Claude Forgets How to Code — Robert Matsuoka](https://hyperdev.matsuoka.com/p/when-claude-forgets-how-to-code) — Analysis of Claude quality fluctuations and infrastructure causes
- [Smoothing Out LLM Variance — Scale AI](https://scale.com/blog/smoothing-out-llm-variance) — Measured ±8-14% day-to-day variance across providers
- [What We Can Learn from Anthropic's System Prompt Updates — PromptLayer](https://blog.promptlayer.com/what-we-can-learn-from-anthropics-system-prompt-updates/) — System prompt evolution analysis
- [Claude's System Prompt Changes Reveal Anthropic's Priorities — Drew Breunig](https://www.dbreunig.com/2025/06/03/comparing-system-prompts-across-claude-versions.html) — Hot-fix patterns in system prompts
- [Complaints About Secretly Switching Models — OpenAI Forum](https://community.openai.com/t/complaints-about-secretly-switching-models/1360150) — Documented silent model swaps
- [Speculative Decoding — BentoML LLM Inference Handbook](https://bentoml.com/llm/inference-optimization/speculative-decoding) — How draft models affect serving
- [A Visual Guide to Mixture of Experts — Maarten Grootendorst](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts) — MoE architecture and routing explained

---
---

# 🔥 Codex 5.3 High Reason and Finding

### Report Scope

This section explains why users can experience a short window where Claude output quality drops while Codex 5.3 feels stable or stronger on coding tasks. The focus is not on permanent model quality rankings. The focus is short-horizon production behavior under real serving conditions.

Report date: March 5, 2026.

### Observed Pattern

The reported pattern is:

1. Model quality is acceptable for a period.
2. Quality appears to degrade for several days.
3. Quality returns close to prior baseline.

This shape is usually a serving-stack or rollout pattern, not a permanent base-model capability change. Permanent capability decline would not normally recover this quickly without an explicit rollback or fix.

### High Reason: Why Codex 5.3 Can Look Better in a Bad Window

Codex 5.3 can appear clearly stronger during another provider's degraded period for several technical reasons that can all happen at the same time:

1. Product-objective fit. Codex 5.3 is optimized for code-generation and agentic coding workflows, so even equal raw model strength can yield better coding outcomes due to tool orchestration, repository reasoning, and code-centric instruction tuning.
2. Inference policy differences. Providers tune latency, reasoning depth, and decoding defaults independently. A more conservative policy at one provider can look "smarter" than an aggressive speed-optimized policy at another for the same day.
3. Serving-path separation. Even if two providers host state-of-the-art models, they run different routing layers, compiler/runtime stacks, and rollout pipelines. An incident in one stack does not imply correlated degradation in the other.
4. Rollout and rollback timing. If one provider is mid-rollout while another is stable, users can see large temporary quality divergence with no underlying long-term change in model weights.
5. Session-level contamination effects. In long coding chats, error accumulation can amplify perceived decline. A competing assistant can feel better simply because the failing session was reset or because its tool loop recovered faster.

### Detailed Finding

For a report like "Claude felt very weak for about four days, then came back," the most probable explanation is:

1. A provider-side incident, routing issue, decoding/runtime bug, or rollout regression affected a subset of requests.
2. The issue persisted long enough to be noticed repeatedly in real workflows.
3. The issue was fixed or rolled back.
4. Perceived quality returned quickly.

During that same period, Codex 5.3 could feel substantially better because it did not share the same incident path and because coding-task optimization magnified the gap in practical outcomes.

### Hypothesis Ranking for This Pattern

| Hypothesis | Likelihood | Rationale |
|------------|------------|-----------|
| Provider incident plus rollback | High | Best match for multi-day dip followed by fast recovery |
| Serving configuration change (sampling/latency/reasoning budget) | High | Common source of sudden behavior shifts without model retraining |
| Silent alias or snapshot movement | Medium-High | Can change behavior with no visible user action |
| Prompt drift and context contamination only | Medium | Can degrade sessions, but less likely to explain broad multi-day reports alone |
| Permanent base-model degradation | Low | Inconsistent with fast return to previous quality |

### What Would Confirm or Falsify This Finding

To turn this from high-confidence inference into hard proof, collect request-level telemetry for the same task set across days:

1. Exact model identifier and snapshot/alias at request time.
2. Any backend fingerprint or release marker exposed by the provider.
3. Decoding parameters (temperature, top_p, top_k, max tokens).
4. Latency, timeout, and error-rate traces.
5. Structured quality scores on a fixed coding benchmark prompt set.
6. Session length and token-context depth at failure points.

If quality drops correlate with an incident window, a config change, or a backend fingerprint shift, the incident/config hypothesis is confirmed. If no such shifts exist and degradation is only in long sessions, context contamination becomes the primary explanation.

### Practical Engineering Guidance

To reduce day-to-day variance in production:

1. Pin model snapshots when available instead of using floating aliases.
2. Store request metadata (model ID, parameters, latency, errors, response quality label).
3. Run a fixed daily canary suite for coding tasks and alert on regression.
4. Reset or compact long-running sessions after several failed turns.
5. Keep a fallback provider/model path for incident windows.
6. Separate "model quality" from "serving reliability" in internal dashboards.

### Final Conclusion

Codex 5.3 looking better during a short Claude degradation window is a technically plausible and expected outcome in modern LLM operations. The strongest explanation is not permanent model collapse. The strongest explanation is temporary serving-path degradation at one provider, combined with coding-specific optimization and stable operation at the other provider during the same period.


<!-- FILE: reports/why-harness-is-important.md -->

# Why Harness is Important

Why Claude Code's features are not "just prompts in disguise" — and why the harness is what actually separates toy output from production-grade engineering work.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Executive Summary

A common reduction among experienced Claude Code users is: *"skills, commands, subagents, hooks — they all eventually become prompts to the model, so a strong prompt alone is equivalent."*

At the layer of the model's final inference call, this is technically true. The model only ever sees tokens.

At every other layer — the one where real software engineering happens — **this reduction collapses.** The harness is not a prompt delivery system. It is a **prompt construction system, a deterministic execution system, and a context architecture system** — and those capabilities cannot be replaced by stronger wording.

This report explains where the reduction is right, where it fails, and why confusing "what the model sees" with "what the system does" leads practitioners away from the features that give Claude Code its actual leverage.

---

## The Reduction That Sounds Right

For a **single-shot atomic task** — "write me a recursive Fibonacci function" — the harness contributes nothing to output quality. Hand the same tokens to the same model and you get the same distribution of outputs whether they arrived via a skill, a command, or a raw prompt.

In this narrow regime, the reduction holds:

> Output quality ≈ Prompt quality

This is the regime where Claude Code offers little value over a plain chatbot. It is also the regime the reduction implicitly assumes — and precisely the regime real engineering work is not in.

---

## Where the Reduction Breaks Down

Ten architectural capabilities of the harness operate at layers where prompts have no access.

| # | Capability | What it does | Why a prompt can't replicate |
|---|------------|--------------|-------------------------------|
| 1 | **Context isolation** | Subagents run in separate context windows | A prompt fills one window. N parallel subagents give ~N× effective context. |
| 2 | **Harness-enforced tool restrictions** | `allowed-tools` / `disallowedTools` block tools before the model can use them | Prompt instructions are advisory; the model can ignore them. Deny rules cannot be ignored. |
| 3 | **Lazy-loaded rules & memory** | `paths:` frontmatter and descendant `CLAUDE.md` files load only when Claude touches matching paths | A prompt is static — it cannot conditionally load based on which files are being read at runtime. |
| 4 | **Hooks: deterministic code execution** | Shell commands run at lifecycle events (PreToolUse, PostToolUse, Stop, etc.) and can **block** tool calls | A prompt cannot intercept its own tool calls. Hooks execute even if the model doesn't "want" them to. |
| 5 | **Model routing** | `model: haiku` or `model: opus` routes a call to a different model endpoint | No token in the prompt can change which model answers. |
| 6 | **Parallelism** | Multiple subagents execute concurrently | A prompt is sequential. The harness schedules and collects results from parallel processes. |
| 7 | **Cross-session persistence** | Memory system and settings hierarchy persist across conversations | A prompt dies when the session ends. |
| 8 | **Modular system prompt** | The CLI loads 110+ system prompt fragments conditionally based on features activated | A user cannot hand-author or swap in the CLI's internal prompt fragments. |
| 9 | **Skill preloading** | `skills:` field injects a skill's full content into a subagent's starting context | The user cannot pre-stuff another agent's context — only the harness loader can. |
| 10 | **Permission classification** | `auto` permission mode uses a background classifier to pre-approve or block tool calls | A prompt cannot add a pre-execution safety layer to itself. |

Each row is a dimension where "strong wording" is categorically not a substitute.

---

## The Two Uses of the Word "Prompt"

The reduction trades on an equivocation. The word *prompt* is used to mean two very different things:

| Meaning | Who controls it | Size |
|---------|-----------------|------|
| (a) What the user typed | The user | ~6–60 tokens |
| (b) What the model sees at inference | The harness | ~5,000–50,000+ tokens |

In a chatbot, (a) and (b) are the same thing.
In Claude Code, they are radically different.

The harness's job is precisely to make (b) much richer than (a):

```
User types: "write a recursive flatten function"   ← (a) ~6 tokens

What the model actually sees at inference:         ← (b) ~15,000 tokens
  ├── CLAUDE.md (project conventions)
  ├── Matching .claude/rules/*.md (loaded via paths: frontmatter)
  ├── Modular system prompt fragments
  ├── Tool definitions
  ├── Environment context (cwd, git status, platform)
  ├── Prior turn history
  ├── Files read by the model via Read/Grep tools
  └── User's 6-token request
```

**Output quality is a function of (b), not (a).** The harness constructs (b). A "strong prompt alone" cannot reproduce (b) because most of it isn't written by the user.

---

## Even for Output Quality, the Harness Is Doing Work

Consider the same prompt — "write a recursive flatten function" — in three environments:

| Environment | What the model sees | Typical result |
|-------------|---------------------|----------------|
| Chatbot, no tools | The sentence | Textbook recursion, generic style |
| Claude Code, no reading | Sentence + CLAUDE.md | Matches declared project conventions |
| Claude Code, agentic loop | Sentence + CLAUDE.md + read adjacent files + run tests | Matches actual codebase patterns, passes tests, handles edge cases the existing code handles |

Same model. Same user prompt. **Three different output qualities.** The difference is the harness — specifically, the effective context it assembles and the iteration loop it enables.

For non-trivial tasks, output quality is a function of:

```
Output quality = f(effective context, model capability, iteration loop)
```

The user controls a sliver of *effective context* (their typed prompt). The harness controls the rest — and the iteration loop entirely.

---

## What the Reduction Gets Right (And What It Gets Wrong)

| Claim | Verdict |
|-------|---------|
| "At inference, the model only sees tokens." | ✅ True |
| "Skills, commands, and subagent prompts all contribute tokens to some context." | ✅ True |
| "For an atomic task in a vacuum, prompt quality dominates output quality." | ✅ True |
| "Therefore a strong prompt is equivalent to using features." | ❌ False |
| "Therefore the harness doesn't matter for output quality." | ❌ False on real engineering tasks |

The first three statements are accurate observations. The leap to the fourth is where the reasoning fails: it conflates the model with the system that wraps it, and conflates atomic tasks with real engineering work.

---

## The Correct Mental Model

> **Prompts control what the model is asked to do.**
> **The harness controls what the system does at layers the model cannot reach** — before tokens arrive, after tokens are produced, across sessions, across contexts, and across processes.

Features are not prompts with extra steps. They are **harness-level primitives** — deterministic execution, context architecture, and infrastructure routing — that operate at layers where the model has no voice.

A useful analogy:

| Layer | Chatbot | Claude Code |
|-------|---------|-------------|
| Recipe | The user's message | The user's message + harness-assembled context |
| Kitchen | None — just a student | Tools, hooks, memory, parallel workers, lifecycle events |

You can write the world's best recipe. Without a kitchen, you cannot cook at scale.

---

## Takeaways for Practitioners

1. **For atomic questions, prompt quality is ~everything.** The harness is irrelevant. Use a chatbot if that's all you need.
2. **For real codebase work, the harness is doing silent heavy lifting.** The effective prompt at inference is mostly harness-constructed, not user-typed.
3. **Use features for what prompts categorically cannot do:** determinism (hooks), isolation (subagents), lazy loading (rules with `paths:`), persistence (memory), routing (per-agent `model:`), and parallelism.
4. **A strong prompt is necessary but not sufficient.** Features give you determinism, isolation, and composition that prompts cannot. The two are complementary, not substitutes.

---

## Sources

- [Agents vs Commands vs Skills](claude-agent-command-skill.md) — shows context isolation, model override, and tool restrictions per feature
- [Claude Agent SDK vs CLI System Prompts](claude-agent-sdk-vs-cli-system-prompts.md) — documents the 110+ modular system prompt fragments
- [Claude Agent Memory](claude-agent-memory.md) — cross-session persistence via `memory:` scopes
- [Claude Memory Best Practice](../best-practice/claude-memory.md) — lazy-loaded descendant `CLAUDE.md` files
- [Claude Subagents Best Practice](../best-practice/claude-subagents.md) — frontmatter reference for harness-enforced capabilities
- [Claude Settings Best Practice](../best-practice/claude-settings.md) — permission rule evaluation and `auto` mode classifier
- [Orchestration Workflow](../orchestration-workflow/orchestration-workflow.md) — concrete demonstration that the reduction fails
