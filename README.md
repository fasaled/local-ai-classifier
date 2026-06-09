# File Classifier CLI

A self-contained command-line tool for classifying text files in macOS using a local LLM. Applies tags to the filesystem via `xattr` extended attributes. No internet connection required. Files are never moved, renamed, or modified.

---

## Concept

An offline tool that reads the content of text files in a folder and applies semantic labels as macOS extended attributes. Labels are defined in a YAML file using natural language descriptions.

The process is non-destructive: file contents are read-only. The tool writes only to `xattr`.

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Bun (TypeScript) |
| Bundler | `bun build --compile` (single binary) |
| LLM inference | llama.cpp (`llama-server` HTTP API) |
| Models | Any GGUF instruction-tuned model |
| macOS tagging | `xattr` (extended attributes) |
| Configuration | YAML |
| Distribution | Single standalone executable |

---

## Prerequisites

- **macOS** (ARM64 or Intel)
- **Bun** installed (`brew install bun`)

---

## Installation

```bash
# Install dependencies
bun install

# Build (downloads llama-server + compiles classifier binary)
bun run build
```

The build process:

1. Runs `prebuild` script: downloads pre-built `llama-server` binary from llama.cpp GitHub releases
2. Compiles the TypeScript CLI into a single standalone executable: `classifier`

After building:

```
bin/                          # llama-server + dynamic libraries
classifier                    # standalone CLI binary
```

### Manual llama-server update

```bash
bun run scripts/download-llama.ts
```

To force a clean re-download:

```bash
rm -rf bin/llama-server bin/*.dylib
bun run scripts/download-llama.ts
```

---

## Quick Start

```bash
# Download a model
mkdir -p models
# Qwen 2.5-1.5B: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
# Place qwen2.5-1.5b-instruct-q4_k_m.gguf in models/

# Run classification
./classifier classify \
  --folder /path/to/folder \
  --labels labels.yaml \
  --model models/qwen2.5-1.5b-instruct-q4_k_m.gguf
```

**Example output:**

```
Loading model (this may take a minute)...

Model loaded and ready.
Loading labels...
Loaded 5 labels: family, banking, marketing, technology, pets
Scanning folder...
Found 9 text files

[00:00] OK     adoption-papers.txt          → pets
[00:01] OK     vet-records.txt              → pets
[00:01] OK     school-notice.txt            → family
[00:01] OK     brand-guidelines.txt         → marketing
[00:01] OK     birthday-card.txt            → family
[00:02] OK     medical-record.txt           → family
[00:02] OK     vaccination-cert.txt         → pets
[00:02] OK     social-media-calendar.txt    → marketing
[00:03] OK     holiday-card.txt             → family
──────────────────────────────────────────
Processed:             9 files
  Tagged:              9
  No label:            0  (no matching label)
Skipped:               0  (already classified)
Total time:            8s
──────────────────────────────────────────
llama-server stopped.
```

---

## Usage

```bash
# Classify files (model loads and unloads automatically)
./classifier classify --folder ./docs --labels labels.yaml --model models/qwen2.5-1.5b-instruct-q4_k_m.gguf

# Force reprocess all files
./classifier classify --folder ./docs --labels labels.yaml --model model.gguf --force

# Watch folder and auto-classify new files
./classifier classify --folder ./docs --labels labels.yaml --model model.gguf --watch

# List tags for files
./classifier list-tags ./docs

# Remove AI tags from files
./classifier remove-tags ./docs

# Show help
./classifier help
```

### Parameters

| Parameter | Description |
|---|---|
| `classify --folder <path>` | Path to the folder to process |
| `classify --labels <yaml>` | Path to the YAML file with label definitions |
| `classify --model <path>` | Path to the GGUF model file |
| `classify --force` | Reprocess files already classified |
| `classify --watch` | Keep server running and auto-classify new files (Ctrl+C to stop) |
| `list-tags <path>` | List tags for all files in a folder |
| `remove-tags <path>` | Remove AI tags from all files in a folder |

---

## Label Definition

Labels are defined in a YAML file. Each label is a key-value pair where the value is a natural language description.

