

<!-- FILE: tutorial/day0/README.md -->

# Day 0 — Claude Code Setup

This guide walks you through installing Claude Code on your machine and authenticating so you can start using it.

## Step 1: Install Claude Code

Choose your operating system:

| OS | Guide |
|----|-------|
| Windows | [windows.md](windows.md) |
| Linux | [linux.md](linux.md) |
| macOS | [mac.md](mac.md) |

Follow the guide for your OS, then come back here for authentication.

---

## Step 2: Verify Installation

After following your OS-specific guide, confirm everything is working:

```bash
node --version    # Should show v18.x or higher
claude --version  # Should show the installed Claude Code version
```

---

## Step 3: Login

<img src="assets/login.png" alt="Claude Code login screen" width="50%">

Run `claude` in your terminal. On first launch, it will ask you to choose a login method.

### Method 1: Subscription (Claude Pro / Max)

- Select **Claude.ai account**
- Browser opens — sign in and authorize
- Return to terminal, you're logged in

### Method 2a: API Key (Team Invite)

Your team admin invites you from the Anthropic dashboard.

- You receive an **invite email** — accept it and create your Anthropic account
- Run `claude` in your terminal
- Select **Anthropic API Key**
- Your key is **auto-generated** on the dashboard — no manual setup needed
- Claude Code starts working immediately

### Method 2b: API Key (You have the key)

If someone shared the key with you (via Slack, email, etc.) or you created your own:

- Run `claude` in your terminal
- Select **Anthropic API Key**
- Paste your key (starts with `sk-ant-`)
- The key is **stored permanently** — you won't be asked again

---

<!-- FILE: tutorial/day0/linux.md -->

# Linux Setup

[Back to Day 0](README.md)

## Prerequisites

You need **Node.js v18 or higher** and **npm**.

## Step 1: Install Node.js

### Option A: Via nodejs.org Download Page with fnm (Recommended)

**fnm** (Fast Node Manager) is officially recommended by Node.js. It's fast, lightweight, and lets you switch Node versions easily if needed later.

