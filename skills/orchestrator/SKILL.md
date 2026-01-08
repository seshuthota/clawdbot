---
name: orchestrator
description: Orchestrate multiple OpenCode agents in parallel to break down and complete complex coding tasks.
metadata: {"clawdbot":{"emoji":"🎯","requires":{"bins":["opencode"]}}}
---

# Orchestrator Skill

When given a complex multi-part task, break it down and run **OpenCode** agents in **parallel**. 

## ⚠️ CRITICAL RULES

1. **ALWAYS use OpenCode** - not Pi, not Claude Code, not Codex, not Gemini
2. **Use `opencode run` for non-interactive** - Command is `opencode run "prompt"`
3. **Write to files, not stdout** - Tell OpenCode to create/edit actual files
4. **Define interfaces FIRST** - If tasks depend on each other, define the shared API before spawning agents
5. **One task = one directory** - Each agent works in its own tmpdir

## OpenCode CLI Reference

```bash
# Non-interactive (for scripting/automation)
opencode run "Your prompt here"

# With specific model (RECOMMENDED: minimax/MiniMax-M2.1)
opencode run --model minimax/MiniMax-M2.1 "Your prompt"

# Continue existing session
opencode run --continue "Follow-up prompt"

# Attach to running server (faster, avoids cold boot)
opencode serve  # Start server first
opencode run --attach http://localhost:4096 "Your prompt"
```

### ⚠️ Known Working Models

**Recommended (antigravity access via Google):**
- `google/antigravity-claude-sonnet-4-5` - Claude Sonnet 4.5
- `google/antigravity-claude-opus-4-5-thinking-high` - Claude Opus with thinking
- `google/antigravity-gemini-3-pro` - Gemini 3 Pro
- `google/antigravity-gemini-3-flash` - Gemini 3 Flash

**Backup:**
- `minimax/MiniMax-M2.1` - Works reliably
- `google/gemini-3-flash` - Fast, lightweight

**Avoid:**
- `minimax/MiniMax-M1.1` - ProviderModelNotFoundError
- `google/gemini-3-pro-low` - Routes to broken endpoint

**Usage:**
```bash
opencode run --model=google/antigravity-claude-sonnet-4-5 "Create a REST API"
```

## The Pattern

```bash
# 1. Create isolated workdirs
TASK1_DIR=$(mktemp -d)
TASK2_DIR=$(mktemp -d)

# 2. Spawn OpenCode agents in background
bash workdir:$TASK1_DIR background:true command:"opencode run 'Create game.py with Snake game logic. Write the complete file.' > opencode.log 2>&1"
# Returns sessionId: abc123

bash workdir:$TASK2_DIR background:true command:"opencode run 'Create ui.py with Pygame UI for a snake game. Write the complete file.' > opencode.log 2>&1"
# Returns sessionId: def456

# 3. Monitor
process action:poll sessionId:abc123
process action:poll sessionId:def456

# 4. When done, read the actual files
read path:$TASK1_DIR/game.py
read path:$TASK2_DIR/ui.py
```

## Orchestration Workflow

### Step 1: Define Interface FIRST (for dependent tasks)

Before spawning parallel agents that need to work together, define the shared contract:

```python
# Shared Interface (show this to BOTH agents)
class SnakeGame:
    def __init__(self, width=20, height=20): ...
    def move(self, direction: str) -> bool: ...  # Returns False if game over
    def get_state(self) -> dict: ...  # Returns {"snake": [...], "food": (x,y), "score": int}
```

Then tell each agent:
- Agent 1: "Implement the SnakeGame class in game.py following this interface exactly"
- Agent 2: "Create ui.py that imports and uses SnakeGame with this interface"

### Step 2: Show Plan Before Executing

```
📋 Orchestration Plan for: Snake Game

| # | Subtask | Command | Status |
|---|---------|---------|--------|
| 1 | Define interface | (manual) | ✅ |
| 2 | Game logic | opencode run | pending |
| 3 | UI | opencode run | pending |
| 4 | Integration test | manual | pending |

Shared Interface:
[show the interface here]

Proceed? (waiting for user confirmation)
```

### Step 3: Execute with OpenCode

**ALWAYS use this pattern:**
```bash
opencode run "Your task. Write the code to [filename]. Create the actual file."
```