```yaml
# labels.yaml
family: "Family documents including personal letters, birthday cards, family photos descriptions, home videos notes, school documents, medical records, insurance policies"
banking: "Banking and financial documents including account statements, investment portfolios, tax returns, credit card bills, loan applications, ATM receipts"
marketing: "Marketing and sales documents including proposals, brochures, brand guidelines, social media posts, press releases, market analysis"
technology: "Technology documents including software architecture, programming guides, system design, technical documentation, API specifications, security guides"
pets: "Pet-related documents including veterinary records, vaccination certificates, pet care guides, adoption papers, pet insurance, training notes"
```

---

## Tag System

The tool writes two extended attributes to each classified file:

| Attribute | Purpose |
|---|---|
| `ai-classified` | Marker: "this file has been processed by the classifier" |
| `ai-classified-labels` | Space-separated list of assigned labels (e.g. `"family"`) |

These are regular `xattr` attributes, not Finder color tags. Inspect with:

```bash
xattr -l file.txt
xattr -p ai-classified-labels file.txt
```

The tool distinguishes its own attributes from any user-added ones — `--force` only rewrites `ai-classified-labels`, leaving other xattrs untouched.

---

## Processing Flow

### 1. Inventory

Scan the folder for text files (extensions: `.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.yml`, `.xml`, `.log`, `.conf`, `.config`, `.ini`, `.toml`, `.properties`). Read current `xattr` state for each.

**Skip criterion:** if a file already has the `ai-classified` marker, it is skipped unless `--force` is used.

### 2. Per-file processing

For each file to be processed:

1. Read content with `Bun.file().text()`
2. Extract metadata: name, size, created, modified
3. Determine classification strategy (see below)
4. Send prompt to llama-server
5. Parse response → extract label name(s)
6. Write `xattr` with the result

### 3. Context strategy

The model context is 32 768 tokens. If the file content fits, classify directly. Otherwise, chunk it.

```
Does the content fit within 32 768 tokens?
  ├── Yes → direct classification (1 model call)
  └── No  → split into chunks, classify each, majority vote
```

For chunked classification, the final label is the one that wins by majority across all chunks.

### 4. Prompt

The model is instructed to return a single label name:

```
Classify this document by selecting ONE label from the list below.

LABELS:
family: Family documents including ...
banking: Banking and financial documents including ...
...

DOCUMENT:
<file content>

Your response must be ONLY the name of the best matching label.
```

The response is parsed (text or JSON) and the matched label is applied.

### 5. Output

Tags written via `xattr`:

```bash
xattr -w ai-classified 1 file.txt
xattr -w ai-classified-labels "family" file.txt
```

---

## Watch Mode

`--watch` keeps the server running and classifies new or modified text files as they appear in the folder.

```bash
./classifier classify --folder ./inbox --labels labels.yaml --model model.gguf --watch
```

Behavior:

- Model is loaded once and stays in memory
- New text files in the folder are classified automatically
- Files with the `ai-classified` marker are skipped (use `--force` to reprocess)
- Debounce: 750ms to avoid duplicate classifications on partial writes
- **Non-recursive** — does not watch subdirectories
- Stop with `Ctrl+C` (SIGINT) — server unloads cleanly

Use cases:

- Drop files into a watched folder for hands-off tagging
- CI integration: process files as they land in a staging area
- Workflow automation: chain with any tool that produces text files

---

## Cache System

The `ai-classified` marker is the cache key.

### Decision logic

```
Does the file have the "ai-classified" xattr?
  ├── Yes + no --force  → SKIP (already processed)
  ├── Yes + --force     → REPROCESS
  │     └── Delete "ai-classified-labels" xattr
  │         Preserve any other xattrs
  │         Write new "ai-classified-labels" + "ai-classified"
  └── No                → PROCESS always
```

### --force behavior

- Deletes only the `ai-classified-labels` xattr
- Preserves all other xattrs (user-added)
- Re-runs classification

---

## Output Log

### Real-time output

