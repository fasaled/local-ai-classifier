# Sailkari

**Sailkari** (Basque for “the one who classifies”) is a **PoC harness** for trying local GGUF models and system prompts on a real task: classify a folder of text files, offline, on macOS.

Swap `--model` to compare GGUFs. Swap `--system-prompt` to compare instructions. Labels and documents stay fixed, so differences come from the model or the prompt — not from a hidden API.

Nothing is shipped as “the” model. You bring any instruction-tuned [GGUF](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md) that [llama.cpp](https://github.com/ggml-org/llama.cpp) can load. Inference stays on `localhost`. Files are never moved, renamed, or rewritten; labels go to `xattr`.

```bash
# same docs + labels, different model
./sailkari classify -f ./docs -l examples/labels.yaml -m models/model-a.gguf --force

# same docs + labels + model, different system prompt
./sailkari classify -f ./docs -l examples/labels.yaml -m models/model-a.gguf \
  --system-prompt prompts/variant.txt --force
```

## Requirements

- **macOS** (Apple Silicon or Intel)
- [**Bun**](https://bun.sh) (`brew install bun`)
- An instruction-tuned **GGUF** model (you download this yourself)

## Install

```bash
git clone https://github.com/fasaled/local-ai-classifier.git
cd local-ai-classifier
bun install
bun run build
```

`bun run build` downloads a prebuilt `llama-server` for your Mac architecture into `bin/`, then compiles the CLI into a standalone `sailkari` binary.

From source, without compiling:

```bash
bun run src/index.ts classify --folder ./docs --labels examples/labels.yaml --model models/your-model.gguf
```

## Try it

1. Search [Hugging Face](https://huggingface.co/models?library=gguf) for an instruct/chat model in GGUF form. **Q4_K_M** is a common quantization. Base (non-instruct) models usually ignore the prompt.
2. Put the file in `models/` (create the folder if needed).
3. Run it on the bundled samples:

```bash
./sailkari classify \
  --folder ./examples/documents \
  --labels ./examples/labels.yaml \
  --model ./models/your-model.gguf
```

That is one PoC run. Change `--model` or `--system-prompt` and run again with `--force` to compare. No rebuild. Point `--folder` at your own documents when you want a domain-specific trial.

```
[00:00] OK     adoption-papers.txt          → pets
[00:01] OK     school-notice.txt            → family
──────────────────────────────────────────
Processed:             18 files
  Tagged:              18
  No label:            0  (no matching label)
Skipped:               0  (already classified)
──────────────────────────────────────────
```

```bash
./sailkari list-tags ./examples/documents
./sailkari remove-tags ./examples/documents
```

## Usage

| Command | Description |
|---|---|
| `classify [options]` | Start the server, classify, stop (or `--watch`) |
| `list-tags <path>` | Print AI labels for every text file in a folder |
| `remove-tags <path>` | Delete only this tool's xattrs |
| `help` | Command list |

```
sailkari classify --folder <path> --labels <yaml> --model <gguf> [options]
```

| Option | Description |
|---|---|
| `--folder`, `-f` | Folder to process (**required**) |
| `--labels`, `-l` | YAML label file (**required**) |
| `--model`, `-m` | Path to a GGUF file (**required**) |
| `--system-prompt`, `-s` | Optional system prompt file (for prompt and model eval) |
| `--force` | Reclassify files that already have the marker |
| `--watch`, `-w` | Keep the model loaded; classify new or modified files (top-level folder only, 750 ms debounce). Stop with `Ctrl+C` |
| `--help`, `-h` | Help for `classify` |

The inference server is started and stopped by `classify`. There is no separate start/stop command. Port `8080` must be free.

## Labels

A YAML map of `name: "natural-language description"`. Labels and the document are always sent as the **user** message. Classification policy lives in the system prompt.

```yaml
family: "Family documents including personal letters, birthday cards, school documents, medical records"
banking: "Banking and financial documents including statements, tax returns, credit card bills"
marketing: "Marketing and sales documents including proposals, brand guidelines, press releases"
technology: "Technology documents including architecture, API specs, security guides"
pets: "Pet-related documents including veterinary records, vaccination certificates, adoption papers"
```

See `examples/labels.yaml`. Describe the **subject** of the document, not the file format, and keep labels mutually exclusive on that axis.

## System prompts

This is the other axis of the PoC. `--system-prompt` is optional. Omit it to use the built-in classifier prompt. Pass a file to try a different policy against the same labels, documents, and model.

```bash
./sailkari classify \
  --folder ./examples/documents \
  --labels ./examples/labels.yaml \
  --model ./models/your-model.gguf \
  --system-prompt ./examples/system-prompt.txt \
  --force
```

Swap `--model` to compare GGUFs. Swap `--system-prompt` to compare instructions. The user payload (label list + document) stays fixed.

The parser only accepts:

- a bare label name: `banking`
- JSON: `{"labels":["banking"]}` or `[{"label":"banking"}]`

Anything else is recorded as `NONE`. A system prompt used with this tool **must** therefore:

1. Tell the model to pick **exactly one** label from the list in the user message.
2. Tell it to reply with **only** the label name (or the JSON shape above) — no quotes, markdown, or explanation.
3. Tell it not to invent labels. `NONE` if nothing fits is fine; the CLI treats that as no match.

Copy `examples/system-prompt.txt` (same text as the built-in default) and edit the policy. Leave the output contract intact, or parsing will fail even when the model “understood” the document.

If a custom prompt looks unconstrained, the CLI prints a warning and still runs — that is a valid eval outcome.

## Tags (`xattr`)

Raw macOS extended attributes, not Finder color tags.

| Attribute | Role |
|---|---|
| `ai-classified` | Cache key: already processed (skipped unless `--force`) |
| `ai-classified-labels` | Space-separated label names |

`--force` and `remove-tags` only touch these two keys. Other xattrs are left alone.

```bash
xattr -p ai-classified-labels some-file.txt
```

## How it works

```
scan → skip if ai-classified
     → read bytes
     → fit in 32k context?  yes → 1 completion
                            no  → N chunks, majority vote
     → parse label name
     → write xattr
```

**llama-server as a child process.** The CLI spawns [llama.cpp](https://github.com/ggml-org/llama.cpp) `llama-server`, waits on `GET /health`, calls `POST /v1/chat/completions`, then SIGTERM / SIGKILL. Inference stays in llama.cpp (GGUF loader, Metal, chat templates). Swapping models is a file path, not a rebuild of native addons.

**Model and system prompt are plugins.** `--model` is a GGUF path. `--system-prompt` is a text file. Temperature is `0`. Labels and document always go in the user message so those two flags are the variables you change when evaluating.

**Labels in YAML, tags on the file.** Changing the taxonomy does not require a code change. `xattr` keeps the decision next to the document — no extra database. That also makes the tool **macOS-only**.

**Non-destructive.** Only the two `ai-classified*` keys are written. File bytes are never rewritten.

**Sequential.** `--parallel 1` to keep peak RAM down. One in-flight completion at a time.

**Standalone binary.** `bun build --compile` embeds the Bun runtime and TypeScript. `llama-server` and its dylibs stay in `bin/` because they are native and architecture-specific.

## Limitations

- Plain text only (`.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.yml`, `.xml`, `.log`, `.conf`, `.config`, `.ini`, `.toml`, `.properties`). No PDF, Office, or images.
- macOS only (`xattr`).
- `--watch` is not recursive.
- No model download — you bring the GGUF.
- Not Finder colored tags.

## Tests

```bash
bun test        # unit tests (parser, progress, watcher) — no model required
bun test e2e    # inference against llama-server — needs bin/llama-server and a GGUF
```

E2E looks for `CLASSIFIER_MODEL` or the first `models/*.gguf`. It copies fixtures to a temp directory, so example files are not tagged. If the runtime or a model is missing, those tests are skipped. Nothing is written back into the repo.

`CLASSIFIER_E2E=0 bun test e2e` forces a skip.

## License

[MIT](./LICENSE). llama.cpp is a separate project; this repo downloads its official macOS binaries at build time.
