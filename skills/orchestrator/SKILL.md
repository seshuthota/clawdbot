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
6. **Inject sub-agent rules** - Sub-agents don't see this file; include behavior rules in their prompt

---

## Sub-Agent Response Laws

When spawning sub-agents, they MUST follow these rules (inject into their prompt):

### Priority Order
1. **Completeness**: Response must contain all critical details. The orchestrator cannot see internal work.
2. **Efficiency**: Be compact *without violating Rule 1*.
3. **Priority**: When in doubt, **more detail > fewer tokens**.

### Required in Every Response
- Files created/modified (with paths)
- Verification status (tests passed? type-check clean?)
- Any issues, warnings, or edge cases discovered
- Clear success/failure status

---

## Sub-Agent Prompt Template

**Always include this at the end of every sub-agent prompt:**

```
RULES:
- Write output to actual files, not stdout
- Self-verify before returning: run type-check/tests/syntax check
- Report back: (1) files created/modified, (2) verification status, (3) any issues
- Be COMPLETE—orchestrator cannot see your process, only your final report
- If you encounter unrelated issues, NOTE them but stay focused on your task
```

### Example Full Prompt
```bash
opencode run "Create game.py implementing a Snake game class with move(), get_state(), and reset() methods.

Requirements:
- Grid size 20x20
- Snake starts at center
- Food spawns randomly

RULES:
- Write output to actual files, not stdout
- Self-verify before returning: run python -c 'import game; print(\"OK\")'
- Report back: (1) files created/modified, (2) verification status, (3) any issues
- Be COMPLETE—orchestrator cannot see your process, only your final report
"
```

---

## Structured Response Format

Sub-agents should return responses in this format (enforce via prompt):

```
STATUS: SUCCESS | PARTIAL | FAILED

FILES:
- game.py (created, 85 lines)
- test_game.py (created, 42 lines)

VERIFICATION:
- ✅ python -c 'import game' passed
- ✅ pytest test_game.py: 5/5 passed

ISSUES:
- None

SUMMARY:
Created Snake game implementation with full test coverage.
```

---

## OpenCode CLI Reference

```bash
# Non-interactive (for scripting/automation)
opencode run "Your prompt here"

# With specific model
opencode run --model google/antigravity-claude-sonnet-4-5 "Your prompt"

# Continue existing session
opencode run --continue "Follow-up prompt"

# Attach to running server (faster)
opencode serve  # Start server first
opencode run --attach http://localhost:4096 "Your prompt"
```

### Known Working Models

**Recommended:**
- `google/antigravity-claude-sonnet-4-5` - Claude Sonnet 4.5
- `google/antigravity-gemini-3-pro` - Gemini 3 Pro
- `minimax/MiniMax-M2.1` - Reliable backup

**Avoid:**
- `minimax/MiniMax-M1.1` - ProviderModelNotFoundError

---

## The Pattern

```bash
# 1. Create isolated workdirs
TASK1_DIR=$(mktemp -d)
TASK2_DIR=$(mktemp -d)

# 2. Spawn OpenCode agents in background
bash workdir:$TASK1_DIR background:true command:"opencode run 'Create game.py... [RULES]' > opencode.log 2>&1"
bash workdir:$TASK2_DIR background:true command:"opencode run 'Create ui.py... [RULES]' > opencode.log 2>&1"

# 3. Monitor
process action:poll sessionId:abc123

# 4. When done, read results
read path:$TASK1_DIR/game.py
```

---

## Orchestration Workflow

### Step 1: Define Interface FIRST (for dependent tasks)

```python
# Shared Interface (show to BOTH agents)
class SnakeGame:
    def __init__(self, width=20, height=20): ...
    def move(self, direction: str) -> bool: ...  # Returns False if game over
    def get_state(self) -> dict: ...  # Returns {"snake": [...], "food": (x,y), "score": int}
```

### Step 2: Show Plan Before Executing

