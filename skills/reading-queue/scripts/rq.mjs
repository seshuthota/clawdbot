#!/usr/bin/env node

/**
 * Reading Queue CLI (rq)
 * Personal reading queue for articles, papers, and videos with AI summarization.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Storage paths
const STORAGE_DIR = join(homedir(), ".clawdbot", "reading-queue");
const QUEUE_FILE = join(STORAGE_DIR, "queue.json");

// ============================================================================
// Storage
// ============================================================================

async function ensureStorage() {
    if (!existsSync(STORAGE_DIR)) {
        await mkdir(STORAGE_DIR, { recursive: true });
    }
    if (!existsSync(QUEUE_FILE)) {
        await writeFile(QUEUE_FILE, JSON.stringify({ items: [] }, null, 2));
    }
}

async function loadQueue() {
    await ensureStorage();
    const data = await readFile(QUEUE_FILE, "utf-8");
    return JSON.parse(data);
}

async function saveQueue(queue) {
    await ensureStorage();
    await writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// ============================================================================
// URL Detection & Extraction
// ============================================================================

function detectSource(url) {
    const u = url.toLowerCase();
    if (u.includes("arxiv.org")) return "arxiv";
    if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    if (u.includes("reddit.com")) return "reddit";
    if (u.includes("github.com")) return "github";
    return "article";
}

/**
 * Auto-generate tags based on URL and title
 */
function autoGenerateTags(url, title) {
    const text = `${url} ${title}`.toLowerCase();
    const tags = new Set();

    // Topic detection keywords
    const topicKeywords = {
        ai: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "neural", "llm", "gpt", "transformer", "diffusion", "generative"],
        ml: ["machine learning", "training", "model", "dataset", "classification", "regression"],
        crypto: ["crypto", "bitcoin", "ethereum", "blockchain", "defi", "web3", "nft", "token"],
        rust: ["rust", "rustlang", "cargo"],
        python: ["python", "pytorch", "tensorflow", "numpy", "pandas"],
        javascript: ["javascript", "typescript", "nodejs", "react", "vue", "nextjs"],
        security: ["security", "vulnerability", "exploit", "hack", "cve", "zero-day"],
        research: ["arxiv", "paper", "research", "study", "findings"],
        tutorial: ["tutorial", "guide", "how to", "getting started", "introduction"],
        news: ["news", "announced", "launches", "released", "update"],
        startup: ["startup", "funding", "raised", "yc", "vc", "series"],
        productivity: ["productivity", "workflow", "automation", "efficiency"],
        design: ["design", "ui", "ux", "figma", "css"],
        devops: ["devops", "kubernetes", "docker", "aws", "cloud", "deployment"],
    };

    for (const [tag, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.add(tag);
        }
    }

    // Add source as tag
    const source = detectSource(url);
    if (source !== "article") {
        tags.add(source);
    }

    return Array.from(tags).slice(0, 5); // Max 5 auto-tags
}

async function extractContent(url) {
    const source = detectSource(url);

    try {
        // ArXiv: extract abstract from API
        if (source === "arxiv") {
            return await extractArxiv(url);
        }

        // YouTube: extract metadata from oembed
        if (source === "youtube") {
            return await extractYouTube(url);
        }

        // General: fetch and parse HTML
        return await extractGeneral(url);
    } catch (err) {
        return {
            title: url,
            content: `Failed to extract: ${err.message}`,
            metadata: {}
        };
    }
}

async function extractArxiv(url) {
    // Extract arxiv ID
    const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    if (!match) {
        return extractGeneral(url);
    }

    const arxivId = match[1];
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;

    const resp = await fetch(apiUrl);
    const xml = await resp.text();

    // Simple XML parsing for arxiv response
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const summaryMatch = xml.match(/<summary>([^<]+)<\/summary>/s);
    const authorsMatch = [...xml.matchAll(/<name>([^<]+)<\/name>/g)];

    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : `ArXiv ${arxivId}`;
    const abstract = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";
    const authors = authorsMatch.map(m => m[1].trim()).slice(0, 5);

    return {
        title,
        content: `## Abstract\n\n${abstract}\n\n## Authors\n${authors.join(", ")}`,
        metadata: {
            arxivId,
            authors,
            pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        }
    };
}

