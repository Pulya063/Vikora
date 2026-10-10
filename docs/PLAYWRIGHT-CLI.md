# Playwright CLI

The frontend includes `@playwright/cli` as a development dependency, pinned by
`frontend/pnpm-lock.yaml`. Official documentation: https://github.com/microsoft/playwright-cli.

Run commands from `frontend`. Reuse the named `vikora` session:

```powershell
pnpm browser:open http://127.0.0.1:3001
pnpm browser:snapshot
pnpm browser:screenshot
pnpm browser resize 390 844
pnpm browser console error
pnpm browser:close
```

Use the actual URL reported by the frontend server; the port can change.
Read fresh snapshot element references before `pnpm browser click <ref>` or
`pnpm browser fill <ref> <text>`. Use `pnpm browser --help` for all commands.
This is an independent browser session, not the Codex in-app browser tab.
Output is saved under `frontend/.playwright-cli/` and ignored by Git.

Use the CLI actively for future frontend inspection, screenshots, responsive
review, and interactions. Respect any explicit instruction to skip tests or
browser checks. Setup was verified by opening `about:blank`; no application
tests were run during installation.

For dependency updates, use the existing project store:

```powershell
pnpm add -D @playwright/cli@latest --store-dir ../.pnpm-store
```
