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
| Model | Liquid LFM 2.5 (GGUF) |
| macOS tagging | `xattr` (native extended attributes) |
| Configuration | YAML |
| Distribution | Self-contained folder with executable + llama-server |

---

## Installation

1. Download the `classifier-dist/` folder
2. Ensure you have a GGUF model file (e.g., Liquid LFM 2.5)

No additional installation required - the tool is self-contained.

---

## Quick Start

```bash
# All-in-one: starts server, classifies, stops server
./classifier --folder /path/to/folder --labels labels.yaml --model /path/to/model.gguf
```

---

## Server Management (Recommended for Multiple Runs)

The model stays in memory while the server is running. The model path is remembered after first start.

```bash
# 1. Start server (load model once)
./classifier --server-start --model /path/to/model.gguf

# 2. Run multiple classifications (no need to specify model again)
./classifier --folder /path/to/folder1 --labels labels.yaml
./classifier --folder /path/to/folder2 --labels labels.yaml
./classifier --folder /path/to/folder3 --labels labels.yaml

# 3. Stop server (unload model, free memory)
./classifier --server-stop
```

---

## Usage

```bash
# Start server (first time only)
./classifier --server-start --model /path/to/model.gguf

# Classify (model path remembered)
./classifier --folder /path/to/folder --labels labels.yaml
./classifier --folder /path/to/folder --labels labels.yaml --force

# List tags for files
./classifier --list-tags /path/to/folder

# Remove AI tags from files
./classifier --remove-tags /path/to/folder

# Stop server
./classifier --server-stop
```

### Parameters

| Parameter | Description |
|---|---|
| `--folder <path>` | Path to the folder to process |
| `--labels <yaml>` | Path to the YAML file with label definitions |
| `--model <gguf>` | Path to the GGUF model file (only needed for --server-start) |
| `--force` | Reprocess files already classified by this tool |
| `--server-start` | Start llama-server and load model |
| `--server-stop` | Stop llama-server and unload model |
| `--list-tags <path>` | List tags for all files in a folder |
| `--remove-tags <path>` | Remove AI tags from all files in a folder |

---

## Label Definition

Labels are defined in a YAML file using the format `label: natural language description`. The description is what the model uses to understand the concept.

```yaml
# labels.yaml
invoice: "Billing, payment, or service charge documents"
legal: "Contracts, agreements, terms, or legal documents"
personal: "Personal notes, journals, or private writing"
project: "Technical documentation, specifications, or project plans"
reference: "Reference material, guides, manuals, or lookup documentation"
```

---

## Processing Flow

### 1. Inventory

On startup, the tool lists all text files in the folder and reads their current macOS tags via `xattr`.

**Skip criterion:** if a file already has the reserved tag `ai-classified`, it is skipped unless the `--force` flag is used.

### 2. Per-file extraction

For each file to be processed, two types of information are extracted:

**System metadata:**
- Filename and extension
- Size in bytes
- Creation and last modified dates
- Existing macOS tags (if any)

**Text content:**
- Direct file read
- Tokenization to determine the context strategy

### 3. Context strategy

The model operates with a maximum context of 32k tokens.

```
Does the content fit within 32k tokens?
  ├── Yes → direct classification (1 model call)
  └── No  → chunk classification + refinement (N+1 model calls)
```

**Direct classification:** a single prompt is built with the metadata, full content, and the list of available labels.

**Chunk classification:**
- Content is split into fragments that fit within the context window
- Each fragment is classified independently → candidate labels
- A final refinement call receives the candidate summary from all fragments and produces the consolidated classification

### 4. Classification

The model receives the prompt and responds exclusively in JSON:

```json
{
  "labels": ["invoice", "legal"],
  "confidence": [0.92, 0.71]
}
```

**Application rules:**
- Only labels with confidence above 50% are applied
- Multiple labels can be applied to the same file
- If no label exceeds the threshold, the file is left untagged

### 5. Tagging

Tags are written to the file's extended attributes via `xattr`:

- The semantic labels resulting from the classification
- The reserved tag `ai-classified` as a processing marker

Tags are immediately visible in the macOS Finder.

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

- **Own tags** (generated in the previous classification run): removed and rewritten
- **External tags** (manually added by the user in Finder or other apps): preserved intact

To make this distinction, the tool stores a record of which semantic labels it wrote in an additional extended attribute on the file (`ai-classified-labels`).

---

## Output Log

### Real-time output (stdout)

```
[00:01] SKIP   contract_2024.txt          → already classified
[00:03] OK     meeting_notes.md           → project, reference
[00:07] OK     invoice_march.txt          → invoice  (chunks: 4, calls: 5)
[00:09] NONE   introduction.txt           → no label (insufficient confidence)
[00:10] SKIP   proposal_draft.md          → already classified
```

| Prefix | Meaning |
|---|---|
| `OK` | Classified and tagged successfully |
| `NONE` | Processed but no label assigned (confidence < 50%) |
| `SKIP` | Skipped because the `ai-classified` marker is present |

### Final summary

```
──────────────────────────────────────────
Processed:             8 files
  Tagged:              6
  No label:            2  (insufficient confidence)
Skipped:               4  (already classified)
Total time:            3m 47s
──────────────────────────────────────────
```

---

## Model Configuration

| Parameter | Value |
|---|---|
| Model | Liquid LFM 2.5 (or any GGUF model) |
| Format | GGUF |
| Maximum context | 32 768 tokens |
| Temperature | 0 (deterministic) |
| Response format | JSON only |
| Inference | Local via llama.cpp server, no network |

The model responds only with the classification JSON, with no reasoning or additional text. This is enforced through system instructions and restrictive inference parameters.

---

## Distribution

The tool is distributed as a self-contained folder containing:
- The compiled Bun executable (`classifier`)
- llama.cpp server binary and required dylibs

```
classifier-dist/
├── classifier          ← compiled executable
└── bin/               ← llama-server + dependencies
    ├── llama-server
    ├── libllama*.dylib
    └── libggml*.dylib
```

---

## Building from Source

### Requirements
- Bun runtime
- GGUF model file

### Build Commands
```bash
bun run build   # Downloads llama-server + builds classifier executable
bun run dist    # Creates self-contained classifier-dist/ folder
```

---

## Current Limitations (v1)

- Processes plain text files only (`.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.xml`, and similar)
- Does not process PDFs, images, binary files, or Office documents
- Processing is sequential: one file at a time
- Requires macOS (Finder tags are specific to this operating system)
