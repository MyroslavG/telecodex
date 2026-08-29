# TeleCodex

TeleCodex is a Telegram bridge for the OpenAI Codex CLI SDK. It keeps a Codex thread alive from your phone, streams agent responses and tool output in real time, and lets you hand the thread back to the CLI whenever you want.

## Features

- **Per-context sessions** — each Telegram chat or forum topic gets its own independent Codex session with separate thread, model, and busy state
- **Streaming responses** — agent text edits in-place as Codex generates it
- **Full tool visibility** — shell commands, file changes, web searches, MCP calls, and error items shown with configurable verbosity
- **Live plan display** — Codex's todo list rendered as a separate message and updated as steps complete
- **Voice transcription** — send a voice message or audio file; TeleCodex transcribes it (local parakeet-coreml or OpenAI Whisper) and forwards the text to Codex
- **Image input** — send a photo (with optional caption) to pass screenshots or images directly to Codex
- **File ingest & artifacts** — send a document to stage it for Codex; generated files are delivered back as Telegram documents
- **Session browser** — `/sessions` lists recent threads from `~/.codex`, grouped by workspace; tap to switch
- **Registered projects** — a server-owned YAML allowlist lets each chat or forum topic select one approved repository
- **Pull request status** — `/pr` shows the current branch PR through the GitHub CLI
- **Telegram login** — `/login` authenticates against the Codex CLI via device auth flow, no terminal needed
- **Launch profiles** — `/launch_profiles` selects the sandbox + approval mode for new or reattached threads in the current Telegram context (`/launch` remains an alias)
- **Model picker** — `/model` shows available models and lets you switch for new threads
- **Reasoning effort** — `/effort` lets you dial from `minimal` to `xhigh` for new threads
- **Optional message reactions** — 👀 while processing, 👍 on success when enabled; silently degrades in chats without reaction support
- **Friendly errors** — common SDK and network errors are translated to actionable messages with command hints
- **Token usage** — session token totals shown on `/session`, with optional per-turn footer in replies
- **Handback flow** — `/handback` prints a ready-to-run `codex resume <id>` command (copied to clipboard on macOS)
- **User allowlist** — only configured Telegram user IDs can interact with the bot
- **Docker-friendly** — workspace auto-detected (`/workspace` in containers, `cwd` otherwise)
- **Remote development guardrails** — project threads receive branch and PR rules that prevent base-branch pushes, force pushes, merges, deployments, and production changes

## Prerequisites

- Node.js 22+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- The Codex CLI installed and authenticated on the host:
  - API key auth: set `CODEX_API_KEY`
  - ChatGPT login: `codex login` on the machine, or use `/login` from Telegram
