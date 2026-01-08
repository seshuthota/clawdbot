---
name: reading-queue
description: Personal reading queue for articles, papers, and videos with AI-powered summarization.
homepage: https://github.com/clawdbot/clawdbot
metadata: {"clawdbot":{"emoji":"📚","requires":{"bins":["node"]}}}
---

# Reading Queue

Save articles, papers, and videos for later reading. Get AI summaries on demand.

## Save a URL

```bash
# Save with optional tags
node {baseDir}/scripts/rq.mjs add "https://arxiv.org/abs/2401.12345" ai research

# Tags can be prefixed with #
node {baseDir}/scripts/rq.mjs add "https://twitter.com/user/status/123" "#ml" "#thread"
```

## List queue

```bash
# All unread
node {baseDir}/scripts/rq.mjs list

# Filter by tag
node {baseDir}/scripts/rq.mjs list --tag ai

# Show all including read
node {baseDir}/scripts/rq.mjs list --all

# Limit results
node {baseDir}/scripts/rq.mjs list --limit 5
```

## Summarize an item

```bash
# By ID
node {baseDir}/scripts/rq.mjs summarize rq_1704567890

# Latest unread
node {baseDir}/scripts/rq.mjs summarize --latest
```

## Mark as read / Archive

```bash
node {baseDir}/scripts/rq.mjs read rq_1704567890
node {baseDir}/scripts/rq.mjs archive rq_1704567890
```

## Search

```bash
node {baseDir}/scripts/rq.mjs search "transformer attention"
```

## Stats

```bash
node {baseDir}/scripts/rq.mjs stats
```

## Notes

- Storage: `~/.clawdbot/reading-queue/queue.json`
- Summarization uses your configured AI model (MiniMax/Anthropic/etc)
- Supports: ArXiv, Twitter/X, YouTube, Reddit, and general articles