async function extractYouTube(url) {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    try {
        const resp = await fetch(oembedUrl);
        const data = await resp.json();

        return {
            title: data.title || "YouTube Video",
            content: `Video by ${data.author_name || "Unknown"}\n\n[Watch on YouTube](${url})`,
            metadata: {
                author: data.author_name,
                authorUrl: data.author_url,
            }
        };
    } catch {
        return {
            title: "YouTube Video",
            content: `[Watch on YouTube](${url})`,
            metadata: {}
        };
    }
}

async function extractGeneral(url) {
    const resp = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ReadingQueue/1.0)",
            "Accept": "text/html"
        }
    });

    const html = await resp.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const title = (ogTitleMatch?.[1] || titleMatch?.[1] || url).trim();

    // Extract description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = ogDescMatch?.[1] || descMatch?.[1] || "";

    // Simple content extraction
    const cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

    // Take first ~2000 chars of content
    const content = description
        ? `## Summary\n\n${description}\n\n## Content Preview\n\n${cleaned.slice(0, 1500)}...`
        : cleaned.slice(0, 2000);

    return { title, content, metadata: {} };
}

// ============================================================================
// Commands
// ============================================================================

async function cmdAdd(url, userTags) {
    const queue = await loadQueue();

    // Check for duplicate
    if (queue.items.some(item => item.url === url)) {
        console.log(`⚠️  URL already in queue: ${url}`);
        return;
    }

    console.log(`📥 Fetching: ${url}...`);
    const extracted = await extractContent(url);

    // Auto-generate tags and merge with user-provided tags
    const autoTags = autoGenerateTags(url, extracted.title);
    const cleanUserTags = userTags.map(t => t.replace(/^#/, "").toLowerCase());
    const allTags = [...new Set([...autoTags, ...cleanUserTags])];

    const id = `rq_${Date.now()}`;
    const item = {
        id,
        url,
        title: extracted.title,
        source: detectSource(url),
        tags: allTags,
        savedAt: new Date().toISOString(),
        status: "unread",
        summary: null,
        content: extracted.content,
        metadata: extracted.metadata,
    };

    queue.items.unshift(item);
    await saveQueue(queue);

    console.log(`✅ Saved to reading queue!`);
    console.log(`📄 "${item.title}"`);
    console.log(`🏷️  Tags: ${item.tags.length > 0 ? item.tags.join(", ") : "(none)"}`);
    if (autoTags.length > 0) {
        console.log(`   (auto-detected: ${autoTags.join(", ")})`);
    }
    console.log(`📚 Source: ${item.source}`);
    console.log(`🆔 ID: ${id}`);
}

async function cmdList(options) {
    const queue = await loadQueue();
    let items = queue.items;

    // Filter by status
    if (!options.all) {
        items = items.filter(i => i.status === "unread");
    }

    // Filter by tag
    if (options.tag) {
        const tag = options.tag.replace(/^#/, "").toLowerCase();
        items = items.filter(i => i.tags.some(t => t.toLowerCase() === tag));
    }

    // Filter by source
    if (options.source) {
        items = items.filter(i => i.source === options.source);
    }

    // Limit
    const limit = options.limit || 10;
    items = items.slice(0, limit);

    if (items.length === 0) {
        console.log("📚 Reading queue is empty!");
        return;
    }

    const total = queue.items.filter(i => i.status === "unread").length;
    console.log(`📚 Reading Queue (${total} unread)\n`);

    items.forEach((item, idx) => {
        const tags = item.tags.length > 0 ? `[${item.tags.join(", ")}] ` : "";
        const status = item.status === "read" ? "✓ " : "";
        const summary = item.summary ? " 📝" : "";
        console.log(`${idx + 1}. ${status}${tags}${item.title}${summary}`);
        console.log(`   ${item.source} | ${item.id}`);
        console.log(`   ${item.url.slice(0, 60)}${item.url.length > 60 ? "..." : ""}\n`);
    });
}

async function cmdSummarize(idOrOption) {
    const queue = await loadQueue();

    let item;
    if (idOrOption === "--latest") {
        item = queue.items.find(i => i.status === "unread");
    } else {
        item = queue.items.find(i => i.id === idOrOption);
    }

    if (!item) {
        console.log(`❌ Item not found: ${idOrOption}`);
        return;
    }

    // Check if already summarized
    if (item.summary) {
        console.log(`📝 Summary of "${item.title}":\n`);
        console.log(item.summary);
        return;
    }

    console.log(`🤖 Generating summary for "${item.title}"...`);
    console.log(`📄 Content length: ${item.content.length} chars\n`);

    // For now, output the content - user can ask the agent to summarize
    // In future, could call MiniMax API directly here
    console.log("--- Content for summarization ---\n");
    console.log(item.content.slice(0, 3000));
    console.log("\n--- End content ---");
    console.log("\n💡 Ask me to summarize this content, then use 'rq save-summary <id> \"<summary>\"' to save it.");
}

async function cmdSaveSummary(id, summary) {
    const queue = await loadQueue();
    const item = queue.items.find(i => i.id === id);

    if (!item) {
        console.log(`❌ Item not found: ${id}`);
        return;
    }

    item.summary = summary;
    await saveQueue(queue);

    console.log(`✅ Summary saved for "${item.title}"`);
}

async function cmdRead(id) {
    const queue = await loadQueue();
    const item = queue.items.find(i => i.id === id);

    if (!item) {
        console.log(`❌ Item not found: ${id}`);
        return;
    }

    item.status = "read";
    await saveQueue(queue);

    console.log(`✅ Marked as read: "${item.title}"`);
}

async function cmdArchive(id) {
    const queue = await loadQueue();
    const item = queue.items.find(i => i.id === id);

    if (!item) {
        console.log(`❌ Item not found: ${id}`);
        return;
    }

    item.status = "archived";
    await saveQueue(queue);

    console.log(`📦 Archived: "${item.title}"`);
}

async function cmdDelete(id) {
    const queue = await loadQueue();
    const idx = queue.items.findIndex(i => i.id === id);

    if (idx === -1) {
        console.log(`❌ Item not found: ${id}`);
        return;
    }

    const item = queue.items.splice(idx, 1)[0];
    await saveQueue(queue);

    console.log(`🗑️  Deleted: "${item.title}"`);
}

async function cmdSearch(query) {
    const queue = await loadQueue();
    const q = query.toLowerCase();

    const results = queue.items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
    );

    if (results.length === 0) {
        console.log(`🔍 No results for: "${query}"`);
        return;
    }

    console.log(`🔍 Found ${results.length} results for "${query}":\n`);
    results.slice(0, 10).forEach((item, idx) => {
        const tags = item.tags.length > 0 ? `[${item.tags.join(", ")}] ` : "";
        console.log(`${idx + 1}. ${tags}${item.title}`);
        console.log(`   ${item.source} | ${item.id}\n`);
    });
}

async function cmdStats() {
    const queue = await loadQueue();

    const total = queue.items.length;
    const unread = queue.items.filter(i => i.status === "unread").length;
    const read = queue.items.filter(i => i.status === "read").length;
    const archived = queue.items.filter(i => i.status === "archived").length;
    const summarized = queue.items.filter(i => i.summary).length;

    // Source breakdown
    const sources = {};
    queue.items.forEach(item => {
        sources[item.source] = (sources[item.source] || 0) + 1;
    });

    // Tag breakdown
    const tags = {};
    queue.items.forEach(item => {
        item.tags.forEach(tag => {
            tags[tag] = (tags[tag] || 0) + 1;
        });
    });

    console.log("📊 Reading Queue Stats\n");
    console.log(`Total items: ${total}`);
    console.log(`📖 Unread: ${unread}`);
    console.log(`✅ Read: ${read}`);
    console.log(`📦 Archived: ${archived}`);
    console.log(`📝 Summarized: ${summarized}\n`);

    console.log("📚 By Source:");
    Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
    });

    if (Object.keys(tags).length > 0) {
        console.log("\n🏷️  Top Tags:");
        Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([tag, count]) => {
            console.log(`  #${tag}: ${count}`);
        });
    }
}

