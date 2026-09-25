

<!-- FILE: tips/claude-boris-10-tips-01-feb-26.md -->

# 10 Tips for Using Claude Code — From the Claude Code Team

A summary of team tips shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on February 1, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

Boris shared tips for using Claude Code sourced directly from the Claude Code team. The way the team uses Claude is different than how Boris uses it personally. Remember: there is no one right way to use Claude Code — everyone's setup is different. You should experiment to see what works for you!

<a href="https://x.com/bcherny/status/2017742741636321619"><img src="assets/boris-26-2-1/0.png" alt="Boris Cherny intro tweet" width="50%" /></a>

---

## 1/ Do More in Parallel

Spin up 3–5 git worktrees at once, each running its own Claude session in parallel. It's the single biggest productivity unlock, and the top tip from the team. Personally, Boris uses multiple git checkouts, but most of the Claude Code team prefers worktrees — it's the reason `@amorisscode` built native support for them into the Claude Desktop app!

Some people also name their worktrees and set up shell aliases (`2a`, `2b`, `2c`) so they can hop between them in one keystroke. Others have a dedicated "analysis" worktree that's only for reading logs and running BigQuery.

See: [Worktrees Docs](https://code.claude.com/docs/en/common...)

<a href="https://x.com/bcherny/status/2017742743125299476"><img src="assets/boris-26-2-1/1.png" alt="Do more in parallel" width="50%" /></a>

---

## 2/ Start Every Complex Task in Plan Mode

Pour your energy into the plan so Claude can 1-shot the implementation.

One person has one Claude write the plan, then they spin up a second Claude to review it as a staff engineer.

Another says the moment something goes sideways, they switch back to plan mode and re-plan. Don't keep pushing. They also explicitly tell Claude to enter plan mode for verification steps, not just for the build.

<a href="https://x.com/bcherny/status/2017742745365057733"><img src="assets/boris-26-2-1/2.png" alt="Start every complex task in plan mode" width="50%" /></a>

---

## 3/ Invest in Your CLAUDE.md

After every correction, end with: "Update your CLAUDE.md so you don't make that mistake again." Claude is eerily good at writing rules for itself.

Ruthlessly edit your `CLAUDE.md` over time. Keep iterating until Claude's mistake rate measurably drops.

One engineer tells Claude to maintain a notes directory for every task/project, updated after every PR. They then point `CLAUDE.md` at it.

<a href="https://x.com/bcherny/status/2017742747067945390"><img src="assets/boris-26-2-1/3.png" alt="Invest in your CLAUDE.md" width="50%" /></a>

---

## 4/ Create Your Own Skills and Commit Them to Git

Reuse across every project. Tips from the team:

- If you do something more than once a day, turn it into a skill or command
- Build a `/techdebt` slash command and run it at the end of every session to find and kill duplicated code
- Set up a slash command that syncs 7 days of Slack, GDrive, Asana, and GitHub into one context dump
- Build analytics-engineer-style agents that write dbt models, review code, and test changes in dev

See: [Extend Claude with Skills — Claude Code Docs](https://code.claude.com/docs/en/skills)

<a href="https://x.com/bcherny/status/2017742748984742078"><img src="assets/boris-26-2-1/4.png" alt="Create your own skills" width="50%" /></a>

---

## 5/ Claude Fixes Most Bugs by Itself

Here's how the team does it:

Enable the Slack MCP, then paste a Slack bug thread into Claude and just say "fix." Zero context switching required.

Or, just say "Go fix the failing CI tests." Don't micromanage how.

Point Claude at docker logs to troubleshoot distributed systems — it's surprisingly capable at this.

<a href="https://x.com/bcherny/status/2017742750473720121"><img src="assets/boris-26-2-1/5.png" alt="Claude fixes most bugs by itself" width="50%" /></a>

---

## 6/ Level Up Your Prompting

a. **Challenge Claude.** Say "Grill me on these changes and don't make a PR until I pass your test." Make Claude be your reviewer. Or, say "Prove to me this works" and have Claude diff behavior between main and your feature branch.

b. **After a mediocre fix,** say: "Knowing everything you know now, scrap this and implement the elegant solution."

c. **Write detailed specs** and reduce ambiguity before handing work off. The more specific you are, the better the output.

<a href="https://x.com/bcherny/status/2017742752566632544"><img src="assets/boris-26-2-1/6.png" alt="Level up your prompting" width="50%" /></a>

---

## 7/ Terminal & Environment Setup

The team loves Ghostty! Multiple people like its synchronized rendering, 24-bit color, and proper unicode support.

For easier Claude-juggling, use `/statusline` to customize your status bar to always show context usage and current git branch. Many also color-code and name their terminal tabs, sometimes using tmux — one tab per task/worktree.

Use voice dictation. You speak 3x faster than you type, and your prompts get way more detailed as a result. (hit fn x2 on macOS)

See: [Terminal Setup Docs](https://code.claude.com/docs/en/termin...)

<a href="https://x.com/bcherny/status/2017742753971769626"><img src="assets/boris-26-2-1/7.png" alt="Terminal and environment setup" width="50%" /></a>

---

## 8/ Use Subagents

a. Append "use subagents" to any request where you want Claude to throw more compute at the problem.

b. Offload individual tasks to subagents to keep your main agent's context window clean and focused.

c. Route permission requests to Opus 4.5 via a hook — let it scan for attacks and auto-approve the safe ones. See: [Hooks Docs](https://code.claude.com/docs/en/hooks#...)

<a href="https://x.com/bcherny/status/2017742755737555434"><img src="assets/boris-26-2-1/8.png" alt="Use subagents" width="50%" /></a>

---

## 9/ Use Claude for Data & Analytics

Ask Claude Code to use the "bq" CLI to pull and analyze metrics on the fly. The team has a BigQuery skill checked into the codebase, and everyone uses it for analytics queries directly in Claude Code. Personally, Boris hasn't written a line of SQL in 6+ months.

This works for any database that has a CLI, MCP, or API.

<a href="https://x.com/bcherny/status/2017742757666902374"><img src="assets/boris-26-2-1/9.png" alt="Use Claude for data and analytics" width="50%" /></a>

---

## 10/ Learning with Claude

A few tips from the team to use Claude Code for learning:

a. Enable the "Explanatory" or "Learning" output style in `/config` to have Claude explain the "why" behind its changes.

b. Have Claude generate a visual HTML presentation explaining unfamiliar code. It makes surprisingly good slides!

c. Ask Claude to draw ASCII diagrams of new protocols and codebases to help you understand them.

d. Build a spaced-repetition learning skill: you explain your understanding, Claude asks follow-ups to fill gaps, stores the result.

<a href="https://x.com/bcherny/status/2017742759218794768"><img src="assets/boris-26-2-1/10.png" alt="Learning with Claude" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — February 1, 2026](https://x.com/bcherny/status/2017742741636321619)


<!-- FILE: tips/claude-boris-12-tips-12-feb-26.md -->

# 12 Ways to Customize Claude Code — Tips from Boris Cherny

A summary of customization tips shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on February 12, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

Boris Cherny highlighted that customizability is one of the things engineers love most about Claude Code — hooks, plugins, LSPs, MCPs, skills, effort, custom agents, status lines, output styles, and more. He shared 12 practical ways developers and teams are customizing their setups.

<a href="https://x.com/bcherny/status/2021699851499798911"><img src="assets/boris-26-2-12/0.webp" alt="Boris Cherny intro tweet" width="50%" /></a>

---

## 1/ Configure Your Terminal

Set up your terminal for the best Claude Code experience:

- **Theme**: Run `/config` to set light/dark mode
- **Notifications**: Enable notifications for iTerm2, or use a custom notification hook
- **Newlines**: If using Claude Code in an IDE terminal, Apple Terminal, Warp, or Alacritty, run `/terminal-setup` to enable shift+enter for newlines (so you don't need to type `\`)
- **Vim mode**: Run `/vim`

<a href="https://x.com/bcherny/status/2021699859359883608"><img src="assets/boris-26-2-12/1.webp" alt="Configure your terminal" width="50%" /></a>

---

## 2/ Adjust Effort Level

Run `/model` to pick your preferred effort level:

- **Low** — fewer tokens, faster responses
- **Medium** — balanced behavior
- **High** — more tokens, more intelligence

Boris's preference: High for everything.

<a href="https://x.com/bcherny/status/2021699860869902424"><img src="assets/boris-26-2-12/2.webp" alt="Adjust effort level" width="50%" /></a>

---

## 3/ Install Plugins, MCPs, and Skills

Plugins let you install LSPs (available for every major language), MCPs, skills, agents, and custom hooks.

Install from the official Anthropic plugin marketplace, or create your own marketplace for your company. Check the `settings.json` into your codebase to auto-add the marketplaces for your team.

Run `/plugin` to get started.

<a href="https://x.com/bcherny/status/2021699862522364149"><img src="assets/boris-26-2-12/3.webp" alt="Install Plugins, MCPs, and Skills" width="50%" /></a>

---

## 4/ Create Custom Agents

Drop `.md` files in `.claude/agents` to create custom agents. Each agent can have a custom name, color, tool set, pre-allowed and pre-disallowed tools, permission mode, and model.

You can also set the default agent for the main conversation using the `"agent"` field in `settings.json` or the `--agent` flag.

Run `/agents` to get started.

<a href="https://x.com/bcherny/status/2021700144039903699"><img src="assets/boris-26-2-12/4.webp" alt="Create custom agents" width="50%" /></a>

---

## 5/ Pre-approve Common Permissions

Claude Code uses a permission system combining prompt injection detection, static analysis, sandboxing, and human oversight.

Out of the box, a small set of safe commands are pre-approved. To pre-approve more, run `/permissions` and add to the allow and block lists. Check these into your team's `settings.json`.

Full wildcard syntax is supported — e.g., `Bash(bun run *)` or `Edit(/docs/**)`.

<a href="https://x.com/bcherny/status/2021700332292911228"><img src="assets/boris-26-2-12/5.webp" alt="Pre-approve common permissions" width="50%" /></a>

---

## 6/ Enable Sandboxing

Opt into Claude Code's open source sandbox runtime to improve safety while reducing permission prompts.

Run `/sandbox` to enable it. Sandboxing runs on your machine and supports both file and network isolation.

<a href="https://x.com/bcherny/status/2021700506465579443"><img src="assets/boris-26-2-12/6.webp" alt="Enable sandboxing" width="50%" /></a>

---

## 7/ Add a Status Line

Custom status lines show up right below the composer, displaying model, directory, remaining context, cost, and anything else you want to see while you work.

Every team member can have a different statusline. Use `/statusline` to have Claude generate one based on your `.bashrc`/`.zshrc`.

<a href="https://x.com/bcherny/status/2021700784019452195"><img src="assets/boris-26-2-12/7.webp" alt="Add a status line" width="50%" /></a>

---

## 8/ Customize Your Keybindings

Every key binding in Claude Code is customizable. Run `/keybindings` to re-map any key. Settings live reload so you can see how it feels immediately.

<a href="https://x.com/bcherny/status/2021700883873165435"><img src="assets/boris-26-2-12/8.webp" alt="Customize your keybindings" width="50%" /></a>

---

## 9/ Set Up Hooks

Hooks let you deterministically hook into Claude's lifecycle:

- Automatically route permission requests to Slack or Opus
- Nudge Claude to keep going when it reaches the end of a turn (you can even kick off an agent or use a prompt to decide whether Claude should keep going)
- Pre-process or post-process tool calls, e.g., to add your own logging

Ask Claude to add a hook to get started.

<a href="https://x.com/bcherny/status/2021701059253874861"><img src="assets/boris-26-2-12/9.webp" alt="Set up hooks" width="50%" /></a>

---

## 10/ Customize Your Spinner Verbs

Customize your spinner verbs to add or replace the default list with your own verbs. Check the `settings.json` into source control to share verbs with your team.

<a href="https://x.com/bcherny/status/2021701145023197516"><img src="assets/boris-26-2-12/10.webp" alt="Customize your spinner verbs" width="50%" /></a>

---

## 11/ Use Output Styles

Run `/config` and set an output style to have Claude respond using a different tone or format.

- **Explanatory** — recommended when getting familiar with a new codebase, to have Claude explain frameworks and code patterns as it works
- **Learning** — to have Claude coach you through making code changes
- **Custom** — create custom output styles to adjust Claude's voice

<a href="https://x.com/bcherny/status/2021701379409273093"><img src="assets/boris-26-2-12/11.webp" alt="Use output styles" width="50%" /></a>

---

## 12/ Customize All the Things!

Claude Code works great out of the box, but when you do customize, check your `settings.json` into git so your team can benefit too. Configuration is supported at multiple levels:

- For your codebase
- For a sub-folder
- For just yourself
- Via enterprise-wide policies

With 37 settings and 84 environment variables (use the `"env"` field in your `settings.json` to avoid wrapper scripts), there's a good chance any behavior you want is configurable.

<a href="https://x.com/bcherny/status/2021701636075458648"><img src="assets/boris-26-2-12/12.webp" alt="Customize all the things" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — February 12, 2026](https://x.com/bcherny)
- [Claude Code Terminal Setup Docs](https://code.claude.com/docs/en/terminal)
- [Claude Code Plugins & Discovery Docs](https://code.claude.com/docs/en/discover-plugins)
- [Claude Code Sub-agents Docs](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Permissions Docs](https://code.claude.com/docs/en/permissions)
- [Claude Code Sandbox Docs](https://code.claude.com/docs/en/sandbox)
- [Claude Code Status Line Docs](https://code.claude.com/docs/en/statusline)
- [Claude Code Keyboard Shortcuts Docs](https://code.claude.com/docs/en/keybindings)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Code Output Styles Docs](https://code.claude.com/docs/en/output-styles)
- [Claude Code Settings Docs](https://code.claude.com/docs/en/settings)


<!-- FILE: tips/claude-boris-13-tips-03-jan-26.md -->

# How I Use Claude Code — 13 Tips from Boris Cherny

A summary of setup tips shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on January 3, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

Boris shared his personal Claude Code setup, noting it's "surprisingly vanilla" — Claude Code works great out of the box, so he doesn't customize it much. There's no one correct way to use it: the team intentionally builds it so you can use, customize, and hack it however you like. Each person on the Claude Code team uses it very differently.

<a href="https://x.com/bcherny/status/2007179832300581177"><img src="assets/boris-26-1-3/0.png" alt="Boris Cherny intro tweet" width="50%" /></a>

---

## 1/ Run 5 Claudes in Parallel

Run 5 Claudes in parallel in your terminal. Number your tabs 1–5, and use system notifications to know when a Claude needs input.

See: [Terminal Setup Docs](https://code.claude.com/docs/en/terminal)

<a href="https://x.com/bcherny/status/2007179833990885678"><img src="assets/boris-26-1-3/1.png" alt="Run 5 Claudes in parallel" width="50%" /></a>

---

## 2/ Use claude.ai/code for Even More Parallelism

Run 5–10 Claudes on claude.ai/code in parallel with your local Claudes. Hand off local sessions to web sessions using `claude.ai/code`, manually kick off sessions in Chrome, and teleport back and forth.

<a href="https://x.com/bcherny/status/2007179836704600237"><img src="assets/boris-26-1-3/2.png" alt="claude.ai/code parallelism" width="50%" /></a>

---

## 3/ Use Opus with Thinking for Everything

Use Opus 4.5 with thinking for everything. It's the best coding model Boris has ever used — even though it's bigger and slower than Sonnet, since you have to steer it less and it's better at tool use, it is almost always faster than using a smaller model in the end.

<a href="https://x.com/bcherny/status/2007179838864666847"><img src="assets/boris-26-1-3/3.png" alt="Opus with thinking" width="50%" /></a>

---

## 4/ Share a Single CLAUDE.md with Your Team

Share a single `CLAUDE.md` for the repo. Check it into git, and have the whole team contribute multiple times a week. Anytime Claude does something incorrectly, add it to the `CLAUDE.md` so Claude knows not to do it next time.

<a href="https://x.com/bcherny/status/2007179840848597422"><img src="assets/boris-26-1-3/4.png" alt="Shared CLAUDE.md" width="50%" /></a>

---

## 5/ Tag @claude on PRs to Update CLAUDE.md

During code review, tag `@claude` on your coworkers' PRs to add something to the `CLAUDE.md` as part of the PR. Use the Claude Code GitHub action ([install-@hub-action](https://github.com/apps/claude)) for this — it's Boris's version of Compounding Engineering.

<a href="https://x.com/bcherny/status/2007179842928947333"><img src="assets/boris-26-1-3/5.png" alt="Tag @claude on PRs" width="50%" /></a>

---

## 6/ Start Most Sessions in Plan Mode

Start most sessions in Plan mode (shift+tab twice). If the goal is to write a Pull Request, use Plan mode and go back and forth with Claude until you like its plan. From there, switch into auto-accept edits mode and Claude can usually 1-shot it. A good plan is really important.

<a href="https://x.com/bcherny/status/2007179845336527000"><img src="assets/boris-26-1-3/6.png" alt="Plan mode" width="50%" /></a>

---

## 7/ Use Slash Commands for Inner Loop Workflows

Use slash commands for every "inner loop" workflow that you do many times a day. This saves you from repeated prompting, and makes it so Claude can use these workflows too. Commands are checked into git and live in `.claude/commands/`.

Example: `/commit-push-pr` — Commit, push, and open a PR.

<a href="https://x.com/bcherny/status/2007179847949500714"><img src="assets/boris-26-1-3/7.png" alt="Slash commands" width="50%" /></a>

---

## 8/ Use Subagents to Automate Common Workflows

Use a few subagents regularly: `code-simplifier` simplifies the code after Claude is done working, `verify-app` has detailed instructions for testing Claude Code end to end, and so on. Think of subagents as automating the most common workflows — similar to slash commands.

Subagents live in `.claude/agents/`.

<a href="https://x.com/bcherny/status/2007179850139000872"><img src="assets/boris-26-1-3/8.png" alt="Subagents" width="50%" /></a>

---

## 9/ Use a PostToolUse Hook to Auto-Format Code

Use a `PostToolUse` hook to format Claude's code. Claude usually generates well-formatted code out of the box, and the hook handles the last 10% to avoid formatting errors in CI later.

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "bun run format || true"
      }
    ]
  }
]
```

<a href="https://x.com/bcherny/status/2007179852047335529"><img src="assets/boris-26-1-3/9.png" alt="PostToolUse hook for formatting" width="50%" /></a>

---

## 10/ Pre-allow Permissions Instead of --dangerously-skip-permissions

Don't use `--dangerously-skip-permissions`. Instead, use `/permissions` to pre-allow common bash commands that you know are safe in your environment, to avoid unnecessary permission prompts. Most of these are checked into `.claude/settings.json` and shared with the team.

<a href="https://x.com/bcherny/status/2007179854077407667"><img src="assets/boris-26-1-3/10.png" alt="Pre-allow permissions" width="50%" /></a>

---

## 11/ Let Claude Use All Your Tools via MCP

Claude Code uses all your tools. It often searches and posts to Slack (via the MCP server), runs BigQuery queries to answer analytics questions (using `bq` CLI), grabs error logs from Sentry, etc. The Slack MCP configuration is checked into `.mcp.json` and shared with the team.

<a href="https://x.com/bcherny/status/2007179856266789204"><img src="assets/boris-26-1-3/11.png" alt="MCP tools" width="50%" /></a>

---

## 12/ Verify Long-Running Tasks with Background Agents

For very long-running tasks, either (a) prompt Claude to verify its work with a background agent when it's done, (b) use an agent Stop hook to do that more deterministically, or (c) use the ralph-wiggum plugin (originally dreamt up by @GeoffreyHuntley).

<a href="https://x.com/bcherny/status/2007179858435281082"><img src="assets/boris-26-1-3/12.png" alt="Long-running tasks verification" width="50%" /></a>

---

## 13/ Give Claude a Way to Verify Its Work

Probably the most important thing to get great results out of Claude Code — give Claude a way to verify its work. If Claude has that feedback loop, it will 2–3x the quality of the final result.

Claude tests every single change Boris lands.

<a href="https://x.com/bcherny/status/2007179861115511237"><img src="assets/boris-26-1-3/13.png" alt="Give Claude a way to verify" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — January 3, 2026](https://x.com/bcherny/status/2007179832300581177)


<!-- FILE: tips/claude-boris-15-tips-30-mar-26.md -->

# 15 Hidden & Under-Utilized Features in Claude Code — From Boris Cherny

A summary of tips shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on March 30, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

Boris shared a bunch of his favorite hidden and under-utilized features in Claude Code, focusing on the ones he uses the most.

<a href="https://x.com/bcherny/status/2038454336355999749"><img src="assets/boris-26-3-30/0.png" alt="Boris Cherny intro tweet" width="50%" /></a>

---

## 1/ Claude Code Has a Mobile App

Did you know Claude Code has a mobile app? Boris writes a lot of his code from the iOS app — it's a convenient way to make changes without opening a laptop.

- Download the Claude app for iOS/Android
- Navigate to the **Code** tab on the left
- You can review changes, approve PRs, and write code directly from your phone

<a href="https://x.com/bcherny/status/2038454337811386436"><img src="assets/boris-26-3-30/1.png" alt="Claude Code mobile app" width="50%" /></a>

---

## 2/ Move Sessions Between Mobile/Web/Desktop and Terminal

Run `claude --teleport` or `/teleport` to continue a cloud session on your machine. Or run `/remote-control` to control a locally running session from your phone/web.

- **Teleport**: pulls a cloud session down to your local terminal
- **Remote Control**: lets you control a local session from any device
- Boris has **"Enable Remote Control for all sessions"** set in his `/config`

<a href="https://x.com/bcherny/status/2038454339933548804"><img src="assets/boris-26-3-30/2.png" alt="Teleport and Remote Control" width="50%" /></a>

---

## 3/ /loop and /schedule — Two of the Most Powerful Features

Use these to schedule Claude to run automatically at a set interval, for up to a week at a time. Boris has a bunch of loops running locally:

- `/loop 5m /babysit` — auto-address code review, auto-rebase, and shepherd PRs to production
- `/loop 30m /slack-feedback` — automatically put up PRs for Slack feedback every 30 mins
- `/loop /post-merge-sweeper` — put up PRs to address code review comments he missed
- `/loop 1h /pr-pruner` — close out stale and no longer necessary PRs
- ...and lots more!

Experiment with turning workflows into skills + loops. It's powerful.

<a href="https://x.com/bcherny/status/2038454341884154269"><img src="assets/boris-26-3-30/3.png" alt="/loop and /schedule" width="50%" /></a>

---

## 4/ Use Hooks to Deterministically Run Logic

Use hooks to run logic as part of the agent lifecycle. For example:

- **Dynamically load** in context each time you start Claude (`SessionStart`)
- **Log every bash command** the model runs (`PreToolUse`)
- **Route permission prompts** to WhatsApp for you to approve/deny (`PermissionRequest`)
- **Poke Claude** to keep going whenever it stops (`Stop`)

<a href="https://x.com/bcherny/status/2038454343519932844"><img src="assets/boris-26-3-30/4.png" alt="Use hooks" width="50%" /></a>

---

## 5/ Cowork Dispatch

Boris uses Dispatch every day to catch up on Slack and emails, manage files, and do things on his laptop when he's not at a computer. When he's not coding, he's dispatching.

- Dispatch is a **secure remote control** for the Claude Desktop app
- It can use your MCPs, browser, and computer, with your permission
- Think of it as a way to delegate non-coding tasks to Claude from anywhere

<a href="https://x.com/bcherny/status/2038454345419936040"><img src="assets/boris-26-3-30/5.png" alt="Cowork Dispatch" width="50%" /></a>

---

## 6/ Use the Chrome Extension for Frontend Work

The most important tip for using Claude Code: **give Claude a way to verify its output.** Once you do that, Claude will iterate until the result is great.

- Think of it like asking someone to build a website but they aren't allowed to use a browser — the result probably won't look good
- Give Claude a browser and it will write code and iterate until it looks good
- Boris uses the Chrome extension every time he works on web code — it tends to work more reliably than other similar MCPs

<a href="https://x.com/bcherny/status/2038454347156398333"><img src="assets/boris-26-3-30/6.png" alt="Chrome extension for frontend" width="50%" /></a>

---

## 7/ Use the Claude Desktop App to Auto-Start and Test Web Servers

Along the same vein, the Desktop app bundles in the ability for Claude to **automatically run your web server and even test it in a built-in browser.**

- You can set up something similar in CLI or VSCode using the Chrome extension
- Or just use the Desktop app for the integrated experience

<a href="https://x.com/bcherny/status/2038454348804714642"><img src="assets/boris-26-3-30/7.png" alt="Desktop app web server testing" width="50%" /></a>

---

## 8/ Fork Your Session

People often ask how to fork an existing session. Two ways:

1. Run `/branch` from your session
2. From the CLI, run `claude --resume <session-id> --fork-session`

`/branch` creates a branched conversation — you are now in the branch. To resume the original, use `claude -r <original-session-id>`.

<a href="https://x.com/bcherny/status/2038454350214041740"><img src="assets/boris-26-3-30/8.png" alt="Fork your session" width="50%" /></a>

---

## 9/ Use /btw for Side Queries

Boris uses this all the time to answer quick questions while the agent works. `/btw` lets you ask a side question without interrupting the agent's current task.

Example:
```
/btw how do I spell dachshund?
> dachshund — German for "badger dog" (dachs + badger, hund + dog).
↑/↓ to scroll · Space, Enter, or Escape to dismiss
```

<a href="https://x.com/bcherny/status/2038454351849787485"><img src="assets/boris-26-3-30/9.png" alt="/btw for side queries" width="50%" /></a>

---

## 10/ Use Git Worktrees

Claude Code ships with deep support for git worktrees. Worktrees are essential for doing lots of parallel work in the same repository. Boris has **dozens of Claudes running at all times**, and this is how he does it.

- Use `claude -w` to start a new session in a worktree
- Or hit the **"worktree" checkbox** in the Claude Desktop app
- For non-git VCS users, use the `WorktreeCreate` hook to add your own logic for worktree creation

<a href="https://x.com/bcherny/status/2038454353787519164"><img src="assets/boris-26-3-30/10.png" alt="Git worktrees" width="50%" /></a>

---

## 11/ Use /batch to Fan Out Massive Changesets

`/batch` interviews you, then has Claude fan out the work to as many **worktree agents** as it takes (dozens, hundreds, even thousands) to get it done.

- Use it for large code migrations and other kinds of parallelizable work
- Each worktree agent works independently on its own copy of the codebase

<a href="https://x.com/bcherny/status/2038454355469484142"><img src="assets/boris-26-3-30/11.png" alt="/batch for massive changesets" width="50%" /></a>

---

## 12/ Use --bare to Speed Up SDK Startup by Up to 10x

By default, when you run `claude -p` (or the TypeScript or Python SDKs), Claude searches for local CLAUDE.md's, settings, and MCPs. But for non-interactive usage, most of the time you want to explicitly specify what to load via `--system-prompt`, `--mcp-config`, `--settings`, etc.

- This was a design oversight when the SDK was first built
- In a future version, they will flip the default to `--bare`
- For now, opt in with the flag to get up to **10x faster startup**

```bash
claude -p "summarize this codebase" \
    --output-format=stream-json \
    --verbose \
    --bare
```

<a href="https://x.com/bcherny/status/2038454357088457168"><img src="assets/boris-26-3-30/12.png" alt="--bare flag for SDK startup" width="50%" /></a>

---

## 13/ Use --add-dir to Give Claude Access to More Folders

When working across multiple repositories, Boris usually starts Claude in one repo and uses `--add-dir` (or `/add-dir`) to let Claude see the other repo.

- This not only tells Claude about the repo, but also **gives it permissions** to work in the repo
- Or, add `"additionalDirectories"` to your team's `settings.json` to always load in additional folders when starting Claude Code

<a href="https://x.com/bcherny/status/2038454359047156203"><img src="assets/boris-26-3-30/13.png" alt="--add-dir for multiple repos" width="50%" /></a>

---

## 14/ Use --agent to Give Claude Code a Custom System Prompt & Tools

Custom agents are a powerful primitive that often gets overlooked. To use it, just define a new agent in `.claude/agents/`, then run:

```bash
claude --agent=<your agent's name>
```

- Agents can have restricted tools, custom descriptions, and specific models
- They're great for creating read-only agents, specialized review agents, or domain-specific tools

<a href="https://x.com/bcherny/status/2038454360418787764"><img src="assets/boris-26-3-30/14.png" alt="--agent for custom system prompts" width="50%" /></a>

---

## 15/ Use /voice to Enable Voice Input

Fun fact: Boris does most of his coding by speaking to Claude, rather than typing.

- Run `/voice` in CLI then hold the space bar to speak
- Press the voice button on Desktop
- Or enable dictation in your iOS settings

<a href="https://x.com/bcherny/status/2038454362226467112"><img src="assets/boris-26-3-30/15.png" alt="/voice for voice input" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — March 30, 2026](https://x.com/bcherny/status/2038454336355999749)


<!-- FILE: tips/claude-boris-2-tips-10-mar-26.md -->

# Code Review & Test Time Compute — Tips from Boris Cherny

A summary of insights shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on March 10, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## 1/ Introducing Code Review

New in Claude Code: **Code Review**. A team of agents runs a deep review on every PR.

- Built for Anthropic's own team first — code output per engineer is up **200% this year**, and reviews were the bottleneck
- Boris has been using it for a few weeks and found it catches many real bugs he would not have noticed otherwise
- When a PR opens, Claude dispatches a team of agents to hunt for bugs

<a href="https://x.com/bcherny/status/2031089411820228645"><img src="assets/boris-26-3-10/0.png" alt="Boris Cherny announcing Code Review" width="50%" /></a>

---

## 2/ Test Time Compute & Multiple Context Windows

Roughly, the more tokens you throw at a coding problem, the better the result. Boris calls this **test time compute**.

- Using **separate context windows** makes the result even better — this is what makes subagents work, and why one agent can cause bugs and another (using the same exact model) can find them
- Similar to engineering teams: if Boris causes a bug, his coworker reviewing the code might find it more reliably than he can
- In the limit, agents will probably write perfect bug-free code — until then, **multiple uncorrelated context windows** tends to be a good approach

<a href="https://x.com/bcherny/status/2031151689219321886"><img src="assets/boris-26-3-10/1.png" alt="Boris Cherny on test time compute" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — March 10, 2026](https://x.com/bcherny)


<!-- FILE: tips/claude-boris-2-tips-25-mar-26.md -->

# Squash Merging & PR Size Distribution — Tips from Boris Cherny

A summary of insights shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on March 25, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## 1/ 266 Contributions in a Single Day — Always Squash

Boris shared his GitHub contribution graph showing **266 contributions on March 24th** — from **141 PRs, always squashed** with a median of **118 lines** per PR.

- Squash merging combines all branch commits into a single commit on the target branch — keeping history clean and linear
- Each PR = one commit makes it easy to revert entire features and simplifies `git bisect`
- At high-velocity AI-assisted workflows (141 PRs/day), squash is the pragmatic choice — individual "fix lint", "try this" commits within a branch are noise

<a href="https://x.com/bcherny/status/2038552880018538749"><img src="assets/boris-26-3-25/1.png" alt="Boris Cherny — 266 contributions, always squashed" width="50%" /></a>

---

## 2/ PR Size Distribution — Keep PRs Small

Boris shared the size distribution across those 141 PRs, totaling **45,032 lines changed** (additions + deletions):

| Metric | Lines (add+del) | Meaning |
|--------|---------------:|---------|
| **p50** | **118** | Median PR size — half of all PRs were 118 lines or fewer |
| p90 | 498 | 90% of PRs were under 500 lines |
| **p99** | **2,978** | Only ~1 PR exceeded ~3K lines |
| min | 2 | Smallest PR — a quick 2-line fix |
| max | 10,459 | Largest single PR — likely a migration or generated code |

- A **median of 118 lines** means most PRs are focused and reviewable, even at 141 PRs/day
- The distribution is heavily right-skewed — the occasional large PR is inevitable (bulk renames, migrations), but the norm is tight
- Small PRs reduce merge conflict risk, are easier to review, and pair perfectly with squash merging for clean reverts

<a href="https://x.com/bcherny/status/2038552880018538749"><img src="assets/boris-26-3-25/2.png" alt="Boris Cherny — PR size distribution table" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — March 25, 2026](https://x.com/bcherny)


<!-- FILE: tips/claude-boris-6-tips-16-apr-26.md -->

# 6 Tips for Getting More Out of Opus 4.7 — From Boris Cherny

A thread of tips shared by Boris Cherny ([@bcherny](https://x.com/bcherny)), creator of Claude Code, on April 16, 2026 — after dogfooding Opus 4.7 for the last few weeks.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

After dogfooding Opus 4.7 for a few weeks, Boris has been feeling "incredibly productive" and shared six ways to get more out of the new model — from permission automation to effort tuning to verification patterns.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/0.png" alt="Boris Cherny intro tweet — dogfooding Opus 4.7" width="50%" /></a>

---

## 1/ Auto Mode — No More Permission Prompts

Opus 4.7 loves doing complex, long-running tasks: deep research, refactoring code, building complex features, iterating until a performance benchmark is hit. In the past, you either had to babyset the model while it did these sorts of long tasks, or use `--dangerously-skip-permissions`.

Anthropic recently rolled out **auto mode** as a safer alternative. In this mode, permission prompts are routed to a model-based classifier that decides whether the command is safe to run:

- If it's safe, auto-approve
- If it's risky, pause and ask

This means no more babysitting while the model runs. More than that, it means you can run more Claudes in parallel — if safe, you can switch focus to the next Claude.

Auto mode is now available for Opus 4.7 for Max, Teams, and Enterprise users. **Shift+Tab** to cycle between `Ask permissions` → `Plan mode` → `Auto mode` in the CLI, or choose it from the dropdown in Desktop or VS Code.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/1.png" alt="Boris Cherny on auto mode" width="50%" /></a>

---

## 2/ The New /fewer-permission-prompts Skill

Anthropic released a new `/fewer-permission-prompts` skill. It scans through your session history to find common bash and MCP commands that are safe but repeatedly prompt for permission. It then recommends a list of commands to add to your permissions allowlist.

Use this to tune up your permissions and avoid unnecessary permission prompts, especially if you don't use auto mode.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/2.png" alt="Boris Cherny on /fewer-permission-prompts skill" width="50%" /></a>

---

## 3/ Recaps

Anthropic shipped **recaps** earlier this week, to prep for Opus 4.7. Recaps are short summaries of what an agent did and what's next.

Very useful when returning to a long-running session after a few minutes or a few hours:

```
* Cogitated for 6m 27s

* recap: Fixing the post-submit transcript shift bug. The styling-flash
  part is shipped as PR #29869 (auto-merge on, posted to stamps). Next:
  I need a screen recording of the remaining horizontal rewrap on `cc -c`
  to target that separate cause. (disable recaps in /config)
```

Disable recaps in `/config` if you don't want them.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/3.png" alt="Boris Cherny on recaps" width="50%" /></a>

---

## 4/ Focus Mode

Boris has been loving the new **focus mode** in the CLI, which hides all the intermediate work to just focus on the final result. The model has reached a point where he generally trusts it to run the right commands and make the right edits. He just looks at the final result.

Use `/focus` to toggle on/off.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/4.png" alt="Boris Cherny on focus mode" width="50%" /></a>

---

## 5/ Configure Your Effort Level

Opus 4.7 uses **adaptive thinking** instead of thinking budgets. To tune the model to think more or less, tune effort.

- **Lower effort** — faster responses and lower token usage
- **Higher effort** — the most intelligence and capability

The slider presents five levels: `low` · `medium` · `high` · `xhigh` · `max` — Speed on the left, Intelligence on the right.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/5.png" alt="Boris Cherny on effort levels" width="50%" /></a>

---

## 6/ Give Claude a Way to Verify Its Work

Finally, make sure Claude has a way to verify its work. This has always been important — now 4.7 is 2-3x what you get out of Claude, so it's more important than ever.

Verification looks different depending on the task:

- **Backend work** — have Claude run your server/service to test end-to-end
- **Frontend work** — use the [Claude Chromium extension](https://code.claude.com/docs/en/chrome) to give Claude a way to control your browser
- **Desktop apps** — use Computer Use

Boris's prompts these days look like `Claude do blah blah /go`, where `/go` is a skill that:

1. Tests itself end-to-end using bash, browser, or computer use
2. Runs `/simplify`
3. Puts up a PR

For long-running work, verification matters even more — when you come back to a task, you know the code works.

<a href="https://x.com/bcherny"><img src="assets/boris-26-4-16/6.png" alt="Boris Cherny on verification" width="50%" /></a>

---

## Sources

- [Boris Cherny (@bcherny) on X — April 16, 2026](https://x.com/bcherny)


<!-- FILE: tips/claude-thariq-tips-16-apr-26.md -->

# Using Claude Code: Session Management & 1M Context — Thariq

A guide on managing sessions, context windows, and compaction in Claude Code, shared by Thariq ([@trq212](https://x.com/trq212)) on April 16, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

With the 1M token context window, Claude Code can handle longer tasks more reliably — but it also opens the door to context pollution if you're not deliberate about managing your sessions. Session management matters more than ever: when to start fresh, when to compact, when to rewind, and when to delegate to subagents.

<img src="assets/thariq-26-4-16/1.png" alt="Thariq intro tweet" width="50%" />

<img src="assets/thariq-26-4-16/2.png" alt="Session management intro" width="50%" />

---

## A Quick Primer on Context, Compaction & Context Rot

The context window is everything the model can "see" at once when generating its next response. It includes your system prompt, the conversation so far, every tool call and its output, and every file that's been read. Claude Code has a context window of **one million tokens**.

Unfortunately using context has a slight cost — **context rot**. Model performance degrades as context grows because attention gets spread across more tokens, and older, irrelevant content starts to distract from the current task. For the 1M context model, some level of context rot happens around **~300-400k tokens**, but it is highly dependent on the task — not a fast rule.

Context windows are a hard cutoff. When you're nearing the end, you need to summarize the task and continue in a new context window — this is **compaction**. You can also trigger compaction yourself.

<img src="assets/thariq-26-4-16/3.png" alt="Context window diagram" width="50%" />

<img src="assets/thariq-26-4-16/4.png" alt="Context rot explanation" width="50%" />

---

## Every Turn Is a Branching Point

After Claude finishes a turn, you have a surprising number of options for what to do next:

- **Continue** — send another message in the same session
- **/rewind (esc esc)** — jump back to a previous message and try again from there
- **/clear** — start a new session, usually with a brief you've distilled from what you just learned
- **Compact** — summarize the session so far and keep going on top of the summary
- **Subagents** — delegate the next chunk of work to an agent with its own clean context, and only pull its result back in

While the most natural is just to continue, the other four options exist to help you manage your context.

<img src="assets/thariq-26-4-16/5.png" alt="Compaction and branching diagram" width="50%" />

<img src="assets/thariq-26-4-16/6.png" alt="Five options after a turn" width="50%" />

Each option carries a different amount of existing context forward:

| Fresh session | Compact | Subagent | Rewind | Continue |
|:---:|:---:|:---:|:---:|:---:|
| your brief only | lossy summary | all + result | prefix kept, tail cut | everything stays |
| *none of it* | | | | *all of it* |

<img src="assets/thariq-26-4-16/7.png" alt="Context carry-forward spectrum" width="50%" />

---

## When to Start a New Session

The new 1M context windows means you can now do longer tasks more reliably — for example, building a full-stack app from scratch. But just because your model hasn't run out of context, it doesn't mean you shouldn't start a new session.

**General rule of thumb: when you start a new task, you should also start a new session.**

A grey area is when you may want to do related tasks where some of the context is still necessary, but not all. For example, writing the documentation for a feature you just implemented. While you could start a new session, Claude would have to reread the files, which would be slower and more expensive. Since documentation may not be a highly intelligence-sensitive task, the extra context is probably worth the efficiency gain.

<img src="assets/thariq-26-4-16/8.png" alt="When to start a new session" width="50%" />

---

## Rewinding Instead of Correcting

If Thariq had to pick one habit that signals good context management, it's **rewind**.

In Claude Code, double-tapping Esc (or running `/rewind`) lets you jump back to any previous message and re-prompt from there. The messages after that point are dropped from the context.

**Correcting** (saying "no, try B" after a failed attempt A) leaves the failed attempt in context:
> context = reads + 2 failed attempts + 2 corrections + the fix

**Rewinding** (going back to before the failed attempt and re-prompting with what you learned) is cleaner:
> context = reads + one informed prompt + the fix

Rewind is often the better approach. For example, Claude reads five files, tries an approach, and it doesn't work. Your instinct may be to type "that didn't work, try X instead." But the better move is to rewind to just after the file reads, and re-prompt with what you learned: "Don't use approach A, the foo module doesn't expose that — go straight to B."

You can also use **"summarize from here"** to have Claude summarize its learnings and create a handoff message, kind of like a message to the previous iteration of Claude from its future self that tried something and it didn't work.

<img src="assets/thariq-26-4-16/9.png" alt="Correcting vs rewinding diagram" width="50%" />

<img src="assets/thariq-26-4-16/10.png" alt="Rewind with summarize from here" width="50%" />

---

## Compacting vs. Fresh Sessions

Once a session gets long, you have two ways to shed weight: `/compact` or `/clear` (and start fresh). They feel similar but behave very differently.

**Compact** asks the model to summarize the conversation so far, then replaces the history with that summary. It's lossy — you're trusting Claude to decide what mattered, but you didn't have to write anything yourself. Claude might be more thorough in including important learnings or files. You can also steer it by passing instructions (`/compact focus on the auth refactor, drop the test debugging`).

- **Mid-task**, keep momentum — details can be fuzzy
- Cheap, keep going

**Fresh + brief** (`/clear`) means *you* write down what matters ("we're refactoring the auth middleware, the constraint is X, the files that matter are A and B, we've ruled out approach Y") and start clean. It's more work, but the resulting context is what *you* decided was relevant.

- **High-stakes** next step — found one fact in 100K of exploration
- More work, more exact

<img src="assets/thariq-26-4-16/11.png" alt="Compacting vs fresh sessions" width="50%" />

<img src="assets/thariq-26-4-16/12.png" alt="Compact vs fresh diagram" width="50%" />

---

## What Causes a Bad Compact?

If you run a lot of long running sessions, you might have noticed times in which compacting might be particularly bad. Bad compacts can happen when the model can't predict the direction your work is going.

For example, autocompact fires after a long debugging session and summarizes the investigation. Your next message is "now fix that other warning we saw in bar.ts." But because the session was focused on debugging, the other warning might have been dropped from the summary.

This is particularly difficult, because due to context rot, the model is at its least intelligent point when compacting. With one million context, you have more time to `/compact` proactively with a description of what you want to do.

<img src="assets/thariq-26-4-16/13.png" alt="Bad compact diagram" width="50%" />

<img src="assets/thariq-26-4-16/14.png" alt="Bad compact explanation" width="50%" />

---

## Subagents & Fresh Context Windows

Subagents are a form of context management, useful for when you know in advance that a chunk of work will produce a lot of intermediate output you won't need again.

When Claude spawns a subagent via the Agent tool, that subagent gets its own fresh context window. It can do as much work as it needs to, and then synthesize its results so only the final report comes back to the parent.

The mental test: **will I need this tool output again, or just the conclusion?**

The exploration noise is garbage-collected when the subagent exits — 20 file reads, 12 greps, 3 dead ends — only the final report returns to the parent context.

While Claude Code will automatically call subagents, you may want to tell it to explicitly do this. For example:

- "Spin up a subagent to verify the result of this work based on the following spec file"
- "Spin off a subagent to read through this other codebase and summarize how it implemented the auth flow, then implement it yourself in the same way"
- "Spin off a subagent to write the docs on this feature based on my git changes"

<img src="assets/thariq-26-4-16/15.png" alt="Subagent context diagram" width="50%" />

<img src="assets/thariq-26-4-16/16.png" alt="Subagent explanation" width="50%" />

<img src="assets/thariq-26-4-16/17.png" alt="When to use subagents" width="50%" />

---

## Summary

When Claude has ended a turn and you're about to send a new message, you have a decision point. Over time, Claude will handle this itself, but for now this is one of the ways you can guide Claude's output.

| Situation | Reach for | Why |
|-----------|-----------|-----|
| Same task, context is still relevant | **Continue** | Everything in the window is still load-bearing — don't pay to rebuild it |
| Claude went down a wrong path | **Rewind** (double-Esc) | Keep the useful file reads, drop the failed attempt, re-prompt with what you learned |
| Mid-task but session is bloated with stale debugging/exploration | **/compact \<hint\>** | Low effort; Claude decides what mattered. Steer it with a hint if needed |
| Starting a genuinely new task | **/clear** | Zero rot; you control exactly what carries forward |
| Next step will generate lots of output you'll only need the conclusion from | **Subagent** | Intermediate tool noise stays in the child's context; only the result comes back |

<img src="assets/thariq-26-4-16/18.png" alt="Summary" width="50%" />

<img src="assets/thariq-26-4-16/19.png" alt="Decision table" width="50%" />

---

## Sources

- [Thariq (@trq212) on X — April 16, 2026](https://x.com/trq212)


<!-- FILE: tips/claude-thariq-tips-17-mar-26.md -->

# Lessons from Building Claude Code: How We Use Skills — Thariq

A comprehensive guide on how Anthropic uses skills internally, shared by Thariq ([@trq212](https://x.com/trq212)) on March 17, 2026.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Context

Skills have become one of the most used extension points in Claude Code. They're flexible, easy to make, and simple to distribute. But this flexibility also makes it hard to know what works best. Thariq shares the lessons learned from using skills extensively at Anthropic with hundreds of them in active use.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/1.png" alt="Thariq intro tweet" width="50%" /></a>

---

## What are Skills?

A common misconception is that skills are "just markdown files", but the most interesting part is that they're **folders** that can include scripts, assets, data, etc. — things the agent can discover, explore, and manipulate. Skills also have a wide variety of configuration options including registering dynamic hooks.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/2.png" alt="What are Skills?" width="50%" /></a>

---

## Types of Skills

After cataloging all of their skills, the team noticed they cluster into 9 recurring categories. The best skills fit cleanly into one; the more confusing ones straddle several.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/3.png" alt="Types of Skills grid" width="50%" /></a>

---

### 1/ Library & API Reference

Skills that explain how to correctly use a library, CLI, or SDKs. These could be for internal libraries or common libraries that Claude Code sometimes has trouble with. They often include a folder of reference code snippets and a list of gotchas to avoid when writing a script.

**Examples:** billing-lib, internal-platform-cli, frontend-design

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/4.png" alt="Library & API Reference" width="50%" /></a>

---

### 2/ Product Verification

Skills that describe how to test or verify that your code is working. These are often paired with an external tool like Playwright, tmux, etc. Verification skills are extremely useful for ensuring Claude's output is correct. It can be worth having an engineer spend a week just making your verification skills excellent.

**Examples:** signup-flow-driver, checkout-verifier, tmux-cli-driver

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/5.png" alt="Product Verification" width="50%" /></a>

---

### 3/ Data Fetching & Analysis

Skills that connect to your data and monitoring stacks. These might include libraries to fetch your data with credentials, specific dashboard IDs, etc., as well as instructions on common workflows or ways to get data.

**Examples:** funnel-query, cohort-compare, grafana

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/6.png" alt="Data Fetching & Analysis" width="50%" /></a>

---

### 4/ Business Process & Team Automation

Skills that automate repetitive workflows into one command. These are usually fairly simple instructions but might have more complicated dependencies on other skills or MCPs. Saving previous results in log files can help the model stay consistent and reflect on previous executions of the workflow.

**Examples:** standup-post, create-\<ticket-system\>-ticket, weekly-recap

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/7.png" alt="Business Process & Team Automation" width="50%" /></a>

---

### 5/ Code Scaffolding & Templates

Skills that generate framework boilerplate for a specific function in the codebase. You might combine these skills with scripts that can be composed. They are especially useful when your scaffolding has natural language requirements that can't be purely covered by code.

**Examples:** new-\<framework\>-workflow, new-migration, create-app

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/8.png" alt="Code Scaffolding & Templates" width="50%" /></a>

---

### 6/ Code Quality & Review

Skills that enforce code quality inside of your org and help review code. These can include deterministic scripts or tools for maximum robustness. You may want to run these skills automatically as part of hooks or inside of a GitHub Action.

**Examples:** adversarial-review, code-style, testing-practices

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/9.png" alt="Code Quality & Review" width="50%" /></a>

---

### 7/ CI/CD & Deployment

Skills that help you fetch, push, and deploy code inside of your codebase. These skills may reference other skills to collect data.

**Examples:** babysit-pr, deploy-\<service\>, cherry-pick-prod

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/10.png" alt="CI/CD & Deployment" width="50%" /></a>

---

### 8/ Runbooks

Skills that take a symptom (such as a Slack thread, alert, or error signature), walk through a multi-tool investigation, and produce a structured report.

**Examples:** \<service\>-debugging, oncall-runner, log-correlator

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/11.png" alt="Runbooks" width="50%" /></a>

---

### 9/ Infrastructure Operations

Skills that perform routine maintenance and operational procedures — some of which involve destructive actions that benefit from guardrails. These make it easier for engineers to follow best practices in critical operations.

**Examples:** \<resource\>-orphans, dependency-management, cost-investigation

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/12.png" alt="Infrastructure Operations" width="50%" /></a>

---

## Tips for Making Skills

9 best practices for writing effective skills, plus guidance on distribution and measurement.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/13.png" alt="Tips for Making Skills grid" width="50%" /></a>

---

### Tip 1: Don't State the Obvious

Claude Code knows a lot about your codebase, and Claude knows a lot about coding, including many default opinions. If you're publishing a skill that is primarily about knowledge, try to focus on information that pushes Claude out of its normal way of thinking. The frontend design skill is a great example — it was built by iterating with customers on improving Claude's design taste, avoiding classic patterns like the Inter font and purple gradients.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/14.png" alt="Don't State the Obvious" width="50%" /></a>

---

### Tip 2: Build a Gotchas Section

The highest-signal content in any skill is the Gotchas section. These sections should be built up from common failure points that Claude runs into when using your skill. Ideally, you will update your skill over time to capture these gotchas.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/15.png" alt="Build a Gotchas Section" width="50%" /></a>

---

### Tip 3: Use the File System & Progressive Disclosure

A skill is a folder, not just a markdown file. You should think of the entire file system as a form of context engineering and progressive disclosure. Tell Claude what files are in your skill, and it will read them at appropriate times. The simplest form is to point to other markdown files — e.g., split detailed function signatures and usage examples into `references/api.md`. You can have folders of references, scripts, examples, etc.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/16.png" alt="Progressive Disclosure" width="50%" /></a>

---

### Tip 4: Avoid Railroading Claude

Claude will generally try to stick to your instructions, and because skills are so reusable you'll want to be careful of being too specific. Give Claude the information it needs, but give it the flexibility to adapt to the situation. Instead of prescriptive step-by-step instructions, give the goal and constraints.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/17.png" alt="Avoid Railroading Claude" width="50%" /></a>

---

### Tip 5: Think through the Setup

Some skills may need to be set up with context from the user. A good pattern is to store this setup information in a `config.json` file in the skill directory. If the config is not set up, the agent can then ask the user for information. You can instruct Claude to use the AskUserQuestion tool for structured, multiple choice questions.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/18.png" alt="Think through the Setup" width="50%" /></a>

---

### Tip 6: The Description Field Is For the Model

When Claude Code starts a session, it builds a listing of every available skill with its description. This listing is what Claude scans to decide "is there a skill for this request?" Which means the description field is not a summary — it's a description of **when to trigger** this skill. Write it for the model.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/19.png" alt="Description = Trigger" width="50%" /></a>

---

### Tip 7: Memory & Storing Data

Some skills can include a form of memory by storing data within them. You could store data in anything as simple as an append-only text log file or JSON files, or as complicated as a SQLite database. Data stored in the skill directory may be deleted when you upgrade the skill, so use `${CLAUDE_PLUGIN_DATA}` as a stable folder per plugin to store data in.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/20.png" alt="Memory & Storing Data" width="50%" /></a>

---

### Tip 8: Store Scripts & Generate Code

One of the most powerful tools you can give Claude is code. Giving Claude scripts and libraries lets Claude spend its turns on composition, deciding what to do next rather than reconstructing boilerplate. Claude can then generate scripts on the fly to compose this functionality for more advanced analysis.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/21.png" alt="Store Scripts & Generate Code" width="50%" /></a>

---

### Tip 9: On Demand Hooks

Skills can include hooks that are only activated when the skill is called, and last for the duration of the session. Use this for more opinionated hooks that you don't want to run all the time but are extremely useful sometimes.

**Examples:**
- `/careful` — blocks rm -rf, DROP TABLE, force-push, kubectl delete via PreToolUse matcher on Bash
- `/freeze` — blocks any Edit/Write that's not in a specific directory

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/22.png" alt="On Demand Hooks" width="50%" /></a>

---

## Distributing Skills

Two ways to share skills with your team:
- **Check into your repo** (under `.claude/skills`) — best for smaller teams working across relatively few repos
- **Make a plugin** and have a Claude Code Plugin marketplace where users can upload and install plugins

Every skill that is checked in also adds a little bit to the context of the model. As you scale, an internal plugin marketplace allows you to distribute skills and let your team decide which ones to install.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/23.png" alt="Distributing Skills" width="50%" /></a>

---

## Managing a Marketplace

There isn't a centralized team that decides which skills go into a marketplace. Instead, try and find the most useful skills organically. Upload to a sandbox folder in GitHub and point people to it in Slack or other forums. Once a skill has gotten traction (which is up to the skill owner to decide), they can put in a PR to move it into the marketplace. Curation before release is important to avoid redundant skills.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/24.png" alt="Managing a Marketplace" width="50%" /></a>

---

## Composing Skills

You may want to have skills that depend on each other. For example, a file upload skill that uploads a file, and a CSV generation skill that makes a CSV and uploads it. This sort of dependency management is not natively built into marketplaces or skills yet, but you can just reference other skills by name, and the model will invoke them if they are installed.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/25.png" alt="Composing Skills" width="50%" /></a>

---

## Measuring Skills

To understand how a skill is doing, use a PreToolUse hook that lets you log skill usage within the company. This means you can find skills that are popular or are undertriggering compared to expectations.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/26.png" alt="Measuring Skills" width="50%" /></a>

---

## Conclusion

Skills are incredibly powerful, flexible tools for agents, but it's still early and we're all figuring out how to use them best. Think of this more as a grab bag of useful tips that we've seen work than a definitive guide. The best way to understand skills is to get started, experiment, and see what works for you. Most of ours began as a few lines and a single gotcha, and got better because people kept adding to them as Claude hit new edge cases.

<a href="https://x.com/trq212/status/2033949937936085378"><img src="assets/thariq-26-3-17/27.png" alt="Conclusion" width="50%" /></a>

---

## Sources

- [Thariq (@trq212) on X — March 17, 2026](https://x.com/trq212/status/2033949937936085378)
- [Skilljar — Agent Skills course](https://code.claude.com/docs/en/skills)
- [Skill Creator](https://code.claude.com/docs/en/skills)
