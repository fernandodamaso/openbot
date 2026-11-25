# Personal fork of OpenBot

This is a personal fork of [nightly-labs/openbot](https://github.com/nightly-labs/openbot) for
UI/UX changes. It is licensed under the same PolyForm Noncommercial 1.0.0 terms as upstream
(see `LICENSE` and `NOTICE`).

## Branches

- `main` mirrors upstream `main`. Never commit to it.
- `custom` is the branch that gets built: upstream's latest release plus the fork's own commits.

## Updates

`/home/admin/.local/bin/openbot-fork-update` runs from the `openbot-fork-update.timer` user timer.
When upstream publishes a new release, it merges the release tag into `custom`. Then it builds the
AppImage and installs it as `/home/admin/Applications/OpenBot.AppImage`, keeping the previous build
as `OpenBot.prev.AppImage`. A merge conflict or a failed build goes to an agent to fix. The script
then verifies the result itself before it installs anything. The built app's own self-updater is
turned off on Linux (`src/main/update-service.ts`), so it can't replace itself with an upstream
build.

## Keeping updates painless

- Keep each change a small, separate commit on `custom`, with a clear message saying what it
  changes and why. The agent uses those messages to resolve conflicts.
- Don't reformat, rename or move upstream files. Change as few lines as you can.
- Prefer new files (components, styles) over editing large upstream ones.
- Theming needs no patch: OpenBot reads `~/.config/OpenBot/themes/`.
- To build and install your current `custom` without waiting for a release, run
  `openbot-fork-update --rebuild`.
