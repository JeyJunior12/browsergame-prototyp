---
name: boris-arbeitsweise
description: Arbeitsweise nach Boris Cherny (Erfinder von Claude Code) – erst planen, eigene Arbeit prüfen, elegante statt geflickte Lösungen. Automatisch anwenden, ohne dass der Nutzer danach fragt, bei Coding-, Website-, Bot- oder Skript-Aufträgen, die mehr als eine kleine Änderung sind (neues Feature, Umbau, mehrere Stellen betroffen). Nicht laden für Fragen, kleine Bugfixes, Bildtausch oder Textänderungen.
---

# Arbeitsweise nach Boris Cherny

Apply these principles to every build task (code, websites, bots, scripts, automations, documents with logic). They come from Boris Cherny's published Claude Code tips (full sources in the `claude-code-wissen` skill); only the ones that work in a single Claude session are included. Do NOT spin up parallel Claudes, agent teams or long autonomous loops — the user explicitly does not want multi-agent setups that burn tokens.

## Reihenfolge mit den anderen Skills
`search-first` (existing tools?) → **Plan** → build → `security-review` (if secrets, logins, user input, payments, bots) → **Verify** → `production-audit` (before going live). Websites also: `impeccable` (if installed); `seo` only for public landing pages or when asked; verify web UI yourself with `playwright-cli` (if installed) (open, click through, screenshot). These are one flow, not competing instructions; don't repeat the same check twice.

## 1. Plan first (Plan Mode)
- For anything bigger than a small fix: before writing code, state a short plan (goal, parts affected, steps, how it will be verified) and get the user's OK.
- If the request is vague, interview the user with a few concrete questions first (AskUserQuestion when available) instead of guessing.
- Small, obvious fixes: skip the plan and just do it.

## 2. Verify your own work (most important tip — 2–3x quality)
- Never hand back untested work when a check is possible: run the code/tests, open the page in a browser and look at it, take a screenshot, call the API, lint, or compare output against the expectation.
- If no automated check exists, write a quick one or describe exactly how the user can check it in one step.
- Report honestly what was verified and what could not be.

## 3. Elegant over patched
- If a fix feels hacky or a second attempt is needed, stop and redo it: "knowing everything I know now, what is the clean solution?"
- Keep code simple; after finishing, do one quick simplification pass (dead code, duplicate logic, unused files).
- Finish migrations fully — never leave half old/half new patterns.

## 4. Bugs: just fix them
- When the user pastes an error or says "fix", investigate and fix autonomously; find the root cause, not just the symptom.

## 5. Challenge the result
- Before calling something done, review it like a strict senior engineer: edge cases, errors, security (keys/passwords never in code or chat), mobile view for websites.

## 6. Explain structure visually
- For systems with several parts, use a small ASCII diagram to show how the pieces connect.

## 7. Project memory (CLAUDE.md)
- When starting or taking over a code project, suggest (or create, if the user agrees) a short CLAUDE.md: what the project is, how to run/build/test, conventions, things to avoid. Under ~200 lines. When the user corrects a recurring mistake, offer to add the rule there.

## 8. Repeat → automate
- If the user asks for the same kind of task repeatedly, offer once to turn it into a skill.

## Communication & tokens
- Answer in the user's language (German). Keep plans to a few bullets, progress notes minimal; show the result and what was verified.
- Save tokens: read only the files/sections needed, don't re-read unchanged files, prefer targeted edits over rewriting whole files, and don't repeat long code back unless asked.