async function cmdShow(id) {
    const queue = await loadQueue();
    const item = queue.items.find(i => i.id === id);

    if (!item) {
        console.log(`❌ Item not found: ${id}`);
        return;
    }

    console.log(`📄 ${item.title}`);
    console.log(`🔗 ${item.url}`);
    console.log(`📚 Source: ${item.source}`);
    console.log(`🏷️  Tags: ${item.tags.join(", ") || "(none)"}`);
    console.log(`📅 Saved: ${item.savedAt}`);
    console.log(`📋 Status: ${item.status}`);

    if (item.metadata.authors) {
        console.log(`👤 Authors: ${item.metadata.authors.join(", ")}`);
    }
    if (item.metadata.pdfUrl) {
        console.log(`📎 PDF: ${item.metadata.pdfUrl}`);
    }

    console.log("\n--- Content ---\n");
    console.log(item.content);

    if (item.summary) {
        console.log("\n--- Summary ---\n");
        console.log(item.summary);
    }
}

// ============================================================================
// Main
// ============================================================================

function usage() {
    console.log(`
📚 Reading Queue (rq) - Personal reading queue with AI summarization

Usage: rq <command> [options]

Commands:
  add <url> [tags...]       Save a URL to queue
  list [options]            List queue items
  show <id>                 Show full item details
  summarize <id|--latest>   Get content for summarization
  save-summary <id> <text>  Save a summary for an item
  read <id>                 Mark as read
  archive <id>              Archive an item
  delete <id>               Delete an item
  search <query>            Search queue
  stats                     Show statistics

List options:
  --tag <tag>               Filter by tag
  --source <source>         Filter by source (arxiv, twitter, etc)
  --all                     Include read items
  --limit <n>               Limit results (default: 10)

Examples:
  rq add "https://arxiv.org/abs/2401.12345" ai research
  rq list --tag ai
  rq summarize --latest
  rq read rq_1234567890
`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
        usage();
        return;
    }

    const cmd = args[0];

    switch (cmd) {
        case "add": {
            const url = args[1];
            if (!url) {
                console.log("❌ Usage: rq add <url> [tags...]");
                return;
            }
            const tags = args.slice(2);
            await cmdAdd(url, tags);
            break;
        }

        case "list": {
            const options = {};
            for (let i = 1; i < args.length; i++) {
                if (args[i] === "--tag" && args[i + 1]) {
                    options.tag = args[++i];
                } else if (args[i] === "--source" && args[i + 1]) {
                    options.source = args[++i];
                } else if (args[i] === "--limit" && args[i + 1]) {
                    options.limit = parseInt(args[++i], 10);
                } else if (args[i] === "--all") {
                    options.all = true;
                }
            }
            await cmdList(options);
            break;
        }

        case "show": {
            const id = args[1];
            if (!id) {
                console.log("❌ Usage: rq show <id>");
                return;
            }
            await cmdShow(id);
            break;
        }

        case "summarize": {
            const idOrOption = args[1] || "--latest";
            await cmdSummarize(idOrOption);
            break;
        }

        case "save-summary": {
            const id = args[1];
            const summary = args.slice(2).join(" ");
            if (!id || !summary) {
                console.log("❌ Usage: rq save-summary <id> <summary text>");
                return;
            }
            await cmdSaveSummary(id, summary);
            break;
        }

        case "read": {
            const id = args[1];
            if (!id) {
                console.log("❌ Usage: rq read <id>");
                return;
            }
            await cmdRead(id);
            break;
        }

        case "archive": {
            const id = args[1];
            if (!id) {
                console.log("❌ Usage: rq archive <id>");
                return;
            }
            await cmdArchive(id);
            break;
        }

        case "delete": {
            const id = args[1];
            if (!id) {
                console.log("❌ Usage: rq delete <id>");
                return;
            }
            await cmdDelete(id);
            break;
        }

        case "search": {
            const query = args.slice(1).join(" ");
            if (!query) {
                console.log("❌ Usage: rq search <query>");
                return;
            }
            await cmdSearch(query);
            break;
        }

        case "stats": {
            await cmdStats();
            break;
        }

        default:
            console.log(`❌ Unknown command: ${cmd}`);
            usage();
    }
}

main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
