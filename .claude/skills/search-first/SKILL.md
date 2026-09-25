---
name: search-first
description: Research-before-coding workflow. Search for existing tools, libraries, APIs, skills and patterns before writing custom code. Use automatically before building any non-trivial feature, script, bot or integration.
metadata:
  origin: ECC
---

# /search-first — Research Before You Code

Systematizes the "search for existing solutions before implementing" workflow.

## Trigger

Use this skill when:
- Starting a new feature that likely has existing solutions
- Adding a dependency or integration
- The user asks "add X functionality" and you're about to write code
- Before creating a new utility, helper, or abstraction

## Workflow

```
┌─────────────────────────────────────────────┐
│  0. TOOL AVAILABILITY PREFLIGHT             │
│     Check search channels before relying on │
│     them; report skipped channels honestly   │
├─────────────────────────────────────────────┤
│  1. NEED ANALYSIS                           │
│     Define what functionality is needed      │
│     Identify language/framework constraints  │
├─────────────────────────────────────────────┤
│  2. SEARCH (yourself, inline)               │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│     │  npm /   │ │  MCP /   │ │  GitHub / │  │
│     │  PyPI    │ │  Skills  │ │  Web      │  │
│     └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────┤
│  3. EVALUATE                                │
│     Score candidates (functionality, maint, │
│     community, docs, license, deps)         │
├─────────────────────────────────────────────┤
│  4. DECIDE                                  │
│     ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│     │  Adopt  │  │  Extend  │  │  Build   │  │
│     │ as-is   │  │  /Wrap   │  │  Custom  │  │
│     └─────────┘  └──────────┘  └─────────┘  │
├─────────────────────────────────────────────┤
│  5. IMPLEMENT                               │
│     Install package / Configure MCP /       │
│     Write minimal custom code               │
└─────────────────────────────────────────────┘
```

## Decision Matrix

| Signal | Action |
|--------|--------|
| Exact match, well-maintained, MIT/Apache | **Adopt** — install and use directly |
| Partial match, good foundation | **Extend** — install + write thin wrapper |
| Multiple weak matches | **Compose** — combine 2-3 small packages |
| Nothing suitable found | **Build** — write custom, but informed by research |

## How to Use

### Step 0: Tool Availability Preflight

This is agent guidance, not an executable setup script. Check only the channels
that are relevant to the task and project in front of you.

| Channel | Check | If missing |
|---------|-------|------------|
| Repository search | `rg --files` and targeted `rg` queries | State that only visible files were inspected |
| Package registry | `npm --version`, `python -m pip --version`, or project package manager | Use web/docs search and avoid claiming registry coverage |
| GitHub CLI | `gh auth status` | Use public web or local git history only |
| MCP/docs tools | Available tool list or local MCP config | Fall back to official docs/web search |
| Skills directory | `ls ~/.claude/skills ~/.codex/skills` where applicable | Say no local skill catalog was available |

### Quick Mode (inline)

Before writing a utility or adding functionality, mentally run through:

0. Does this already exist in the repo? → `rg` through relevant modules/tests first
1. Is this a common problem? → Search npm/PyPI
2. Is there an MCP for this? → Check `~/.claude/settings.json` and search
3. Is there a skill for this? → Check `~/.claude/skills/`
4. Is there a GitHub implementation/template? → Run GitHub code search for maintained OSS before writing net-new code

### Full Mode (inline)

For non-trivial functionality, do the research yourself in the current session (web search, package registries, GitHub, the `kostenlose-apis` skill for data sources). Do NOT launch subagents or parallel agents — the user does not want multi-agent setups. Return a short comparison (2–4 candidates: what it does, maintenance, license, cost, fit) with a recommendation: Adopt / Extend / Build.

## Integration Points

- Run this before the planning step of the `boris-arbeitsweise` skill, so the plan already uses existing tools.
- For free data sources and APIs, check the `kostenlose-apis` skill first.

## Anti-Patterns

- **Jumping to code**: Writing a utility without checking if one exists
- **Ignoring MCP**: Not checking if an MCP server already provides the capability
- **Silent skipping**: Reporting "nothing found" when a search channel was unavailable
- **Over-customizing**: Wrapping a library so heavily it loses its benefits
- **Dependency bloat**: Installing a massive package for one small feature