1. Open your browser and go to [nodejs.org/en/download](https://nodejs.org/en/download).

2. You'll see a row of dropdowns that says: **"Get Node.js® vXX.XX.X (LTS) for __ using __ with __"**. Set the dropdowns as follows:

   | Dropdown | Select |
   |----------|--------|
   | Version | **vXX.XX.X (LTS)** — keep the default LTS version, don't change it |
   | OS | **Linux** |
   | Package Manager | **fnm** (under "Recommended (Official)") |
   | Package Format | **npm** — keep the default |

3. The page will show you the exact commands to run. Open your terminal and copy-paste them. They will look something like this:

   ```bash
   # Step 1 — Install fnm
   curl -fsSL https://fnm.vercel.app/install | bash

   # Step 2 — Restart your terminal or reload your shell profile
   source ~/.bashrc   # or: source ~/.zshrc (if you use zsh)

   # Step 3 — Install Node.js
   fnm install 24   # The page will show the exact version number
   ```

   > The version number may differ from above — always use whatever the website shows.

4. **Close and reopen your terminal** (or run the `source` command above) so that `fnm`, `node`, and `npm` are available.

> **Why fnm?** It's in the "Recommended (Official)" category on the Node.js download page. Like nvm, it installs Node into your home directory so you never need `sudo` for npm global installs — but fnm is significantly faster (written in Rust) and works the same across Windows, macOS, and Linux.

### Option B: Using your distro's package manager

This is quicker but may install an older version of Node.js. **Check the version after installing** — if it's below v18, use Option A instead.

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y nodejs npm

# Check the version
node --version   # Must be v18 or higher
```

**Fedora:**

```bash
sudo dnf install -y nodejs npm
```

**Arch Linux:**

```bash
sudo pacman -S nodejs npm
```

### Option C: NodeSource (Latest LTS via apt, no nvm)

For Ubuntu/Debian users who want the latest LTS without using nvm:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 2: Verify Node.js

```bash
node --version
npm --version
```

Both should print version numbers. `node --version` must show v18.x or higher.

## Step 3: Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

> **Permission error?**
> - If you used **fnm** or **nvm**: this shouldn't happen. Check that it's active (`which node` should point to a path inside your home directory, not `/usr/...`).
> - If you used a system install: either use `sudo npm install -g @anthropic-ai/claude-code` or fix npm's global directory permissions:
>   ```bash
>   mkdir -p ~/.npm-global
>   npm config set prefix '~/.npm-global'
>   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
>   source ~/.bashrc
>   ```

## Step 4: Verify Claude Code

```bash
claude --version
```

You should see the Claude Code version printed. Now head back to [README.md](README.md) for authentication setup.

---

## Notes

- **WSL (Windows Subsystem for Linux):** This guide works inside WSL too. Just follow these steps from your WSL terminal.
- **PATH issues:** If `claude` is not found after install, ensure npm's global bin is in your PATH. Run `npm config get prefix` — the `bin/` subdirectory of that path needs to be in your PATH.


<!-- FILE: tutorial/day0/mac.md -->

# macOS Setup

[Back to Day 0](README.md)

---

**Terminal**
- Open Terminal (press `Cmd + Space`, type "Terminal", hit Enter)

**Homebrew**
- Check if Homebrew is already installed:
  ```bash
  brew --version
  ```
- If you get "command not found", install Homebrew first:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

**Claude Code**
- ```bash
  brew install --cask claude-code
  ```

**Verify**
- ```bash
  claude --version
  ```

---

Now head back to [README.md](README.md) for authentication setup.


<!-- FILE: tutorial/day0/windows.md -->

# Windows Setup

[Back to Day 0](README.md)

---

**Node.js**
- Go to [nodejs.org](https://nodejs.org)
- Click the **"Download Node.js (LTS)"** button — this downloads the `.msi` installer
- Run the `.msi` file and click **Next** through the wizard
- Accept the defaults, click **Install**, wait for it to finish

**Verify Node.js**
- Open a **new** terminal (PowerShell or Windows Terminal) and run:
  ```powershell
  node --version
  npm --version
  ```

**Claude Code**
- ```powershell
  npm install -g @anthropic-ai/claude-code
  ```
- If you get a permission error, run your terminal as **Administrator** (right-click > Run as administrator)

**Verify**
- ```powershell
  claude --version
  ```

---

Now head back to [README.md](README.md) for authentication setup.


<!-- FILE: tutorial/day1/README.md -->

# Day 1 — Your First Conversation with Claude Code

[Back to Day 0 (Setup)](../day0/README.md)

---

You've installed Claude Code. Now what? This guide walks you through three levels of using it — each one gives you more control over **how** Claude does its work.

Think of it like hiring someone:
1. **Prompting** = asking a stranger on the street for directions
2. **Agents** = hiring a specialist who always does things a certain way
3. **Skills** = that specialist having specific training for specific tasks

---

## Level 1: Prompting (Just Ask)

> 🧠 **Think of it like** texting a friend who knows a lot. You ask "what's the weather in Karachi?" and they'll give you *an* answer — but you have no idea if they checked a weather app, looked out their window, or just guessed from memory.

Open your terminal and type `claude`. You're now in a conversation. Try typing:

```
what is the weather in Karachi?
```

Claude will answer — but **how** it answers is unpredictable. It might:
- Pull from its training data (which could be outdated)
- Search the web (if web tools are available)
- Give you a general answer instead of real-time data

This is perfectly fine for quick questions! But if you need **consistent, reliable results**, prompting alone isn't enough.

### When Prompting Works Great

- Asking questions about your codebase ("what does this file do?")
- Writing or editing documents ("rewrite this email to sound more professional")
- Brainstorming ideas ("give me 5 subject lines for this campaign")
- Explaining things ("explain this error message like I'm not a developer")

### The Limitation

Every time you ask "what's the weather?", Claude might fetch data differently — or not fetch real data at all. There's no guarantee it uses the same source or method twice.

---

## Level 2: Agents (The Specialist)

An **agent** is Claude playing a specific role — like assigning a job title.

> 🧠 **Think of it like** a restaurant kitchen. Without an agent, you walk into a random kitchen and shout "make me pasta!" — whoever hears you might boil instant noodles or make a five-course Italian meal. With an agent, you hire a **Pasta Chef** whose job description says: *"Always use fresh ingredients, always cook al dente, always plate it the same way."* Now you know exactly what you're getting, every single time.

Here's the same idea applied to Claude:

> **Without an agent:** You ask Claude "What's the weather in Dubai?"
> It might check its training data, search the web, or make a best guess. You don't know what it'll do.
>
> **With an agent:** A `weather-agent` has a clear job description:
> *"Always check the Open-Meteo API for Dubai. Always return the temperature in a specific format."*
> Same question, same approach, every time.

### Real Example from This Repo

This repo has a `weather-agent` — its entire job is fetching Dubai's temperature. Here's what makes it different from just prompting:

| | Prompting | Agent |
|---|---|---|
| **Source** | Could be anywhere | Always Open-Meteo API |
| **Location** | Whatever Claude picks | Always Dubai (lat: 25.2, lon: 55.3) |
| **Format** | Random paragraph | Clean temperature + unit |
| **Consistency** | Different every time | Same method, every time |

### The Takeaway

Agents give you **predictability**. Same question → same approach → same quality. That's the advantage — not that agents are smarter, but that they're **consistent**.

---

## Level 3: Skills (The Training)

A **skill** is a specific capability that an agent (or Claude itself) can use.

> 🧠 **Think of it like** a new employee's training manual. When someone joins your team, they have a role (agent), but they also go through specific training modules — how to use the CRM, how to write a proposal, how to run a standup. Each training module is a **skill**. The role tells them *what* they are; the skills tell them *how* to do specific things.

Now think about a real person:

> **Shayan** has many skills:
> - Engineering skill — can write code
> - Gaming skill — knows game mechanics
> - Reading skill — can digest and summarize long documents
>
> Each skill has its own knowledge and methods. Shayan uses the right skill for the right task.

Claude works the same way. The `weather-agent` has a skill called `weather-fetcher`:

- The **agent** (`weather-agent`) = the person with the job title "Weather Reporter"
- The **skill** (`weather-fetcher`) = the specific training on *how* to fetch weather data

The skill contains exact instructions:
1. Call this specific API URL
2. Extract the temperature from this specific field in the response
3. Return it in this specific format

### Why Separate Agents and Skills?

Because **one agent can have multiple skills**, and **one skill can be used by multiple agents**.

For example, imagine you create:
- A `daily-report-agent` that summarizes your day
- It could use a `weather-fetcher` skill (for weather) + a `calendar-reader` skill (for meetings) + a `email-summarizer` skill (for email highlights)

Skills are reusable building blocks. Agents are the people who use them.

---

## Putting It All Together

Here's the full picture:

```
Level 1: PROMPTING
You → "What's the weather?" → Claude figures it out somehow
                                (unpredictable method)

Level 2: AGENTS
You → Weather Agent → Always uses the same approach
                      (predictable method)

Level 3: SKILLS
You → Weather Agent → Uses weather-fetcher skill
                      (predictable method with specific instructions)
```

Each level adds more control:

| Level | What You Control | Best For |
|-------|-----------------|----------|
| **Prompting** | The question | Quick one-off questions |
| **Agents** | The question + who answers | Repeatable tasks |
| **Skills** | The question + who answers + how they do it | Critical workflows |

---

## What's Next?

For now, spend time at **Level 1** — just prompt. Get comfortable asking Claude questions in the terminal. The more you use it, the more you'll notice tasks that would benefit from an agent.

---

[Back to Day 0 (Setup)](../day0/README.md)
