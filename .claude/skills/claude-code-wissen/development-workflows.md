

<!-- FILE: development-workflows/cross-model-workflow/cross-model-workflow.md -->

# Cross-Model (Claude Code + Codex) Workflow

based on [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) and [codex-cli-best-practice](https://github.com/shanraisshan/codex-cli-best-practice)

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CROSS-MODEL CLAUDE CODE + CODEX WORKFLOW                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: PLAN                                          Claude Code      │
│  ─────────────                                         Opus 4.6         │
│  Open Claude Code in plan mode (Terminal 1).           Plan Mode        │
│  Claude interviews you via AskUserQuestion.                             │
│  Produces a phased plan with test gates.                                │
│                                                                         │
│  Output: plans/{feature-name}.md                                        │
│                                                                         │
│                              ▼                                          │
│                                                                         │
│  STEP 2: QA REVIEW                                     Codex CLI        │
│  ──────────────────                                    GPT-5.4          │
│  Open Codex CLI in another terminal (Terminal 2).                       │
│  Codex reviews plan against the actual codebase.                        │
│  Inserts intermediate phases ("Phase 2.5")                              │
│  with "Codex Finding" headings.                                         │
│  Adds to the plan — never rewrites original phases.                     │
│                                                                         │
│  Output: plans/{feature-name}.md (updated)                              │
│                                                                         │
│                              ▼                                          │
│                                                                         │
│  STEP 3: IMPLEMENT                                     Claude Code      │
│  ──────────────────                                    Opus 4.6         │
│  Start a new Claude Code session (Terminal 1).                          │
│  You implement phase-by-phase                                           │
│  with test gates at each phase.                                         │
│                                                                         │
│                              ▼                                          │
│                                                                         │
│  STEP 4: VERIFY                                        Codex CLI        │
│  ────────────────                                      GPT-5.4          │
│  Start a new Codex CLI session (Terminal 2).                            │
│  Codex verifies the implementation                                      │
│  against the plan.                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## How cross-model workflow actually looks in production

![Cross-Model Workflow](assets/cross-model-workflow.png)

*Last Updated: 2026-03-06*


<!-- FILE: development-workflows/rpi/rpi-workflow.md -->

# RPI Workflow

**RPI** = **R**esearch → **P**lan → **I**mplement

A systematic development workflow with validation gates at each phase. Prevents wasted effort on non-viable features and ensures comprehensive documentation.

<table width="100%">
<tr>
<td><a href="../../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Overview

![RPI Workflow](rpi-workflow.svg)

---

## Installation

Copy the `.claude` folder (containing `agents/` and `commands/rpi/`) to your repository root, then create the `rpi/plans` directory.

---

## Example Workflow

### Feature: User Authentication

**Step 1: Describe**
```
User: "Add OAuth2 authentication with Google and GitHub providers"

1. Claude generates plan
   → Output: rpi/plans/oauth2-authentication.md
2. Create feature folder: rpi/oauth2-authentication/
3. Copy the plan into the feature folder
4. Rename the plan to REQUEST.md
   → Final: rpi/oauth2-authentication/REQUEST.md
```

**Step 2: Research**
```bash
/rpi:research rpi/oauth2-authentication/REQUEST.md
```
Output:
- `research/RESEARCH.md` with analysis
- Verdict: **GO** (feasible, aligned with strategy)

**Step 3: Plan**
```bash
/rpi:plan oauth2-authentication
```
Output:
- `plan/pm.md` - User stories and acceptance criteria
- `plan/ux.md` - Login UI flows
- `plan/eng.md` - Technical architecture
- `plan/PLAN.md` - 3 phases, 15 tasks

**Step 4: Implement**
```bash
/rpi:implement oauth2-authentication
```
Progress:
- Phase 1: Backend Foundation → PASS
- Phase 2: Frontend Integration → PASS
- Phase 3: Testing & Polish → PASS

Result: Feature complete, ready for PR.

---

## Feature Folder Structure

All feature work lives in `rpi/{feature-slug}/`:

```
rpi/{feature-slug}/
├── REQUEST.md              # Step 1: Initial feature description
├── research/
│   └── RESEARCH.md         # Step 2: GO/NO-GO analysis
├── plan/
│   ├── PLAN.md             # Step 3: Implementation roadmap
│   ├── pm.md               # Product requirements
│   ├── ux.md               # UX design
│   └── eng.md              # Technical specification
└── implement/
    └── IMPLEMENT.md        # Step 4: Implementation record
```

---

## Agents and Commands

| Command | Agents Used |
|---------|-------------|
| `/rpi:research` | requirement-parser, product-manager, Explore, senior-software-engineer, technical-cto-advisor, documentation-analyst-writer |
| `/rpi:plan` | senior-software-engineer, product-manager, ux-designer, documentation-analyst-writer |
| `/rpi:implement` | Explore, senior-software-engineer, code-reviewer |