- *(Optional)* `ffmpeg` — required for local voice transcription via parakeet-coreml
- *(Optional)* `OPENAI_API_KEY` — enables OpenAI Whisper as a voice transcription fallback

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Fill in `.env`:

   | Variable | Required | Description |
   |---|---|---|
   | `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from @BotFather |
   | `TELEGRAM_ALLOWED_USER_IDS` | ✅ | Comma-separated Telegram user IDs |
   | `CODEX_API_KEY` | — | API key for Codex (alternative to ChatGPT login) |
   | `CODEX_MODEL` | — | Default model, e.g. `gpt-5.4`, `o3` |
   | `CODEX_SANDBOX_MODE` | — | `read-only`, `workspace-write` *(default)*, `danger-full-access` |
   | `CODEX_APPROVAL_POLICY` | — | `never` *(default)*, `on-request`, `on-failure`, `untrusted` |
   | `CODEX_LAUNCH_PROFILES_JSON` | — | Optional JSON array of named launch profiles for `/launch_profiles` |
   | `CODEX_DEFAULT_LAUNCH_PROFILE` | — | Default launch profile id (defaults to `default`) |
   | `ENABLE_UNSAFE_LAUNCH_PROFILES` | — | Set to `true` to allow extra `danger-full-access` launch profiles |
   | `TOOL_VERBOSITY` | — | `all`, `summary` *(default)*, `errors-only`, `none` |
   | `SHOW_TURN_TOKEN_USAGE` | — | Show the per-turn `in/cached/out` footer in final replies (`false` by default) |
   | `MAX_FILE_SIZE` | — | Max upload size in bytes (default `20971520` = 20 MB) |
   | `ENABLE_TELEGRAM_LOGIN` | — | Allow `/login` and `/logout` from Telegram (`true` by default) |
   | `ENABLE_TELEGRAM_REACTIONS` | — | Enable Telegram emoji reactions like 👀 / 👍 (`false` by default) |
   | `OPENAI_API_KEY` | — | Enables OpenAI Whisper voice transcription fallback |
   | `PROJECTS_CONFIG` | — | Server-owned YAML file registering approved repositories |
   | `PROJECTS_ROOT` | — | Directory that contains every registered project; configured paths outside it are rejected |

4. Start the bot:
   ```bash
   npm run dev
   ```

## Telegram Commands

| Command | Description |
|---|---|
| `/start` | Welcome & status (concise for returning users) |
| `/help` | Grouped command reference |
| `/new` | Start a fresh thread (workspace picker if multiple workspaces) |
| `/projects` | List registered projects available to the current user |
| `/project [id]` | Show the selected project or select an approved project by ID |
| `/pr` | Show the current branch pull request for the selected project |
| `/session` | Current thread ID, workspace, model, effort, and token totals |
| `/sessions` | Browse recent threads grouped by workspace; tap to switch |
| `/switch <id>` | Switch directly to a thread by ID |
| `/retry` | Resend the last prompt |
| `/abort` | Cancel the current turn |
| `/launch_profiles` | Select launch profile for new or reattached threads (`/launch` alias kept) |
| `/model` | View and change the model |
| `/effort` | Set reasoning effort: `minimal` · `low` · `medium` · `high` · `xhigh` |
| `/auth` | Check authentication status |
| `/login` | Start Codex device-auth flow from Telegram |
| `/logout` | Sign out of Codex |
| `/voice` | Check voice transcription backend status |
| `/handback` | Print `codex resume <id>` for CLI handoff |
| `/attach <id>` | Bind an existing Codex thread to this forum topic |

### Registered projects

Remote development projects are registered by the server operator, never by a Telegram message. Copy [`projects.example.yml`](projects.example.yml) to the host path configured by `PROJECTS_CONFIG` and edit it:

```yaml
projects:
  kolo:
    name: Kolo
    path: /data/projects/kolo
    base_branch: main
