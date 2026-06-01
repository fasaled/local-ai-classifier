# File Classifier CLI

A self-contained command-line tool for classifying and tagging text files in macOS using a local LLM model, with no internet connection, and without moving or modifying any files.

---

## Concept

An offline autonomous agent that analyzes the content and metadata of text files in a macOS folder and applies native filesystem tags (Finder tags) based on a set of user-defined labels written in natural language.

The process is non-destructive: it never moves, renames, or modifies file contents. It only writes tags to the filesystem's extended attributes (`xattr`).

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime / bundler | Bun |
| LLM inference | llama.cpp (llama-server) |
| Model | Qwen 2.5-1.5B (GGUF) |
| macOS tagging | `xattr` (native extended attributes) |
| Configuration | YAML |
| Distribution | Self-contained folder with executable + llama-server |

---

## Installation

1. Download the `classifier-dist/` folder or clone the repository
2. Ensure you have a GGUF model file (e.g., Qwen 2.5-1.5B)
3. Start the server with the model path

No additional installation required - the tool is self-contained.

---

## Quick Start

```bash
# 1. Start the server and load model
./classifier start --model /path/to/model.gguf

# 2. Classify files
./classifier classify --folder /path/to/folder --labels labels.yaml

# 3. Stop the server when done
./classifier stop
```

### All-in-one command

```bash
# Starts server, classifies, stops server automatically
./classifier start --model /path/to/model.gguf && \
./classifier classify --folder /path/to/folder --labels labels.yaml && \
./classifier stop
```

---

## Usage

```bash
# Start server (load model once)
./classifier start --model /path/to/model.gguf

# Run multiple classifications (model stays in memory)
./classifier classify --folder /path/to/folder1 --labels labels.yaml
./classifier classify --folder /path/to/folder2 --labels labels.yaml

# Force reprocess all files
./classifier classify --folder /path/to/folder --labels labels.yaml --force

# List tags for files
./classifier list-tags /path/to/folder

# Remove AI tags from files
./classifier remove-tags /path/to/folder

# Stop server (unload model)
./classifier stop
```

### Parameters

| Parameter | Description |
|---|---|
| `start --model <path>` | Start llama-server and load model |
| `classify --folder <path>` | Path to the folder to process |
| `classify --labels <yaml>` | Path to the YAML file with label definitions |
| `classify --force` | Reprocess files already classified |
| `list-tags <path>` | List tags for all files in a folder |
| `remove-tags <path>` | Remove AI tags from all files in a folder |
| `stop` | Stop llama-server and unload model |

---

## Label Definition

Labels are defined in a YAML file using the format `label: natural language description`. The description helps the model understand the concept.

```yaml
# labels.yaml
family: "Family documents including personal letters, birthday cards, family photos descriptions, home videos notes, school documents, medical records, insurance policies"
banking: "Banking and financial documents including account statements, investment portfolios, tax returns, credit card bills, loan applications, ATM receipts"
marketing: "Marketing and sales documents including proposals, brochures, brand guidelines, social media posts, press releases, market analysis"
technology: "Technology documents including software architecture, programming guides, system design, technical documentation, API specifications, security guides"
pets: "Pet-related documents including veterinary records, vaccination certificates, pet care guides, adoption papers, pet insurance, training notes"
```

---

## Processing Flow

### 1. Inventory

On startup, the tool lists all text files in the folder and reads their current macOS tags via `xattr`.

**Skip criterion:** if a file already has the reserved tag `ai-classified`, it is skipped unless the `--force` flag is used.

### 2. Per-file extraction

For each file to be processed:
- Read file content
- Get file metadata (size, dates)

### 3. Context strategy

The model operates with a maximum context of 32k tokens.

```
Does the content fit within 32k tokens?
  ├── Yes → direct classification (1 model call)
  └── No  → chunk classification (multiple calls + majority voting)
```

**Direct classification:** a single prompt with metadata, content, and labels.

**Chunk classification:**
- Content is split into fragments that fit within context
- Each fragment is classified independently
- Final label determined by majority voting

### 4. Classification

The model receives the prompt and responds exclusively with a single label name.

### 5. Tagging

Tags are written to the file's extended attributes via `xattr`:
- The semantic label from classification
- The reserved tag `ai-classified` as a processing marker

Tags are immediately visible in macOS Finder.

---

## Cache System

The tool uses a cache mechanism based on the reserved tag `ai-classified`.

### Decision logic during inventory

```
Does the file have the "ai-classified" tag?
  ├── Yes + no --force  → SKIP (already processed)
  ├── Yes + --force     → REPROCESS
  │     └── Remove semantic labels previously written by this tool
  │         Preserve labels manually added by the user in Finder
  │         Write new semantic labels + "ai-classified"
  └── No                → PROCESS always
```

### --force behavior

With `--force`, the tool distinguishes between its own tags and external tags:
- **Own tags** (from previous classification): removed and rewritten
- **External tags** (manually added): preserved intact

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

[00:01]  OK     adoption-papers.txt       → pets       1.1KB   572ms   qwen2.5-1.5b-instruct-q4_k_m.gguf
[00:02]  OK     vet-records.txt           → pets       1.4KB   875ms   qwen2.5-1.5b-instruct-q4_k_m.gguf
[00:02]  OK     school-notice.txt         → family     820B    684ms   qwen2.5-1.5b-instruct-q4_k_m.gguf
...
──────────────────────────────────────────
Processed:             9 files
  Tagged:              9
  No label:            0  (no matching label)
Skipped:               0  (already classified)
Total time:            6s
──────────────────────────────────────────

Server still running. Run 'classifier stop' to unload when done.
```

### Log columns

| Column | Description |
|--------|-------------|
| Timestamp | Elapsed time since start |
| Status | OK (success), NONE (no label), SKIP (skipped) |
| Filename | File name |
| Label | Classification result |
| Size | File size (B, KB, or MB) |
| Time | Processing time for this file |
| Model | Model filename |

---

## Model Configuration

| Parameter | Value |
|---|---|
| Model | Qwen 2.5-1.5B Instruct (GGUF) |
| Context | 32 768 tokens |
| Temperature | 0 (deterministic) |
| Inference | Local via llama-server, no network |

---

## Building

```bash
# Install dependencies
bun install

# Run directly
bun run src/index.ts --help

# Build standalone executable
bun build --compile --outfile classifier src/index.ts
```

---

## Limitations

- Processes plain text files only (`.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.xml`)
- Does not process PDFs, images, binary files, or Office documents
- Requires macOS (Finder tags are macOS-specific)
- Requires llama-server binary in `bin/` directory or in PATH

---

## Results

See [RESULTS.md](./RESULTS.md) for detailed model comparison results.

**Recommended Model: Qwen 2.5-1.5B**
- Good accuracy (~90%)
- Fast processing (~500ms per file)
- Small model size (1.0GB)
- Excellent balance of performance and speed