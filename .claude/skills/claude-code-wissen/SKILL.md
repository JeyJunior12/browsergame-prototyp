---
name: claude-code-wissen
description: Knowledge base from the claude-code-best-practice repo (tips by Boris Cherny, Thariq, Cat Wu and the community; CLAUDE.md/memory, skills, commands, subagents, hooks, MCP, settings, startup flags, usage and rate limits, workflows). Consult it proactively, without being asked, whenever it would improve the work: starting or setting up a code project (offer a CLAUDE.md), the user hits limits or wastes tokens, a workflow repeats and could become a skill/command/hook, Claude Code settings or permissions come up, or the user asks how to use Claude or Claude Code better or mentions Boris Cherny.
---

# Claude-Code-Wissen

Reference library, loaded on demand. Do not read everything — Grep or open only what the question needs.

## Where to look (bundled in this folder: one file per topic folder, e.g. `tips.md`, `best-practice.md`, `reports.md`; each original file starts with `<!-- FILE: path -->` — Grep for it)
- `README-tipps-uebersicht.md` — the full tips table (83+ tips) grouped by topic, each with its source (Boris, Thariq, Cat, community). Start here for "tips" questions; Grep for a keyword.
- `tips/claude-boris-*.md` — Boris Cherny's tip threads in full (dated); `tips/claude-thariq-*.md` — Thariq's.
- `best-practice/` — how-tos: `claude-memory.md` (CLAUDE.md), `claude-skills.md`, `claude-commands.md`, `claude-subagents.md`, `claude-settings.md`, `claude-mcp.md`, `claude-cli-startup-flags.md`, `claude-power-ups.md`.
- `reports/` — deeper reports, e.g. `claude-usage-and-rate-limits.md`, `claude-global-vs-project-settings.md`, `claude-agent-command-skill.md`, `claude-in-chrome-v-chrome-devtools-mcp.md`.
- `development-workflows/`, `tutorial/`, `videos/` (podcast/talk summaries: Boris on Lenny's, YC, Pragmatic Engineer …).
- `orchestration-workflow/`, `agent-teams/` — multi-agent setups. Only mention on explicit request: the user does not want multi-agent/parallel-Claude setups that burn tokens.

## How to answer
1. Find the relevant file(s), answer in the user's language (German), plain and short, with concrete steps or commands.
2. Name the source (e.g. "Tipp von Boris Cherny, Jan 2026"). Tips are dated and Claude Code changes fast: if a command or feature may have changed, check the official docs (code.claude.com/docs) via web search before stating it as current.
3. When asked to create a CLAUDE.md, skill, command or hook, follow the matching best-practice file (e.g. CLAUDE.md under ~200 lines, must contain run/build/test commands).
4. Prefer tips that work in a single session and save tokens (plan mode, /clear vs /compact, verification loops, CLAUDE.md) over parallel/multi-agent ones.
