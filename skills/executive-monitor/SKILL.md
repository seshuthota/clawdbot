---
name: executive-monitor
description: High-level System 3 layer for process supervision, autonomous reflection, and project-scale orchestration.
metadata: {"clawdbot":{"emoji":"🏛️","requires":{"bins":["opencode"]}}}
---

# Executive Monitor Skill

The **Executive Monitor** is the "System 3" meta-cognitive layer of the assistant. It manages long-running processes, supervises sub-agents, and performs autonomous reflection to maintain project integrity.

## 🏛️ CORE PILLARS

1. **Process Supervision**: Enforce "Laws" on sub-agents and audit their internal reasoning.
2. **Autonomous Reflection**: Proactively audit the codebase, update documentation, and refine "Core Memory."
3. **Context Orchestration**: Break project-scale tasks into parallel worker-threads (OpenCode).

---

## ⚠️ CRITICAL RULES

1. **ALWAYS use OpenCode** - for sub-tasks.
2. **Define interfaces FIRST** - ensure cross-agent compatibility.
3. **Self-verify before reporting** - run tests/type-checks as part of the "Monitoring" phase.
4. **Update Core Memory** - Always summarize results into `memory.md` during the "Reflection" phase.

---

## 🤖 MODES OF OPERATION

### 1. Reactive Mode (User-Driven)
Triggered by direct user requests to build or analyze features.
- **Goal**: Complete a specific feature or fix.
- **Process**: Break down task -> Spawn Agents (OpenCode) -> Monitor -> Integrity Check -> Report.

### 2. Autonomous Mode (System-Driven)
Triggered by cron jobs or lifecycle events (e.g., "Nightly Reflection").
- **Goal**: Maintain systemic health and documentation accuracy.
- **Targets**: `memory.md`, `README.md`, broken tests, or stale TODOs.
- **Action**: Read recent changes -> Identify gaps -> Fix/Document -> Self-Audit -> Update Core Memory.

---

## 📋 Structured Response Format (Reflection)

Every task completion (Reactive or Autonomous) must end with a **Reflective Summary** block:

```
STATUS: SUCCESS | PARTIAL | FAILED

FILES:
- [path/to/file] (created/modified/verified)

INTEGRITY CHECK:
- ✅ All tests passed
- ✅ Type-check clean
- ⚠️ Found 1 outdated comment in [file]

REFLECTIVE SUMMARY (FOR CORE MEMORY):
- [Key Learning/Fact]: (e.g., "The MiniMax model requires an Authorization header.")
- [Action item]: (e.g., "Need to update the Ubuntu install script.")
```

---

## OpenCode CLI Reference

```bash
# Non-interactive (for scripting/automation)
opencode run "Your prompt here"

# Continue existing session
opencode run --continue "Follow-up prompt"

# With specific model (USE THIS: Google auth is missing)
opencode run --model minimax/MiniMax-M2.1 "Your prompt"
```

---

## Orchestration Pattern

```bash
# 1. Create workdirs
TASK_DIR=$(mktemp -d)

# 2. Spawn Workers
bash background:true command:"opencode run --model minimax/MiniMax-M2.1 'Task... [RULES]' > worker.log 2>&1"

# 3. Monitor & Reflect
# (Wait for completion)
# Read results and write findings to memory.md
```
