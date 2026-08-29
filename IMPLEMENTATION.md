# Remote Development Controller MVP

This checklist tracks the adaptation of TeleCodex into a personal remote multi-repository development controller.

- [x] Preserve the Codex SDK, Telegram bot, persistent session registry, attachments, voice, login, launch profiles, and existing tests.
- [x] Add a server-owned YAML project allowlist with validated absolute paths below `PROJECTS_ROOT`.
- [x] Persist the selected project independently for every Telegram chat/topic context.
- [x] Add `/projects`, `/project [id]`, and `/pr`; project commands never accept an arbitrary filesystem path.
- [x] Start new project threads in the selected repository and restrict session/attach switching to that project.
- [x] Prepend durable project-specific Git and PR instructions to the first prompt in each project thread.
- [x] Add `gh`, Git, SSH, persistent Codex/GitHub auth mounts, and project/config mounts to the Docker deployment.
- [x] Add unit coverage for config validation, topic isolation, project working directories, instruction scope, and GitHub CLI parsing.
- [x] Document remote server provisioning, credentials, project registration, and Telegram workflow.
- [ ] Deploy to the remote server and authenticate Codex/GitHub with the actual credentials.
