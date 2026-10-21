---
description: Install Overgeared Agents into OpenCode's global configuration.
---

Install Overgeared Agents by running the OA exporter:

```bash
node integrations/export.mjs --runtime opencode --to global
```

This exports 8 OA agents and 10 OA skills into `~/.config/opencode/`. It is idempotent, conflict-aware, and reversible. After running, verify that `oa-project-manager` and `oa-full-stack-developer` are gone and `oa-frontend-developer` and `oa-backend-developer` are present.