```

Every path must be an existing absolute directory below `PROJECTS_ROOT`; symlink escapes, duplicate paths, invalid identifiers, and arbitrary Telegram paths are rejected at startup. Project selection is persisted separately for each private chat or forum topic. Selecting another project prepares a fresh thread for that context.

Use `/projects`, `/project kolo`, and `/new`. The selected repository becomes the Codex working directory. On the first prompt of each project thread, TeleCodex adds instructions to inspect the repository, update the configured base branch, create an `agent/...` feature branch, run tests, push only that branch, and create or update a PR when asked. It explicitly forbids direct base-branch pushes, force pushes, merges, remote rewrites, deployment, production data changes, and access to unrelated repositories.

### Voice, image & file input

- **Voice / audio** — send any voice message or audio file; TeleCodex transcribes it and sends the result to Codex
- **Photos** — send a photo with an optional caption; the image is forwarded to Codex as visual input
- **Documents** — send a file (with optional caption); TeleCodex stages it in the workspace, runs Codex, and delivers any generated files back as Telegram documents

### Tool verbosity

| Mode | What you see |
|---|---|
| `all` | Every tool start, streaming output, and result |
| `summary` *(default)* | A short grouped footer such as `Tools used: 3x bash, 2x subagents, web_fetch` |
| `errors-only` | Only failed tool calls |
| `none` | Silent |

Per-turn token usage is hidden by default. Set `SHOW_TURN_TOKEN_USAGE=true` if you want the `in / cached / out` footer appended to final replies.

### Launch profiles

- TeleCodex always provides a built-in `default` profile synthesized from `CODEX_SANDBOX_MODE` and `CODEX_APPROVAL_POLICY`
- Built-in Telegram-visible presets are:
  - `Default`
  - `Read Only`
  - `Review`
  - `Full Access` when `ENABLE_UNSAFE_LAUNCH_PROFILES=true`
- `Workspace Write` is not listed separately because it is already the default behavior in the shipped config
- Optional extra profiles can be configured with `CODEX_LAUNCH_PROFILES_JSON`, for example:
  ```json
  [
    { "id": "readonly", "label": "Read Only", "sandboxMode": "read-only", "approvalPolicy": "never" },
    { "id": "review", "label": "Review", "sandboxMode": "workspace-write", "approvalPolicy": "on-request" }
  ]
  ```
- `/launch_profiles` changes only future thread creation or reattachment in the current chat/topic context; it does not mutate an already active thread in place
- Extra `danger-full-access` profiles are blocked unless `ENABLE_UNSAFE_LAUNCH_PROFILES=true`
- Selecting a `danger-full-access` profile from Telegram requires an explicit confirmation step

## Multi-Session Architecture

Each Telegram chat or forum topic is identified by a **context key** — the chat ID alone for private chats, or `chatId:threadId` for forum topics. This means every topic in a supergroup gets its own independent Codex session.

The `SessionRegistry` maps context keys to `CodexSessionService` instances:

```
┌───────────────────┐      ┌───────────────────────────────┐
│ Private Chat A     │─────▶│ CodexSessionService (thread X) │
│ key: "111"         │      └───────────────────────────────┘
├───────────────────┤      ┌───────────────────────────────┐
│ Group B / Topic 1  │─────▶│ CodexSessionService (thread Y) │
│ key: "222:1"       │      └───────────────────────────────┘
├───────────────────┤      ┌───────────────────────────────┐
│ Group B / Topic 2  │─────▶│ CodexSessionService (thread Z) │
│ key: "222:2"       │      └───────────────────────────────┘
└───────────────────┘
```

- **First message** in a context → creates a new `CodexSessionService` → starts a new Codex thread
- **Subsequent messages** → same context key → same session → conversation continues
- **`/new`** → replaces the thread within the same context (optionally picking a workspace first)
- **`/sessions`** → lists all Codex threads from `~/.codex`, lets you switch within the current context
- **`/attach <id>`** → resumes a specific Codex CLI thread (useful for picking up work started in the terminal)

Session metadata (thread ID, workspace, launch profile, model, effort, selected project, and instruction state) is persisted to `.telecodex/contexts.json` and restored on restart so threads survive bot reboots.

Each context has independent busy-state tracking, so a running prompt in one topic doesn't block another.

## Handoff: Telegram → CLI

1. Run `/handback` in Telegram
2. TeleCodex replies with:
   ```bash
   cd '/path/to/project' && codex resume 'thread-abc123'
   ```
3. Paste and run in your terminal

On macOS the command is also copied to the clipboard automatically.

## Architecture

```
Telegram ←→ Grammy bot (auto-retry, HTML formatting, inline keyboards)
                |
                v
        SessionRegistry  ──→  per-context CodexSessionService instances
                |
                ├── @openai/codex-sdk  ──→  spawns Codex CLI subprocess
                │     └── ThreadEvents (agent text, commands, file changes,
                │                       MCP calls, web searches, todo lists,
                │                       reasoning, errors, token usage)
                ├── CodexStateReader  ──→  ~/.codex/state_*.sqlite  (threads)
                │                    ──→  ~/.codex/models_cache.json (models)
                ├── CodexAuth        ──→  codex login/logout subprocess
                ├── Attachments      ──→  .telecodex/inbox/<turnId>/ (staged files)
                ├── Artifacts        ──→  .telecodex/outbox/<turnId>/ (generated files)
                └── VoiceTranscriber  ──→  parakeet-coreml (local)
                                     ──→  OpenAI Whisper (cloud fallback)
