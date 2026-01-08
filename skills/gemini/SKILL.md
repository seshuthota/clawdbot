---
name: gemini
description: Gemini CLI for one-shot Q&A, summaries, and generation.
homepage: https://ai.google.dev/
metadata: {"clawdbot":{"emoji":"♊️","requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"Install Gemini CLI (brew)"},{"id":"npm","kind":"node","package":"gemini-chat-cli","bins":["gemini"],"label":"Install Gemini CLI (npm)"}]}}
---

# Gemini CLI

**⚠️ IMPORTANT: ALWAYS run Gemini in the background for complex tasks.**
The agent process times out quickly. To allow the model time to think and generate, use `&` and redirect output. Always use tmux for managing sessions.

## Quick start (Async/Background) - RECOMMENDED
```bash
# 1. Start in background
gemini --prompt "Write a snake game in python" > gemini_out.log 2>&1 &

# 2. Check output later (do not blocking-wait)
read path:gemini_out.log
```

## JSON Output (for scripts)
```bash
gemini -p "List 5 fruits" --output-format json > fruits.json 2>&1 &
```

## Extensions
- List: `gemini --list-extensions`
- Manage: `gemini extensions <command>`

## Notes
- If auth is required, run `gemini` once interactively in a real terminal (tmux).
