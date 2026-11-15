# Development workflow

## Branches and PRs

- `main` is the only long-lived branch. There is no production risk: a Workshop version only changes when the user publishes it.
- **Small changes** (a tweak, a fix, notes, a text) may be committed straight to `main`.
- **Bigger features** go on a branch `<type>/<topic>` (`feat/moisture-noise`, `chore/agent-workflow-docs`) and into a PR, so the user
  can review the diff. Bigger means: a new mechanic, a larger rework, a new fork, a change to the docs or skills.
- Commit messages are conventional (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), in English, one logical change each.
- **Never push or open a PR unless the user asked for it in the current task.** When asked for a whole feature ("push, build the PR and
  merge"), that covers exactly that branch; it does not carry over to the next task.
- **The user's working tree is theirs.** Check `git status` first. Files that are modified before the task starts are not yours:
  stage by path (`git add <path>`), never `git add -A` or `git commit -a`.
- Merge a PR with a squash merge, then update local `main` (`git pull --ff-only`) and delete the branch.

## Checks before a commit

In a Vite project: `npm run lint`, `npm run build` (this includes the type check) and `npm run format:check`. The no-build projects
have no checks; open the page and look.

## Looking at a wallpaper

An agent verifies a visual change by looking at it, not by assuming:

1. Start `npm run dev` in the project (in the background), or serve a no-build project with any static server.
2. Open it with the Playwright MCP, take a screenshot, read the console messages.
3. Exercise the change: drag/wheel for camera, click for tile input, `window.wallpaperPropertyListener.applyUserProperties({...})`
   called through `browser_evaluate` for a property.
4. Stop the server. Playwright session files land in `.playwright-mcp/`, which is ignored.

Keyboard works in the browser, but the applied wallpaper never receives it
([wallpaper-engine-integration.md](wallpaper-engine-integration.md)). What only the real Wallpaper Engine can show (the applied
wallpaper, the native property panel) is left for the user; say so in the report instead of claiming it works.

## Review of a bigger change

Before the PR of a bigger change, a read-only subagent reviews the branch (`git diff main`), because the agent that built it is
biased. It gets the goal and the diff, not the conclusions, and reports only what matters for correctness, structure and the rules.
Check each finding against the code, fix what is real, and say in the report what was dropped and why.
