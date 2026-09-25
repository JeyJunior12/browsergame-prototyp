

<!-- FILE: best-practice/claude-cli-startup-flags.md -->

# CLI Startup Flags Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Mar%2002%2C%202026-white?style=flat&labelColor=555)

Reference for Claude Code startup flags, top-level subcommands, and startup environment variables when launching Claude Code from the terminal.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Table of Contents

1. [Session Management](#session-management)
2. [Model & Configuration](#model--configuration)
3. [Permissions & Security](#permissions--security)
4. [Output & Format](#output--format)
5. [System Prompt](#system-prompt)
6. [Agent & Subagent](#agent--subagent)
7. [MCP & Plugins](#mcp--plugins)
8. [Directory & Workspace](#directory--workspace)
9. [Budget & Limits](#budget--limits)
10. [Integration](#integration)
11. [Initialization & Maintenance](#initialization--maintenance)
12. [Debug & Diagnostics](#debug--diagnostics)
13. [Settings Override](#settings-override)
14. [Version & Help](#version--help)
15. [Subcommands](#subcommands)
16. [Environment Variables](#environment-variables)

---

## Session Management

| Flag | Short | Description |
|------|-------|-------------|
| `--continue` | `-c` | Continue the most recent conversation in the current directory |
| `--resume` | `-r` | Resume a specific session by ID or name, or show interactive picker |
| `--from-pr <NUMBER\|URL>` | | Resume sessions linked to a specific GitHub PR |
| `--fork-session` | | Create a new session ID when resuming (use with `--resume` or `--continue`) |
| `--session-id <UUID>` | | Use a specific session ID (must be valid UUID) |
| `--no-session-persistence` | | Disable session persistence (print mode only) |
| `--remote` | | Create a new web session on claude.ai |
| `--teleport` | | Resume a web session in your local terminal |

---

## Model & Configuration

| Flag | Short | Description |
|------|-------|-------------|
| `--model <NAME>` | | Set model with alias (`sonnet`, `opus`, `haiku`) or full model ID |
| `--fallback-model <NAME>` | | Auto-fallback model when default is overloaded (print mode only) |
| `--betas <LIST>` | | Beta headers to include in API requests (API key users only) |

---

## Permissions & Security

| Flag | Short | Description |
|------|-------|-------------|
| `--dangerously-skip-permissions` | | Skip ALL permission prompts. Use with extreme caution |
| `--allow-dangerously-skip-permissions` | | Enable permission bypassing as an option without activating it |
| `--permission-mode <MODE>` | | Begin in specified permission mode: `default`, `plan`, `acceptEdits`, `bypassPermissions` |
| `--allowedTools <TOOLS>` | | Tools that execute without prompting (permission rule syntax) |
| `--disallowedTools <TOOLS>` | | Tools removed from model context entirely |
| `--tools <TOOLS>` | | Restrict which built-in tools Claude can use (use `""` to disable all) |
| `--permission-prompt-tool <TOOL>` | | Specify MCP tool to handle permission prompts in non-interactive mode |

---

## Output & Format

| Flag | Short | Description |
|------|-------|-------------|
| `--print` | `-p` | Print response without interactive mode (headless/SDK mode) |
| `--output-format <FORMAT>` | | Output format: `text`, `json`, `stream-json` |
| `--input-format <FORMAT>` | | Input format: `text`, `stream-json` |
| `--json-schema <SCHEMA>` | | Get validated JSON matching schema (print mode only) |
| `--include-partial-messages` | | Include partial streaming events (requires `--print` and `--output-format=stream-json`) |
| `--verbose` | | Enable verbose logging with full turn-by-turn output |

---

## System Prompt

| Flag | Short | Description |
|------|-------|-------------|
| `--system-prompt <TEXT>` | | Replace entire system prompt with custom text |
| `--system-prompt-file <PATH>` | | Load system prompt from file, replacing default (print mode only) |
| `--append-system-prompt <TEXT>` | | Append custom text to default system prompt |
| `--append-system-prompt-file <PATH>` | | Append file contents to default prompt (print mode only) |

---

## Agent & Subagent

| Flag | Short | Description |
|------|-------|-------------|
| `--agent <NAME>` | | Specify an agent for the current session |
| `--agents <JSON>` | | Define custom subagents dynamically via JSON |
| `--teammate-mode <MODE>` | | Set agent team display: `auto`, `in-process`, `tmux` |

---

## MCP & Plugins

| Flag | Short | Description |
|------|-------|-------------|
| `--mcp-config <PATH\|JSON>` | | Load MCP servers from JSON file or string |
| `--strict-mcp-config` | | Only use MCP servers from `--mcp-config`, ignore all others |
| `--plugin-dir <PATH>` | | Load plugins from directory for this session only (repeatable) |

---

## Directory & Workspace

| Flag | Short | Description |
|------|-------|-------------|
| `--add-dir <PATH>` | | Add additional working directories for Claude to access |
| `--worktree` | `-w` | Start Claude in an isolated git worktree (branched from HEAD) |

---

## Budget & Limits

| Flag | Short | Description |
|------|-------|-------------|
| `--max-budget-usd <AMOUNT>` | | Maximum dollar amount for API calls before stopping (print mode only) |
| `--max-turns <NUMBER>` | | Limit number of agentic turns (print mode only) |

---

## Integration

| Flag | Short | Description |
|------|-------|-------------|
| `--chrome` | | Enable Chrome browser integration for web automation |
| `--no-chrome` | | Disable Chrome browser integration for this session |
| `--ide` | | Automatically connect to IDE on startup if exactly one valid IDE available |

---

## Initialization & Maintenance

| Flag | Short | Description |
|------|-------|-------------|
| `--init` | | Run initialization hooks and start interactive mode |
| `--init-only` | | Run initialization hooks and exit (no interactive session) |
| `--maintenance` | | Run maintenance hooks and exit |

---

## Debug & Diagnostics

| Flag | Short | Description |
|------|-------|-------------|
| `--debug <CATEGORIES>` | | Enable debug mode with optional category filtering (e.g., `"api,hooks"`) |

---

## Settings Override

| Flag | Short | Description |
|------|-------|-------------|
| `--settings <PATH\|JSON>` | | Path to settings JSON file or JSON string to load |
| `--setting-sources <LIST>` | | Comma-separated list of sources to load: `user`, `project`, `local` |
| `--disable-slash-commands` | | Disable all skills and slash commands for this session |

---

## Version & Help

| Flag | Short | Description |
|------|-------|-------------|
| `--version` | `-v` | Output the version number |
| `--help` | `-h` | Show help information |

---

## Subcommands

These are top-level commands run as `claude <subcommand>`:

| Subcommand | Description |
|------------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start REPL with initial prompt |
| `claude agents` | List configured agents |
| `claude auth` | Manage Claude Code authentication |
| `claude doctor` | Run diagnostics from the command line |
| `claude install` | Install or switch Claude Code native builds |
| `claude mcp` | Configure MCP servers (`add`, `remove`, `list`, `get`, `enable`) |
| `claude plugin` | Manage Claude Code plugins |
| `claude remote-control` | Manage remote control sessions |
| `claude setup-token` | Create a long-lived token for subscription usage |
| `claude update` / `claude upgrade` | Update to the latest version |

---

## Environment Variables

These startup-only environment variables are set in your shell before launching Claude Code (they cannot be configured via `settings.json`):

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Enable experimental agent teams. Also env-configurable — see [Settings Reference](./claude-settings.md#environment-variables) |
| `CLAUDE_CODE_TMPDIR` | Override temp directory for internal files. Also configurable via `env` key — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` | Enable additional directory CLAUDE.md loading. Also configurable via `env` key — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |
| `DISABLE_AUTOUPDATER=1` | Disable auto-updates. Also configurable via `env` key — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |
| `CLAUDE_CODE_EFFORT_LEVEL` | Control thinking depth — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |
| `USE_BUILTIN_RIPGREP=0` | Use system ripgrep instead of built-in (Alpine Linux) |
| `CLAUDE_CODE_SIMPLE` | Enable simple mode (Bash + Edit tools only). Also configurable via `env` key — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |
| `CLAUDE_BASH_NO_LOGIN=1` | Skip login shell for BashTool |
| `CCR_FORCE_BUNDLE=1` | Force bundling/uploading local repository when using `claude --remote`. Also configurable via `env` key — see [Settings Reference](./claude-settings.md#environment-variables-via-env) |

For environment variables configurable via the `"env"` key in `settings.json` (including `MAX_THINKING_TOKENS`, `CLAUDE_CODE_SHELL`, `CLAUDE_CODE_ENABLE_TASKS`, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, and more), see the [Claude Settings Reference](./claude-settings.md#environment-variables-via-env).

---

## Sources

- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless)
- [Claude Code Setup](https://code.claude.com/docs/en/setup)
- [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows)


<!-- FILE: best-practice/claude-commands.md -->

# Commands Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Sep%2025%2C%202026%2011%3A13%20AM%20PKT-white?style=flat&labelColor=555) ![Version](https://img.shields.io/badge/Claude_Code-v2.1.282-blue?style=flat&labelColor=555)<br>
[![Implemented](https://img.shields.io/badge/Implemented-2ea44f?style=flat)](../implementation/claude-commands-implementation.md)

Claude Code commands — frontmatter fields and official built-in slash commands.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Frontmatter Fields (20)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Display name and `/slash-command` identifier. Defaults to the directory name if omitted |
| `description` | string | Recommended | What the command does. Shown in autocomplete and used by Claude for auto-discovery |
| `when_to_use` | string | No | Additional context for when Claude should invoke the skill — trigger phrases or example requests. Appended to `description` in the listing and counts toward the 1,536-character cap |
| `argument-hint` | string | No | Hint shown during autocomplete (e.g., `[issue-number]`, `[filename]`) |
| `arguments` | string/list | No | Named positional arguments for `$name` substitution in command content. Accepts a space-separated string or YAML list — names map to argument positions in order |
| `disable-model-invocation` | boolean | No | Set `true` to prevent Claude from automatically invoking this command |
| `user-invocable` | boolean | No | Set `false` to hide from the `/` menu — command becomes background knowledge only |
| `paths` | string/list | No | Glob patterns that limit when this skill is activated. Accepts a comma-separated string or a YAML list. When set, Claude loads the skill automatically only when working with files matching the patterns |
| `allowed-tools` | string/list | No | Tools allowed without permission prompts when this command is active |
| `disallowed-tools` | string/list | No | Tools removed from Claude's available pool while this command is active. Clears when you send your next message. The inverse of `allowed-tools` |
| `model` | string | No | Model to use when this command runs (e.g., `haiku`, `sonnet`, `opus`) |
| `effort` | string | No | Override the model effort level when invoked (`low`, `medium`, `high`, `xhigh`, `max`) |
| `context` | string | No | Set to `fork` to run the command in an isolated subagent context |
| `agent` | string | No | Subagent type when `context: fork` is set (default: `general-purpose`) |
| `background` | boolean | No | Only applies with `context: fork`. Set to `false` to wait for the forked subagent's result in the turn that invoked the skill, instead of running it in the background. Default: `true`. Requires v2.1.218+ |
| `shell` | string | No | Shell for `` !`command` `` blocks — accepts `bash` (default) or `powershell`. Requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` |
| `metadata` | object | No | Free-form YAML map for your own key-value data. Claude Code ignores the content (which must be a map); useful for catalog or entitlement fields read by your own tooling. Do not reuse reserved field names such as `paths` as keys |
| `license` | string | No | License covering the skill per the [Agent Skills](https://agentskills.io) spec. Claude Code accepts the field but does not act on it |
| `compatibility` | string | No | Environment requirements for the skill per the [Agent Skills](https://agentskills.io) spec, such as intended products or system prerequisites. Accepts up to 500 characters. Claude Code accepts the field but does not act on it |
| `hooks` | object | No | Lifecycle hooks scoped to this command |

---

## ![Official](../!/tags/official.svg) **(94)**

| # | Command | Tag | Description |
|---|---------|-----|-------------|
| 1 | `/design-login` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Authorize design-system access for `/design-sync` with your claude.ai account |
| 2 | `/login` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Sign in to your Anthropic account |
| 3 | `/logout` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Sign out from your Anthropic account |
| 4 | `/setup-bedrock` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Configure Amazon Bedrock authentication, region, and model pins through an interactive wizard. Only visible when `CLAUDE_CODE_USE_BEDROCK=1` is set. First-time Bedrock users can also access this wizard from the login screen |
| 5 | `/setup-vertex` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Configure Google Cloud's Agent Platform authentication, project, region, and model pins through an interactive wizard. Only visible when `CLAUDE_CODE_USE_VERTEX=1` is set. First-time users can also access this wizard from the login screen |
| 6 | `/upgrade` | ![Auth](https://img.shields.io/badge/Auth-2980B9?style=flat) | Open the upgrade page to switch to a higher plan tier |
| 7 | `/auto-mode-setup` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Draft `autoMode.environment` entries from your project and recent sessions, then review the draft and save it to your user settings. Requires a Pro, Max, or Team plan and Claude Code v2.1.228 or later. On native Windows, requires v2.1.233 or later |
| 8 | `/color [color\|default]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Set the prompt bar color for the current session. Available colors: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. Use `default` to reset. Run without an argument to pick a random color |
| 9 | `/config [key=value ...]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Open the Settings interface to adjust theme, model, output style, and other preferences. From v2.1.181, pass one or more `key=value` pairs to set a setting directly without opening the interface, for example `/config thinking=false`. The `key=value` form also works in non-interactive (`-p`) and Remote Control modes. Run `/config help` to list the keys you can set. Alias: `/settings` |
| 10 | `/focus` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Toggle the focus view, which shows only your last prompt, a one-line tool-call summary with edit diffstats, and the final response. The selection persists across sessions; set `viewMode` in settings to override it. Only available in fullscreen rendering |
| 11 | `/import [codex\|gemini\|cursor] [--dry-run] [--yes]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Bring configuration from other coding agents on your machine (currently OpenAI Codex, Google Gemini CLI, or Cursor) into Claude Code, including instruction files, MCP servers, commands, subagents, and skills. In non-interactive mode (`-p`), lists what it found and gives you the command that confirms the import. `--dry-run` previews without writing; `--yes` skips the interactive picker. Importing from Cursor requires v2.1.265 or later. Not available on Bedrock, Agent Platform (Vertex), Foundry, Claude Platform on AWS, a Claude apps gateway, or with feature-flag fetching turned off |
| 12 | `/keybindings` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Open or create your keybindings configuration file |
| 13 | `/output-style [style]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | List and switch output styles, including over Remote Control and in cloud and other headless sessions. Requires v2.1.269 or later |
| 14 | `/permissions` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Manage allow, ask, and deny rules for tool permissions. Opens an interactive dialog where you can view rules by scope, add or remove rules, manage working directories, and use the Auto mode tab to view or edit classifier rules and review recent auto mode denials. Alias: `/allowed-tools` |
| 15 | `/powerup` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Discover Claude Code features through quick interactive lessons with animated demos |
| 16 | `/privacy-settings` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | View and update your privacy settings. Only available for Pro and Max plan subscribers |
| 17 | `/radio` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Open Claude FM lo-fi radio in your browser. Prints the stream URL when no browser is available |
| 18 | `/sandbox` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Toggle sandbox mode. Available on supported platforms only |
| 19 | `/scroll-speed` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Adjust mouse wheel scroll speed interactively. Only available in fullscreen rendering. Not available in JetBrains terminals |
| 20 | `/statusline` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Configure Claude Code's status line. Describe what you want, or run without arguments to auto-configure from your shell prompt |
| 21 | `/stickers` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Order Claude Code stickers |
| 22 | `/terminal-setup` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Configure terminal keybindings for Shift+Enter and other shortcuts. Only visible in terminals that need it, like VS Code, Cursor, Devin Desktop, Alacritty, or Zed. In Apple Terminal, enables Option+Enter for newlines and turns off the audible bell. In iTerm2, turns on clipboard access so `/copy` works |
| 23 | `/theme` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Change the color theme. Includes light and dark variants, colorblind-accessible (daltonized) themes, ANSI themes that use your terminal's color palette, an "Auto (match terminal)" option that follows your terminal's light/dark mode, and custom themes loaded from `~/.claude/themes/` or plugins. Select "New custom theme…" to create your own |
| 24 | `/tui [default\|fullscreen]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Set the terminal UI renderer and relaunch into it with your conversation intact. `fullscreen` enables the flicker-free alt-screen renderer. With no argument, prints the active renderer |
| 25 | `/voice [hold\|tap\|off]` | ![Config](https://img.shields.io/badge/Config-F39C12?style=flat) | Toggle voice dictation, or enable it in a specific mode. Requires a Claude.ai account |
| 26 | `/autocompact [auto\|<tokens>]` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Set the auto-compact window: how full the context window gets before Claude Code compacts automatically. Pass a token count such as `500k`, or `auto` to return to the default tuned for your model. Claude Code saves the value to your settings and applies it immediately. Without an argument, opens a dialog showing the current window. Requires v2.1.221+ |
| 27 | `/context [all]` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Visualize current context usage as a colored grid. Shows optimization suggestions for context-heavy tools, memory bloat, and capacity warnings. Pass `all` to expand the full breakdown |
| 28 | `/cost` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Alias for `/usage` |
| 29 | `/insights` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Generate an HTML report analyzing Claude Code sessions on this machine, including project areas, interaction patterns, and friction points. Not available in cloud sessions |
| 30 | `/rate-limit-options` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Show ways to keep working when a claude.ai usage limit blocks a request: wait and continue automatically when the limit resets, add usage credits, or upgrade your plan. Claude Code can also open this menu on its own when you hit a limit at your own terminal. Requires a claude.ai subscription. Doesn't appear in the command menu; type it in full. The wait-and-continue rows require Claude Code v2.1.234 or later |
| 31 | `/stats` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Alias for `/usage`. Opens on the Stats tab |
| 32 | `/status` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Open the Settings interface (Status tab) showing version, model, account, and connectivity. Includes a Session kind row showing whether the session is running as a background job (attached or unattended) or interactively. Works while Claude is responding, without waiting for the current response to finish |
| 33 | `/usage` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Show session cost, plan usage limits, and activity stats. On a Pro, Max, Team, or Enterprise plan, includes a breakdown of what counts against your plan limits. `/cost` and `/stats` are aliases |
| 34 | `/usage-credits` | ![Context](https://img.shields.io/badge/Context-8E44AD?style=flat) | Configure usage credits to keep working when you hit a limit. On Team and Enterprise plans, members without billing access send a credits request to their admin from the CLI instead of opening the browser (v2.1.248+). Prints the URL when no browser can open, for example over SSH (v2.1.205+). Previously `/extra-usage` |
| 35 | `/bug [report]` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | Report a bug or share your conversation. You choose how much session history to include and confirm on a consent screen before anything is sent. On a third-party provider or without Anthropic credentials, writes a local archive under `~/.claude/feedback-bundles/` instead. In VS Code, opens the extension's own dialog (v2.1.229+). Alias: `/share` |
| 36 | `/feedback [report]` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | Send product feedback about Claude Code. Opens the same dialog as `/bug`. Without an argument, opens a drafts queue of feedback Claude drafted, where you can review, edit, send, or discard them |
| 37 | `/heapdump` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | Write a JavaScript heap snapshot and memory breakdown to `~/Desktop` for diagnosing high memory usage. Writes to the home directory on Linux when there is no Desktop folder. Hidden from the command menu; type it in full. Share only the `-diagnostics.json` file, as the `.heapsnapshot` contains your conversation and credentials. Useful when filing bug reports about memory growth |
| 38 | `/help` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | Show help and available commands |
| 39 | `/release-notes` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | View the changelog in an interactive version picker. Select a specific version to see its release notes, or choose to show all versions |
| 40 | `/tasks` | ![Debug](https://img.shields.io/badge/Debug-E74C3C?style=flat) | View and manage background work in the current session, including subagents that have finished. Also available as `/bashes` |
| 41 | `/copy [N]` | ![Export](https://img.shields.io/badge/Export-7F8C8D?style=flat) | Copy the last assistant response to clipboard. Pass a number `N` to copy the Nth-latest response: `/copy 2` copies the second-to-last. When code blocks are present, shows an interactive picker to select individual blocks or the full response. Press `w` in the picker to write the selection to a file instead of the clipboard, which is useful over SSH |
| 42 | `/export [filename]` | ![Export](https://img.shields.io/badge/Export-7F8C8D?style=flat) | Export the current conversation as plain text. With a filename, writes directly to that file. Without, opens a dialog to copy to clipboard or save to a file |
| 43 | `/agents` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Print guidance for managing agent configurations — ask Claude to create or manage subagents, or edit `.claude/agents/` or `~/.claude/agents/` directly |
| 44 | `/chrome` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Configure Claude in Chrome settings |
| 45 | `/hooks` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | View hook configurations for tool events |
| 46 | `/ide` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Manage IDE integrations and show status |
| 47 | `/mcp [reconnect <server>\|enable\|disable [<server>\|all]]` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Manage MCP server connections and OAuth authentication. Run with no argument to open the interactive list, pass `reconnect <server>` to reconnect one disconnected server, or pass `enable`/`disable` with a server name or `all` to change connection state without opening the dialog |
| 48 | `/plugin [subcommand]` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Manage Claude Code plugins. Run with no argument to open the plugin menu, or pass a subcommand such as `list`, `install`, `enable`, or `disable` to act directly |
| 49 | `/reload-plugins [--force]` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Reload all active plugins to apply pending changes without restarting. Reports counts for each reloaded component and flags any load errors. When the reload would change which MCP tools are loaded and invalidate the prompt cache, the command warns and skips unless you pass `--force` |
| 50 | `/reload-skills` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Re-scan skill and command directories so skills added or changed on disk during the session become available without restarting. Reports how many skills are available and how many were added or removed |
| 51 | `/skill-doctor` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | Show which loaded skills go unused and what each costs in context, so you can prune them. Requires Claude Code v2.1.252 or later and feature-flag fetching |
| 52 | `/skills` | ![Extensions](https://img.shields.io/badge/Extensions-16A085?style=flat) | List available skills. Type to filter by name, description, or source. Press `t` to sort by token count. Press `Space` or `Enter` to cycle a skill's visibility; `Esc` saves and closes. Plugin skills, skills with `disable-model-invocation: true`, and skills with a managed `skillOverrides` entry cannot be cycled |
| 53 | `/memory` | ![Memory](https://img.shields.io/badge/Memory-3498DB?style=flat) | Edit `CLAUDE.md` memory files, enable or disable auto-memory, and view auto-memory entries |
| 54 | `/advisor [model\|off]` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Enable or disable the advisor tool, which consults a second model for guidance at key moments during a task. Accepts a model name (`fable`, `opus`, `sonnet`) or a full model ID (`fable` requires Fable 5 access); without an argument opens a picker. In non-interactive (`-p`) and Remote Control modes, with no argument it prints the current advisor as text instead of opening the picker; requires v2.1.260. Use `off` to disable |
| 55 | `/effort [level\|auto\|status]` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Set the model effort level. Available levels depend on the model and include `low`, `medium`, `high`, `xhigh`, `max` (session-only), and `ultracode` (combines `xhigh` reasoning with automatic workflow orchestration; session-only). Pass `status` to print the current level without opening the picker. Without an argument, opens an interactive slider to pick the level. `auto` resets to the model default. Takes effect immediately without waiting for the current response to finish. Also works in `-p` mode outside the effort hold |
| 56 | `/fast [on\|off]` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Toggle fast mode on or off |
| 57 | `/model [model]` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Switch the AI model and save it as your default for new sessions. Press `s` on a row to switch for the current session only. For models that support it, use left/right arrows to adjust effort level. When switching mid-conversation after prior output, Claude warns before applying the change. Also works in `-p` mode with a model argument, applying for the current session only (v2.1.205+) |
| 58 | `/passes` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Share a free week of Claude Code with friends. Only visible if your account is eligible |
| 59 | `/plan [description]` | ![Model](https://img.shields.io/badge/Model-E67E22?style=flat) | Enter plan mode directly from the prompt. Pass an optional description to enter plan mode and immediately start with that task, for example `/plan fix the auth bug` |
| 60 | `/add-dir <path>` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Add a working directory for file access during the current session. Supports Tab-completion on partial paths. From v2.1.234, Claude Code asks you to confirm the directory right away, mid-turn; before v2.1.234 it queued the command until the turn finished. Most `.claude/` configuration is not discovered from the added directory. A successful add runs your `DirectoryAdded` hooks |
| 61 | `/diff` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Review the changes in your working tree, including the edits Claude has made so far |
| 62 | `/init` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Initialize project with a `CLAUDE.md` guide. Set `CLAUDE_CODE_NEW_INIT=1` for an interactive flow that also walks through skills, hooks, and personal memory files |
| 63 | `/review [low\|medium\|high\|xhigh\|max\|ultra] [--fix] [--comment] [pr#\|branch\|path]` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Alias of `/code-review`. Reviews the current diff, or a PR number, branch, or path you pass. Accepts the same effort levels and flags. With no level given, reuses the last `low`–`max` level you typed. For a deep cloud review, use `/code-review ultra` |
| 64 | `/security-review` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Analyze pending changes on the current branch for security vulnerabilities. Reviews the diff between your branch and origin's default branch and identifies risks like injection, auth issues, and data exposure. Needs an `origin` remote |
| 65 | `/team-onboarding` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Generate a team onboarding guide from your Claude Code usage history. Claude analyzes your sessions, commands, and MCP server usage from the past 30 days and produces a markdown guide. For claude.ai subscribers on Pro, Max, Team, and Enterprise plans, also returns a share link teammates can open directly in Claude Code |
| 66 | `/ultrareview [PR or branch]` | ![Project](https://img.shields.io/badge/Project-27AE60?style=flat) | Run a deep, multi-agent code review in a cloud sandbox. The preferred invocation is `/code-review ultra`; `/ultrareview` remains as an alias. Pass a PR reference to review that pull request, or a branch name to change the comparison base. Includes 3 free runs on Pro and Max, then requires usage credits |
| 67 | `/autofix-pr [prompt]` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Spawn a Claude Code on the web session that watches the current branch's PR and pushes fixes when CI fails or reviewers leave comments. Detects the open PR from your checked-out branch with `gh pr view`; to watch a different PR, check out its branch first. Requires the `gh` CLI and access to Claude Code on the web |
| 68 | `/desktop` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Continue the current session in the Claude Code Desktop app. Requires macOS or x64 Windows and a Claude subscription. Alias: `/app` |
| 69 | `/install-github-app` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Install the Claude GitHub App for a repository, with an optional step to set up GitHub Actions workflows and secrets |
| 70 | `/install-slack-app` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Install the Claude Slack app. Opens a browser to complete the OAuth flow |
| 71 | `/mobile` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Show QR code to download the Claude mobile app. Aliases: `/ios`, `/android` |
| 72 | `/remote-control` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Make this session available for remote control from claude.ai. Alias: `/rc` |
| 73 | `/remote-env` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Choose the default environment for cloud agents |
| 74 | `/schedule [description]` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Create, update, list, or run routines. Claude walks you through the setup conversationally. Alias: `/routines` |
| 75 | `/teleport` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Pull a Claude Code on the web session into this terminal: opens a picker, then fetches the branch and conversation. Also available as `/tp`. Requires a claude.ai subscription |
| 76 | `/web-setup` | ![Remote](https://img.shields.io/badge/Remote-5D6D7E?style=flat) | Connect your GitHub account to Claude Code on the web using your local `gh` CLI credentials. `/schedule` prompts for this automatically if GitHub is not connected |
| 77 | `/artifacts` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | List the artifacts you own or that are shared with you, then attach one to the session, open it in your browser, or copy its link. Available where artifacts are. Requires Claude Code v2.1.208 or later; attaching with `Enter` requires v2.1.216 |
| 78 | `/background [prompt]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Detach the current session to run as a background agent and free this terminal. Pass a prompt to send one more instruction before detaching. Monitor the session with `claude agents`. Alias: `/bg` |
| 79 | `/branch [name]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Create a branch of the current conversation at this point |
| 80 | `/btw [question]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Ask a quick side question without adding to the conversation. Without an argument, reopens the overlay on your most recent side question |
| 81 | `/cd <path>` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Move the session to a new working directory without breaking the prompt cache |
| 82 | `/clear [name]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Start a new conversation with empty context. Pass an optional `name` to label the previous conversation for easy retrieval via `/resume`. To free up context while continuing the same conversation, use `/compact` instead. The previous conversation can be restored from the rewind menu (v2.1.191+). Aliases: `/reset`, `/new` |
| 83 | `/compact [instructions]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Compact conversation with optional focus instructions |
| 84 | `/exit` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Exit the CLI. In an attached background session, this detaches and the session keeps running. Alias: `/quit` |
| 85 | `/fork [prompt]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Copy the current conversation into a new background session and keep working here |
| 86 | `/goal [condition\|clear]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Set a goal — Claude keeps working across turns until the condition is met. With no argument, shows the current or most recently achieved goal. `clear`, `stop`, `off`, `reset`, `none`, or `cancel` removes an active goal early |
| 87 | `/list-agents` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | List the subagents, agent team teammates, and other Claude Code sessions Claude can message, with the name to use for each. Teammate rows and the first line showing this session's own name require v2.1.239 or later. Also available as `/peers`. Only available where cross-session messaging is enabled |
| 88 | `/recap` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Generate a one-line summary of the current session on demand, without affecting the ongoing conversation |
| 89 | `/rename [name]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Rename the current session and show the name on the prompt bar. Without a name, auto-generates one from conversation history. Also works in `-p` mode (v2.1.205+). Strips control and invisible characters and caps names at 200 characters (v2.1.221+) |
| 90 | `/resume [session]` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Resume a conversation by ID or name, or open the session picker. As of v2.1.144, background sessions appear in the picker marked with `bg`. A still-running background session cannot be resumed from the picker — attach via `claude agents` or stop it first. Alias: `/continue` |
| 91 | `/rewind` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Rewind the conversation and/or code to a previous point, or summarize from a selected message. See checkpointing. Alias: `/checkpoint`, `/undo` |
| 92 | `/stop` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Stop the current background session. Only available while attached to a background session; the transcript and any worktree are kept. To detach without stopping, use `/exit` or press `←` |
| 93 | `/subtask <task>` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Spawn a forked subagent: a background subagent that inherits the full conversation and works on the task while you keep working. Its result returns to this conversation when it finishes. Requires v2.1.212+. Not available when agent view is off |
| 94 | `/workflows` | ![Session](https://img.shields.io/badge/Session-4A90D9?style=flat) | Open the workflow progress view to watch, pause, resume, or save running and completed workflows |

Bundled skills such as `/debug` can also appear in the slash-command menu, but they are not built-in commands.

---

## Sources

- [Claude Code Commands](https://code.claude.com/docs/en/commands)
- [Claude Code Interactive Mode](https://code.claude.com/docs/en/interactive-mode)
- [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)


<!-- FILE: best-practice/claude-mcp.md -->

# MCP Servers Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Mar%2002%2C%202026%2012%3A30%20PM%20PKT-white?style=flat&labelColor=555)<br>
[![Implemented](https://img.shields.io/badge/Implemented-2ea44f?style=flat)](../.mcp.json)

MCP (Model Context Protocol) servers extend Claude Code with connections to external tools, databases, and APIs. This guide covers recommended servers for daily use and configuration best practices.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## MCP Servers for Daily Use

> *"Went overboard with 15 MCP servers thinking more = better. Ended up using only 4 daily."* — [r/mcp](https://reddit.com/r/mcp/comments/1mj0fxs/) (682 upvotes)

| MCP Server | What It Does | Resources |
|------------|-------------|-----------|
| [**Context7**](https://github.com/upstash/context7) | Fetches up-to-date library docs into context. Prevents hallucinated APIs from outdated training data | [Reddit: "by far the best MCP for coding"](https://reddit.com/r/mcp/comments/1qarjqm/) · [npm](https://www.npmjs.com/package/@upstash/context7-mcp) |
| [**Playwright**](https://github.com/microsoft/playwright-mcp) | Browser automation — implement, test, and verify UI features autonomously. Screenshots, navigation, form testing | [Reddit: essential for frontend](https://reddit.com/r/mcp/comments/1m59pk0/) · [Docs](https://playwright.dev/) |
| [**Claude in Chrome**](https://github.com/nicobailon/claude-code-in-chrome-mcp) | Connects Claude to your real Chrome browser — inspect console, network, DOM. Debug what users actually see | [Reddit: "game changer" for debugging](https://reddit.com/r/mcp/comments/1qarjqm/5_mcps_that_have_genuinely_made_me_10x_faster/nza0i7t/) · [Comparison Report](../reports/claude-in-chrome-v-chrome-devtools-mcp.md) |
| [**DeepWiki**](https://github.com/devanshusemwal/deepwiki-mcp) | Fetches structured wiki-style documentation for any GitHub repo — architecture, API surface, relationships | [Reddit: "put it behind a gateway with Context7"](https://reddit.com/r/mcp/comments/1qarjqm/) |
| [**Excalidraw**](https://github.com/antonpk1/excalidraw-mcp-app) | Generate architecture diagrams, flowcharts, and system designs as hand-drawn Excalidraw sketches from prompts | [GitHub](https://github.com/antonpk1/excalidraw-mcp-app) |

Research (Context7/DeepWiki) -> Debug (Playwright/Chrome) -> Document (Excalidraw)

---

## Configuration

MCP servers are configured in `.mcp.json` at the project root (project-scoped) or in `~/.claude.json` (user-scoped).

### Server Types

| Type | Transport | Example |
|------|-----------|---------|
| **stdio** | Spawns a local process | `npx`, `python`, binary |
| **http** | Connects to a remote URL | HTTP/SSE endpoint |

### Example `.mcp.json`

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    },
    "deepwiki": {
      "command": "npx",
      "args": ["-y", "deepwiki-mcp"]
    },
    "remote-api": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

Use environment variable expansion for secrets instead of committing API keys in `.mcp.json`:

```json
{
  "mcpServers": {
    "remote-api": {
      "type": "http",
      "url": "https://mcp.example.com/mcp?token=${MCP_API_TOKEN}"
    }
  }
}
```

### Settings for MCP Servers

These settings in `.claude/settings.json` control MCP server approval:

| Key | Type | Description |
|-----|------|-------------|
| `enableAllProjectMcpServers` | boolean | Auto-approve all `.mcp.json` servers without prompting |
| `enabledMcpjsonServers` | array | Allowlist of specific server names to auto-approve |
| `disabledMcpjsonServers` | array | Blocklist of specific server names to reject |

### Permission Rules for MCP Tools

MCP tools follow the `mcp__<server>__<tool>` naming convention in permission rules:

```json
{
  "permissions": {
    "allow": [
      "mcp__*",
      "mcp__context7__*",
      "mcp__playwright__browser_snapshot"
    ],
    "deny": [
      "mcp__dangerous-server__*"
    ]
  }
}
```

---

## MCP Scopes

MCP servers can be defined at three levels:

| Scope | Location | Purpose |
|-------|----------|---------|
| **Project** | `.mcp.json` (repo root) | Team-shared servers, committed to git |
| **User** | `~/.claude.json` (`mcpServers` key) | Personal servers across all projects |
| **Subagent** | Agent frontmatter (`mcpServers` field) | Servers scoped to a specific subagent |

Precedence: Subagent > Project > User

---

## Sources

- [MCP Servers — Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [5 MCPs that have genuinely made me 10x faster — r/mcp](https://reddit.com/r/mcp/comments/1qarjqm/)
- [MCP Server Overload Discussion — r/mcp](https://reddit.com/r/mcp/comments/1mj0fxs/)


<!-- FILE: best-practice/claude-memory.md -->

# Claude Memory

Persistent context via CLAUDE.md files — how to write them and how they load in monorepos.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## 1. Writing a Good CLAUDE.md

A well-structured CLAUDE.md is the single most impactful way to improve Claude Code's output for your project. Humanlayer has an excellent guide covering what to include, how to structure it, and common pitfalls.

- [Humanlayer - Writing a good Claude.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

---

## 2. CLAUDE.md in Large Monorepos

When working with Claude Code in a monorepo, understanding how CLAUDE.md files are loaded into context is crucial for organizing your project instructions effectively.

<p align="center">
  <a href="https://x.com/bcherny/status/2016339448863355206"><img src="assets/claude-memory/claude-memory-monorepo.jpg" alt="CLAUDE.md loading in monorepos" width="600"></a>
</p>

### The Two Loading Mechanisms

Claude Code uses two distinct mechanisms for loading CLAUDE.md files:

#### Ancestor Loading (UP the directory tree)

When you start Claude Code, it walks **upward** from your current working directory toward the filesystem root and loads every CLAUDE.md it finds along the way. These files are loaded **immediately at startup**.

#### Descendant Loading (DOWN the directory tree)

CLAUDE.md files in subdirectories below your current working directory are **NOT loaded at launch**. They are only included when Claude reads files in those subdirectories during your session. This is known as **lazy loading**.

### Example Monorepo Structure

Consider a typical monorepo with separate directories for different components:

```
/mymonorepo/
├── CLAUDE.md          # Root-level instructions (shared across all components)
├── frontend/
│   └── CLAUDE.md      # Frontend-specific instructions
├── backend/
│   └── CLAUDE.md      # Backend-specific instructions
└── api/
    └── CLAUDE.md      # API-specific instructions
```

### Scenario 1: Running Claude Code from the Root Directory

When you run Claude Code from `/mymonorepo/`:

```bash
cd /mymonorepo
claude
```

| File | Loaded at Launch? | Reason |
|------|-------------------|--------|
| `/mymonorepo/CLAUDE.md` | Yes | It's your current working directory |
| `/mymonorepo/frontend/CLAUDE.md` | No | Loaded only when you read/edit files in `frontend/` |
| `/mymonorepo/backend/CLAUDE.md` | No | Loaded only when you read/edit files in `backend/` |
| `/mymonorepo/api/CLAUDE.md` | No | Loaded only when you read/edit files in `api/` |

### Scenario 2: Running Claude Code from a Component Directory

When you run Claude Code from `/mymonorepo/frontend/`:

```bash
cd /mymonorepo/frontend
claude
```

| File | Loaded at Launch? | Reason |
|------|-------------------|--------|
| `/mymonorepo/CLAUDE.md` | Yes | It's an ancestor directory |
| `/mymonorepo/frontend/CLAUDE.md` | Yes | It's your current working directory |
| `/mymonorepo/backend/CLAUDE.md` | No | Different branch of the directory tree |
| `/mymonorepo/api/CLAUDE.md` | No | Different branch of the directory tree |

### Key Takeaways

1. **Ancestors always load at startup** — Claude walks UP the directory tree and loads all CLAUDE.md files it finds. This ensures you always have access to root-level, repository-wide instructions.

2. **Descendants load lazily** — Subdirectory CLAUDE.md files only load when you interact with files in those subdirectories. This prevents irrelevant context from bloating your session.

3. **Siblings never load** — If you're working in `frontend/`, you won't get `backend/CLAUDE.md` or `api/CLAUDE.md` loaded into context.

4. **Global CLAUDE.md** — You can also place a CLAUDE.md at `~/.claude/CLAUDE.md` in your home folder, which applies to ALL Claude Code sessions regardless of project.

### Why This Design Works for Monorepos

- **Shared instructions propagate down** — Root-level CLAUDE.md contains repository-wide conventions, coding standards, and common patterns that apply everywhere.

- **Component-specific instructions stay isolated** — Frontend developers don't need backend-specific instructions cluttering their context, and vice versa.

- **Context is optimized** — By lazily loading descendant CLAUDE.md files, Claude Code avoids loading potentially hundreds of kilobytes of irrelevant instructions at startup.

### Best Practices

1. **Put shared conventions in root CLAUDE.md** — Coding standards, commit message formats, PR templates, and other repository-wide guidelines.

2. **Put component-specific instructions in component CLAUDE.md** — Framework-specific patterns, component architecture, testing conventions unique to that component.

3. **Use CLAUDE.local.md for personal preferences** — Add it to `.gitignore` for instructions that shouldn't be shared with the team.

---

## Sources

- [Claude Code Documentation - How Claude Looks Up Memories](https://code.claude.com/docs/en/memory#how-claude-looks-up-memories)
- [Boris Cherny on X - Clarification on CLAUDE.md Loading](https://x.com/bcherny/status/2016339448863355206)
- [Humanlayer - Writing a good Claude.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)


<!-- FILE: best-practice/claude-power-ups.md -->

# Power-ups Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Apr%2002%2C%202026-white?style=flat&labelColor=555)

Interactive lessons teaching Claude Code features with animated demos. Each power-up teaches one thing Claude Code can do that most people miss. Introduced in v2.1.90.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Usage

```bash
claude
/powerup
```

---

## Power-ups (10)

<p align="center">
  <img src="assets/claude-power-ups/powerup-menu.png" alt="Power-ups menu showing 10 lessons" width="700">
</p>

| # | Power-up | Topics |
|---|----------|--------|
| 1 | Talk to your codebase | `@` files, line refs |
| 2 | Steer with modes | `shift+tab`, plan, auto |
| 3 | Undo anything | `/rewind`, `Esc-Esc` |
| 4 | Run in the background | tasks, `/tasks` |
| 5 | Teach Claude your rules | `CLAUDE.md`, `/memory` |
| 6 | Extend with tools | MCP, `/mcp` |
| 7 | Automate your workflow | skills, hooks |
| 8 | Multiply yourself | subagents, `/agents` |
| 9 | Code from anywhere | `/remote-control`, `/teleport` |
| 10 | Dial the model | `/model`, `/effort` |

---

## Example: Dial the model

The last power-up teaches model switching and effort control with an animated demo.

<p align="center">
  <img src="assets/claude-power-ups/dial-the-model-1.png" alt="Dial the model — demo thinking deeply" width="700">
</p>

<p align="center">
  <img src="assets/claude-power-ups/dial-the-model-2.png" alt="Dial the model — demo showing hypotheses" width="700">
</p>

<p align="center">
  <img src="assets/claude-power-ups/dial-the-model-3.png" alt="Dial the model — demo setting effort to high" width="700">
</p>

---

## Sources

- [Changelog — v2.1.90](https://code.claude.com/docs/en/changelog)


<!-- FILE: best-practice/claude-settings.md -->

# Settings Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Sep%2001%2C%202026%2010%3A39%20AM%20PKT-white?style=flat&labelColor=555) ![Version](https://img.shields.io/badge/Claude_Code-v2.1.252-blue?style=flat&labelColor=555)<br>
[![Implemented](https://img.shields.io/badge/Implemented-2ea44f?style=flat)](../.claude/settings.json)

A comprehensive guide to all available configuration options in Claude Code's `settings.json` files. As of v2.1.252, Claude Code exposes **140+ settings** and **315+ environment variables** (use the `"env"` field in `settings.json` to avoid wrapper scripts).

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

## Table of Contents

1. [Settings Hierarchy](#settings-hierarchy)
2. [Core Configuration](#core-configuration)
3. [Permissions](#permissions)
4. [Hooks](#hooks)
5. [MCP Servers](#mcp-servers)
6. [Sandbox](#sandbox)
7. [Plugins](#plugins)
8. [Model Configuration](#model-configuration)
9. [Display & UX](#display--ux)
10. [AWS & Cloud Credentials](#aws--cloud-credentials)
11. [Environment Variables](#environment-variables-via-env)
12. [Useful Commands](#useful-commands)

---

## Settings Hierarchy

Settings apply in order of precedence (highest to lowest):

| Priority | Location | Scope | Shared? | Purpose |
|----------|----------|-------|---------|---------|
| 1 | Managed settings | Organization | Yes (deployed by IT) | Security policies that cannot be overridden |
| 2 | Command line arguments | Session | N/A | Temporary single-session overrides |
| 3 | `.claude/settings.local.json` | Project | No (git-ignored) | Personal project-specific |
| 4 | `.claude/settings.json` | Project | Yes (committed) | Team-shared settings |
| 5 | `~/.claude/settings.json` | User | N/A | Global personal defaults |

**Managed settings** are organization-enforced and cannot be overridden by any other level, including command line arguments. Delivery methods:
- **Server-managed** settings (remote delivery)
- **MDM profiles** — macOS plist at `com.anthropic.claudecode`
- **Registry policies** — Windows `HKLM\SOFTWARE\Policies\ClaudeCode` (admin) and `HKCU\SOFTWARE\Policies\ClaudeCode` (user-level, lowest policy priority)
- **File** — `managed-settings.json` and `managed-mcp.json` (macOS: `/Library/Application Support/ClaudeCode/`, Linux/WSL: `/etc/claude-code/`, Windows: `C:\Program Files\ClaudeCode\`)
- **Drop-in directory** — `managed-settings.d/` alongside `managed-settings.json` for independent policy fragments (v2.1.83). Following the systemd convention, `managed-settings.json` is merged first as the base, then all `*.json` files in the drop-in directory are sorted alphabetically and merged on top. Later files override earlier ones for scalar values; arrays are concatenated and de-duplicated; objects are deep-merged. Hidden files starting with `.` are ignored. Use numeric prefixes to control merge order (e.g., `10-telemetry.json`, `20-security.json`)

Within the managed tier, precedence is: server-managed > MDM/OS-level policies > file-based (`managed-settings.d/*.json` + `managed-settings.json`) > HKCU registry (Windows only). Only one managed source wins for most keys; sources do not merge across tiers. Within the file-based tier, drop-in files and the base file are merged together.

**Exception — admin-source union keys:** The following keys are honored when *any* admin-controlled managed source sets them, not just the winning source: `sandbox.network.allowManagedDomainsOnly`, `sandbox.network.allowedDomains` (when `allowManagedDomainsOnly` is set), `sandbox.filesystem.allowManagedReadPathsOnly`, `sandbox.filesystem.allowRead` (when `allowManagedReadPathsOnly` is set), `allowAllClaudeAiMcps`, `sandbox.bwrapPath`, `sandbox.socatPath`, `forceRemoteSettingsRefresh`, and `env` (which merges **per key** across all admin sources rather than taking the highest-precedence source's entire object).

> **Note:** As of v2.1.75, the deprecated Windows fallback path `C:\ProgramData\ClaudeCode\managed-settings.json` has been removed. Use `C:\Program Files\ClaudeCode\managed-settings.json` instead.

> **Note (v2.1.126):** `/config` now persists changes to `~/.claude/settings.json` instead of holding them in memory only. Edits made through the interactive Config UI survive restarts.

**Managed-only policy keys:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `parentSettingsBehavior` | string | `"first-wins"` | Controls whether managed settings supplied programmatically by an embedding host process (SDK parent) apply when an admin-deployed managed tier is also present. `"first-wins"`: parent-supplied settings are dropped and only the admin tier applies. `"merge"`: parent-supplied settings apply under the admin tier and are filtered so they can **tighten** policy but not loosen it. Requires v2.1.133+ |
| `policyHelper` | object | - | Admin-deployed executable that computes managed settings dynamically at startup. Object shape: `{path: string, timeoutMs?: number, refreshIntervalMs?: number}` — `path` points at the helper binary; `timeoutMs` caps the wait (omit or `0` for no timeout); `refreshIntervalMs` controls re-runs at session start (omit for startup-only, `0` disables, otherwise must be ≥ `60000`). Only honored from MDM or a system `managed-settings.json` file (never from user/project settings). **When configured, `policyHelper` output is the sole active managed source — other managed-tier sources (server-managed, MDM, file) are ignored for that run.** Requires v2.1.136+ |
| `requiredMinimumVersion` | string | - | **(Managed only)** Prevents Claude Code from starting if the installed version is below this floor. CLI exits with an error prompting the user to upgrade. Complements `minimumVersion` (which controls auto-update floor) — this one enforces at startup. Example: `"2.1.163"` |
| `requiredMaximumVersion` | string | - | **(Managed only)** Prevents Claude Code from starting if the installed version exceeds this ceiling. CLI exits with an error if the version is too new. Use alongside `requiredMinimumVersion` to pin a specific version range in managed environments. Example: `"2.1.165"` |
| `browserExternalPageTools` | string | - | **(Managed only)** Set to `"disabled"` to prevent Claude from using tools to read or act on external pages in the desktop app's Browser pane. Users can still navigate to external sites themselves, and local dev server previews are unaffected |
| `disableBrowserExternalNavigation` | boolean | - | **(Managed only)** Set to `true` (JSON boolean only — string `"true"` is silently ignored) to prevent Claude from navigating the desktop app's Browser pane to external URLs. Only JSON boolean `true` is honored |
| `disableMobileSimulatorTools` | boolean | - | **(Managed only)** Set to `true` (JSON boolean only — a malformed value logs a warning) to remove mobile simulator tools from Claude. Only JSON boolean `true` is honored |

**Important**:
- `deny` rules have highest safety precedence and cannot be overridden by lower-priority allow/ask rules.
- Managed settings may lock or override local behavior even if local files specify different values.
- Array settings (e.g., `permissions.allow`) are **concatenated and deduplicated** across scopes — entries from all levels are combined, not replaced. **Exceptions:** `fallbackModel`, `availableModels`, `modelPicker`, and `modelSettings` do **not** merge — the highest-precedence settings file that defines them supplies the entire value. For `availableModels`, a managed-source value applies as-is and lower scopes cannot extend it.

---

## Core Configuration

### General Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `$schema` | string | - | JSON Schema URL for IDE validation and autocompletion (e.g., `"https://json.schemastore.org/claude-code-settings.json"`) |
| `model` | string | `"default"` | Override default model. Accepts aliases (`sonnet`, `opus`, `haiku`) or full model IDs |
| `agent` | string | - | Set the default agent for the main conversation. Value is the agent name from `.claude/agents/`. Also available via `--agent` CLI flag |
| `language` | string | `"english"` | Claude's preferred response language. Also sets the voice dictation language and **auto-generated session titles** (v2.1.121; since v2.1.176, an unset language causes titles to match the conversation language) |
| `claudeMdExcludes` | array | - | Glob patterns or absolute paths of `CLAUDE.md` files to skip when loading [memory](https://code.claude.com/docs/en/memory). Patterns match against absolute file paths. Only applies to user, project, and local memory; managed policy files cannot be excluded. Example: `["**/vendor/**/CLAUDE.md"]` |
| `claudeMd` | string | - | **(Managed only)** CLAUDE.md-style instructions injected as organization-managed [memory](https://code.claude.com/docs/en/memory). Only honored when set in managed or policy settings; ignored in user, project, and local settings. Example: `"Always run make lint before committing."` |
| `cleanupPeriodDays` | number | `30` | Age cutoff for the startup cleanup sweep (minimum 1). Inactive session transcripts and orphaned subagent worktrees are deleted; as of v2.1.117 the sweep also covers `~/.claude/tasks/`, `~/.claude/shell-snapshots/`, and `~/.claude/backups/`. Setting to `0` is rejected with a validation error. To disable transcript writes in non-interactive mode (`-p`), use `--no-session-persistence` or `persistSession: false` SDK option |
| `autoUpdatesChannel` | string | `"latest"` | Release channel: `"stable"` or `"latest"` |
| `minimumVersion` | string | - | Prevent the auto-updater from downgrading below a specific version. Automatically set when switching to the stable channel and choosing to stay on the current version until stable catches up. Used with `autoUpdatesChannel` |
| `alwaysThinkingEnabled` | boolean | `false` | Enable extended thinking by default for all sessions |
| `thinkingBudgetTokens` | number | - | Set a fixed token budget for extended thinking per response. When set, limits the number of thinking tokens to the specified value. If unset, Claude Code uses a dynamic budget based on the model and effort level. Works alongside `alwaysThinkingEnabled` *(not in official settings page — unverified)* |
| `skipWebFetchPreflight` | boolean | `false` | Skip the WebFetch domain safety check that sends each requested hostname to `api.anthropic.com` before fetching. Set to `true` in environments that block outbound traffic to Anthropic, such as Bedrock, Vertex AI, or Foundry deployments with restrictive egress |
| `availableModels` | array | - | Restrict which models users can select via `/model`, `--model`, Config tool, or `ANTHROPIC_MODEL`. Does not affect the Default option. As of v2.1.172, also constrains the model picker for subagent dispatching and the `advisorModel` picker. Use `enforceAvailableModels: true` to additionally constrain the Default model option. Example: `["sonnet", "haiku"]` |
| `enforceAvailableModels` | boolean | `false` | **(Managed only)** When `true`, the `availableModels` allowlist also constrains the Default model option — users cannot select a model outside the allowlist even via the Default slot. Without this flag, `availableModels` leaves the Default option unrestricted. Pair with `availableModels` for full model lockdown (v2.1.175) |
| `fastModePerSessionOptIn` | boolean | `false` | Require users to opt in to fast mode each session |
| `fastMode` | boolean | `false` | Enable fast mode for all sessions. When `true`, Claude Code uses the faster model tier by default. Users can also toggle fast mode per session with `/fast`. Pairs with `fastModePerSessionOptIn` |
| `defaultShell` | string | `"bash"` | Default shell for input-box `!` commands. Accepts `"bash"` (default) or `"powershell"`. Setting `"powershell"` routes interactive `!` commands through PowerShell on Windows. Requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` (v2.1.84). **v2.1.120:** When PowerShell is available, it is used as the fallback shell on Windows even without Git for Windows installed. **v2.1.126:** When PowerShell is enabled, it is treated as the *primary* shell instead of defaulting to Bash. PowerShell 7 detection now also covers Microsoft Store installs, MSI installs not on PATH, and `.NET` global tool installs |
| `includeGitInstructions` | boolean | `true` | Include built-in commit and PR workflow instructions and the git status snapshot in Claude's system prompt. The `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` environment variable takes precedence over this setting when set |
| `voice` | object | - | Voice dictation configuration. Object with three fields: `enabled` (boolean — push-to-talk on/off), `mode` (string — `"hold"` for hold-to-talk or `"tap"` for tap-to-toggle), and `autoSubmit` (boolean — submit transcript immediately when dictation ends). Written automatically when you run `/voice`. Requires a Claude.ai account (v2.1.118 expanded structure) |
| `voiceEnabled` | boolean | - | **DEPRECATED** — legacy alias for `voice.enabled`. Use the `voice` object instead to get `mode` and `autoSubmit` controls |
| `showClearContextOnPlanAccept` | boolean | `false` | Show the "clear context" option on the plan accept screen. Set to `true` to restore the option (hidden by default since v2.1.81) |
| `viewMode` | string | - | Default transcript view mode on startup: `"default"`, `"verbose"`, or `"focus"`. Overrides the sticky `/focus` toggle selection when set |
| `disableDeepLinkRegistration` | string | - | Set to `"disable"` to prevent Claude Code from registering the `claude-cli://` protocol handler with the operating system on startup. Deep links let external tools open a Claude Code session with a pre-filled prompt via `claude-cli://open?q=...`. The `q` parameter supports multi-line prompts using URL-encoded newlines (`%0A`). Useful in environments where protocol handler registration is restricted or managed separately |
| `showThinkingSummaries` | boolean | `false` | Show extended thinking summaries in interactive sessions. When unset or `false` (default in interactive mode), thinking blocks are redacted by the API and shown as a collapsed stub. Redaction only changes what you see, not what the model generates — to reduce thinking spend, lower the budget or disable thinking instead. Non-interactive mode (`-p`) and SDK callers always receive summaries regardless of this setting |
| `disableSkillShellExecution` | boolean | `false` | Disable inline shell execution for `` !`...` `` and `` ```! `` blocks in skills and custom commands from user, project, plugin, or additional-directory sources. Commands are replaced with `[shell command execution disabled by policy]` instead of being run. Bundled and managed skills are not affected (v2.1.91) |
| `skillListingMaxDescChars` | number | `1536` | Per-skill character cap on the combined `description` and `when_to_use` text in the [skill listing](https://code.claude.com/docs/en/skills) Claude sees each turn. Text longer than this is truncated (v2.1.105) |
| `skillListingBudgetFraction` | number | `0.01` | Fraction of the model's context window reserved for the [skill listing](https://code.claude.com/docs/en/skills) Claude sees each turn (`0.01` = 1%). When the listing exceeds the budget, descriptions for the least-used skills are collapsed to bare names so Claude can still invoke them but won't see why (v2.1.105) |
| `forceRemoteSettingsRefresh` | boolean | `false` | **(Managed only)** Block CLI startup until remote managed settings are freshly fetched. If the fetch fails, the CLI exits (fail-closed). Use in enterprise environments where policy enforcement must be up-to-date before any session begins (v2.1.92) |
| `wslInheritsWindowsSettings` | boolean | `false` | **(Windows managed settings only)** When `true`, Claude Code on WSL reads managed settings from the Windows policy chain (HKLM registry + `C:\Program Files\ClaudeCode\managed-settings.json`) in addition to `/etc/claude-code`, with Windows sources taking priority. Only honored when set in the HKLM registry key or `C:\Program Files\ClaudeCode\managed-settings.json`, both of which require Windows admin to write. For HKCU policy to also apply on WSL, the flag must additionally be set in HKCU itself. Has no effect on native Windows (v2.1.118) |
| `tui` | string | `"default"` | Rendering mode: `"fullscreen"` or `"default"`. Set via `/tui fullscreen` for flicker-free alt-screen rendering (v2.1.110) |
| `awaySummaryEnabled` | boolean | `true` | Generate an "away summary" (idle-session recap) when the user returns after being away. Set to `false` to opt out. Pairs with the `CLAUDE_CODE_ENABLE_AWAY_SUMMARY` env var (v2.1.110) |
| `autoCompactEnabled` | boolean | `true` | Auto-compact the conversation when context approaches the model's limit. Set to `false` to disable automatic compaction and manage context manually. Also disableable via the `DISABLE_AUTO_COMPACT` env var |
| `autoCompactWindow` | number | model-tuned | How full the context window gets before automatic compaction triggers, in tokens (100,000–1,000,000). When unset, Claude Code uses a window tuned for your model. Set it with the `/autocompact` command (writes to user settings) or the `--autocompact` CLI flag. Pairs with the `CLAUDE_CODE_AUTO_COMPACT_WINDOW` env var (v2.1.221+) |
| `skillOverrides` | object | - | Per-skill visibility overrides keyed by skill name. Value is `"on"` (full), `"name-only"` (visible but not auto-described), `"user-invocable-only"` (hidden from model discovery but still slash-invocable), or `"off"` (fully hidden). Example: `{"legacy-context": "name-only", "deploy": "off"}` (v2.1.129) |
| `disableRemoteControl` | boolean | `false` | Disable [Remote Control](https://code.claude.com/docs/en/remote-control): blocks `claude remote-control`, the `--remote-control` flag, auto-start, and the in-session toggle. Typically placed in managed settings for per-device MDM enforcement, but works from any scope (v2.1.128) |
| `agentPushNotifEnabled` | boolean | `false` | Send proactive push notifications to [Remote Control](https://code.claude.com/docs/en/remote-control) when Claude decides to push (e.g., task complete). Appears in `/config` as **Push when Claude decides** |
| `inputNeededNotifEnabled` | boolean | `false` | Send a push notification to [Remote Control](https://code.claude.com/docs/en/remote-control) when a permission prompt or question awaits user input. Appears in `/config` as **Push when actions required** |
| `remoteControlAtStartup` | boolean/null | - | Auto-connect [Remote Control](https://code.claude.com/docs/en/remote-control) on startup. `true` always auto-connects, `false` never auto-connects, unset uses the organization default. **Scope exception:** `false` in project or local settings applies even against a managed `true` (user and project settings can opt out). Only user settings, `--settings`, and managed settings can set it to `true` (v2.1.119+) |
| `disableAgentView` | boolean | `false` | Set to `true` to turn off [background agents and agent view](https://code.claude.com/docs/en/agent-view): `claude agents`, `--bg`, `/background`, and the on-demand supervisor. Can be set at any scope but typically placed in managed settings. Equivalent to setting the `CLAUDE_CODE_DISABLE_AGENT_VIEW` env var to `1` |
| `disableWorkflows` | boolean | `false` | Set to `true` to disable [dynamic workflows](https://code.claude.com/docs/en/workflows) (`/workflows`) and the bundled workflow slash commands. Can be set at any scope. Equivalent to the `CLAUDE_CODE_DISABLE_WORKFLOWS` env var. Workflows were introduced in v2.1.154 |
| `workflowKeywordTriggerEnabled` | boolean | `true` | Whether typing the word "ultracode" in a prompt triggers a [dynamic workflow](https://code.claude.com/docs/en/workflows). Set to `false` to require explicit `/workflows` invocation. Ultracode, `/workflows`, and saved workflow commands are unaffected by this setting. Appears in `/config` as **Ultracode keyword trigger** (v2.1.157; trigger keyword renamed workflow→ultracode in v2.1.160) |
| `ultracode` | boolean | - | **(Session-only — not persisted)** When `true`, the harness authors and runs a workflow for every substantive task by default, maximizing thoroughness regardless of token cost. Appears in the official "Available settings" list but is session-scoped: set via `/effort ultracode`, `--settings`, or the SDK rather than written to `settings.json` (v2.1.154) |
| `dynamicWorkflowSize` | string | - | Advisory guideline for the number of agents spawned in a [dynamic workflow](https://code.claude.com/docs/en/workflows). Values: `"small"`, `"medium"`, `"large"`. When set, the workflow harness uses this as the default fleet size before scaling up or down based on the task. Set via `/config` as **Workflow size** (v2.1.202; values formalized in v2.1.205) *(not in official docs — unverified; superseded by `workflowSizeGuideline` in v2.1.219)* |
| `workflowSizeGuideline` | string | `"medium"` | Advisory guideline for the dynamic workflow fleet size, settable from any settings file. Values: `"small"`, `"medium"` (default as of v2.1.219), `"large"`, `"unrestricted"`. The default fleet size now renders in the running-workflow status line. Use this key instead of `dynamicWorkflowSize` — it propagates from managed or user settings (v2.1.219) |
| `disableBundledSkills` | boolean | `false` | Conceal Claude Code's built-in capabilities (bundled skills) from the model. When `true`, the model cannot invoke built-in skills. Paired with the `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` env var. Useful when strict plugin-only customization is required (v2.1.169) |
| `disableArtifact` | boolean | `false` | Disable the Artifact web publishing tool. When `true`, Claude cannot create or publish web artifacts. Can be set at any scope |
| `enableArtifact` | boolean | - | **(v2.1.196+)** User-level opt-in for the Artifact web publishing tool. When set to `true`, enables Artifact for the user even when no organization policy requires it. `disableArtifact: true` takes precedence and overrides this setting |
| `feedbackSurveyRate` | number | - | Probability (0–1) that the session quality survey appears when eligible. Enterprise admins can control how often the survey is shown. Example: `0.05` = 5% of eligible sessions |
| `advisorModel` | string | - | Model for the server-side advisor tool. Accepts a model alias (`opus`, `sonnet`) or a full model ID. When unset, the advisor uses the session model. Requires v2.1.98+. **v2.1.210+:** Setting `"fable"` no longer attaches an advisor — Fable 5 is temporarily unavailable in the advisor picker; use `"opus"` or `"sonnet"` instead |
| `respondToBashCommands` | boolean | `true` | Whether Claude automatically responds after a `!` shell command completes. Set to `false` to disable the automatic follow-up response when a `!` bash command finishes (v2.1.186) |
| `askUserQuestionTimeout` | string | `"never"` | How long to wait before an unanswered AskUserQuestion dialog auto-continues without the user. Values: `"60s"`, `"5m"`, `"10m"`, `"never"` (no auto-continue — the default). Set via `/config` as **Question auto-continue timeout**. Pairs with the `CLAUDE_AFK_TIMEOUT_MS` env var; the env var applies only when this setting is set to a duration. Only honored from project and local settings — managed and user settings values are ignored. (v2.1.200) |
| `theme` | string | `"dark"` | UI color theme. Values: `"auto"` (follow OS), `"dark"`, `"light"`, `"dark-daltonized"`, `"light-daltonized"`, `"dark-ansi"`, `"light-ansi"`, `"custom:<slug>"`, `"custom:<plugin>:<slug>"`. Plugin-provided themes use the `custom:` prefix |
| `verbose` | boolean | `false` | Show full tool output instead of truncated summaries. Equivalent to running with `--verbose`; persists the verbose view across sessions |
| `switchModelsOnFlag` | boolean | `true` | Automatically switch to the fallback model when a safety classifier flags a request. When `false`, flagged requests are blocked rather than rerouted (v2.1.170) |
| `processWrapper` | string | - | Corporate launcher command used for background processes (e.g., a credential-injecting wrapper). Only honored from managed settings, user settings (`~/.claude/settings.json`), or `--settings`; ignored from project and local settings to prevent untrusted repos from hijacking background process launches (v2.1.210) |
| `remote.defaultEnvironmentId` | string | - | Default environment ID to use when launching remote sessions or background agents via `--remote` without an explicit environment ID. When set, Claude Code selects this environment automatically rather than prompting. Only honored from user and managed settings (v2.1.200+) |
| `crossSessionInbound` | string | - | Controls how this session handles messages from your other Claude sessions via Remote Control. Values: `"accept"` (receive messages from your other sessions), `"hold"` (queue inbound messages without processing), `"refuse"` (reject inbound session-to-session traffic). Scope exception: a stricter value from project or local settings applies even against a managed setting (`accept` < `hold` < `refuse`). Appears in `/config` as **Messages from your other sessions** (v2.1.224) |
| `dialogExpiry` | string | - | How long inbound dialog requests from your other sessions remain queued before auto-expiring. Accepts duration strings (e.g., `"5m"`, `"1h"`). When a `crossSessionInbound: "hold"` session resumes, queued requests older than this duration are dropped. Appears in `/config` as **Dialog expiry** (v2.1.246) |
| `autoContinueAtUsageLimit` | boolean | - | When `true`, Claude Code automatically continues the session when a usage limit (API rate limit, daily cap) resets instead of waiting for user input. Appears in `/config` as **Auto-continue at usage limit** (v2.1.234) |
| `feedbackDrafts` | boolean | `true` | When `true`, Claude Code queues bug-report drafts in the background when it encounters surprising errors. Set to `false` to disable background draft queuing. Gates the `SendFeedback` tool. Appears in `/config` as **Feedback drafts** (v2.1.247) |
| `desktopSessionCleanupPeriodDays` | number | - | Age cutoff in days for cleaning up desktop session data (separate from transcript cleanup controlled by `cleanupPeriodDays`). Inactive desktop session artifacts older than this threshold are removed during the startup cleanup sweep (v2.1.248) |

**Example:**
```json
{
  "model": "opus",
  "agent": "code-reviewer",
  "language": "japanese",
  "cleanupPeriodDays": 60,
  "autoUpdatesChannel": "stable",
  "alwaysThinkingEnabled": true
}
```

### Plans & Memory Directories

Store plan and auto-memory files in custom locations.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `plansDirectory` | string | `~/.claude/plans` | Directory where `/plan` outputs are stored |
| `autoMemoryDirectory` | string | - | Custom directory for auto-memory storage. Accepts `~/`-expanded paths. Not accepted in project settings (`.claude/settings.json`) to prevent redirecting memory writes to sensitive locations; accepted from policy, local, and user settings |
| `autoMemoryEnabled` | boolean | `true` | Enable [auto memory](https://code.claude.com/docs/en/memory). When `false`, Claude does not read from or write to the auto-memory directory. Can also be toggled with `/memory` during a session, or disabled via the `CLAUDE_CODE_DISABLE_AUTO_MEMORY` env var |
| `fileCheckpointingEnabled` | boolean | `true` | Snapshot files before each edit so you can restore them with `/rewind`. Set to `false` to skip checkpointing and save disk space. Also disableable via the `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` env var |

**Example:**
```json
{
  "plansDirectory": "./my-plans"
}
```

**Use Case:** Useful for organizing planning artifacts separately from Claude's internal files, or for keeping plans in a shared team location.

### Worktree Settings

Configure how `--worktree` creates and manages git worktrees. Useful for reducing disk usage and startup time in large monorepos.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `worktree.symlinkDirectories` | array | `[]` | Directories to symlink from the main repository into each worktree to avoid duplicating large directories on disk |
| `worktree.sparsePaths` | array | `[]` | Directories to check out in each worktree via git sparse-checkout (cone mode). Only the listed paths are written to disk |
| `worktree.baseRef` | string | `"fresh"` | Which ref new worktrees branch from. `"fresh"` branches from `origin/<default-branch>` for a clean tree matching the remote. `"head"` branches from your current local `HEAD`, including uncommitted-but-tracked changes (v2.1.133) |
| `worktree.bgIsolation` | string | `"worktree"` | Isolation mode for [background sessions](https://code.claude.com/docs/en/agent-view). `"worktree"` (default) blocks `Edit`/`Write` in the main checkout until `EnterWorktree` is called; `"none"` lets background jobs edit the working copy directly (v2.1.143) |

**Example:**
```json
{
  "worktree": {
    "symlinkDirectories": ["node_modules", ".cache"],
    "sparsePaths": ["packages/my-app", "shared/utils"]
  }
}
```

### Attribution Settings

Customize attribution messages for git commits and pull requests.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `attribution.commit` | string | Co-authored-by | Git commit attribution (supports trailers) |
| `attribution.pr` | string | Generated message | Pull request description attribution |
| `attribution.sessionUrl` | boolean | `true` | Include a link to the claude.ai session URL in commits and PRs generated in web sessions or Remote Control sessions. Set to `false` to omit the link. Has no effect in local CLI sessions (v2.1.183) |
| `prUrlTemplate` | string | - | URL template that controls how the "PR" badge in commit attribution links to the pull request UI. Supports placeholders for the repo host, owner, repo, and PR number. Useful for self-hosted GitLab/Bitbucket/GitHub Enterprise instances where the default `https://github.com/...` URL does not apply (v2.1.119) |
| `includeCoAuthoredBy` | boolean | `true` | **DEPRECATED** - Use `attribution` instead |

**Example:**
```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
    "pr": "Generated with Claude Code"
  }
}
```

**Note:** Set to empty string (`""`) to hide attribution entirely.

### Authentication Helpers

Scripts for dynamic authentication token generation.

| Key | Type | Description |
|-----|------|-------------|
| `apiKeyHelper` | string | Shell script path that outputs auth token (sent as both `X-Api-Key` and `Authorization: Bearer` headers) |
| `forceLoginMethod` | string | Restrict login to `"claudeai"`, `"console"`, or `"gateway"` accounts. Use `"gateway"` for organization-managed Claude gateway deployments. **(Managed only)** |
| `forceLoginOrgUUID` | string \| array | Require login to belong to a specific organization. Accepts a single UUID string (which also pre-selects that organization during login) or an array of UUIDs where any listed organization is accepted without pre-selection. When set in managed settings, login fails if the authenticated account does not belong to a listed organization; an empty array fails closed and blocks login with a misconfiguration message |
| `forceLoginGatewayUrl` | string | **(Managed only)** Pre-fill the Claude gateway URL on the login screen when `forceLoginMethod` is `"gateway"`. Avoids requiring users to manually enter the gateway URL. Typically set alongside `forceLoginMethod: "gateway"` |
| `gcpAuthRefresh` | string | Custom script that refreshes GCP Application Default Credentials when they expire or cannot be loaded. Run by Claude Code before retrying authentication. Useful when ADC are short-lived and require an org-specific helper to renew. Example: `"gcloud auth application-default login"` |

**Example:**
```json
{
  "apiKeyHelper": "/bin/generate_temp_api_key.sh",
  "forceLoginMethod": "console",
  "forceLoginOrgUUID": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"]
}
```

### Company Announcements

Display custom announcements to users at startup (cycled randomly).

| Key | Type | Description |
|-----|------|-------------|
| `companyAnnouncements` | array | Array of strings displayed at startup |

**Example:**
```json
{
  "companyAnnouncements": [
    "Welcome to Acme Corp!",
    "Remember to run tests before committing!",
    "Check the wiki for coding standards"
  ]
}
```

---

## Permissions

Control what tools and operations Claude can perform.

### Permission Structure

```json
{
  "permissions": {
    "allow": [],
    "ask": [],
    "deny": [],
    "additionalDirectories": [],
    "defaultMode": "acceptEdits",
    "disableBypassPermissionsMode": "disable"
  }
}
```

### Permission Keys

| Key | Type | Description |
|-----|------|-------------|
| `permissions.allow` | array | Rules allowing tool use without prompting |
| `permissions.ask` | array | Rules requiring user confirmation |
| `permissions.deny` | array | Rules blocking tool use (highest precedence) |
| `permissions.additionalDirectories` | array | Extra directories Claude can access |
| `permissions.defaultMode` | string | Default permission mode. Valid values: `"default"`, `"manual"` (alias for `"default"`, v2.1.200), `"acceptEdits"`, `"dontAsk"`, `"bypassPermissions"`, `"auto"`, `"plan"`. In Remote environments, only `acceptEdits` and `plan` are honored (v2.1.70+). **Note (v2.1.142):** `"auto"` is ignored when set in project (`.claude/settings.json`) or local settings — a repository cannot grant itself auto mode; use `~/.claude/settings.json` instead |
| `permissions.disableBypassPermissionsMode` | string | Prevent bypass mode activation |
| `permissions.skipDangerousModePermissionPrompt` | boolean | Skip the confirmation prompt shown before entering bypass permissions mode via `--dangerously-skip-permissions` or `defaultMode: "bypassPermissions"`. Ignored when set in project settings (`.claude/settings.json`) to prevent untrusted repositories from auto-bypassing the prompt |
| `allowManagedPermissionRulesOnly` | boolean | **(Managed only)** Only managed permission rules apply; user/project `allow`, `ask`, `deny` rules are ignored |
| `autoMode` | object | Customize what the [auto mode](https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode) classifier blocks and allows. Contains `environment` (trusted infrastructure descriptions), `allow` (exceptions to block rules), `soft_deny` (block rules), and `hard_deny` (unconditional block rules — cannot be overridden by `allow` exceptions or the `$defaults` sentinel, v2.1.136) — all arrays of prose strings. Also accepts `classifyAllShell` (boolean, default `false`): when `true`, routes all Bash/PowerShell commands through the auto-mode classifier instead of only arbitrary-code-execution patterns, giving stricter coverage at the cost of more classifier calls (v2.1.193). **Not read from shared project settings** (`.claude/settings.json`) **or local settings** (`.claude/settings.local.json`) to prevent repo injection (v2.1.207 removed local-settings scope). Available in user and managed settings only; configure in `~/.claude/settings.json`. Setting `allow` or `soft_deny` **replaces** the entire default list for that section unless you include the literal string `"$defaults"` in the array — the sentinel inherits the built-in rules at that position so custom entries are added alongside them (v2.1.118). Run `claude auto-mode defaults` to see built-in rules before customizing |
| `disableAutoMode` | string | Set to `"disable"` to prevent [auto mode](https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode) from being activated. Removes `auto` from the `Shift+Tab` cycle and rejects `--permission-mode auto` at startup. Can be set at any settings level; most useful in managed settings where users cannot override it |
| `useAutoModeDuringPlan` | boolean | Whether plan mode uses auto mode semantics when auto mode is available. Default: `true`. Not read from shared project settings (`.claude/settings.json`). Appears in `/config` as "Use auto mode during plan" |

### Permission Modes

| Mode | Behavior |
|------|----------|
| `"default"` | Standard permission checking with prompts |
| `"manual"` | Alias for `"default"` introduced in v2.1.200 — same standard permission checking with prompts. The rename improves clarity across the CLI, VS Code, and JetBrains UIs. Accepted wherever `"default"` is accepted |
| `"acceptEdits"` | Automatically accepts file edits **and common filesystem commands** (`mkdir`, `touch`, `mv`, `cp`, etc.) for paths in the working directory or `additionalDirectories`. **v2.1.160:** Always prompts before writing build-tool config files that grant code execution (`.npmrc`, `.yarnrc*`, `bunfig.toml`, `.bazelrc`, `.pre-commit-config.yaml`, `.devcontainer/`, etc.) and before writing to shell startup files (`.zshenv`, `.zlogin`, `.bash_login`) and `~/.config/git/` |
| `"dontAsk"` | Auto-denies tools unless pre-approved via `/permissions` or `permissions.allow` rules. Tools marked `requiresUserInteraction` in their MCP server manifest and organization-set-to-ask connector tools are **denied** even if you've explicitly allowed them |
| `"bypassPermissions"` | Skip all permission checks (dangerous). All path-based prompts are skipped — writes to `.git`, `.config/git`, `.claude`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, and `.mvn` no longer prompt (**v2.1.121** exempted `.claude/commands/`, `.claude/agents/`, `.claude/skills/`, and `.claude/worktrees/`; **v2.1.126** removed all remaining path-based prompts). Three classes still prompt regardless: (1) removals targeting the filesystem root or home directory (`rm -rf /`, `rm -rf ~`, including commands using `$(...)`, backtick substitution, or `<(...)` process substitution), (2) tools marked `requiresUserInteraction` in their MCP server manifest, and (3) organization-set-to-ask connector tools. Explicit `permissions.ask` rules still prompt — only the built-in permission checks are bypassed |
| `"auto"` | Auto-approves tool calls with background safety checks that verify actions align with your request. Research preview. Classifier auto-approves read-only and file edits; sends everything else through a safety check. Falls back to prompting after 3 consecutive or 20 total blocks. In the default `Shift+Tab` permission-mode cycle since v2.1.111 (the `--enable-auto-mode` flag was removed in v2.1.111 — start in this mode with `--permission-mode auto`). Configure with the `autoMode` setting |
| `"plan"` | Read-only exploration mode. As of v2.1.136, file writes are blocked even when a matching `Edit(...)` allow rule exists — plan mode now overrides explicit allow rules to maintain its read-only guarantee |

### Tool Permission Syntax

| Tool | Syntax | Examples |
|------|--------|----------|
| `Bash` | `Bash(command pattern)` | `Bash(npm run *)`, `Bash(* install)`, `Bash(git * main)` |
| `PowerShell` | `PowerShell(cmd *)` | `PowerShell(Get-ChildItem *)`, `PowerShell(git commit *)` — same shape as Bash; common aliases are canonicalized (`gci`/`ls`/`dir` → `Get-ChildItem`) and the PowerShell AST is parsed so each subcommand of a `|`/`;`/`&&`/`||` chain must match |
| `Read` | `Read(path pattern)` | `Read(.env)`, `Read(./secrets/**)` |
| `Edit` | `Edit(path pattern)` | `Edit(src/**)`, `Edit(*.ts)` |
| `Write` | `Write(path pattern)` | `Write(*.md)`, `Write(./docs/**)` — **valid in `deny` and `ask` rules only**; accepted in `allow` rules at parse time but never consulted (see note below) |
| `NotebookEdit` | `NotebookEdit(pattern)` | `NotebookEdit(*)` — **valid in `deny` and `ask` rules only**; accepted in `allow` rules at parse time but never consulted (see note below) |
| `WebFetch` | `WebFetch(domain:pattern)` | `WebFetch(domain:example.com)` |
| `WebSearch` | `WebSearch` | Global web search |
| `Task` | `Task(agent-name)` | `Task(Explore)`, `Task(my-agent)` — legacy alias for `Agent`; prefer `Agent(name)` in new configs |
| `Agent` | `Agent(name)` | `Agent(researcher)`, `Agent(*)` — permission scoped to subagent spawning |
| `Skill` | `Skill(skill-name)` or `Skill(prefix *)` | `Skill(weather-fetcher)`, `Skill(weather *)` matches `weather-fetcher`/`weather-svg-creator` (v2.1.139) *(not in official permissions docs — unverified)* |
| `MCP` | `mcp__server__tool` | `mcp__memory__*`, `mcp__github__*` — official docs show only the double-underscore form; `MCP(server:tool)` shorthand *(not in official permissions docs — unverified)* |
| `Tool` | `Tool(param:value)` | `Agent(model:opus)`, `Agent(isolation:worktree)`, `Bash(run_in_background:true)` — match **deny and ask rules** against a tool's input parameters; supports `*` wildcards in the value position. **Allow rules do not use this syntax** — an allow rule for one parameter value wouldn't establish overall safety, so allow rules continue to use each tool's own specifier syntax. Matching a tool's primary content field (e.g., `Bash(command:rm *)`) is also forbidden and triggers a startup warning (v2.1.178) |
| `Cd` | `Cd(path pattern)` | `Cd(/home/*)`, `Cd(~/projects/*)` — controls which directories the `/cd` command may navigate to. **Allowlist mode:** adding *any* `Cd` allow rule switches `/cd` into allowlist mode — all paths not explicitly allowed are refused. A bare `Cd` deny disables `/cd` entirely. **Wildcard semantics differ from Read/Edit:** `*` matches exactly one path segment; `**` crosses segments. A trailing `/**` also matches the named root itself. These rules do NOT follow gitignore-style matching |

> **v2.1.210:** `Write(path)`, `NotebookEdit(path)`, and `Glob(path)` in **allow** rules are accepted at parse time but **never consulted** — Claude Code's allow-rule evaluation only checks `Edit(path)` and `Read(path)`. A startup warning flags these entries and recommends the correct alternatives. In **deny** and **ask** rules, `Write(path)`, `NotebookEdit(path)`, and `Glob(path)` continue to work as expected.

**Evaluation order:** Rules are evaluated in order: deny rules first, then ask, then allow. The first matching rule wins.

**Deny rule glob patterns (v2.1.166):** In a `deny` rule, using `"*"` in the tool-name position matches ALL tools — equivalent to a global deny. For example, `"*"` in the deny array blocks every tool call. This makes it possible to lock down access completely and carve out specific allow/ask exceptions.

**Allow rule glob restrictions:** In an `allow` rule, tool-name globs are only accepted **after a literal `mcp__<server>__` prefix** — the server segment must be glob-free. An unanchored allow glob such as `"*"`, `"B*"`, or `"mcp__*"` is **skipped with a startup warning** and does not auto-approve anything. For example, `"allow": ["mcp__github__*"]` works, but `"allow": ["mcp__*"]` does not. Use `"deny": ["*"]` plus specific allow rules to allowlist instead.

**Read/Edit path patterns:** Permission rules for `Read`, `Edit`, and `Write` support gitignore-style patterns with four prefix types:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `//` | Absolute path from filesystem root | `Read(//Users/alice/file)` |
| `~/` | Relative to home directory | `Read(~/.zshrc)` |
| `/` | Relative to project root | `Edit(/src/**)` |
| `./` or none | Relative path (current directory) | `Read(.env)`, `Read(*.ts)` |

**Symlink resolution:** Permission rules check both the symlink path and its resolved target. **Allow** rules apply only when *both* the symlink and its target match — a symlink inside an allowed directory that points outside it still prompts. **Deny** rules apply when *either* the symlink or its target matches — a symlink to a denied file is itself denied.

**Bash wildcard notes:**
- `*` can appear at **any position**: prefix (`Bash(* install)`), suffix (`Bash(npm *)`), or middle (`Bash(git * main)`)
- **Word boundary:** `Bash(ls *)` (space before `*`) matches `ls -la` but NOT `lsof`; `Bash(ls*)` (no space) matches both
- `Bash(*)` is treated as equivalent to `Bash` (matches all bash commands)
- Permission rules support output redirections: `Bash(python:*)` matches `python script.py > output.txt`
- The `:*` suffix syntax (e.g., `Bash(npm:*)`) is an equivalent way to write a trailing wildcard — it is **not deprecated** but only recognized at the end (e.g., `Bash(git:* push)` treats the colon literally). The permission dialog writes the space form
- **Compound commands:** shell operators (`&&`, `||`, `;`, `|`, `|&`, `&`, and newlines) split a command and each subcommand must match independently — `Bash(safe-cmd *)` does **not** authorize `safe-cmd && other-cmd`
- **Process wrappers:** `timeout`, `time`, `nice`, `nohup`, and `stdbuf` are stripped before matching (so `Bash(npm test *)` also matches `timeout 30 npm test`); bare `xargs` (no flags) is stripped too. Exec wrappers `watch`, `setsid`, `ionice`, `flock`, and `find` with `-exec`/`-delete` always prompt and cannot be approved by a prefix rule

**Example:**
```json
{
  "permissions": {
    "allow": [
      "Edit(*)",
      "Bash(npm run *)",
      "Bash(git *)",
      "WebFetch(domain:*)",
      "mcp__memory__*"
    ],
    "ask": [
      "Bash(rm *)",
      "Bash(git push *)"
    ],
    "deny": [
      "Read(.env)",
      "Read(./secrets/**)",
      "Bash(curl *)"
    ],
    "additionalDirectories": ["../shared-libs/"]
  }
}
```

---

## Hooks

Hook configuration (events, properties, matchers, exit codes, environment variables, and HTTP hooks) is maintained in a dedicated repository:

> **[claude-code-hooks](https://github.com/shanraisshan/claude-code-hooks)** — Complete hook reference with sound notification system, all 28 hook events (including `PreModelSwitch` and `PostModelSwitch` added in v2.1.252), HTTP hooks, matcher patterns, exit codes, and environment variables.

Hook-related settings keys (`hooks`, `disableAllHooks` (also disables any custom status line), `allowManagedHooksOnly`, `allowedHttpHookUrls`, `httpHookAllowedEnvVars`) are documented there.

For the official hooks reference, see the [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks).

---

## MCP Servers

Configure Model Context Protocol servers for extended capabilities.

> **OAuth (v2.1.111):** MCP servers that authenticate via OAuth follow [RFC 9728](https://datatracker.ietf.org/doc/rfc9728/) for protected-resource metadata discovery. Compliant servers expose authorization endpoints under `/.well-known/oauth-protected-resource`, and Claude Code completes the OAuth flow automatically — no manual `apiKeyHelper` or `headersHelper` script required for spec-conformant servers.

> **Reserved server names (v2.1.128+):** `workspace`, `Claude Browser`, and `Claude Preview` are reserved MCP server names. User-defined servers with these names are skipped at load time with a warning logged to the session log. Rename any pre-existing servers using these names to avoid the collision.

> **`.mcp.json` hot-reload (v2.1.139):** The `/mcp` Reconnect action now re-reads `.mcp.json` from disk before reconnecting, so adding or editing a server no longer requires a session restart. Claude Code also injects `CLAUDE_PROJECT_DIR` into stdio-launched MCP server environments (v2.1.139) so servers can resolve paths relative to the project root.

> **Per-server timeout floor (v2.1.162):** Per-server `timeout` values less than 1000ms are ignored and the global `MCP_TOOL_TIMEOUT` default applies instead. Values ≥ 1000ms are honored as before.

### MCP Settings

| Key | Type | Scope | Description |
|-----|------|-------|-------------|
| `enableAllProjectMcpServers` | boolean | Any | Auto-approve all `.mcp.json` servers. **Security note (v2.1.196):** `.mcp.json` servers no longer self-approve — explicit opt-in via `enableAllProjectMcpServers: true` or `enabledMcpjsonServers` is now required |
| `enabledMcpjsonServers` | array | Any | Allowlist specific server names |
| `disabledMcpjsonServers` | array | Any | Blocklist specific server names |
| `allowedMcpServers` | array | Managed only | Allowlist with name/command/URL matching |
| `deniedMcpServers` | array | Managed only | Blocklist with matching |
| `allowManagedMcpServersOnly` | boolean | Managed only | Only allow MCP servers explicitly listed in managed allowlist |
| `channelsEnabled` | boolean | Managed only | Allow [channels](https://code.claude.com/docs/en/channels) for Team and Enterprise users. When unset or `false`, channel message delivery is blocked regardless of `--channels` flag |
| `allowedChannelPlugins` | array | Managed only | Allowlist of channel plugins that may push messages. Replaces the default Anthropic allowlist when set. Undefined = fall back to the default, empty array = block all channel plugins. Requires `channelsEnabled: true`. Each entry is an object with `marketplace` and `plugin` fields (v2.1.84) |
| `allowAllClaudeAiMcps` | boolean | Managed only | Load claude.ai cloud MCP connectors alongside `managed-mcp.json`. When enabled, claude.ai-hosted MCP connectors are made available in addition to admin-deployed managed MCP servers |
| `disableClaudeAiConnectors` | boolean | Any | Disable auto-fetching of claude.ai MCP connectors. When `true`, claude.ai cloud connectors are not loaded. **Restrictive-value exception:** `true` applies from any scope, including project settings, even against a managed `false` — lower-priority scopes can opt out but cannot opt in (v2.1.182) |

### MCP Server Matching (Managed Settings)

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": "npx @modelcontextprotocol/*" },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" }
  ]
}
```

> **`${VAR}` interpolation (v2.1.219):** `allowedMcpServers` and `deniedMcpServers` entries may contain `${VAR}` placeholders. Claude Code resolves them from the startup environment and managed-settings `env` block at load time. Use to reference environment-specific server names or URLs without hardcoding them in managed settings (e.g., `{ "serverUrl": "https://${MCP_HOST}/*" }`).

### Per-Server Tool Loading (`alwaysLoad`, v2.1.121)

By default, MCP tool definitions are deferred (loaded into context on demand via tool search). Set `alwaysLoad: true` on an individual MCP server entry in `.mcp.json` (or inline `mcpServers`) to exempt that server from deferral — every tool from that server then loads upfront at session start regardless of `ENABLE_TOOL_SEARCH`. Available on all server types; requires Claude Code v2.1.121+. Use this only for a small set of tools needed every turn — each upfront tool consumes context that would otherwise be available for conversation.

```json
{
  "mcpServers": {
    "always-on-server": {
      "type": "http",
      "url": "https://mcp.example.com",
      "alwaysLoad": true
    }
  }
}
```

An MCP server can also mark individual tools as always-loaded by including `"anthropic/alwaysLoad": true` in the tool's `_meta` object — useful when only a subset of a server's tools should bypass deferral.

**Example:**
```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["memory", "github", "filesystem"],
  "disabledMcpjsonServers": ["experimental-server"]
}
```

---

## Sandbox

Configure bash command sandboxing for security.

### Sandbox Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sandbox.enabled` | boolean | `false` | Enable bash sandboxing |
| `sandbox.failIfUnavailable` | boolean | `false` | Exit with error when sandbox is enabled but cannot start, instead of running unsandboxed. Useful for enterprise policies that require strict sandboxing (v2.1.83) |
| `sandbox.autoAllowBashIfSandboxed` | boolean | `true` | Auto-approve bash when sandboxed. As of v2.1.139, shell-expansion forms (`$VAR`, `$(cmd)`) are correctly recognized so commands containing variable substitution no longer fall back to a prompt when sandbox auto-approval is enabled |
| `sandbox.excludedCommands` | array | `[]` | Commands to run outside sandbox |
| `sandbox.allowUnsandboxedCommands` | boolean | `true` | Allow `dangerouslyDisableSandbox`. When set to `false`, the escape hatch is completely disabled and all commands must run sandboxed (or be in `excludedCommands`). Useful for enterprise policies that require strict sandboxing |
| `sandbox.filesystem.disabled` | boolean | `false` | Skip filesystem isolation while keeping network egress control active. When `true`, the sandbox does not restrict file access but network egress stays confined to `sandbox.network.allowedDomains`. **Only honored from user settings, managed settings, or `--settings`** — ignored in `.claude/settings.json` and `.claude/settings.local.json` (v2.1.216) |
| `sandbox.ignoreViolations` | object | `{}` | Map of command patterns to path arrays — suppress violation warnings *(in JSON schema, not on official settings page)* |
| `sandbox.enableWeakerNestedSandbox` | boolean | `false` | **(Linux and WSL2 only)** Enable weaker sandbox for unprivileged Docker environments (reduces security) |
| `sandbox.network.allowUnixSockets` | array | `[]` | **(macOS only)** Specific Unix socket paths accessible in sandbox. Ignored on Linux and WSL2, where the seccomp filter cannot inspect socket paths; use `allowAllUnixSockets` instead |
| `sandbox.network.allowAllUnixSockets` | boolean | `false` | Allow all Unix sockets (overrides `allowUnixSockets`). On Linux and WSL2 this is the only way to permit Unix sockets, since it skips the seccomp filter that otherwise blocks `socket(AF_UNIX, ...)` calls |
| `sandbox.network.allowLocalBinding` | boolean | `false` | Allow binding to localhost ports (macOS) |
| `sandbox.network.allowedDomains` | array | `[]` | Network domain allowlist for sandbox |
| `sandbox.network.strictAllowlist` | boolean | `false` | When `true`, deny all network access to hosts **not** in `allowedDomains` without prompting the user. By default, unlisted hosts prompt for permission; this setting makes the allowlist a hard block. The effective allowlist also includes any `WebFetch(domain:...)` allow rules. Only applies to outbound connections from sandboxed bash commands — Claude Code's own API and WebFetch calls are not affected. **Only honored from user settings, managed settings, or `--settings`** — ignored in `.claude/settings.json` and `.claude/settings.local.json` (v2.1.219) |
| `sandbox.network.deniedDomains` | array | `[]` | Network domain denylist for bash sandbox. Takes precedence over wildcards in `allowedDomains`. Supports glob patterns (e.g., `"*.example.com"`) (v2.1.113) |
| `sandbox.network.httpProxyPort` | number | - | HTTP proxy port 1-65535 (custom proxy) |
| `sandbox.network.socksProxyPort` | number | - | SOCKS5 proxy port 1-65535 (custom proxy) |
| `sandbox.network.allowManagedDomainsOnly` | boolean | `false` | Only allow domains in managed allowlist (managed settings) |
| `sandbox.network.allowMachLookup` | array | `[]` | (macOS only) Additional XPC/Mach service names the sandbox may look up. Supports a single trailing `*` for prefix matching. Needed for tools that communicate via XPC such as the iOS Simulator or Playwright. Example: `["com.apple.coresimulator.*"]` |
| `sandbox.filesystem.allowWrite` | array | `[]` | Additional paths where sandboxed commands can write. Arrays are merged across all settings scopes. Also merged with paths from `Edit(...)` allow permission rules. Prefix: `/` (absolute), `~/` (home), `./` or none (project-relative in project settings, `~/.claude`-relative in user settings). The older `//` prefix for absolute paths still works. **Note:** This differs from [Read/Edit permission rules](#tool-permission-syntax), which use `//` for absolute and `/` for project-relative |
| `sandbox.filesystem.denyWrite` | array | `[]` | Paths where sandboxed commands cannot write. Arrays are merged across all settings scopes. Also merged with paths from `Edit(...)` deny permission rules. Same path prefix conventions as `allowWrite` |
| `sandbox.filesystem.denyRead` | array | `[]` | Paths where sandboxed commands cannot read. Arrays are merged across all settings scopes. Also merged with paths from `Read(...)` deny permission rules. Same path prefix conventions as `allowWrite` |
| `sandbox.filesystem.allowRead` | array | `[]` | Paths to re-allow read access within `denyRead` regions. Overrides matching `denyRead` glob entries, but an exact-path `denyRead` rule still blocks exact matches — `allowRead` does not universally trump every `denyRead` pattern. Arrays are merged across all settings scopes. Same path prefix conventions as `allowWrite` |
| `sandbox.filesystem.allowManagedReadPathsOnly` | boolean | `false` | **(Managed only)** Only `allowRead` paths from managed settings are respected. `allowRead` entries from user, project, and local settings are ignored |
| `sandbox.enableWeakerNetworkIsolation` | boolean | `false` | (macOS only) Allow access to system TLS trust (`com.apple.trustd.agent`); reduces security |
| `sandbox.bwrapPath` | string | - | **(Managed only, Linux/WSL2)** Absolute path to the bubblewrap (`bwrap`) binary. Overrides automatic `PATH` detection. Only honored from managed settings, not user or project settings. Example: `/opt/admin/bwrap` (v2.1.133) |
| `sandbox.socatPath` | string | - | **(Managed only, Linux/WSL2)** Absolute path to the `socat` binary used for the sandbox network proxy. Overrides automatic `PATH` detection. Only honored from managed settings. Example: `/opt/admin/socat` (v2.1.133) |
| `sandbox.allowAppleEvents` | boolean | `false` | **(macOS only)** Opt-in for sandboxed commands to send Apple Events. Required for tools that use `open`, `osascript`, or browser authentication flows that depend on Apple Events IPC. **Warning:** Enabling this removes code-execution isolation — Apple Events can be used to execute code in other applications (v2.1.181) |
| `sandbox.credentials` | object | — | Fine-grained control over which credential files and environment variables are blocked from sandboxed subprocess environments. Object with two arrays: `files` (array of credential file entries — see sub-keys below) and `envVars` (array of `{name: string, mode: string, injectHosts?: string[]}` entries — `mode` is `"deny"` (default, strips the var) or `"mask"` (substitutes a placeholder, only honored from user settings/managed/`--settings`; `deny` takes precedence when same var appears with both modes) with `injectHosts` selectively exposing the value to listed hosts only). An individual invalid entry is stripped with a warning; the valid subset is enforced. (v2.1.187; per-entry object shape since v2.1.191; per-entry `mode` and `injectHosts` since v2.1.199) |
| `sandbox.credentials.files[].path` | string | — | Absolute or `~/`-prefixed path to the credential file to protect |
| `sandbox.credentials.files[].mode` | string | `"deny"` | `"deny"` blocks sandboxed reads of the file; `"mask"` intercepts reads and substitutes placeholder values so commands can still run but cannot exfiltrate the raw credential. **`mask` mode only honored from user settings, managed settings, or `--settings`** (v2.1.187 deny; v2.1.221 mask) |
| `sandbox.credentials.files[].extract` | string | — | Regex with a single capture group used to locate credential values within the file for masking. Required when `mode` is `"mask"` and the file is not a well-known format. Example: `"oauth_token:\\s*(\\S+)"` (v2.1.221) |
| `sandbox.credentials.files[].injectHosts` | array | — | Hostnames that receive the real credential value via the TLS-termination proxy even when `mode` is `"mask"`. Requires `sandbox.network.tlsTerminate` to be configured (v2.1.199) |
| `sandbox.credentials.files[].onExtractNoMatch` | string | `"warn"` | Behavior when the `extract` regex matches nothing: `"warn"` (log a warning, allow read), `"deny"` (block the read), or `"error"` (abort the sandboxed command) (v2.1.221) |
| `sandbox.credentials.files[].maskDuplicates` | boolean | `false` | When `true`, also mask occurrences of the extracted credential value that appear in other files and env vars read during the same sandboxed command (v2.1.221) |
| `sandbox.credentials.files[].decode` | string | - | Decode strategy for credential extraction. Set to `"jwt"` to enable JWT-aware masking — the file is decoded as a JWT and individual claims are masked. Use with `maskClaims` to specify which claims to protect (v2.1.224) |
| `sandbox.credentials.files[].maskClaims` | array | - | When `decode` is `"jwt"`, the list of JWT claim names whose values should be masked in sandboxed command output. Example: `["access_token", "id_token"]` (v2.1.224) |
| `sandbox.credentials.awsPairs` | object | - | AWS credential pair masking for sandboxed commands. Masks AWS access key IDs and their corresponding secret access keys as a correlated pair. Object with credential pair entries for AWS SigV4 re-signing in credential-masked environments. Requires `mask` mode on the related credential file (v2.1.224) |
| `sandbox.credentials.sigv4` | object | - | AWS SigV4 re-signing configuration for sandboxed HTTP requests. When configured, the TLS-termination proxy re-signs outbound requests with AWS credentials after credential masking — allowing sandboxed commands to make authenticated AWS API calls without directly accessing raw credentials. Requires `sandbox.network.tlsTerminate` (v2.1.224) |
| `sandbox.network.tlsTerminate` | object | — | TLS termination configuration for sandboxed bash commands. When set, Claude Code acts as a TLS man-in-the-middle for outbound HTTPS from the sandbox, enabling credential masking (`sandbox.credentials` `mask` mode). Set to `{}` to generate an ephemeral certificate authority for the session, or set `caCertPath` and `caKeyPath` to provide your own CA. **Only honored from user settings, managed settings, or `--settings`** — ignored in `.claude/settings.json` and `.claude/settings.local.json`. Experimental (v2.1.199) |
| `sandbox.credentials.allowPlaintextInject` | boolean | `false` | Allow `mask` credential substitution to also apply on **plain HTTP requests** (where the upstream identity is unverified and the credential travels in cleartext). When `false` (default), credential injection via `injectHosts` is restricted to TLS-terminated HTTPS connections only, preventing credentials from being sent over unencrypted channels. Use only in trusted local environments where cleartext exposure is acceptable (v2.1.199) |

**Example:**
```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["git", "docker", "gh"],
    "allowUnsandboxedCommands": false,
    "network": {
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

---

## Plugins

Configure Claude Code plugins and marketplaces.

### Plugin Settings

| Key | Type | Scope | Description |
|-----|------|-------|-------------|
| `enabledPlugins` | object | Any | Enable/disable specific plugins |
| `extraKnownMarketplaces` | object | Project | Add custom plugin marketplaces (team sharing via `.claude/settings.json`) |
| `strictKnownMarketplaces` | boolean | Managed only | When `true`, only the official Anthropic marketplace is permitted; no additional or custom marketplaces may be installed |
| `strictPluginOnlyCustomization` | boolean \| array | Managed only | Block skills, agents, hooks, and MCP servers from user and project sources, so they can only come from plugins or managed settings. `true` locks all four surfaces; an array such as `["skills", "hooks"]` locks only the named ones |
| `pluginSuggestionMarketplaces` | array | Managed only | Allowlist of marketplace names whose plugins may appear as contextual install suggestions during a session. Restricts which marketplaces can surface "you might want this plugin" prompts (v2.1.152) |
| `skippedMarketplaces` | array | Any | Marketplaces user declined to install *(in JSON schema, not on official settings page)* |
| `skippedPlugins` | array | Any | Plugins user declined to install *(in JSON schema, not on official settings page)* |
| `pluginConfigs` | object | Managed / User / --settings | Per-plugin MCP server configs (keyed by `plugin@marketplace`). As of v2.1.207, no longer read from project-level `.claude/settings.json` or `.claude/settings.local.json`; only user, `--settings`, and managed settings are honored |
| `blockedMarketplaces` | array | Managed only | Block specific plugin marketplaces. Each entry can match by source string, `hostPattern`, or `pathPattern` — as of v2.1.119 the `hostPattern` and `pathPattern` matchers are correctly enforced before any download touches the filesystem, so blocked marketplaces never reach disk |
| `pluginTrustMessage` | string | Managed only | Custom message displayed when prompting users to trust plugins |
| `disableSideloadFlags` | boolean | Managed only | Reject the `--plugin-dir`, `--plugin-url`, `--agents`, and `--mcp-config` startup flags. When `true`, users cannot bypass `strictKnownMarketplaces` by passing sideload flags at launch. Use in managed environments to enforce marketplace-only plugin distribution (v2.1.193) |
| `disableCommandPluginSources` | boolean | Managed only | Block marketplace sources of type `command` (dynamic plugin-directory resolution via a local command). When `true`, `command`-typed marketplace source entries are ignored even if present in plugin configs. Use to prevent plugins that use command sources from loading in managed environments (v2.1.229+) |

**Marketplace source types:** `github`, `git`, `directory`, `settings`, `url`, `npm`, `file`, `archive`, `command`. Use `source: 'settings'` to declare a small set of plugins inline without setting up a hosted marketplace repository. Use `source: 'archive'` for zip-based plugin installation with SHA-256 pinning (v2.1.224). Use `source: 'command'` for dynamic plugin-directory resolution — a local command prints the plugin directory path, re-resolved each session; `mode: "link"` uses it in place instead of copying it (v2.1.229). Note: `hostPattern` is a *matcher* field for `blockedMarketplaces`, not a source type.

**Owner wildcard entries (v2.1.223):** `strictKnownMarketplaces` and `blockedMarketplaces` now accept `"owner/*"` wildcard entries to match all repositories from a specific organization or user.

**Example:**
```json
{
  "enabledPlugins": {
    "formatter@acme-tools": true,
    "deployer@acme-tools": true,
    "experimental@acme-tools": false
  },
  "extraKnownMarketplaces": {
    "acme-tools": {
      "source": {
        "source": "github",
        "repo": "acme-corp/claude-plugins"
      }
    },
    "inline-tools": {
      "source": {
        "source": "settings",
        "name": "inline-tools",
        "plugins": [
          {
            "name": "code-formatter",
            "source": { "source": "github", "repo": "acme-corp/code-formatter" }
          }
        ]
      }
    }
  }
}
```

---

## Model Configuration

### Model Aliases

| Alias | Description |
|-------|-------------|
| `"default"` | Recommended for your account type |
| `"sonnet"` | Latest Sonnet model (Claude Sonnet 5 on the Anthropic API — native 1M-token context, introduced v2.1.197; Claude Sonnet 4.6 on Bedrock/Vertex/Foundry) |
| `"opus"` | Latest Opus model (**Claude Opus 5** (`claude-opus-5`) on the Anthropic API as of v2.1.219 — 1M-token context native; Opus 4.8 on Bedrock, Vertex, and Claude Platform on AWS as of v2.1.207). Opus 5 and Opus 4.8 are the fast-mode models (Opus 4.7 removed from fast mode in v2.1.219). Opus 5 supports `ultracode` effort; Opus 4.8 defaults to `high` and supports `xhigh` |
| `"haiku"` | Fast Haiku model |
| `"sonnet[1m]"` | Sonnet with 1M token context |
| `"opus[1m]"` | Opus with 1M token context (default on Max, Team, and Enterprise since v2.1.75) |
| `"opusplan"` | Opus for planning, Sonnet for execution |
| `"fable"` | Claude Fable 5 — long-horizon reasoning model. Anthropic API only (v2.1.170+). Fable 5 includes 1M context by default; the `[1m]` suffix is auto-stripped, so `fable[1m]` is redundant (v2.1.173) |

**Example:**
```json
{
  "model": "opus"
}
```

> **Note (v2.1.144):** `/model` changes the model for the **current session only**. Press `d` in the `/model` picker to also set the selection as your default. The `model` setting and `ANTHROPIC_MODEL` continue to control the persistent default.

### Model Overrides

Map Anthropic model IDs to provider-specific model IDs for Bedrock, Vertex, or Foundry deployments.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `effortLevel` | string | - | Persist the effort level across sessions. Accepts `"low"`, `"medium"`, `"high"`, `"xhigh"` (Fable 5, Opus 5, Sonnet 5, Opus 4.7, Opus 4.8, v2.1.111). **`"max"` and `"ultracode"` are session-only and are not accepted here** — set them via `/effort` or `--settings` for a single session but do not write them to `settings.json`. Written automatically when you run `/effort <level>`. The default effort is `high` on every model that supports effort, except Opus 4.7 which defaults to `xhigh`. Unsupported levels fall back to the highest supported level on the active model. **As of v2.1.243, `/effort` saves defaults per-model via `modelSettings`** — use `modelSettings` when you want different effort defaults per model |
| `modelSettings` | object | - | Per-model saved effort levels and configuration, keyed by model alias or ID. Each entry contains `effortLevel` and optionally other per-model overrides. `/effort` writes to this key as of v2.1.243, enabling different default effort levels on different models. **Does not merge across settings files** — the highest-precedence file that defines it supplies the entire object. Example: `{"opus": {"effortLevel": "xhigh"}, "sonnet": {"effortLevel": "high"}}` |
| `modelPicker` | object | - | Curate and order the `/model` picker with labeled, ordered rows. Overrides the default model list when set. **Does not merge across settings files** — the highest-precedence file that defines it supplies the entire list. Example: `[{"id": "opus", "label": "Opus 5 (reasoning)"}, {"id": "sonnet", "label": "Sonnet 5 (balanced)"}]` (v2.1.242+) |
| `modelPricing` | object | - | **(Managed only)** Contracted per-model rates and discount multipliers applied to usage cost reporting. Allows organizations to configure accurate cost attribution when using negotiated pricing tiers rather than public list prices (v2.1.243+) |
| `fallbackModel` | array | - | Up to 3 fallback model IDs tried sequentially when the primary model is unavailable (e.g., rate-limited or capacity issue). Each entry is a model ID or alias; `"default"` expands to the account default. Claude Code attempts the primary model first; if it fails, each fallback is tried in order. Stops at the first successful response. **Unlike most array settings, this key does not merge across settings files** — the highest-precedence file that defines it supplies the entire chain; entries beyond 3 (after deduplication) are silently ignored (v2.1.166) |
| `modelOverrides` | object | - | Map model picker entries to provider-specific IDs (e.g., Bedrock inference profile ARNs). Each key is a model picker entry name, each value is the provider model ID |

**Example:**
```json
{
  "modelOverrides": {
    "claude-opus-4-6": "arn:aws:bedrock:us-east-1:123456789:inference-profile/anthropic.claude-opus-4-6-v1:0",
    "claude-sonnet-4-6": "arn:aws:bedrock:us-east-1:123456789:inference-profile/anthropic.claude-sonnet-4-6-v1:0"
  }
}
```

### Effort Level

The `/model` command exposes an **effort level** control that adjusts how much reasoning the model applies per response. Use the ← → arrow keys in the `/model` UI to cycle through effort levels.

| Effort Level | Description |
|-------------|-------------|
| Ultracode | Session-only: triggers the ultracode workflow in addition to xhigh reasoning depth. Activated via `/effort ultracode` — **not a valid `effortLevel` value in settings.json** (v2.1.203+) |
| Max | Session-only: maximum reasoning depth on models that support it (Fable 5, Opus 5, Sonnet 5, Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 4.6). **Not a valid `effortLevel` value in settings.json** |
| XHigh | Extended high reasoning depth. Available on Fable 5, Opus 5, Sonnet 5, Opus 4.7, Opus 4.8 (v2.1.111). Default on Opus 4.7 across all plans; on other supported models the default is `high` |
| High (default on all effort-supporting models except Opus 4.7) | Full reasoning depth, best for complex tasks |
| Medium | Balanced reasoning, good for everyday tasks |
| Low | Minimal reasoning, fastest responses |

**How to use:**
1. Run `/effort low`, `/effort medium`, or `/effort high` to set directly (v2.1.76+)
2. Or run `/model` → select a model → use **← →** arrow keys to adjust
3. The setting persists via the `effortLevel` key in `settings.json`. **As of v2.1.243, `/effort` saves per-model defaults via `modelSettings`** — the global `effortLevel` remains the fallback when `modelSettings` has no entry for the active model

**Note:** Effort level is available for Opus 4.6, Sonnet 4.6, Opus 4.7, and Opus 4.8 on Max and Team plans. The default was changed from High to Medium in v2.1.68, then changed back to **High** for API-key, Bedrock/Vertex/Foundry, Team, and Enterprise users in v2.1.94. In v2.1.117, the default was also raised from `medium` to `high` for Pro/Max subscribers on Opus 4.6 and Sonnet 4.6, bringing all tiers into alignment on `high`. v2.1.111 introduced **`xhigh`** (Opus 4.7 only at the time) and made it the default effort level on Opus 4.7 across all plans. **v2.1.154** added **Opus 4.8** as the latest Opus on the Anthropic API; it supports `xhigh` but defaults to `high`. As of v2.1.75, 1M context window for Opus 4.6 is available by default on Max, Team, and Enterprise plans.

**Effort env propagation:** Inside skill files, use `${CLAUDE_EFFORT}` to reference the current effort level (v2.1.120). As of v2.1.133, the same `$CLAUDE_EFFORT` variable is also injected into the environment of Bash tool subprocesses and hook handlers, so shell scripts and hook commands can adapt their behavior based on the active effort tier without reading a separate config file.

### Model Environment Variables

Configure via `env` key:

```json
{
  "env": {
    "ANTHROPIC_MODEL": "sonnet",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "custom-haiku-model",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "custom-sonnet-model",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "custom-opus-model",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku",
    "MAX_THINKING_TOKENS": "10000"
  }
}
```

---

## Display & UX

### Display Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `statusLine` | object | - | Custom status line configuration |
| `outputStyle` | string | `"default"` | Output style (e.g., `"Explanatory"`) |
| `spinnerTipsEnabled` | boolean | `true` | Show tips while waiting |
| `spinnerVerbs` | object | - | Custom spinner verbs with `mode` ("append" or "replace") and `verbs` array |
| `spinnerTipsOverride` | object | - | Custom spinner tips with `tips` (string array) and optional `excludeDefault` (boolean). When `excludeDefault` is `true`, only custom tips show; when `false` or absent, custom tips merge with built-in tips. As of v2.1.121, `excludeDefault: true` also suppresses time-based spinner tips |
| `respectGitignore` | boolean | `true` | Respect .gitignore in file picker |
| `prefersReducedMotion` | boolean | `false` | Reduce animations and motion effects in the UI |
| `axScreenReader` | boolean | `false` | Enable screen-reader-friendly output mode. When `true`, Claude outputs flat text without decorative box-drawing characters, color, and other terminal UI elements. Appears in `/config` as **Screen reader mode**. Only applies at the User scope — does not read from project or managed settings. Also available via the `--ax-screen-reader` CLI flag (v2.1.181) |
| `syntaxHighlightingDisabled` | boolean | `false` | Disable syntax highlighting in diffs, code blocks, and file previews. Distinct from the `CLAUDE_CODE_SYNTAX_HIGHLIGHT` env var, which only governs diff output |
| `fileSuggestion` | object | - | Custom file suggestion command (see File Suggestion Configuration below) |
| `autoScrollEnabled` | boolean | `true` | Auto-scroll the conversation in fullscreen mode. Set to `false` to disable automatic scrolling (v2.1.110). Versions before v2.1.119 stored this in `~/.claude.json` |
| `editorMode` | string | `"normal"` | Key binding mode for the input prompt: `"normal"` or `"vim"`. Appears in `/config` as **Editor mode**. Versions before v2.1.119 stored this in `~/.claude.json` |
| `vimInsertModeRemaps` | object | - | Custom key remappings applied in vim insert mode. Object where keys are exactly two printable characters (the input sequence) and values are the replacement sequence — the only valid target value is `<Esc>`. Only applies when `editorMode` is `"vim"`. Example: `{"jk": "<Esc>", "jj": "<Esc>"}` (v2.1.208) |
| `showTurnDuration` | boolean | `true` | Show turn duration messages after responses (e.g., "Cooked for 1m 6s"). Versions before v2.1.119 stored this in `~/.claude.json` |
| `teammateMode` | string | `"in-process"` | How [agent team](https://code.claude.com/docs/en/agent-teams) teammates display: `"auto"` (picks split panes in tmux or iTerm2, in-process otherwise), `"in-process"` (default since v2.1.179), `"tmux"`, or `"iterm2"` (force iTerm2 split panes regardless of auto-detection, v2.1.186). See [choose a display mode](https://code.claude.com/docs/en/agent-teams#choose-a-display-mode). Versions before v2.1.119 stored this in `~/.claude.json` |
| `terminalProgressBarEnabled` | boolean | `true` | Show the terminal progress bar in supported terminals (ConEmu, Ghostty 1.2.0+, and iTerm2 3.6.6+). Appears in `/config` as **Terminal progress bar**. Versions before v2.1.119 stored this in `~/.claude.json` |
| `preferredNotifChannel` | string | `"auto"` | Method for task-complete and permission-prompt notifications. Values: `"auto"`, `"terminal_bell"`, `"iterm2"`, `"iterm2_with_bell"`, `"kitty"`, `"ghostty"`, `"notifications_disabled"`. Default `"auto"` sends a desktop notification in iTerm2, Ghostty, and Kitty and does nothing in other terminals. Set `"terminal_bell"` to ring the bell character in any terminal. Appears in `/config` as **Notifications**. See [Get a terminal bell or notification](https://code.claude.com/docs/en/terminal-config#get-a-terminal-bell-or-notification) |
| `wheelScrollAccelerationEnabled` | boolean | `true` | Disable mouse-wheel scroll acceleration in fullscreen mode. Set to `false` to use fixed per-tick scroll steps instead of the OS-level acceleration curve (v2.1.174) |
| `footerLinksRegexes` | array | - | Array of objects matched against **turn output** (tool results, file contents, fetched pages, Claude's responses) to display as link badges in the footer row. Each entry is `{type, pattern, url, label}` where `pattern` is a regex with named capture groups and `url`/`label` may reference those groups. Matched patterns produce a clickable badge at the bottom of the chat UI. Capped at 5 badges per turn; URL max 2048 chars; allowed schemes: `http`, `https`, `vscode`, `cursor`, `windsurf`, `zed`, `jetbrains`, `idea`, `slack`, `linear`, `notion`, `figma`, `vscode-insiders`. User/`--settings`/managed only (v2.1.176) |
| `emojiCompletionEnabled` | boolean | `true` | Enable emoji shortcode autocomplete in the prompt input (e.g., `:tada:` → 🎉). Set to `false` to disable. Requires v2.1.217+ |
| `keybindingFlavor` | string | - | Keyboard shortcut style for word deletion. Set to `"readline"` for Bash/GNU readline-style Ctrl+W behavior (delete word backward to whitespace boundary). When unset, uses the default word-deletion behavior (v2.1.236) |
| `spellcheck` | object | - | Spell-check underlines in the prompt input. Requires an installed spell-check binary (`aspell`, `hunspell`, or `ispell`). Object with `enabled` (boolean) and `binary` (string — path to the spell checker). Set via `/config`. Requires v2.1.235+ (binary path required as of v2.1.236) |
| `promptCacheTtl` | string | - | Keep the 1-hour prompt cache tier active on the main conversation for API-key and cloud-provider users who have access to extended cache TTLs. When unset, the default 5-minute cache TTL applies. Example: `"1h"`. Pairs with `subagentPromptCacheTtl` (v2.1.243+) |
| `subagentPromptCacheTtl` | string | - | Keep the 5-minute prompt cache tier active for subagents when set. Controls the cache TTL for subagent turns separately from the main conversation. Use with `promptCacheTtl` for independent control of caching behavior in orchestrated workflows (v2.1.243+) |

### Global Config Settings (`~/.claude.json`)

These IDE-related preferences are stored in `~/.claude.json`, **not** `settings.json`.

> **v2.1.119 migration note:** As of v2.1.119, `autoScrollEnabled`, `editorMode`, `showTurnDuration`, `teammateMode`, and `terminalProgressBarEnabled` moved into `settings.json` and are documented in the Display Settings table above. Earlier versions stored them here.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `autoConnectIde` | boolean | `false` | Automatically connect to a running IDE when Claude Code starts from an external terminal. Appears in `/config` as **Auto-connect to IDE (external terminal)** when running outside a VS Code or JetBrains terminal |
| `autoInstallIdeExtension` | boolean | `true` | Automatically install the Claude Code IDE extension when running from a VS Code terminal. Appears in `/config` as **Auto-install IDE extension**. Can also be disabled via `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` env var |
| `externalEditorContext` | boolean | `false` | Prepend Claude's previous response as `#`-commented context when you open the external editor with `Ctrl+G`. Set to `true` to enable |
| `teammateDefaultModel` | string | `null` | **Removed in v2.1.251.** Previously set the default model for [agent-team](https://code.claude.com/docs/en/agent-teams) teammates when the lead dispatched them. Teammates now inherit the lead's model by default |
| `diffTool` | string | - | External diff tool command invoked when viewing file diffs. When set, Claude Code spawns this command with the two file paths as arguments instead of rendering the built-in diff view |
| `permissionExplainerEnabled` | boolean | `true` | Show an AI-generated natural-language explanation of why a permission is being requested alongside the permission prompt. Set to `false` to suppress the explanation and show only the raw tool call |

### Workspace & Teams

| Key | Type | Description |
|-----|------|-------------|
| `sshConfigs` | object[] | SSH connection definitions surfaced as a dropdown in Desktop. Each entry must include `id`, `name`, and `sshHost`; optionally `sshPort`, `sshIdentityFile`, and `startDirectory`. Only honored from managed and user settings — project settings values are ignored |

**Field reference:**

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier for the SSH connection entry |
| `name` | yes | Display name shown in the Desktop dropdown |
| `sshHost` | yes | SSH host (e.g., `user@dev.example.com` or `dev.example.com`) |
| `sshPort` | no | SSH port number |
| `sshIdentityFile` | no | Path to the SSH identity file (private key) |
| `startDirectory` | no | Initial working directory after connecting |

**Example:**
```json
{
  "sshConfigs": [
    {
      "id": "dev-vm",
      "name": "Dev VM",
      "sshHost": "user@dev.example.com",
      "sshPort": 22,
      "sshIdentityFile": "~/.ssh/id_ed25519",
      "startDirectory": "/home/user/project"
    }
  ]
}
```

### Status Line Configuration

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2,
    "refreshInterval": 5
  }
}
```

| Field | Description |
|-------|-------------|
| `type` | Set to `"command"` to run a shell script |
| `command` | Shell command or script path that generates the status line output |
| `padding` | Extra horizontal spacing (in characters) added to status line content. Defaults to `0`. Controls relative indentation beyond the interface's built-in spacing |
| `refreshInterval` | Re-run the command every N seconds in addition to event-driven updates. Minimum is `1`. Useful when the status line shows time-based data (e.g., a clock) or when background subagents change git state while the main session is idle. Leave unset to run only on events (v2.1.97) |
| `hideVimModeIndicator` | When `true`, suppresses the built-in vim mode indicator from the status area so a custom status line command can render it instead. Only has effect when `editorMode` is `"vim"` |

**Status Line Input Fields:**

The status line command receives a JSON object on stdin. For the full JSON schema and examples, see the [Status Line Documentation](https://code.claude.com/docs/en/statusline).

| Field | Description |
|-------|-------------|
| `model.id`, `model.display_name` | Current model identifier and display name |
| `cwd`, `workspace.current_dir` | Current working directory (both contain the same value; `workspace.current_dir` preferred) |
| `workspace.project_dir` | Directory where Claude Code was launched (may differ from `cwd` if working directory changes) |
| `workspace.added_dirs` | Additional directories added via `/add-dir` or `--add-dir` |
| `workspace.git_worktree` | Git worktree name when inside a linked worktree created with `git worktree add`. Absent in the main working tree (v2.1.97) |
| `cost.total_cost_usd` | Total session cost in USD |
| `cost.total_duration_ms` | Total wall-clock time since session started, in milliseconds |
| `cost.total_api_duration_ms` | Total time spent waiting for API responses, in milliseconds |
| `cost.total_lines_added`, `cost.total_lines_removed` | Lines of code changed during the session |
| `context_window.total_input_tokens`, `context_window.total_output_tokens` | Cumulative token counts across the session |
| `context_window.context_window_size` | Maximum context window size in tokens (200000 default, 1000000 for extended context) |
| `context_window.used_percentage` | Pre-calculated percentage of context window used |
| `context_window.remaining_percentage` | Pre-calculated percentage of context window remaining |
| `context_window.current_usage` | Token counts from the last API call (input, output, cache tokens) |
| `exceeds_200k_tokens` | Whether total tokens from the most recent API response exceeds 200k (fixed threshold) |
| `rate_limits.five_hour.used_percentage` | Five-hour rate limit usage percentage (v2.1.80+) |
| `rate_limits.five_hour.resets_at` | Five-hour rate limit reset timestamp (Unix epoch seconds) |
| `rate_limits.seven_day.used_percentage` | Seven-day rate limit usage percentage |
| `rate_limits.seven_day.resets_at` | Seven-day rate limit reset timestamp (Unix epoch seconds) |
| `session_id` | Unique session identifier |
| `session_name` | Custom session name set with `--name` or `/rename`. Absent if no custom name set |
| `transcript_path` | Path to conversation transcript file |
| `version` | Claude Code version |
| `output_style.name` | Name of the current output style |
| `vim.mode` | Current vim mode (`NORMAL` or `INSERT`) when vim mode is enabled |
| `agent.name` | Agent name when running with `--agent` flag or agent settings |
| `effort.level` | Current reasoning effort (`low`, `medium`, `high`, `xhigh`, or `max`). Reflects the live session value, including mid-session `/effort` changes. Absent when the current model does not support the effort parameter (v2.1.121) |
| `thinking.enabled` | Whether extended thinking is enabled for the session (v2.1.121) |
| `worktree.name` | Name of the active worktree (present only during `--worktree` sessions) |
| `worktree.path` | Absolute path to the worktree directory |
| `worktree.branch` | Git branch name for the worktree. Absent for hook-based worktrees |
| `worktree.original_cwd` | Directory before entering the worktree |
| `worktree.original_branch` | Git branch checked out before entering the worktree. Absent for hook-based worktrees |
| `github` | GitHub repository and pull-request information for the current branch when detected — repo identity and the associated PR (v2.1.145) |

### File Suggestion Configuration

The file suggestion script receives a JSON object on stdin (e.g., `{"query": "src/comp"}`) and must output up to 15 file paths (one per line).

```json
{
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  },
  "respectGitignore": true
}
```

**Example:**
```json
{
  "statusLine": {
    "type": "command",
    "command": "git branch --show-current 2>/dev/null || echo 'no-branch'"
  },
  "spinnerTipsEnabled": true,
  "spinnerVerbs": {
    "mode": "replace",
    "verbs": ["Cooking", "Brewing", "Crafting", "Conjuring"]
  },
  "spinnerTipsOverride": {
    "tips": ["Use /compact at ~50% context", "Start with plan mode for complex tasks"],
    "excludeDefault": true
  }
}
```

---

## AWS & Cloud Credentials

### AWS Settings

| Key | Type | Description |
|-----|------|-------------|
| `awsAuthRefresh` | string | Script to refresh AWS auth (modifies `.aws` dir) |
| `awsCredentialExport` | string | Script outputting JSON with AWS credentials |

**Example:**
```json
{
  "awsAuthRefresh": "aws sso login --profile myprofile",
  "awsCredentialExport": "/bin/generate_aws_grant.sh"
}
```

### OpenTelemetry

| Key | Type | Description |
|-----|------|-------------|
| `otelHeadersHelper` | string | Script to generate dynamic OpenTelemetry headers |

**Example:**
```json
{
  "otelHeadersHelper": "/bin/generate_otel_headers.sh"
}
```

---

## Environment Variables (via `env`)

Set environment variables for all Claude Code sessions.

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "...",
    "NODE_ENV": "development",
    "DEBUG": "true"
  }
}
```

### Common Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for authentication |
| `ANTHROPIC_AUTH_TOKEN` | OAuth token |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth access token for Claude.ai authentication. Alternative to `/login` for SDK and automated environments. Takes precedence over keychain-stored credentials |
| `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` | OAuth refresh token for Claude.ai authentication. When set, `claude auth login` exchanges this token directly instead of opening a browser. Requires `CLAUDE_CODE_OAUTH_SCOPES` |
| `CLAUDE_CODE_OAUTH_SCOPES` | Space-separated OAuth scopes the refresh token was issued with (e.g., `"user:profile user:inference user:sessions:claude_code"`). Required when `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` is set |
| `ANTHROPIC_WORKSPACE_ID` | Workspace ID for [workload identity federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation). Set when your federation rule is scoped to more than one workspace so the token exchange knows which workspace to target (v2.1.141) |
| `ANTHROPIC_BASE_URL` | Custom API endpoint |
| `ANTHROPIC_BEDROCK_BASE_URL` | Override Bedrock endpoint URL |
| `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` | Override the Bedrock Mantle endpoint URL. See [Mantle endpoint](https://code.claude.com/docs/en/amazon-bedrock#use-the-mantle-endpoint) |
| `ANTHROPIC_BEDROCK_SERVICE_TIER` | Bedrock service tier: `default`, `flex`, or `priority`. Sent as the `X-Amzn-Bedrock-Service-Tier` header on every request. See [Amazon Bedrock service tiers](https://code.claude.com/docs/en/amazon-bedrock#service-tiers) (v2.1.122) |
| `ANTHROPIC_AWS_API_KEY` | Workspace API key for Claude Platform on AWS |
| `ANTHROPIC_AWS_BASE_URL` | Override Claude Platform on AWS endpoint URL |
| `ANTHROPIC_AWS_WORKSPACE_ID` | Required workspace ID for Claude Platform on AWS |
| `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` | Set by host platforms that embed Claude Code and manage model provider routing on the user's behalf. When set, provider-selection / endpoint / authentication env vars in `settings.json` (e.g., `CLAUDE_CODE_USE_BEDROCK`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`) are ignored so user settings cannot override the host's routing. The automatic telemetry opt-out for Bedrock/Vertex/Foundry is also skipped, so telemetry follows the standard `DISABLE_TELEMETRY` opt-out (v2.1.126) |
| `ANTHROPIC_VERTEX_BASE_URL` | Override Vertex AI endpoint URL |
| `ANTHROPIC_BETAS` | Comma-separated Anthropic beta header values |
| `ANTHROPIC_VERTEX_PROJECT_ID` | GCP project ID for Vertex AI |
| `GCLOUD_PROJECT` | GCP project ID for Vertex AI requests (overrides `ANTHROPIC_VERTEX_PROJECT_ID`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account credential file for Vertex AI authentication |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID for Vertex AI requests (overrides `ANTHROPIC_VERTEX_PROJECT_ID`) |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | Model ID to add as a custom entry in the `/model` picker. Use to make a non-standard or gateway-specific model selectable without replacing built-in aliases |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME` | Display name for the custom model entry in the `/model` picker. Defaults to the model ID when not set |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION` | Display description for the custom model entry in the `/model` picker. Defaults to `Custom model (<model-id>)` when not set |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES` | Override capability detection for the custom model entry. Comma-separated values (e.g., `effort,thinking`). Required when the custom model supports features the auto-detection cannot confirm. See [model configuration](https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities) |
| `ANTHROPIC_MODEL` | Name of the model to use. Accepts aliases (`sonnet`, `opus`, `haiku`) or full model IDs. Overrides the `model` setting |
| `INIT_PROMPT` | Custom system prompt injected at session initialization |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override the Haiku model alias with a custom model ID (e.g., for third-party deployments) |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME` | Customize the Haiku entry label in the `/model` picker when using a pinned model on Bedrock/Vertex/Foundry. Defaults to the model ID |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION` | Customize the Haiku entry description in the `/model` picker. Defaults to `Custom model (<model-id>)` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES` | Override capability detection for a pinned Haiku model. Comma-separated values (e.g., `effort,thinking`). Required when the pinned model supports features the auto-detection cannot confirm |
| `CLAUDE_PID` | Read-only. Set to the PID of the Claude Code process in every subprocess it spawns (Bash tool, hooks, status line commands, MCP stdio servers). Use in scripts to signal the parent Claude Code process or to detect the Claude Code lineage. Introduced in v2.1.214 |
| `CLAUDECODE` | Set to `1` in shell environments Claude Code spawns (Bash tool, tmux sessions). Not set in hooks or status line commands. Use to detect when a script is running inside a Claude Code shell |
| `CLAUDE_CODE_CHILD_SESSION` | Set to `1` in subprocesses Claude Code spawns via the Bash, PowerShell, and Monitor tools, hook commands, and status line commands. Not set for stdio MCP server subprocesses. Unlike `CLAUDECODE`, this is only set by Claude Code's own spawn path (not IDE extensions), so it reliably distinguishes a nested `claude` session from a top-level `claude` launched in an IDE-integrated terminal. Nested interactive TUI sessions are automatically excluded from `--resume`, `--continue`, up-arrow history, and `claude agents`. Non-interactive `claude -p` sessions still persist. Set `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1` to override this exclusion (v2.1.172) |
| `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE` | Set to `1` to override the automatic exclusion of nested interactive TUI sessions from `--resume`, `--continue`, up-arrow history, and `claude agents`. By default, nested sessions (where `CLAUDE_CODE_CHILD_SESSION=1`) are excluded to prevent them from polluting history. Set this to force persistence when you want nested sessions tracked |
| `CLAUDE_CODE_SESSION_ID` | Read-only. Set automatically in Bash and PowerShell tool subprocesses to the current session ID. Matches the `session_id` field passed to hooks. Updated on `/clear`. Use to correlate scripts and external tools with the Claude Code session that launched them (v2.1.132). Also injected into stdio MCP server environments on `--resume` (v2.1.163 changelog) *(in v2.1.163 changelog; not yet on official env-vars page — read-only)* |
| `AI_AGENT` | Set automatically by Claude Code in subprocess environments (Bash tool, hooks, MCP stdio servers). Generic flag identifying the parent process as an AI agent — useful for tools that adapt behavior when invoked from any AI agent rather than checking each agent-specific variable like `CLAUDECODE` *(in v2.1.120 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS` | Set to `1` to allow fast mode when the organization status check fails due to a network error. Useful when a corporate proxy blocks the status endpoint |
| `CLAUDE_CODE_USE_BEDROCK` | Use AWS Bedrock (`1` to enable) |
| `CLAUDE_CODE_USE_VERTEX` | Use Google Vertex AI (`1` to enable) |
| `CLAUDE_CODE_USE_FOUNDRY` | Use Microsoft Foundry (`1` to enable) |
| `CLAUDE_CODE_USE_MANTLE` | Use the Bedrock [Mantle endpoint](https://code.claude.com/docs/en/amazon-bedrock#use-the-mantle-endpoint) (`1` to enable) |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | Set to `1` to enable the PowerShell tool on Windows (opt-in preview). When enabled, Claude can run PowerShell commands natively instead of routing through Git Bash. Only supported on native Windows, not WSL (v2.1.84) |
| `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY` | Set to `1` to stop Claude Code from passing `-ExecutionPolicy Bypass` when spawning PowerShell for tool calls, hooks, and status line commands, respecting the machine's effective execution policy instead. By default Claude Code bypasses execution policy at process scope so `.ps1` scripts and module imports work on default-Restricted Windows. Never overrides Group Policy `MachinePolicy`/`UserPolicy` (v2.1.143) |
| `CLAUDE_CODE_REMOTE` | Read-only. Set automatically to `true` when Claude Code is running as a cloud session. Read this from a hook or setup script to detect whether you are in a cloud environment |
| `CLAUDE_CODE_REMOTE_SESSION_ID` | Read-only. Set automatically in cloud sessions to the current session's ID. Read this to construct a link back to the session transcript |
| `CLAUDE_CODE_BRIDGE_SESSION_ID` | Read-only. Set automatically in Bash tool and hook command subprocesses while the session has an active Remote Control connection. Value is the session ID in `session_` form (same identifier in the session's `claude.ai/code` URL). Removed when the connection ends. Allows scripts to link back to the session that ran them. In cloud sessions, read `CLAUDE_CODE_REMOTE_SESSION_ID` instead (v2.1.199) |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | Prefix for auto-generated Remote Control session names. Defaults to the machine hostname |
| `CLAUDE_CLIENT_PRESENCE_FILE` | Path to a file that, when present, signals an active client and suppresses mobile push notifications from Remote Control. Useful in environments where a desktop client is always running and mobile pings are unwanted |
| `CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK` | Set to `1` to send push notifications even while the user is actively typing in the session. By default, notifications are suppressed when active user presence is detected (v2.1.193) |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Enable/disable telemetry (`0` or `1`) |
| `DISABLE_ERROR_REPORTING` | Disable error reporting (`1` to disable) |
| `DISABLE_AUTOUPDATER` | Set to `1` to disable automatic update checks against the npm registry. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `DISABLE_UPDATES` | Set to `1` to completely block all update paths — automatic checks, notifications, and manual `claude update`. Stricter than `DISABLE_AUTOUPDATER`, which only disables the background check. Use in environments where all updates must be blocked until explicitly re-enabled *(in v2.1.118 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` | Set to `1` to let Claude Code run your package manager's upgrade command in the background when a new version is available. Applies to Homebrew and WinGet installations. Other package managers continue to show the upgrade command without running it. See [Auto updates](https://code.claude.com/docs/en/setup#auto-updates) (v2.1.129) |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | Set to `1` to populate the `/model` picker from your gateway's `/v1/models` endpoint when `ANTHROPIC_BASE_URL` points at an Anthropic-compatible gateway such as LiteLLM, Kong, or an internal proxy. Off by default because gateways backed by a shared API key would otherwise expose every model the key can access. Discovered models are still filtered by the `availableModels` allowlist (v2.1.129, opt-in change from prior auto-discovery) |
| `DISABLE_TELEMETRY` | Disable telemetry (`1` to disable) |
| `DO_NOT_TRACK` | Standard opt-out variable; set to `1` to opt out of telemetry collection. Respected by `DISABLE_TELEMETRY` |
| `MCP_TIMEOUT` | MCP startup timeout in ms |
| `MCP_CONNECT_TIMEOUT_MS` | Timeout in ms for the MCP server TCP/Unix connection phase (default: `5000`). Distinct from `MCP_TIMEOUT` (startup) and `MCP_TOOL_TIMEOUT` (per-call) |
| `MCP_SERVER_CONNECTION_BATCH_SIZE` | Number of local (stdio) MCP servers to connect in parallel on startup. Use to throttle startup load on machines with many servers |
| `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | Number of remote (HTTP/SSE) MCP servers to connect in parallel on startup. Separate from the local batch size to account for network latency |
| `CLAUDE_CODE_MCP_ALLOWLIST_ENV` | Spawn stdio MCP servers with a safe baseline environment only, stripping most inherited env vars to prevent credential leakage into untrusted server processes |
| `MAX_MCP_OUTPUT_TOKENS` | Max MCP output tokens (default: 25000). Warning displayed when output exceeds 10,000 tokens |
| `API_TIMEOUT_MS` | Timeout in ms for API requests (default: 600000) |
| `API_FORCE_IDLE_TIMEOUT` | Override the 5-minute idle timeout for streaming connections. Set to `0` to disable the idle timeout entirely, `1` to enforce it on all connections, or leave unset for the default (auto-enabled on slow or unreliable gateways that frequently stall). Useful for slow API gateways (v2.1.169) |
| `CLAUDE_CODE_CONNECT_TIMEOUT_MS` | **REMOVED in v2.1.186.** This variable is a no-op. Use `API_TIMEOUT_MS` instead. Previously controlled the connect, TLS, and response-header phase timeout for streaming API requests |
| `CLAUDE_AFK_TIMEOUT_MS` | How many milliseconds before an unanswered AskUserQuestion dialog auto-continues, when `askUserQuestionTimeout` is set to a duration. As of v2.1.200, the default is `"never"` (no auto-continue) controlled by `askUserQuestionTimeout`; this env var applies only when a timeout duration is active. Setting to `0` closes the dialog immediately. To keep questions open, prefer `askUserQuestionTimeout: "never"` (v2.1.198; default changed v2.1.200) |
| `CLAUDE_AFK_COUNTDOWN_MS` | How many milliseconds before auto-continue the on-screen countdown appears on an unanswered AskUserQuestion dialog (default: `20000` / 20 seconds) (v2.1.198) |
| `BASH_MAX_TIMEOUT_MS` | Bash command timeout |
| `BASH_MAX_OUTPUT_LENGTH` | Max bash output length |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Auto-compact threshold percentage (1-100). Default is ~95%. Set lower (e.g., `50`) to trigger compaction earlier. Values above 95% have no effect. Use `/context` to monitor current usage. Example: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50 claude` |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | Override the context window size Claude Code assumes for the active model. Only takes effect when `DISABLE_COMPACT` is also set. Use when routing to a model through `ANTHROPIC_BASE_URL` whose context window does not match the built-in size for its name |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Set to `1` to **return to the original working directory** after each Bash or PowerShell command. By default, directory changes made inside a command persist to the next command — this variable restores the original cwd after each call |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks (`1` to disable) |
| `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP` | Set to `1` to disable automatic memory-pressure reaping of idle background shell commands. When unset, Claude Code automatically reaps idle background shells under memory pressure to free resources (v2.1.193 changelog, not yet on official env-vars page) |
| `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF` | Set to `1` to stop a background session's running background shell commands, dynamic workflows, and background subagents when the supervisor stops, restarts, or updates that session's process. By default they are handed off to the session's next process (v2.1.198) |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | Set to `1` to disable the advisor tool and the `/advisor` command. Env-var equivalent of omitting advisor usage. Pair with `advisorModel` for advisor configuration (min v2.1.98) |
| `CLAUDE_CODE_DISABLE_AGENT_VIEW` | Set to `1` to turn off background agents and agent view (`claude agents`, `--bg`, `/background`, on-demand supervisor). Env-var equivalent of the `disableAgentView` setting *(referenced on official settings page; not listed on the env-vars page)* |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | Set to `1` to disable the built-in Explore and Plan subagents. Claude explores with search tools or the general-purpose subagent instead. Plan mode reads files directly rather than launching Explore and Plan agents (v2.1.198) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable the experimental agent teams feature (`1` to enable). Allows spawning coordinated teams of subagents within a session. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `CLAUDE_CODE_DISABLE_WORKFLOWS` | Set to `1` to disable [dynamic workflows](https://code.claude.com/docs/en/workflows) (`/workflows`) and the bundled workflow slash commands. Env-var equivalent of the `disableWorkflows` setting |
| `CLAUDE_CODE_ENABLE_AUTO_MODE` | **As of v2.1.207, auto mode is available on Bedrock, Vertex AI, and Foundry by default — this opt-in is no longer required.** Previously (v2.1.158–v2.1.206): set to `1` to make [auto mode](https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode) available on those providers. Use `disableAutoMode: "disable"` in settings to turn auto mode off |
| `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` | Set to `1` to conceal Claude Code's built-in capabilities (bundled skills) from the model. Env-var equivalent of the `disableBundledSkills` setting (v2.1.169) |
| `CLAUDE_CODE_DISABLE_ARTIFACT` | Set to `1` to disable the [Artifact](https://code.claude.com/docs/en/artifacts) tool, which publishes session output as a private web page on claude.ai. Equivalent to the `disableArtifact` setting |
| `CLAUDE_CODE_ARTIFACT_AUTO_OPEN` | Set to `0` to stop Claude Code from opening the browser automatically when a new artifact is published. Republishing an existing artifact does not open the browser regardless of this setting |
| `ENABLE_TOOL_SEARCH` | MCP tool search threshold (e.g., `auto:5`) |
| `ENABLE_PROMPT_CACHING_1H` | Opt into 1-hour prompt cache TTL. Replaces the deprecated `ENABLE_PROMPT_CACHING_1H_BEDROCK` *(in v2.1.108 changelog, not yet on official env-vars page)* |
| `FORCE_PROMPT_CACHING_5M` | Force 5-minute prompt cache TTL *(in v2.1.108 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_ENABLE_AWAY_SUMMARY` | Opt out of away summary / idle-session recap. Set to `0` to disable. Pairs with the `awaySummaryEnabled` setting (v2.1.110) |
| `DISABLE_PROMPT_CACHING` | Disable all prompt caching (`1` to disable) |
| `DISABLE_PROMPT_CACHING_HAIKU` | Disable Haiku prompt caching |
| `DISABLE_PROMPT_CACHING_SONNET` | Disable Sonnet prompt caching |
| `DISABLE_PROMPT_CACHING_OPUS` | Disable Opus prompt caching |
| `ENABLE_PROMPT_CACHING_1H_BEDROCK` | Request 1-hour cache TTL on Bedrock (`1` to enable) *(not in official docs — unverified; v2.1.108 changelog says deprecated, replaced by `ENABLE_PROMPT_CACHING_1H`)* |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable experimental beta features (`1` to disable) |
| `CLAUDE_CODE_SHELL` | Override automatic shell detection |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | Override default file read token limit |
| `CLAUDE_CODE_GLOB_HIDDEN` | Set to `false` to exclude dotfiles from results when Claude invokes the Glob tool. Included by default. Does not affect `@` file autocomplete, `ls`, Grep, or Read |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | Set to `false` to make the Glob tool respect `.gitignore` patterns. By default, Glob returns all matching files including gitignored ones. Does not affect `@` file autocomplete, which has its own `respectGitignore` setting |
| `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` | Timeout in seconds for Glob file discovery |
| `CLAUDE_CODE_ENABLE_TASKS` | Controls whether sessions use the structured Task tools (`TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList`) or the legacy `TodoWrite` tool. As of v2.1.142, Task tools are the default in all modes. Set to `0` to revert to `TodoWrite` |
| `CLAUDE_CODE_SIMPLE` | Set to `1` to run with a minimal system prompt and only the Bash, file read, and file edit tools. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | Auto-exit SDK mode after idle duration (ms) |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Disable adaptive thinking (`1` to disable) |
| `CLAUDE_CODE_DISABLE_THINKING` | Force-disable extended thinking (`1` to disable) |
| `DISABLE_INTERLEAVED_THINKING` | Prevent interleaved-thinking beta header from being sent (`1` to disable) |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | Hold all 1M context window models to the 200K context size via auto-compaction. As of v2.1.223, this applies to all 1M models (not just one). Set to `1` to disable 1M context across your deployment |
| `CLAUDE_CODE_ACCOUNT_UUID` | Override account UUID for authentication |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | Disable git-related system prompt instructions |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | Set to `0` to omit the Claude Code attribution block from the system prompt |
| `CLAUDE_CODE_NEW_INIT` | Set to `true` to make `/init` run an interactive setup flow. Asks which files to generate (CLAUDE.md, skills, hooks) before exploring the codebase. Without this, `/init` generates a CLAUDE.md automatically |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | Path to one or more read-only plugin seed directories, separated by `:` on Unix or `;` on Windows. Bundle pre-populated plugins into a container image. Claude Code registers marketplaces from these directories at startup and uses pre-cached plugins without re-cloning |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | Enable Claude.ai MCP servers |
| `CLAUDE_CODE_EFFORT_LEVEL` | Set effort level: `low`, `medium`, `high`, `xhigh` (Opus 4.7 and 4.8, v2.1.111), `max` (Opus 4.6 only), or `auto` (use model default). Takes precedence over `/effort` and the `effortLevel` setting. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `CLAUDE_EFFORT` | Read-only. Injected into Bash tool subprocesses and hook handlers with the active effort level so shell scripts and hooks can adapt to the current tier (companion to `CLAUDE_CODE_EFFORT_LEVEL`; v2.1.133). Inside skill files use `${CLAUDE_EFFORT}` *(in changelog, not on official env-vars page — read-only, not user-configurable)* |
| `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT` | Set to `1` to force-enable the effort parameter on all models, even those that do not normally support effort-level selection. Allows `/effort` and the `effortLevel` setting to take effect on models outside the standard effort-capable set (v2.1.154) |
| `CLAUDE_CODE_MAX_TURNS` | Maximum agentic turns before stopping *(not in official docs — unverified)* |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Equivalent of setting `DISABLE_AUTOUPDATER`, `DISABLE_FEEDBACK_COMMAND`, `DISABLE_ERROR_REPORTING`, and `DISABLE_TELEMETRY` |
| `CLAUDE_CODE_SKIP_SETTINGS_SETUP` | Skip first-run settings setup flow *(not in official docs — unverified)* |
| `CLAUDE_CODE_PROMPT_CACHING_ENABLED` | Override prompt caching behavior *(not in official docs — unverified)* |
| `CLAUDE_CODE_DISABLE_TOOLS` | Comma-separated list of tools to disable *(not in official docs — unverified)* |
| `CLAUDE_CODE_DISABLE_MCP` | Disable all MCP servers (`1` to disable) *(not in official docs — unverified)* |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens per response. Default: 32,000 (64,000 for Opus 4.6 as of v2.1.77). Upper bound: 64,000 (128,000 for Opus 4.6 and Sonnet 4.6 as of v2.1.77) |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | Disable fast mode entirely (`1` to disable) |
| `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE` | **REMOVED in v2.1.160** — the environment variable is now a no-op. Fast mode runs on the default model regardless of this variable. Previously pinned [fast mode](https://code.claude.com/docs/en/fast-mode) to Claude Opus 4.6 instead of the default (v2.1.142–v2.1.159) |
| `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` | Set to `1` to disable the non-streaming fallback when a streaming request fails mid-stream. Streaming errors propagate to the retry layer instead. Useful when a proxy or gateway causes the fallback to produce duplicate tool execution (v2.1.83) |
| `CLAUDE_ENABLE_STREAM_WATCHDOG` | Stream idle watchdog that aborts stalled streams. Enabled by default as of v2.1.163; set to `0` to disable |
| `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING` | Enabled by default on the Anthropic API (v2.1.139+); set to `0` to opt out |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory (`1` to disable) |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | Disable file checkpointing for `/rewind` (`1` to disable) |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | Disable attachment processing (`1` to disable) |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | Prevent loading CLAUDE.md files (`1` to disable) |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | Load CLAUDE.md memory files from additional directories specified via `--add-dir` at startup (`1` to enable). Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `CLAUDE_CODE_DISABLE_POLICY_SKILLS` | Skip loading skills from the system-wide managed skills directory (`1` to disable) |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | Auto-resume if previous session ended mid-turn (`1` to enable) |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS` | Maximum age in ms of an interrupted turn that will be auto-resumed on restart. Turns older than this are skipped. Only applies when `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1` |
| `CLAUDE_CODE_RESUME_PROMPT` | Custom prompt injected at the start of an auto-resumed interrupted turn. Defaults to a built-in continuation message |
| `CLAUDE_CODE_SAFE_MODE` | Set to `1` to enable safe mode, which limits potentially destructive operations and enforces stricter tool guardrails |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | Set to `1` to skip writing prompt history and session transcripts to disk. Sessions started with this variable set do not appear in `--resume`, `--continue`, or up-arrow history. Useful for ephemeral scripted sessions |
| `CLAUDE_CODE_USER_EMAIL` | Provide user email synchronously for authentication |
| `CLAUDE_CODE_ORGANIZATION_UUID` | Provide organization UUID synchronously for authentication |
| `CLAUDE_CONFIG_DIR` | Custom config directory (overrides default `~/.claude`) |
| `CLAUDE_CODE_TMPDIR` | Override the temp directory used for internal temp files. Claude Code appends `/claude/` to this path. Default: `/tmp` on Unix/macOS, `os.tmpdir()` on Windows |
| `ANTHROPIC_CUSTOM_HEADERS` | Custom headers for API requests (`Name: Value` format, newline-separated for multiple headers) |
| `CLAUDE_CODE_EXTRA_BODY` | JSON object to merge into the top level of every API request body. Use to inject vendor-specific fields (e.g., routing hints for a custom gateway) |
| `CLAUDE_CODE_PROPAGATE_TRACEPARENT` | Set to `1` to propagate the W3C `traceparent` header through requests when routing through a custom proxy, linking Claude Code traces to your upstream telemetry |
| `ANTHROPIC_FOUNDRY_API_KEY` | API key for Microsoft Foundry authentication |
| `ANTHROPIC_FOUNDRY_BASE_URL` | Base URL for Foundry resource |
| `ANTHROPIC_FOUNDRY_RESOURCE` | Foundry resource name |
| `ANTHROPIC_FOUNDRY_AUTH_TOKEN` | Azure authentication token for Foundry (alternative to service principal auth, v2.1.203+) |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key for authentication |
| `ANTHROPIC_SMALL_FAST_MODEL` | **DEPRECATED** — Use `ANTHROPIC_DEFAULT_HAIKU_MODEL` instead |
| `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` | AWS region for deprecated Haiku-class model override |
| `CLAUDE_CODE_SHELL_PREFIX` | Command prefix prepended to bash commands |
| `BASH_DEFAULT_TIMEOUT_MS` | Default bash command timeout in ms |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | Skip AWS auth for Bedrock (`1` to skip) |
| `CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS` | Timeout in milliseconds for AWS credential chain resolution on Bedrock. Set lower (e.g., `5000`) in environments where a credential source is absent so the chain fails fast. Default: `60000` (60 seconds) (v2.1.207) |
| `CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD` | Set to `1` to disable the Bedrock content-type guard that rejects responses with unexpected MIME types. Use when a gateway returns non-standard content types but the response body is valid (v2.1.208) |
| `CLAUDE_CODE_SKIP_FOUNDRY_AUTH` | Skip Azure auth for Foundry (`1` to skip) |
| `CLAUDE_CODE_SKIP_MANTLE_AUTH` | Skip AWS authentication for Bedrock Mantle (e.g., when using an LLM gateway) |
| `CLAUDE_CODE_SKIP_VERTEX_AUTH` | Skip Google auth for Vertex (`1` to skip) |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | Allow proxy to perform DNS resolution |
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | Credential refresh interval in ms for `apiKeyHelper` |
| `CLAUDE_CODE_CLIENT_CERT` | Client certificate path for mTLS |
| `CLAUDE_CODE_CLIENT_KEY` | Client private key path for mTLS |
| `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` | Passphrase for encrypted mTLS key |
| `CLAUDE_CODE_CERT_STORE` | Comma-separated list of CA certificate sources for TLS connections: `bundled` (Mozilla CA set shipped with Claude Code) and/or `system` (OS trust store). Default: `bundled,system`. The native binary distribution is required for system store integration; on the Node.js runtime, only the bundled set is used regardless of this value (v2.1.101) |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | Plugin marketplace git clone timeout in ms (default: 120000) |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | Set to `1` to clone GitHub `owner/repo` shorthand plugin sources over HTTPS instead of SSH. Applies to plugin install/update and `/plugin marketplace add`/`update`. Useful in CI runners or containers without a configured SSH key for `github.com` (v2.1.141) |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | Override the plugins root directory |
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | Skip auto-adding the official marketplace (`1` to disable) |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | Wait for plugin install to complete before first query (`1` to enable) |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | Timeout in ms for synchronous plugin install |
| `CLAUDE_CODE_SYNC_SKILLS` | Set to `1` to wait for skill sync to complete before the first query, ensuring skills are up-to-date before the session starts |
| `CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS` | Timeout in ms for the skill install phase of synchronous skill sync |
| `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS` | Timeout in ms to wait for all skill syncs to complete when `CLAUDE_CODE_SYNC_SKILLS=1` |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | Set to `1` to keep the existing marketplace cache when a `git pull` fails instead of wiping and re-cloning. Useful in offline or airgapped environments where re-cloning would fail the same way |
| `CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH` | Refresh plugin state at session turn boundaries after a background install completes (`1` to enable). Without this, newly installed plugins take effect on the next session |
| `CLAUDE_CODE_HIDE_ACCOUNT_INFO` | Hide email/org info from UI *(not in official docs — unverified)* |
| `CLAUDE_CODE_DISABLE_CRON` | Disable scheduled/cron tasks (`1` to disable) |
| `DISABLE_INSTALLATION_CHECKS` | Disable installation warnings |
| `DISABLE_FEEDBACK_COMMAND` | Disable the `/feedback` command. The older name `DISABLE_BUG_COMMAND` is also accepted |
| `DISABLE_DOCTOR_COMMAND` | Hide the `/doctor` command (`1` to disable) |
| `DISABLE_LOGIN_COMMAND` | Hide the `/login` command (`1` to disable) |
| `DISABLE_LOGOUT_COMMAND` | Hide the `/logout` command (`1` to disable) |
| `DISABLE_UPGRADE_COMMAND` | Hide the `/upgrade` command (`1` to disable) |
| `DISABLE_EXTRA_USAGE_COMMAND` | Hide the `/extra-usage` command — renamed to `/usage-credits` in v2.1.144, though this env var name is unchanged (`1` to disable) |
| `DISABLE_INSTALL_GITHUB_APP_COMMAND` | Hide the `/install-github-app` command (`1` to disable) |
| `DISABLE_NON_ESSENTIAL_MODEL_CALLS` | Disable flavor text and non-essential model calls *(not in official docs — unverified)* |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | Override debug log file path. Despite the name, this is a file path, not a directory. Requires debug mode enabled separately via `--debug`, `/debug`, or the `DEBUG` env var; setting this variable alone does not enable logging. Use `--debug-file` to both enable debug mode and set the path at once. Default: `~/.claude/debug/<session-id>.txt` |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | Minimum debug log level |
| `CLAUDE_AUTO_BACKGROUND_TASKS` | Force auto-backgrounding of long tasks (`1` to enable) |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | Prevent remapping Opus 4.0/4.1 to newer models (`1` to disable) |
| `FALLBACK_FOR_ALL_PRIMARY_MODELS` | Trigger fallback model for all primary models, not just default (`1` to enable) |
| `CCR_FORCE_BUNDLE` | Set to `1` to force `claude --remote` to bundle and upload your local repository even when GitHub access is available. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `CLAUDE_CODE_GIT_BASH_PATH` | Windows only: path to the Git Bash executable (`bash.exe`). Use when Git Bash is installed but not in your PATH |
| `DISABLE_COST_WARNINGS` | Disable cost warning messages |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Default model for subagents (e.g., `haiku`, `sonnet`). **As of v2.1.238 (breaking change):** changed from an override to a default — agent definitions that explicitly set a model and subagent tool calls that pass an explicit model now take precedence over this variable |
| `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT` | Set to `1` to forward subagent streaming text output to the parent session in real time. By default, subagent output is buffered until the subagent completes. As of v2.1.219, forwarding also works for nested subagents at depth 2+ (v2.1.211) |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Set to `1` to strip Anthropic and cloud provider credentials from subprocess environments (Bash tool, hooks, MCP stdio servers). Use for defense-in-depth when subprocesses should not inherit API keys (v2.1.83) |
| `CLAUDE_CODE_SCRIPT_CAPS` | JSON object limiting how many times specific scripts may be invoked per session when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set. Keys are substrings matched against the command text; values are integer call limits. For example, `{"deploy.sh": 2}` allows `deploy.sh` to be called at most twice. Matching is substring-based; runtime fan-out via `xargs` or `find -exec` is not detected — this is a defense-in-depth control |
| `CLAUDE_CODE_PERFORCE_MODE` | Set to `1` to enable Perforce-aware write protection. When set, Edit, Write, and NotebookEdit fail with a `p4 edit <file>` hint if the target file lacks the owner-write bit, which Perforce clears on synced files until `p4 edit` opens them. Prevents Claude Code from bypassing Perforce change tracking (v2.1.98) |
| `CLAUDE_CODE_PROCESS_WRAPPER` | Wrap the Claude Code process at startup. Specify the wrapper executable and arguments; Claude Code is appended as the final argument. Useful for profiling tools, sandboxes, or tracing (e.g., `CLAUDE_CODE_PROCESS_WRAPPER="strace -e trace=file"`). *(in v2.1.208 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MAX_RETRIES` | Override API request retry count (default: 10) |
| `CLAUDE_CODE_RETRY_WATCHDOG` | Raise the retry count for non-capacity API errors to 300. The standard retry cap (`CLAUDE_CODE_MAX_RETRIES`, default: 10) still applies for capacity errors (v2.1.199) |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | Max parallel read-only tools (default: 10) |
| `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` | Maximum web searches allowed per session (default: `200`). Prevents runaway tool use in long agentic sessions *(in v2.1.212 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` | Maximum subagents that can be spawned per session (default: `200`). Prevents resource exhaustion in deeply nested agentic workflows *(in v2.1.212 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | Maximum number of subagents that run concurrently (default: `20`). Limits parallel agent fan-out; excess agents queue and run as slots free up (v2.1.217) |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | Maximum nesting depth for subagents (default: `3` as of v2.1.219). Subagents at the depth limit cannot spawn further subagents (v2.1.217) |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` | Disable built-in subagent types in SDK mode (`1` to disable) |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | Skip `mcp__<server>__` prefix for MCP tools in SDK mode (`1` to enable) |
| `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` | Stall timeout in ms for background subagents (default: 600000 / 10 minutes). The subagent is killed if it produces no output for this duration |
| `MCP_CONNECTION_NONBLOCKING` | Set to `true` in `-p` mode to skip the MCP connection wait entirely. Bounds `--mcp-config` server connections at 5s instead of blocking on the slowest server *(in v2.1.89 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | Duration in milliseconds after which a slow MCP tool call is automatically backgrounded (default: `120000` / 2 minutes). MCP calls that exceed this threshold continue running in the background without blocking the agent turn *(in v2.1.212 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` | Idle timeout in ms for MCP tool calls. The tool call is cancelled if it produces no streaming response within this window. Use when a gateway or MCP server hangs silently — distinct from `MCP_TOOL_TIMEOUT`, which is a total wall-clock limit (v2.1.187) |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | SessionEnd hook timeout in ms (replaces hard 1.5s limit) |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | Maximum number of times a Stop hook can block a session from ending (default: `8`). After this many blocks the session ends regardless of hook exit codes |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | Disable feedback survey prompts (`1` to disable) |
| `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` | Set to `1` to route the session quality survey to your own OpenTelemetry collector when Anthropic-bound nonessential traffic is blocked. Survey ratings are emitted only as OTEL events to your configured collector — no survey data is sent to Anthropic. Applies when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, or `DO_NOT_TRACK` is set; has no effect otherwise. `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` and the organization product feedback policy take precedence (v2.1.136) |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Disable terminal title updates (`1` to disable) |
| `CLAUDE_CODE_TMUX_TRUECOLOR` | Set to `1` to allow 24-bit truecolor output inside tmux. By default, Claude Code clamps to 256 colors when `$TMUX` is set because tmux does not pass through truecolor escape sequences unless configured to. Set this after adding `set -ga terminal-overrides ',*:Tc'` to your `~/.tmux.conf` |
| `CLAUDE_CODE_NO_FLICKER` | Set to `1` to enable flicker-free alt-screen rendering. Eliminates visual flicker during fullscreen redraws (v2.1.88) |
| `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT` | Set to `1` to repaint the entire screen on every frame in fullscreen rendering. Use when partial redraws produce visual artifacts in unusual terminal emulators |
| `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` | Set to `1` to disable fullscreen rendering and use the classic main-screen renderer. The conversation stays in your terminal's native scrollback so `Cmd+f` and tmux copy mode work as usual. Takes precedence over `CLAUDE_CODE_NO_FLICKER` and the `tui` setting. You can also switch with `/tui default` (v2.1.132) |
| `CLAUDE_CODE_FORCE_SYNC_OUTPUT` | Set to `1` to force-enable DEC private mode 2026 synchronized output when your terminal supports it but is not auto-detected. Useful for emulators such as Emacs `eat` that implement BSU/ESU but do not reply to the capability probe. Has no effect under tmux (v2.1.129) |
| `CLAUDE_CODE_SCROLL_SPEED` | Mouse wheel scroll multiplier for fullscreen rendering. Increase for faster scrolling, decrease for finer control |
| `CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL` | Set to `1` to disable virtual scrolling in fullscreen rendering and render every message in the transcript. Use if scrolling in fullscreen mode shows blank regions where messages should appear |
| `CLAUDE_CODE_DISABLE_MOUSE` | Set to `1` to disable mouse tracking in fullscreen rendering. Useful when mouse events interfere with terminal multiplexers or accessibility tools |
| `CLAUDE_CODE_DISABLE_MOUSE_CLICKS` | Set to `1` to disable mouse click interactions in fullscreen rendering while preserving wheel scroll. Distinguishes click-event suppression from full mouse tracking disable (`CLAUDE_CODE_DISABLE_MOUSE`). Useful when terminal selection or external accessibility tools conflict with in-app mouse clicks *(in v2.1.195 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_HIDE_CWD` | Set to `1` to hide the current working directory in the Claude Code startup logo banner. Useful in screen recordings, demos, or shared sessions where the CWD path leaks information about the host or project layout (v2.1.119) |
| `CLAUDE_CODE_ACCESSIBILITY` | Set to `1` to keep native terminal cursor visible for screen readers and accessibility tools |
| `CLAUDE_AX_SCREEN_READER` | Set to `1` to render screen-reader friendly output: flat text without decorative borders or animations. Set to `0` to force screen-reader mode off even when the `axScreenReader` setting is `true`. The `--ax-screen-reader` CLI flag takes precedence (v2.1.181+) |
| `CLAUDE_CODE_NATIVE_CURSOR` | Set to `1` to show the terminal's own cursor at the input caret position instead of Claude Code's custom cursor character |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | Set to `0` to disable syntax highlighting in diff output |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | Skip automatic IDE extension installation (`1` to skip) |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | Override auto IDE connection behavior |
| `CLAUDE_CODE_IDE_HOST_OVERRIDE` | Override IDE host address for connection |
| `CLAUDE_CODE_IDE_SKIP_VALID_CHECK` | Skip IDE lockfile validation (`1` to skip) |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | Debounce interval in ms for OTel headers helper script |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | Timeout in ms for OpenTelemetry flush |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` | Timeout in ms for OpenTelemetry shutdown |
| `CLAUDE_ENABLE_BYTE_WATCHDOG` | Set to `1` to force-enable the byte-level streaming idle watchdog, or `0` to force-disable it. When unset, the watchdog is enabled by default for Anthropic API connections. The byte watchdog aborts a connection when no bytes arrive on the wire for the duration set by `CLAUDE_STREAM_IDLE_TIMEOUT_MS` (minimum 5 minutes), independent of the event-level watchdog |
| `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK` | Set to `1` to enable the byte-level streaming idle watchdog specifically for Bedrock connections. By default the byte watchdog is not active on Bedrock. Pair with `CLAUDE_STREAM_IDLE_TIMEOUT_MS` to configure the timeout |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | Timeout in ms for the streaming idle watchdog. Two watchdogs apply: **byte-level** (default and minimum `300000` / 5 minutes, aborts when no bytes arrive on the wire) and **event-level** (default `90000` / 90 seconds, no minimum, aborts when no SSE events arrive). The byte watchdog is enabled by default for Anthropic API connections; control it via `CLAUDE_ENABLE_BYTE_WATCHDOG`. Increase the event timeout if long-running tools or slow networks cause premature timeout errors |
| `OTEL_LOG_TOOL_DETAILS` | Set to `1` to include `tool_parameters` in OpenTelemetry events. Omitted by default for privacy (v2.1.85) |
| `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` | Maximum content length in bytes for OpenTelemetry event payloads (default: `61440` / 60 KB). Truncates large tool inputs, outputs, or message bodies before emitting them as OTel events to prevent oversized payloads *(in v2.1.214 changelog, not yet on official env-vars page)* |
| `OTEL_LOG_RAW_API_BODIES` | Set to `1` to emit full API request and response bodies as OpenTelemetry log events. Omitted by default for privacy and payload size. Useful for debugging at a gateway or proxy *(in v2.1.111 changelog, not yet on official env-vars page)* |
| `OTEL_RESOURCE_ATTRIBUTES` | Comma-separated `key=value` pairs added as resource attributes on all OpenTelemetry metric data points emitted by Claude Code. Use to attach environment or deployment labels (e.g., `environment=production,team=platform`) that appear on every metric for filtering in your collector (v2.1.162) |
| `OTEL_LOG_USER_PROMPTS` | Set to `1` to include the `user_system_prompt` field in OpenTelemetry LLM request spans. Omitted by default for privacy — user prompts can contain sensitive data, so opt in only when you control the OTel collector and have policies in place *(in v2.1.121 changelog, not yet on official env-vars page)* |
| `OTEL_LOG_ASSISTANT_RESPONSES` | Set to `1` to include model response text in OpenTelemetry log events. Omitted by default for privacy and payload size. Use only when you control the OTel collector and have policies for handling model output *(in v2.1.193 changelog, not yet on official env-vars page)* |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint URL for metrics and logs. See [Monitoring](https://code.claude.com/docs/en/monitoring-usage) |
| `OTEL_EXPORTER_OTLP_HEADERS` | OpenTelemetry exporter headers (`Name=Value` format, comma-separated) for authenticating with your collector |
| `OTEL_LOG_TOOL_CONTENT` | Set to `1` to emit full tool inputs and outputs as OpenTelemetry log events. Omitted by default for privacy |
| `OTEL_METRICS_EXPORTER` | OpenTelemetry metrics exporter type (e.g., `otlp`). See [Monitoring](https://code.claude.com/docs/en/monitoring-usage) |
| `OTEL_TRACES_EXPORTER` | OpenTelemetry traces exporter type (e.g., `otlp`). See [Monitoring](https://code.claude.com/docs/en/monitoring-usage) |
| `OTEL_METRICS_INCLUDE_ENTRYPOINT` | Set to `1` to include the session entry-point (e.g., interactive vs `-p` vs SDK) as a label on all OpenTelemetry metric data points. Useful for breaking down metrics by how Claude Code was invoked (v2.1.161) |
| `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` | Maximum length of OpenTelemetry attribute values in bytes. Attribute values exceeding this limit are truncated. Use to cap memory and payload size when emitting spans with large attribute values |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | Set to `1` to include the authenticated account UUID as a label on all OpenTelemetry metric data points |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | Set to `1` to include the session ID as a label on all OpenTelemetry metric data points |
| `OTEL_METRICS_INCLUDE_VERSION` | Set to `1` to include the Claude Code version as a label on all OpenTelemetry metric data points |
| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` | Set to `1` to promote `OTEL_RESOURCE_ATTRIBUTES` key/value pairs onto every metric data point as dimensions |
| `CLAUDE_CODE_OTEL_DIAG_STDERR` | Set to `1` to emit OpenTelemetry SDK diagnostic output to stderr. Use to troubleshoot collector connectivity or exporter configuration issues |
| `CLAUDE_CODE_FORK_SUBAGENT` | Set to `1` to enable forked subagents on external builds (non-Anthropic-signed distributions). Forked subagents run in an isolated child process instead of sharing the main agent's context *(in v2.1.117 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MCP_SERVER_NAME` | Name of the MCP server, passed as an environment variable to `headersHelper` scripts so they can generate server-specific authentication headers *(in v2.1.85 changelog, not yet on official env-vars page)* |
| `CLAUDE_CODE_MCP_SERVER_URL` | URL of the MCP server, passed as an environment variable to `headersHelper` scripts alongside `CLAUDE_CODE_MCP_SERVER_NAME` *(in v2.1.85 changelog, not yet on official env-vars page)* |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override Opus model alias (e.g., `claude-opus-4-6[1m]`) |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | Customize the Opus entry label in the `/model` picker when using a pinned model on Bedrock/Vertex/Foundry. Defaults to the model ID |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION` | Customize the Opus entry description in the `/model` picker. Defaults to `Custom model (<model-id>)` |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES` | Override capability detection for a pinned Opus model. Comma-separated values (e.g., `effort,thinking`). Required when the pinned model supports features the auto-detection cannot confirm |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override Sonnet model alias (e.g., `claude-sonnet-4-6`) |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME` | Customize the Sonnet entry label in the `/model` picker when using a pinned model on Bedrock/Vertex/Foundry. Defaults to the model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION` | Customize the Sonnet entry description in the `/model` picker. Defaults to `Custom model (<model-id>)` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES` | Override capability detection for a pinned Sonnet model. Comma-separated values (e.g., `effort,thinking`). Required when the pinned model supports features the auto-detection cannot confirm |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | Override Fable model alias (e.g., `claude-fable-5`) |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME` | Customize the Fable entry label in the `/model` picker when using a pinned model on Bedrock/Vertex/Foundry. Defaults to the model ID |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION` | Customize the Fable entry description in the `/model` picker. Defaults to `Custom model (<model-id>)` |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES` | Override capability detection for a pinned Fable model. Comma-separated values (e.g., `effort,thinking`). Required when the pinned model supports features the auto-detection cannot confirm |
| `MAX_THINKING_TOKENS` | Maximum extended thinking tokens per response. Set to `0` to disable extended thinking entirely on the Anthropic API (equivalent to `--thinking disabled`). Applies only when using a fixed thinking budget — on adaptive thinking models (Opus 4.7+), the effort level controls thinking depth instead |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Set the context capacity in tokens used for auto-compaction calculations. Defaults to the model's context window (200K standard, 1M for extended context models). Use a lower value (e.g., `500000`) on a 1M model to treat it as 500K for compaction. Capped at actual context window. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is applied as a percentage of this value. Setting this decouples the compaction threshold from the status line's `used_percentage` |
| `DISABLE_AUTO_COMPACT` | Disable automatic context compaction (`1` to disable). Manual `/compact` still works *(not in official docs — unverified)* |
| `DISABLE_COMPACT` | Disable all compaction — both automatic and manual (`1` to disable) |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | Enable prompt suggestions |
| `CLAUDE_CODE_PLAN_MODE_REQUIRED` | Require plan mode for sessions |
| `CLAUDE_CODE_TEAM_NAME` | Team name for agent teams |
| `CLAUDE_CODE_TASK_LIST_ID` | Task list ID for task integration |
| `CLAUDE_ENV_FILE` | Custom environment file path |
| `FORCE_AUTOUPDATE_PLUGINS` | Force plugin auto-updates (`1` to enable) |
| `HTTP_PROXY` | HTTP proxy URL for network requests |
| `HTTPS_PROXY` | HTTPS proxy URL for network requests |
| `NO_PROXY` | Comma-separated list of hosts that bypass proxy |
| `MCP_TOOL_TIMEOUT` | MCP tool execution timeout in ms |
| `MCP_CLIENT_SECRET` | MCP OAuth client secret |
| `MCP_OAUTH_CALLBACK_PORT` | MCP OAuth callback port |
| `IS_DEMO` | Enable demo mode |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Character budget for slash command tool output |
| `TASK_MAX_OUTPUT_LENGTH` | Maximum output length in bytes for background task results. Results exceeding this limit are truncated |
| `MAX_STRUCTURED_OUTPUT_RETRIES` | Maximum number of retries when a structured output (schema-constrained tool call) fails validation. Default: `3` |
| `DEBUG` | Set to `claude:*` or other debug namespaces to enable verbose debug logging. Equivalent to the `--debug` flag for most purposes |
| `FORCE_HYPERLINK` | Set to `1` to force OSC 8 hyperlink rendering even in terminals that did not explicitly advertise support. Use when your terminal supports hyperlinks but is not auto-detected |
| `DISABLE_GROWTHBOOK` | Set to `1` to disable the GrowthBook feature-flag client, preventing outbound calls to the feature-flag CDN. Useful in air-gapped or firewall-restricted environments |
| `DISABLE_PROMPT_CACHING_FABLE` | Set to `1` to disable prompt caching specifically for Fable model requests |
| `CLAUDE_CODE_FORCE_STRIKETHROUGH` | Set to `1` to force-enable strikethrough text rendering for deleted lines in diff output even in terminals that did not confirm support |
| `CLAUDE_DISABLE_ADOPT` | Set to `1` to prevent Claude Code from adopting an existing `claude` process that may be running in the same terminal. Used in environments where process adoption would cause unexpected behavior |
| `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` | Maximum time in ms to wait for a background task to produce output before printing a waiting indicator. Controls how long Claude Code waits silently before informing the user a background task is still running |
| `CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS` | Timeout in ms for agent team teardown when parking teammates. Controls how long the lead agent waits for team members to complete their teardown before proceeding |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | Custom system prompt to inject when running in `--simple` / `CLAUDE_CODE_SIMPLE=1` mode |
| `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT` | Set to `1` to append the parent's system prompt to each subagent's system prompt. When unset, subagents receive their own prompt only |
| `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` | Set to `1` to skip the organization-level check that determines whether fast mode is available. Use in environments where the org status endpoint is unreachable and fast mode should always be treated as available |
| `CLAUDE_CODE_USE_ANTHROPIC_AWS` | Set to `1` to use Claude Platform on AWS for API requests. Requires `ANTHROPIC_AWS_API_KEY` and `ANTHROPIC_AWS_WORKSPACE_ID` |
| `CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH` | Set to `1` to skip authentication when using Claude Platform on AWS. Use in environments where credentials are injected externally |
| `CLAUDE_CODE_SKIP_AWS_CRED_CACHE` | Set to `1` to disable caching of AWS credentials. Forces a fresh credential resolution on every request. Useful when credentials rotate frequently |
| `CLAUDE_CODE_USE_NATIVE_FILE_SEARCH` | Set to `1` to use native OS file search for the Glob tool on macOS (Spotlight/mdfind) and Windows (Windows Search) instead of the built-in search. May be faster on large repos with native indexing configured |
| `VERTEX_REGION_CLAUDE_3_5_HAIKU` | Vertex AI region override for Claude 3.5 Haiku |
| `VERTEX_REGION_CLAUDE_3_5_SONNET` | Vertex AI region override for Claude 3.5 Sonnet |
| `VERTEX_REGION_CLAUDE_3_7_SONNET` | Vertex AI region override for Claude 3.7 Sonnet |
| `VERTEX_REGION_CLAUDE_4_0_OPUS` | Vertex AI region override for Claude 4.0 Opus |
| `VERTEX_REGION_CLAUDE_4_0_SONNET` | Vertex AI region override for Claude 4.0 Sonnet |
| `VERTEX_REGION_CLAUDE_4_1_OPUS` | Vertex AI region override for Claude 4.1 Opus |
| `VERTEX_REGION_CLAUDE_4_5_OPUS` | Vertex AI region override for Claude 4.5 Opus |
| `VERTEX_REGION_CLAUDE_4_5_SONNET` | Vertex AI region override for Claude 4.5 Sonnet |
| `VERTEX_REGION_CLAUDE_4_6_OPUS` | Vertex AI region override for Claude 4.6 Opus |
| `VERTEX_REGION_CLAUDE_4_6_SONNET` | Vertex AI region override for Claude 4.6 Sonnet |
| `VERTEX_REGION_CLAUDE_4_7_OPUS` | Vertex AI region override for Claude 4.7 Opus |
| `VERTEX_REGION_CLAUDE_4_8_OPUS` | Vertex AI region override for Claude 4.8 Opus |
| `VERTEX_REGION_CLAUDE_5_OPUS` | Vertex AI region override for Claude 5 Opus |
| `VERTEX_REGION_CLAUDE_5_SONNET` | Vertex AI region override for Claude 5 Sonnet |
| `VERTEX_REGION_CLAUDE_FABLE_5` | Vertex AI region override for Claude Fable 5 |
| `VERTEX_REGION_CLAUDE_HAIKU_4_5` | Vertex AI region override for Claude Haiku 4.5 |
| `CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS` | Timeout in milliseconds for the byte-level streaming idle watchdog before aborting a stalled connection. Applies when `CLAUDE_ENABLE_BYTE_WATCHDOG` is active. Minimum: 300,000 (5 minutes) |
| `CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION` | Set to `1` to disable the per-key union behavior for `env` across multiple admin-controlled managed sources. When set, only the `env` block from the winning managed source is used (v2.1.223) |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` | Set to `1` to enable fast mode on Opus 4.7. By default fast mode is not available on Opus 4.7 because its default effort (`xhigh`) differs from the fast-mode model tier |
| `MCP_DISCOVERY_CACHE` | Path to a local cache file for MCP server discovery results. When set, Claude Code reads discovery results from this file instead of querying the discovery endpoint on startup, reducing latency in environments with many MCP servers |
| `USE_BUILTIN_RIPGREP` | Set to `1` to use Claude Code's bundled ripgrep binary for the Grep tool instead of any `rg` found on `PATH`. Useful when the system `rg` version is incompatible or not installed. Also configurable as a startup-only var — see [CLI Startup Flags](./claude-cli-startup-flags.md#environment-variables) |
| `ANTHROPIC_BEDROCK_REGION_PREFIX` | Region prefix for Bedrock cross-region inference profile IDs. When set, Claude Code prepends this value to Bedrock model IDs to construct cross-region inference profile ARNs automatically (v2.1.224) |
| `ANTHROPIC_DEFAULT_MODEL` | Default model name applied when no `model` key is set in any settings file. Unlike `ANTHROPIC_MODEL` which always overrides the model, this variable applies only as a last-resort fallback when no settings file specifies a model (v2.1.236+) |
| `CLAUDE_CODE_PROJECT_DIR_NAME` | Short display name for the current project used in session transcript directory names. When set, overrides the auto-derived project name (usually the repository or directory name) in transcript paths. Useful when multiple projects share a directory name (v2.1.234+) |
| `CLAUDE_CODE_TOOL_MEMORY_LIMIT` | Memory limit for sandboxed tool processes on Linux (cgroup-enforced). Prevents runaway builds from consuming all available memory. Accepts bytes or human-readable sizes (e.g., `"2G"`). Only enforced when the Linux sandbox is active (v2.1.233) |
| `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` | Cache TTL in milliseconds for WebFetch responses. When set, fetched pages are cached for this duration to avoid redundant network requests for the same URL within a session. Set to `0` to disable caching (v2.1.233) |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS` | Set to `1` to enable the legacy `TodoWrite`/`TodoRead`/`TodoDone` tools as an alternative to the default `TaskCreate`/`TaskUpdate`/`TaskGet` task management tools (v2.1.234) |
| `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS` | Stagger delay in milliseconds between launching same-prefix agents in a dynamic workflow. When multiple agents share the same label prefix, this delay prevents simultaneous starts that could overwhelm downstream services. Default: `0` (no stagger) (v2.1.229) |

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `/model` | Switch models and adjust effort level (Opus 4.7 and 4.8) |
| `/effort` | Set effort level directly: `low`, `medium`, `high`, `xhigh` (Fable 5, Opus 5, Sonnet 5, Opus 4.7, 4.8), `max` (session-only; available on all effort-supporting models), or `ultracode` (session-only; enables ultracode workflow, v2.1.203+) (v2.1.76+) |
| `/config` | Interactive configuration UI; also accepts `key=value` syntax for prompt-based settings: `/config model=sonnet` (v2.1.181) |
| `/autocompact` | Set the auto-compact window size in tokens. Writes `autoCompactWindow` to user settings. Use `--autocompact <tokens>` CLI flag for the same effect per-session (v2.1.221+) |
| `/memory` | View/edit all memory files |
| `/agents` | Manage subagents |
| `/mcp` | Manage MCP servers |
| `/hooks` | View configured hooks |
| `/plugin` | Manage plugins |
| `claude plugin tag` | Tag a plugin version in a marketplace for distribution. Run from the marketplace repo with the plugin name and version (v2.1.118) |
| `claude plugin prune` | Remove plugins whose marketplace source is no longer present (e.g., marketplace deleted or `extraKnownMarketplaces` entry removed). Cleans up local cache and disables orphaned plugins (v2.1.121) |
| `claude plugin details <plugin>` | Show the plugin's component inventory (commands, agents, skills, hooks) and the per-session context-token cost it adds. Useful for auditing token spend before enabling a plugin in a managed environment (v2.1.139) |
| `/keybindings` | Configure custom keyboard shortcuts |
| `/skills` | View and manage skills |
| `/permissions` | View and manage permission rules |
| `/usage-credits` | View remaining usage credits and limits. Renamed from `/extra-usage` in v2.1.144 (the old name still works) |
| `claude gateway` | Manage Claude Gateway connections for organization-managed deployments. Requires `forceLoginMethod: "gateway"` in managed settings (v2.1.195) |
| `claude auto-mode reset` | Reset auto-mode classification for the current session. Prompts for confirmation; pass `--yes` to skip the prompt (v2.1.212) |
| `/fork` | Fork the current session context into a new isolated subagent session (v2.1.212) |
| `/subtask` | Launch an isolated subtask in a separate context. The subtask runs independently and results are returned when it completes (v2.1.212) |
| `--doctor` | Diagnose configuration issues |
| `--debug` | Debug mode with hook execution details |

---

## Quick Reference: Complete Example

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "sonnet",
  "advisorModel": "opus",
  "agent": "code-reviewer",
  "language": "english",
  "cleanupPeriodDays": 30,
  "autoUpdatesChannel": "stable",
  "alwaysThinkingEnabled": true,
  "showThinkingSummaries": true,
  "viewMode": "default",
  "tui": "fullscreen",
  "awaySummaryEnabled": false,
  "includeGitInstructions": true,
  "defaultShell": "bash",
  "plansDirectory": "./plans",
  "claudeMdExcludes": ["**/vendor/**/CLAUDE.md"],
  "effortLevel": "high",
  "autoCompactWindow": 800000,
  "skillListingMaxDescChars": 1536,
  "skillListingBudgetFraction": 0.01,
  "disableAgentView": false,
  "disableWorkflows": false,
  "workflowKeywordTriggerEnabled": true,
  "workflowSizeGuideline": "medium",
  "syntaxHighlightingDisabled": false,
  "emojiCompletionEnabled": true,

  "worktree": {
    "symlinkDirectories": ["node_modules"],
    "sparsePaths": ["packages/my-app", "shared/utils"],
    "baseRef": "fresh",
    "bgIsolation": "worktree"
  },

  "skillOverrides": {
    "legacy-context": "name-only",
    "deploy": "off"
  },

  "modelOverrides": {
    "claude-opus-4-6": "arn:aws:bedrock:us-east-1:123456789:inference-profile/anthropic.claude-opus-4-6-v1:0"
  },

  "autoMode": {
    "classifyAllShell": false,
    "environment": [
      "Source control: github.example.com/acme-corp and all repos under it",
      "Trusted internal domains: *.internal.example.com"
    ],
    "soft_deny": ["$defaults", "Never run terraform apply"],
    "hard_deny": ["Never run rm -rf on directories outside the project"]
  },

  "permissions": {
    "allow": [
      "Edit(*)",
      "Bash(npm run *)",
      "Bash(git *)",
      "WebFetch(domain:*)",
      "mcp__memory__*",
      "Agent(*)"
    ],
    "deny": [
      "Read(.env)",
      "Read(./secrets/**)"
    ],
    "additionalDirectories": ["../shared/"],
    "defaultMode": "acceptEdits"
  },

  "enableAllProjectMcpServers": true,

  "mcpServers": {
    "always-on-server": {
      "type": "http",
      "url": "https://mcp.example.com",
      "alwaysLoad": true
    }
  },

  "sshConfigs": [
    {
      "id": "dev-vm",
      "name": "Dev VM",
      "sshHost": "user@dev.example.com"
    }
  ],

  "sandbox": {
    "enabled": true,
    "excludedCommands": ["git", "docker"],
    "filesystem": {
      "denyRead": ["./secrets/"],
      "denyWrite": ["./.env"]
    }
  },

  "attribution": {
    "commit": "Generated with Claude Code",
    "pr": ""
  },
  "prUrlTemplate": "https://gitlab.example.com/{owner}/{repo}/-/merge_requests/{number}",

  "statusLine": {
    "type": "command",
    "command": "git branch --show-current"
  },

  "spinnerTipsEnabled": true,
  "spinnerTipsOverride": {
    "tips": ["Custom tip 1", "Custom tip 2"],
    "excludeDefault": false
  },
  "prefersReducedMotion": false,
  "preferredNotifChannel": "terminal_bell",

  "env": {
    "NODE_ENV": "development",
    "CLAUDE_CODE_EFFORT_LEVEL": "medium",
    "ANTHROPIC_BEDROCK_SERVICE_TIER": "priority"
  }
}
```

---

## Sources

- [Claude Code Settings Reference](https://code.claude.com/docs/en/settings-reference) — canonical key index (~180 keys with Scope/Type/Default columns)
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Model Configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code Status Line Reference](https://code.claude.com/docs/en/statusline)
- [Claude Code Environment Variables](https://code.claude.com/docs/en/env-vars)
- [Claude Code Settings JSON Schema](https://json.schemastore.org/claude-code-settings.json)
- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Claude Code GitHub Settings Examples](https://github.com/feiskyer/claude-code-settings)
- [Claude Code Permissions Reference](https://code.claude.com/docs/en/permissions)
- [Claude Code Sandbox Reference](https://code.claude.com/docs/en/sandboxing)


<!-- FILE: best-practice/claude-skills.md -->

# Skills Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Sep%2025%2C%202026%2010%3A13%20AM%20PKT-white?style=flat&labelColor=555) ![Version](https://img.shields.io/badge/Claude_Code-v2.1.282-blue?style=flat&labelColor=555)<br>
[![Implemented](https://img.shields.io/badge/Implemented-2ea44f?style=flat)](../implementation/claude-skills-implementation.md)

Claude Code skills — frontmatter fields and official bundled skills.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Frontmatter Fields (20)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Display name and `/slash-command` identifier. Defaults to the directory name if omitted |
| `description` | string | Recommended | What the skill does. Shown in autocomplete and used by Claude for auto-discovery |
| `when_to_use` | string | No | Additional context for when Claude should invoke the skill — trigger phrases and example requests. Appended to `description` in the skill listing, counts toward the 1,536-character cap |
| `argument-hint` | string | No | Hint shown during autocomplete (e.g., `[issue-number]`, `[filename]`) |
| `arguments` | string/list | No | Named positional arguments for `$name` substitution in the skill content. Accepts a space-separated string or a YAML list — names map to argument positions in order |
| `disable-model-invocation` | boolean | No | Set `true` to prevent Claude from automatically invoking this skill |
| `user-invocable` | boolean | No | Set `false` to hide from the `/` menu — skill becomes background knowledge only, intended for agent preloading |
| `allowed-tools` | string | No | Tools allowed without permission prompts when this skill is active |
| `disallowed-tools` | string/list | No | Tools removed from Claude's available pool while the skill is active (e.g. block `AskUserQuestion` for a background loop). Accepts a space/comma-separated string or YAML list — the restriction clears on the next message |
| `model` | string | No | Model to use when this skill runs (e.g., `haiku`, `sonnet`, `opus`) |
| `effort` | string | No | Override the model effort level when invoked (`low`, `medium`, `high`, `xhigh`, `max`) |
| `context` | string | No | Set to `fork` to run the skill in an isolated subagent context |
| `agent` | string | No | Subagent type when `context: fork` is set (default: `general-purpose`) |
| `background` | boolean | No | Only applies with `context: fork`. Set to `false` to wait for the forked subagent's result in the invoking turn instead of running in the background (default: `true`). Requires v2.1.218+ |
| `hooks` | object | No | Lifecycle hooks scoped to this skill |
| `paths` | string/list | No | Glob patterns that limit when the skill auto-activates. Accepts a comma-separated string or YAML list — Claude loads the skill only when working with matching files |
| `shell` | string | No | Shell for `` !`command` `` blocks — `bash` (default) or `powershell`. Requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` |
| `metadata` | YAML map | No | Free-form YAML map for your own key-value data (e.g., entitlement or catalog fields) read by your own tooling from `SKILL.md`. Claude Code does not act on its contents; drops values that aren't a map. Do not reuse frontmatter field names (e.g., `paths`) as keys |
| `license` | string | No | License covering the skill. Part of the [Agent Skills](https://agentskills.io) spec. Claude Code accepts the field but does not act on it |
| `compatibility` | string | No | Environment requirements for the skill (max 500 chars), such as intended products or system prerequisites. Part of the [Agent Skills](https://agentskills.io) spec. Claude Code accepts the field but does not act on it |

---

## ![Official](../!/tags/official.svg) **(19)**

| # | Skill | Description |
|---|-------|-------------|
| 1 | `code-review` | Review the current diff for correctness bugs at a chosen effort level (low/medium: fewer, high-confidence findings; high→max: broader coverage) — `--comment` posts findings as inline PR comments |
| 2 | `batch` | Run commands across multiple files in bulk |
| 3 | `debug` | Debug failing commands or code issues |
| 4 | `loop` | Run a prompt or slash command on a recurring interval (up to 3 days) |
| 5 | `claude-api` | Build apps with the Claude API or Anthropic SDK — triggers on `anthropic` / `@anthropic-ai/sdk` imports |
| 6 | `fewer-permission-prompts` | Scan transcripts for common read-only Bash/MCP calls and add a prioritized allowlist to `.claude/settings.json` to reduce permission prompts |
| 7 | `run` | Launch and drive the project's app to see a change working in the real app (not just tests). Requires v2.1.145 |
| 8 | `verify` | Build and run the app to confirm a code change does what it should, without falling back to tests or type checks. Requires v2.1.145 |
| 9 | `run-skill-generator` | Teaches `/run` and `/verify` how to build and launch the project — records a per-project launch recipe at `.claude/skills/run-<name>/`. Requires v2.1.145 |
| 10 | `simplify` | Review changed code for cleanup opportunities (reuse, simplification, efficiency, abstraction level), four review agents in parallel. From v2.1.154 it does **not** hunt for correctness bugs — use `/code-review` for that |
| 11 | `design` | Draft UI mockups, screen flows, landing pages, or posters as artboards on one canvas, published as an artifact running a research preview of Claude Design's editor. Where saving is enabled for the account, artboards are edited on the canvas and saved to publish a new version; otherwise view-and-export as PNG or PDF. Requires a session where artifacts are available. Available on the Anthropic API; unavailable on Amazon Bedrock, Google Cloud Agent Platform, and Microsoft Foundry. Introduced v2.1.234 |
| 12 | `design-sync` | Convert your repo's React design system and upload it to Claude Design — optionally name the design system (e.g., `/design-sync Acme DS`). First-time sync verifies every component and can take hours on large repos. Available on the Anthropic API only (unavailable on Bedrock, Google Cloud Agent Platform, and Microsoft Foundry) |
| 13 | `dataviz` | Design charts, graphs, and dashboards with a color-palette validator for accessible, consistent visualizations — triggers on requests for any chart, graph, plot, or data visualization in any output medium. Introduced v2.1.198 |
| 14 | `doctor` | Setup/health checkup for your Claude Code configuration. The one bundled skill exempt from `disableBundledSkills` — stays typable even when that setting is on. Reclassified from a built-in command to a bundled skill in v2.1.205 |
| 15 | `review` | Fast single-pass, read-only review of a GitHub pull request. For a multi-agent deep dive, use `/code-review <level> <pr#>` instead. From v2.1.186–v2.1.201 used the `/code-review medium` engine; v2.1.202 reverted to a fast single-pass review. Became Skill-tool-invocable in v2.1.108 |
| 16 | `security-review` | Review the current diff for security vulnerabilities and suggest fixes. Pass `--fix` to apply findings or `--comment` to post them as inline GitHub PR comments. Became Skill-tool-invocable in v2.1.108 |
| 17 | `workflow-authoring` | Load the reference for writing dynamic workflow scripts: script API, resume behavior, quality patterns, and worked examples. Claude normally loads it on its own before writing a script. Available only when dynamic workflows are enabled. Requires v2.1.248 |
| 18 | `skill-doctor` | Reports which loaded skills go unused and what each costs in context, so you can prune them. Introduced v2.1.261 |
| 19 | `update-config` | Configure the Claude Code harness via `settings.json` — describe any settings change (allow a command, set an env var, add a hook) and Claude edits the matching settings file; for simple options like theme or model, use `/config` instead |

See also: [Official Skills Repository](https://github.com/anthropics/skills/tree/main/skills) for community-maintained installable skills.

---

## Sources

- [Claude Code Skills — Docs](https://code.claude.com/docs/en/skills)
- [Skills Discovery in Monorepos](../reports/claude-skills-for-larger-mono-repos.md)
- [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)


<!-- FILE: best-practice/claude-subagents.md -->

# Sub-agents Best Practice

![Last Updated](https://img.shields.io/badge/Last_Updated-Sep%2025%2C%202026%2011%3A45%20AM%20PKT-white?style=flat&labelColor=555) ![Version](https://img.shields.io/badge/Claude_Code-v2.1.282-blue?style=flat&labelColor=555)<br>
[![Implemented](https://img.shields.io/badge/Implemented-2ea44f?style=flat)](../implementation/claude-subagents-implementation.md)

Claude Code subagents — frontmatter fields and official built-in agent types.

<table width="100%">
<tr>
<td><a href="../">← Back to Claude Code Best Practice</a></td>
<td align="right"><img src="../!/claude-jumping.svg" alt="Claude" width="60" /></td>
</tr>
</table>

---

## Frontmatter Fields (16)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier using lowercase letters and hyphens |
| `description` | string | Yes | When to invoke. Use `"PROACTIVELY"` for auto-invocation by Claude |
| `tools` | string/list | No | Comma-separated allowlist of tools (e.g., `Read, Write, Edit, Bash`). Inherits all tools if omitted. Supports `Agent(agent_type)` syntax to restrict spawnable subagents; the older `Task(agent_type)` alias still works |
| `disallowedTools` | string/list | No | Tools to deny, removed from inherited or specified list |
| `model` | string | No | Model to use: `sonnet`, `opus`, `haiku`, a full model ID (e.g., `claude-opus-4-6`), or `inherit` (default: `inherit`) |
| `permissionMode` | string | No | Permission mode: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, or `plan` |
| `maxTurns` | integer | No | Maximum number of agentic turns before the subagent stops |
| `skills` | list | No | Skill names to preload into agent context at startup (full content injected, not just made available) |
| `mcpServers` | list | No | MCP servers for this subagent — server name strings or inline `{name: config}` objects |
| `hooks` | object | No | Lifecycle hooks scoped to this subagent. All hook events are supported; `PreToolUse`, `PostToolUse`, and `Stop` are the most common |
| `memory` | string | No | Persistent memory scope: `user`, `project`, or `local` |
| `background` | boolean | No | Set to `true` to always run as a background task (default: `false`) |
| `effort` | string | No | Effort level override when this subagent is active: `low`, `medium`, `high`, `xhigh`, `max` (Opus 4.6 only). Default: inherits from session |
| `isolation` | string | No | Set to `"worktree"` to run in a temporary git worktree (auto-cleaned if no changes) |
| `initialPrompt` | string | No | Auto-submitted as the first user turn when this agent runs as the main session agent (via `--agent` or the `agent` setting). Commands and skills are processed. Prepended to any user-provided prompt |
| `color` | string | No | Display color for the subagent in the task list and transcript: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, or `cyan` |

---

## ![Official](../!/tags/official.svg) **(5)**

| # | Agent | Model | Tools | Description |
|---|-------|-------|-------|-------------|
| 1 | `general-purpose` | inherit | All | Complex multi-step tasks — the default agent type for research, code search, and autonomous work |
| 2 | `Explore` | haiku | Read-only (no Write, Edit) | Fast codebase search and exploration — optimized for finding files, searching code, and answering codebase questions |
| 3 | `Plan` | inherit | Read-only (no Write, Edit) | Pre-planning research in plan mode — explores the codebase and designs implementation approaches before writing code |
| 4 | `statusline-setup` | sonnet | Read, Edit | Configures the user's Claude Code status line setting |
| 5 | `claude-code-guide` | haiku | Glob, Grep, Read, WebFetch, WebSearch | Answers questions about Claude Code features, Agent SDK, and Claude API |

---

## Sources

- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [CLI reference — Claude Code Docs](https://code.claude.com/docs/en/cli-reference)
- [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
