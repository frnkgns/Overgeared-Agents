---
description: Update the Overgeared Agents installation in OpenCode's global configuration.
---

Update Overgeared Agents by re-running the OA exporter:

```bash
node integrations/export.mjs --runtime opencode --to global
```

Changed artifacts are rewritten; unchanged ones are left alone. If you edited a generated file yourself, OA treats it as a conflict rather than clobbering it (use `--force` to back up and reclaim). After running, verify that 8 agents are present and no retired roles remain.
