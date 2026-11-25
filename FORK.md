# My OpenBot fork

This is my personal fork of [nightly-labs/openbot](https://github.com/nightly-labs/openbot), for my
own UI/UX changes. Upstream's updates still reach me automatically: each new release is merged
into my fork, then built and installed for me.

- GitHub: https://github.com/fernandodamaso/openbot
- Code: `/home/admin/Projects/openbot`
- License: the same PolyForm Noncommercial 1.0.0 as upstream, for personal and noncommercial use
  (see `LICENSE`).

## Opening OpenBot

Use the normal **OpenBot** entry in the app launcher. It opens
`/home/admin/Applications/OpenBot.AppImage`, which is always my fork's build.

Its window always opens in the hidden scratchpad (a Hyprland rule in
`/home/admin/.config/hypr/hosts/desktop.lua`). **SUPER+SHIFT+S** shows or hides it. If the launcher
seems to do nothing, OpenBot is already running in the scratchpad.

## Making a UI/UX change

1. Work in `/home/admin/Projects/openbot` on the `custom` branch.
2. Try it live with `bun run dev` in that folder. This opens a separate dev copy of OpenBot with its
   own data, so my real OpenBot and its chats are not touched. Stop it with `bun run dev:stop`.
3. When it looks right, commit it to `custom` (see the rules below).
4. Put it in my real OpenBot with `openbot-fork-update --rebuild`. It takes about a minute. Then quit
   OpenBot fully and open it again.
5. Optional: `git push` to back it up on GitHub. Updates also push `custom` for me.

### Rules that keep updates painless

- **One small commit per change, with a clear message** saying what it changes and why, e.g.
  "Fork: make the sidebar agent list denser". When upstream changes the same code, the update agent
  reads these messages to keep my change working.
- Change as few upstream lines as possible. Don't reformat, rename or move upstream files.
- Prefer adding new files (components, styles) over rewriting large upstream ones.
- Never commit to `main`; it is an exact copy of upstream.
- Colours and themes need no code: OpenBot reads `~/.config/OpenBot/themes/`.
- Don't touch the line with `OPENBOT_FORK_SELF_UPDATE` in `src/main/update-service.ts`. It stops
  OpenBot from updating itself to the official build, which would lose my changes.

## How updates arrive

Every 3 hours a timer runs `/home/admin/.local/bin/openbot-fork-update`. When upstream has published
a new release:

1. It merges the release into a copy of `custom`, in a separate folder
   (`/home/admin/SSD/build/openbot-update`). It never touches this folder or my uncommitted work.
2. If my changes conflict with upstream's, or the build breaks, it hands the problem to an agent
   (Claude by default) to fix.
3. It checks the result itself: my commits are still there, the self-updater stays off, and the
   code typechecks and builds. If anything fails, nothing is installed.
4. It installs the new OpenBot, moves `custom` forward and pushes it to GitHub.

I get a desktop notification at each step.

| Notification | What to do |
|---|---|
| **OpenBot fork updated** | Quit OpenBot fully and reopen it to get the new version. If an agent fixed a conflict, the notification names its report; worth a quick read. |
| **OpenBot fork update failed** | Nothing changed, and my OpenBot keeps working. The log is in the notification. Ask an agent to fix it on `custom`, then run `openbot-fork-update --rebuild`. The failed attempt is kept on a `fork-update-failed/*` branch for reference. |
| **…uncommitted edits block moving custom** | The new version is installed, but my uncommitted edits are in the way. Commit or stash them, then run `git merge --ff-only fork-installed`. The next run also retries this. |

## If a new version is broken

Open **OpenBot: Roll Back** from the app launcher. It asks first, then closes OpenBot, switches to
the version from before the last update (`OpenBot.prev.AppImage`), and reopens it. Open it again to
switch forward. The next upstream release updates me normally.

One catch: if the new version changed how OpenBot stores its data, the older one may say "update
required" and refuse to open. Then the fix has to go into the new version instead.

## Commands

| Command | What it does |
|---|---|
| `openbot-fork-update --rebuild` | Build and install my current `custom` now. Also retries a failed update. |
| `openbot-fork-update --no-push` | Same as a timer run, without pushing to GitHub. |
| `OPENBOT_FORK_AGENT=codex openbot-fork-update` | Use Codex instead of Claude to fix problems (`none` = no agent). |
| `openbot-rollback` | Same as the "OpenBot: Roll Back" launcher entry. |
| `systemctl --user list-timers openbot-fork-update.timer` | When the next update check runs. |
| `systemctl --user disable --now openbot-fork-update.timer` | Pause automatic updates (`enable --now` resumes them). |

## Where things are

| What | Where |
|---|---|
| Update logs (newest is `last.log`) | `/home/admin/.local/state/openbot-fork/logs/` |
| Installed app / previous version | `/home/admin/Applications/OpenBot.AppImage` / `OpenBot.prev.AppImage` |
| Update scripts | `/home/admin/.local/bin/openbot-fork-update`, `/home/admin/.local/bin/openbot-rollback` |
| Timer | `/home/admin/.config/systemd/user/openbot-fork-update.timer` |
| Update build folder (safe to delete; it is recreated) | `/home/admin/SSD/build/openbot-update` |
| `node_modules` | On the Kingston drive (`/home/admin/SSD/offload/Projects/openbot/node_modules`), bind-mounted here |
| Rules for agents working in this fork | The "Personal fork" section at the top of `AGENTS.md` (Claude reads it through `CLAUDE.md`) |
| bun | Kept at exactly the version in `package.json` (`packageManager`), because dev mode refuses any other. The updater installs it when upstream changes it. |