```
Loading model (this may take a minute)...

Model loaded and ready.
Loading labels...
Loaded 5 labels: family, banking, marketing, technology, pets
Scanning folder...
Found 9 text files

[00:00] OK     adoption-papers.txt          → pets
[00:00] OK     vet-records.txt              → pets
[00:01] OK     school-notice.txt            → family
──────────────────────────────────────────
Processed:             9 files
  Tagged:              9
  No label:            0  (no matching label)
Skipped:               0  (already classified)
Total time:            8s
──────────────────────────────────────────
llama-server stopped.
```

For chunked files, the log shows extra info:

```
[00:30] OK     microservices-architecture.txt → technology  (chunks: 3, calls: 3)
```

### Status values

| Status | Meaning |
|--------|---------|
| `OK` | Classified, label written |
| `NONE` | Model could not match any label |
| `SKIP` | Already classified, or unreadable file |

### Summary

```
──────────────────────────────────────────
Processed:             N files
  Tagged:              N
  No label:            N  (no matching label)
Skipped:               N  (already classified)
Total time:            Ns
──────────────────────────────────────────
```

---

## Inference Server (llama-server)

The classifier uses [llama-server](https://github.com/ggerganov/llama.cpp) as a child process.

### Startup

```bash
llama-server -m model.gguf -c 32768 --port 8080 --log-disable --parallel 1
```

| Flag | Value | Purpose |
|------|-------|---------|
| `-m` | `<model>` | Path to GGUF model |
| `-c` | `32768` | Context window (tokens) |
| `--port` | `8080` | HTTP port |
| `--log-disable` | — | Suppress llama.cpp verbose logs |
| `--parallel` | `1` | Single concurrent request |

### API used

```
POST http://localhost:8080/v1/chat/completions
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "<prompt>" }],
  "temperature": 0,
  "stream": false
}
```

### Lifecycle

1. **Spawn** — `bun.spawn(["llama-server", ...])` with `stdio: ["ignore", "pipe", "pipe"]`
2. **Health check** — `GET /health` polled every 200ms until 200 OK (max 30s)
3. **Classify** — POST per file to `/v1/chat/completions`
4. **Stop** — SIGTERM sent, wait up to 5s, then SIGKILL

### Requirements

- `bin/llama-server` must exist (downloaded by `prebuild`)
- The model file must be a valid GGUF (Q4_K_M recommended for size/quality balance)
- Port 8080 must be free

---

## Model Configuration

| Parameter | Value |
|---|---|
| Recommended model | Qwen 2.5-1.5B Instruct (GGUF, Q4_K_M, 1.0GB) |
| Context | 32 768 tokens |
| Temperature | 0 (deterministic) |
| Max response tokens | 16 (label name only) |
| Network | None — fully local |

---

## Building

```bash
# Install dependencies
bun install

# Build (downloads llama-server + compiles classifier)
bun run build
```

`bun run build` does:

1. `prebuild` → runs `scripts/download-llama.ts` to fetch llama.cpp prebuilt binary
2. `build` → `bun build --compile --target bun --outfile classifier src/index.ts`

The result is a single `classifier` binary (~60MB) that bundles the Bun runtime + all TypeScript.

To run from source without compiling:

```bash
bun run src/index.ts <command>
```

---

## Limitations

- **Plain text only** — `.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.yml`, `.xml`, `.log`, `.conf`, `.config`, `.ini`, `.toml`, `.properties`. No PDFs, images, binaries, Office docs.
- **Non-recursive watch** — `--watch` only monitors the top-level folder, not subdirectories.
- **macOS only** — `xattr` is macOS-specific. Linux uses a different xattr API.
- **No parallel classification** — llama-server is configured with `--parallel 1`. Sequential is simpler and avoids OOM.
- **No Finder color tags** — uses raw xattr, not Finder's green/orange/red labels.
- **No model auto-download** — you must provide your own GGUF file.

---

## Results

See [RESULTS.md](./RESULTS.md) for detailed model comparison results.

**Recommended Model: Qwen 2.5-1.5B**
- ~89% accuracy on 18-file test set
- ~500ms per small file
- 1.0GB model size
- Best balance of accuracy, speed, and footprint