```

## Project Layout

```
TeleCodex/
├── src/
│   ├── index.ts           — startup, signal handling, polling loop
│   ├── bot.ts             — Telegram bot, all commands and handlers
│   ├── bot-ui.ts          — pure render helpers (/help, /start, session labels)
│   ├── codex-launch.ts    — launch profile parsing, validation, and formatting
│   ├── codex-session.ts   — CodexSessionService wrapping the SDK
│   ├── codex-state.ts     — SQLite reader for thread/model discovery
│   ├── codex-auth.ts      — Codex CLI auth (login status, device auth, logout)
│   ├── session-registry.ts — per-context session map with persistence
│   ├── projects.ts        — server-owned project allowlist parsing and validation
│   ├── development-instructions.ts — project Git/PR guardrails for new threads
│   ├── github.ts          — GitHub CLI current-PR lookup
│   ├── context-key.ts     — Telegram chat/topic → context key derivation
│   ├── attachments.ts     — file staging (sanitization, size limits)
│   ├── artifacts.ts       — generated file collection and Telegram delivery
│   ├── error-messages.ts  — SDK/network error → user-friendly translation
│   ├── voice.ts           — voice transcription (parakeet / Whisper)
│   ├── config.ts          — environment loading and validation
│   └── format.ts          — Markdown → Telegram HTML conversion
├── test/                  — unit tests for sessions, projects, configuration, and bot helpers
├── .env.example
├── projects.example.yml
├── IMPLEMENTATION.md
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
└── vitest.config.ts
```

## Docker

```bash
docker compose up --build
```

The compose file:
- loads environment from `.env`
- runs as a non-root UID `1001`
- includes `git`, `gh`, OpenSSH, and the Codex CLI bundled by the SDK dependency
- persists Codex auth/state, GitHub CLI auth, and Git configuration in separate host mounts
- mounts the project root at `/data/projects` and the project registry read-only at `/data/config/projects.yml`

`PROJECTS_ROOT_HOST` and `PROJECTS_CONFIG_HOST` are required compose variables. The remaining host-path variables in `.env.example` have local defaults, but use protected absolute server paths in production.

## Remote Development Setup

This deployment keeps the bot on one Linux server while you control it from Telegram. It assumes Ubuntu, Docker Engine with the Compose plugin, and a service account whose UID is `1001` to match the container. Install Docker from the [official Docker Engine instructions](https://docs.docker.com/engine/install/ubuntu/) and install or verify the Compose plugin with the [official Compose instructions](https://docs.docker.com/compose/install/linux/).

1. Provision the service user and persistent directories:
   ```bash
   sudo useradd --system --create-home --uid 1001 --shell /usr/sbin/nologin telecodex
   sudo install -d -o 1001 -g 1001 -m 0750 /srv/telecodex/{data,projects,config,codex,gh,git}
   sudo install -d -o 1001 -g 1001 -m 0700 /home/telecodex/.ssh
   sudo usermod -aG docker "$USER"
   docker compose version
   ```

2. Clone this fork and create the registry:
   ```bash
   sudo git clone https://github.com/MyroslavG/telecodex.git /srv/telecodex/app
   cd /srv/telecodex/app
   sudo cp projects.example.yml /srv/telecodex/config/projects.yml
   sudo chown -R "$USER":"$USER" /srv/telecodex/app
   sudo chown -R 1001:1001 /srv/telecodex/{data,projects,config,codex,gh,git}
   cp .env.example .env
   chmod 600 .env
   ```

3. Configure `.env` with the Telegram credentials and container paths. The host mounts must point to the persistent directories created above:
   ```dotenv
   TELEGRAM_BOT_TOKEN=replace-with-BotFather-token
   TELEGRAM_ALLOWED_USER_IDS=your-numeric-telegram-user-id

   PROJECTS_CONFIG=/data/config/projects.yml
   PROJECTS_ROOT=/data/projects
   TELECODEX_DATA_HOST=/srv/telecodex/data
   PROJECTS_ROOT_HOST=/srv/telecodex/projects
   PROJECTS_CONFIG_HOST=/srv/telecodex/config/projects.yml
   CODEX_HOME_HOST=/srv/telecodex/codex
   GH_CONFIG_HOME_HOST=/srv/telecodex/gh
   GIT_CONFIG_HOME_HOST=/srv/telecodex/git
   SSH_DIR_HOST=/home/telecodex/.ssh
   ```
   Set `CODEX_API_KEY` only if you prefer API-key authentication. Otherwise authenticate the Codex CLI in the next step.

4. Configure the service user's SSH key before cloning private repositories. Upload the printed public key to the intended GitHub account or organization and verify the GitHub host key before adding it to `known_hosts`:
   ```bash
   sudo -u telecodex ssh-keygen -t ed25519 -f /home/telecodex/.ssh/id_ed25519 -N ""
   sudo -u telecodex cat /home/telecodex/.ssh/id_ed25519.pub
   sudo -u telecodex sh -c 'ssh-keyscan github.com >> ~/.ssh/known_hosts'
   sudo chmod 600 /home/telecodex/.ssh/id_ed25519
   ```

5. Create a separate directory for every repository and register only its container path in `/srv/telecodex/config/projects.yml`:
   ```bash
   sudo -u telecodex git clone git@github.com:your-org/company-api.git /srv/telecodex/projects/company-api
   sudo -u telecodex git clone git@github.com:your-org/company-web.git /srv/telecodex/projects/company-web
   ```
   ```yaml
   projects:
     company-api:
       name: Company API
       path: /data/projects/company-api
       base_branch: main
     company-web:
       name: Company Web
       path: /data/projects/company-web
       base_branch: develop
   ```
   Restart the service whenever this registry changes. Do not put the host paths (`/srv/...`) in the YAML; the container sees `/data/projects/...`.

6. Build the image and authenticate Codex once; the mount makes its device-login state survive container restarts:
   ```bash
   docker compose build
   docker compose run --rm --entrypoint codex telecodex login --device-auth
   docker compose run --rm --entrypoint codex telecodex login status
   ```
   You can also run `/login` after the bot starts. The installed Codex SDK supports persistent/resumable threads and sets each thread's working directory, which is the behavior used for project-bound sessions. [Codex SDK documentation](https://learn.chatgpt.com/docs/codex-sdk)

7. Authenticate GitHub CLI once for PR creation and make its Git credential helper persistent:
   ```bash
   docker compose run --rm --entrypoint gh telecodex auth login --hostname github.com --git-protocol ssh --web --skip-ssh-key
   docker compose run --rm --entrypoint gh telecodex auth setup-git --hostname github.com
   docker compose run --rm --entrypoint gh telecodex auth status --active
   ```
   GitHub CLI supports SSH or HTTPS git protocol selection and stores the active account per host; `gh auth setup-git` configures Git to use that authenticated account. [GitHub CLI authentication manual](https://cli.github.com/manual/gh_auth_login)

8. Configure Git author identity in every registered repository so commits have an attributable author:
   ```bash
   docker compose run --rm --entrypoint git telecodex -C /data/projects/company-api config user.name "Your Name"
   docker compose run --rm --entrypoint git telecodex -C /data/projects/company-api config user.email "you@example.com"
   ```
   Repeat for each repository, or use the persisted global Git config mount if one identity is appropriate for all projects.

9. For multiple GitHub identities, prefer one SSH key per identity and host aliases in `/home/telecodex/.ssh/config`:
   ```sshconfig
   Host github-personal
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_personal
     IdentitiesOnly yes

   Host github-work
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_work
     IdentitiesOnly yes
   ```
   Add each public key to its matching GitHub account or organization, use remotes such as `git@github-work:your-org/company-api.git`, and add a verified GitHub host key to `known_hosts`. Keep the private keys mode `0600`, the directory mode `0700`, and never mount an unrelated personal `.ssh` directory into the container.

10. Start the service:
   ```bash
   docker compose up -d --build
   docker compose logs -f telecodex
   ```
   For updates, run `git pull --ff-only`, review `git diff`, then `docker compose up -d --build`. The project repositories are separate clones and are never overwritten by that update.

11. In Telegram, use `/projects`, `/project company-api`, and `/new`, then describe the task. Continue with normal messages in that chat/topic. Use `/pr` to retrieve the current branch pull request. A pasted review comment is handled on the existing branch and PR after the agent validates it.

## Development

```bash
npm run dev      # run with tsx (no build step)
npm run build    # compile TypeScript
npm test         # run vitest
```

## Release Automation

TeleCodex does not yet use the TelePi npm release pipeline, but the exact Trusted Publishing process has been documented so it can be adopted here.

See:
- `docs/npm-trusted-publishing.md`

That playbook covers:
- making the package publishable on npm
- adding a tag-driven GitHub Actions workflow
- configuring npm Trusted Publishing
- the maintainer release flow (`npm version ...` + `git push --follow-tags`)

## Security Notes

- Only users in `TELEGRAM_ALLOWED_USER_IDS` can interact with the bot
- Default sandbox mode is `workspace-write` — Codex can read and write within the working directory
- Use `danger-full-access` only if you fully trust the user and the host environment
- The built-in `Full Access` profile and any extra `danger-full-access` launch profiles are opt-in via `ENABLE_UNSAFE_LAUNCH_PROFILES=true`
- Default approval policy is `never` — suited for headless/automated use
- Project paths come only from the server-owned registry; Telegram commands cannot set a working directory
- The mounted repository root should contain only repositories this agent is permitted to work on
- Keep `/srv/telecodex`, Codex state, GitHub auth, and SSH keys readable only by the intended server administrator and UID `1001`
- `/launch_profiles` only selects from validated configured profiles; Telegram users cannot submit arbitrary sandbox or approval values
- `CODEX_API_KEY` (agent auth) and `OPENAI_API_KEY` (voice transcription) are separate credentials
- `/login` and `/logout` can be disabled by setting `ENABLE_TELEGRAM_LOGIN=false`
- Files uploaded via Telegram are sanitized (name, size, type) before staging in the workspace
- All Markdown output is sanitized before being sent as Telegram HTML
