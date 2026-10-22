---
description: Install Overgeared Agents into OpenCode's global configuration.
---

Install Overgeared Agents by running the OA exporter:

```bash
node integrations/export.mjs --runtime opencode --to global
```

This exports 8 OA agents, 10 OA skills, and the OA delegation instruction into `~/.config/opencode/`. It is idempotent, conflict-aware, and reversible. After running, verify that `oa-project-manager` and `oa-full-stack-developer` are gone and `oa-frontend-developer` and `oa-backend-developer` are present.

Activate delegation once by adding the installed instruction to `~/.config/opencode/opencode.jsonc`:

```json
"instructions": ["~/.config/opencode/oa-delegation.md"]
```

Without that entry OpenCode installs `oa-delegation.md` but does not load it.