```
📋 Orchestration Plan for: Snake Game

| # | Subtask | Agent | Status |
|---|---------|-------|--------|
| 1 | Define interface | (manual) | ✅ |
| 2 | Game logic | opencode | pending |
| 3 | UI | opencode | pending |
| 4 | Integration test | manual | pending |

Shared Interface: [show above]

Proceed? (waiting for confirmation)
```

### Step 3: Execute with Injected Rules

Always append the Sub-Agent Prompt Template to every spawn.

### Step 4: Verify Results

```bash
# Check files exist
bash command:"ls -la $TASK1_DIR"

# Read and validate
read path:$TASK1_DIR/game.py
```

### Step 5: Handle Failures

If status is FAILED or PARTIAL:
1. Read the ISSUES section
2. Decide: retry with more context, or escalate to user
3. Continue other independent tasks

---

## Test Use Cases

Use these to verify the orchestrator skill is working correctly:

### 🧪 Test 1: Simple Independent Tasks (Parallel)

**Prompt to give your assistant:**
```
Create a Python utility library with three independent modules:
1. string_utils.py - functions for string manipulation (reverse, capitalize_words, count_vowels)
2. math_utils.py - functions for math operations (factorial, is_prime, fibonacci)
3. file_utils.py - functions for file operations (read_json, write_json, file_exists)

Each should include docstrings and basic error handling.
```

**Expected Behavior:**
- Assistant creates 3 parallel OpenCode agents
- Each agent works in isolated tmpdir
- Results come back with STATUS, FILES, VERIFICATION sections
- All 3 modules are created and verified independently

---

### 🧪 Test 2: Dependent Tasks with Interface

**Prompt:**
```
Create a simple task manager with:
1. A TaskManager class (task_manager.py) that stores tasks with add, complete, list methods
2. A CLI interface (cli.py) that uses TaskManager to provide command-line access

The CLI should work with commands like: add "Buy milk", list, complete 1
```

**Expected Behavior:**
- Assistant FIRST defines the TaskManager interface
- Then spawns 2 agents with the shared interface
- Both agents produce compatible code
- Integration works because interface was defined upfront

---

### 🧪 Test 3: Error Recovery

**Prompt:**
```
Create a web scraper that:
1. Fetches a webpage (using requests)
2. Parses specific elements (using beautifulsoup4)

Note: The agents should NOT try to pip install anything—just write the code assuming deps exist.
```

**Expected Behavior:**
- Agent completes code without trying to install packages
- If verification fails due to missing import, ISSUES section notes it
- Agent stays focused on writing code, not fixing environment
- Orchestrator can see the issue and decide next steps

---

### 🧪 Test 4: Self-Verification

**Prompt:**
```
Create a calculator module (calc.py) with add, subtract, multiply, divide functions.
The divide function should handle division by zero gracefully.
```

**Expected Behavior:**
- Sub-agent writes calc.py
- Sub-agent runs `python -c 'import calc; print(calc.divide(10, 0))'` to verify
- Response includes VERIFICATION section showing the check passed
- No unhandled exceptions

---

## Quick Reference

```bash
# Spawn with rules
bash workdir:$DIR background:true command:"opencode run 'Task... [RULES]' > opencode.log 2>&1"

# Monitor
process action:poll sessionId:XXX

# Read results  
read path:$DIR/filename.py

# Kill if stuck
process action:kill sessionId:XXX
```

---

## For Long Tasks: Use tmux

```bash
# Create session
bash command:"tmux new-session -d -s task1 'cd $TASK1_DIR && opencode'"

# Send prompt
bash command:"tmux send-keys -t task1 'Your prompt here' Enter"

# Check progress
bash command:"tmux capture-pane -t task1 -p | tail -50"
```

### tmux Pitfalls
- Avoid `!`, `$`, backticks in send-keys
- Use Write tool for complex prompts
- Monitor with `capture-pane` periodically