The key is telling OpenCode to **write files** not just print code.

### Step 4: Verify Files Were Created

After agents complete:
```bash
# Check what files exist
bash command:"ls -la $TASK1_DIR"

# Read the actual files
read path:$TASK1_DIR/game.py
```

### Step 5: Handle Failures

If a task fails:
1. Log what went wrong
2. Note the error in progress update
3. **Continue with other tasks**
4. At the end, report failures and offer to retry

## Node.js/TypeScript Best Practices

When orchestrating Node.js projects:

### Pre-configure package.json
```json
{
  "dependencies": {
    "commander": "^14.0.0",
    "picocolors": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```
**Never rely on the agent to install dependencies at runtime — pre-install or specify in package.json.**

### TypeScript Config
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true
  }
}
```
**Avoid `module: ESNext` with `moduleResolution: bundler` — stick to `NodeNext`.**

### ESM Import Rules
When `package.json` has `"type": "module"`:
- Import paths must include file extensions: `import x from './file.js'`
- CommonJS `require()` won't work
- Use `.ts` files with TypeScript compilation to `.js`

### Agent Focus Rule
**STAY ON TASK.** If the agent encounters an unrelated issue (e.g., missing dependency):
- Note it
- Continue with the assigned task
- Report the issue at the end

**DO NOT** try to fix compilation errors, install missing packages, or refactor unrelated code unless explicitly asked.

## Examples

### ✅ Good: Independent Tasks
```
User: Create a REST API with 3 endpoints

Plan:
1. [opencode] Create users.py with /users endpoint
2. [opencode] Create products.py with /products endpoint  
3. [opencode] Create orders.py with /orders endpoint

These are independent, can run in parallel.
```

### ✅ Good: Dependent Tasks with Interface
```
User: Create snake game with UI

Plan:
0. Define shared interface (SnakeGame class)
1. [opencode] Implement SnakeGame in game.py (given interface)
2. [opencode] Create ui.py using SnakeGame (given interface)
3. Verify both files, test integration
```

### ❌ Bad: Parallel without interface
```
User: Create snake game with UI

WRONG:
1. [opencode] Create game logic  <-- No interface defined
2. [opencode] Create UI          <-- Won't know how to call game logic

FIX: Define interface first, then spawn agents.
```

## Quick Reference

```bash
# Spawn OpenCode (ALWAYS use opencode, not pi/claude/codex/gemini)
bash workdir:$DIR background:true command:"opencode run 'task description. Write to filename.py' > opencode.log 2>&1"

# List all running
process action:list

# Check if done
process action:poll sessionId:XXX

# Get opencode output
process action:log sessionId:XXX

# Check actual files created
bash command:"ls -la $DIR"
read path:$DIR/filename.py

# Kill if stuck
process action:kill sessionId:XXX
```

## For Long Tasks: Use tmux

If a task might take more than 2-3 minutes:
```bash
# Create tmux session
bash command:"tmux new-session -d -s task1 'cd $TASK1_DIR && opencode'"

# Send prompt via tmux
bash command:"tmux send-keys -t task1 'Create a complete snake game' Enter"

# Check progress
bash command:"tmux capture-pane -t task1 -p | tail -50"
```

### ⚠️ tmux Pitfalls to Avoid

1. **Shebang escaping:** When sending prompts with `#!/usr/bin/env node`, wrap in double quotes and escape:
   ```bash
   # WRONG - causes "event not found"
   tmux send-keys -t task1 '#!/usr/bin/env node' Enter

   # RIGHT - avoid shebangs in prompts, create file via Write tool
   ```

2. **Special characters:** Avoid `!`, `$`, backticks in tmux send-keys. Use Write tool instead.

3. **Long prompts:** Break into smaller prompts or write to a file first.

4. **Monitor progress:** Check pane output periodically:
   ```bash
   tmux capture-pane -t task1 -p | tail -30
   ```

## Using OpenCode Server (Advanced)

For faster execution without cold boot on each run:
```bash
# Start server once
opencode serve

# Then spawn agents that attach to it
bash workdir:$DIR background:true command:"opencode run --attach http://localhost:4096 'Your task' > opencode.log 2>&1"
```
