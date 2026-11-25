# Personal fork of OpenBot

This is a personal fork of [nightly-labs/openbot](https://github.com/nightly-labs/openbot) for
UI/UX changes. It is licensed under the same PolyForm Noncommercial 1.0.0 terms as upstream
(see `LICENSE` and `NOTICE`).

## Branches

- `main` mirrors upstream `main`. Never commit to it.
- `custom` is the branch that gets built: upstream's latest release plus the fork's own commits.

## Updates

`/home/admin/.local/bin/openbot-fork-update` runs from the `openbot-fork-update.timer` user timer
every 3 hours. When upstream publishes a new release, it works in its own worktree
(`/home/admin/SSD/build/openbot-update`), never in this checkout:

1. It merges the release tag into a copy of `custom`.
2. A merge conflict or a failed build goes to an agent: `claude` by default, or set
   `OPENBOT_FORK_AGENT=codex|none`.
3. The script then checks the result itself. Your commits must still be there, the updater gate
   must be intact, and the tree must be clean. Then it runs the typecheck and the build.
4. Only if everything passes, it installs the AppImage as `/home/admin/Applications/OpenBot.AppImage`
   and keeps the previous one as `OpenBot.prev.AppImage`.
5. It fast-forwards `custom` and pushes it to GitHub.

If the update fails, `custom` and the installed app are left as they were. The attempt is kept on a
`fork-update-failed/*` branch, and you get a notification. Logs are in
`/home/admin/.local/state/openbot-fork/logs/`.

The built app's own self-updater is turned off on Linux (`src/main/update-service.ts`), so it
can't replace itself with an upstream build. Note that `OpenBot.prev.AppImage` may refuse to open
your data after an update that changed the database schema.

## Keeping updates painless

- Keep each change a small, separate commit on `custom`, with a clear message saying what it
  changes and why. The agent uses those messages to resolve conflicts.
- Don't reformat, rename or move upstream files. Change as few lines as you can.
- Prefer new files (components, styles) over editing large upstream ones.
- Theming needs no patch: OpenBot reads `~/.config/OpenBot/themes/`.
- To build and install your current `custom` without waiting for a release, run
  `openbot-fork-update --rebuild`.
