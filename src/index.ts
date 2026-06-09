import { scanFolder } from "./file-scanner.ts";
import { loadLabels, processFile } from "./classifier.ts";
import { logProgress, logSummary } from "./logger.ts";
import { startServer, stopServer, isServerRunning } from "./llm.ts";
import { getAllTags, removeOwnTags, hasAIClassifiedTag } from "./xattr.ts";
import { watchFolder } from "./watcher.ts";
import type { ProcessingSummary } from "./types.ts";

interface GlobalFlags {
  help: boolean;
}

interface StartCommand extends GlobalFlags {
  model: string;
}

interface ClassifyCommand extends GlobalFlags {
  folder: string;
  labels: string;
  model: string;
  force: boolean;
  watch: boolean;
}

type Command =
  | { cmd: "start"; args: StartCommand }
  | { cmd: "classify"; args: ClassifyCommand }
  | { cmd: "stop" }
  | { cmd: "list-tags"; folder: string }
  | { cmd: "remove-tags"; folder: string }
  | { cmd: "help" };

function printHelp(): void {
  console.log(`
File Classifier CLI - Tag files using a local LLM

Usage:
  classifier classify [options]           Classify files in a folder
  classifier list-tags <path>              List tags for files in a folder
  classifier remove-tags <path>            Remove AI tags from files in a folder
  classifier help                          Show this help message

Commands:
  classify [options]    Classify files in a folder
    --folder, -f        Path to the folder to process (required)
    --labels, -l         Path to the YAML file with label definitions (required)
    --model, -m         Path to the GGUF model file (required)
    --force             Reprocess files already classified
    --watch, -w         Keep server running and auto-classify new files
    --help, -h          Show help for this command

  list-tags <path>      List tags for all files in a folder

  remove-tags <path>    Remove AI tags from all files in a folder

Examples:
  # Classify files (model loads and unloads automatically)
  classifier classify --folder ./docs --labels labels.yaml --model model.gguf

  # Force reprocess all files
  classifier classify --folder ./docs --labels labels.yaml --model model.gguf --force

  # Watch folder for new files and classify automatically
  classifier classify --folder ./docs --labels labels.yaml --model model.gguf --watch

  # List tags
  classifier list-tags ./docs

  # Remove AI tags
  classifier remove-tags ./docs
`);
}

function printStartHelp(): void {
  console.log(`
start - Start llama-server and load a model

Usage:
  classifier start --model <path>

Options:
  --model, -m <path>    Path to the GGUF model file (required)
  --help, -h            Show this help message

Example:
  classifier start --model ./models/llama.gguf
`);
}

function printClassifyHelp(): void {
  console.log(`
classify - Classify files in a folder (starts server, classifies, stops)

Usage:
  classifier classify --folder <path> --labels <yaml> --model <path>
  classifier classify --folder <path> --labels <yaml> --model <path> --watch

Options:
  --folder, -f <path>   Path to the folder to process (required)
  --labels, -l <yaml>   Path to the YAML file with label definitions (required)
  --model, -m <path>    Path to the LLM model file (required)
  --force               Reprocess files already classified by this tool
  --watch, -w           Keep server running and auto-classify new files
  --help, -h            Show this help message

Examples:
  classifier classify --folder ./documents --labels labels.yaml --model models/qwen2.5-1.5b.gguf
  classifier classify --folder ./documents --labels labels.yaml --model models/qwen2.5-1.5b.gguf --watch
`);
}

function parseGlobalFlags(args: string[]): { flags: GlobalFlags; remaining: string[] } {
  const flags: GlobalFlags = { help: false };
  const remaining: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      i++;
    } else {
      remaining.push(arg);
      i++;
    }
  }

  return { flags, remaining };
}

function parseCommand(args: string[]): Command | null {
  if (args.length === 0) {
    printHelp();
    return null;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case "help":
    case "--help":
    case "-h":
      return { cmd: "help" };

    case "start": {
      const { flags, remaining } = parseGlobalFlags(args.slice(1));
      if (flags.help) {
        return { cmd: "help" };
      }
      const modelArgs = remaining.filter((a) => !a.startsWith("-"));
      const modelFlagIdx = remaining.findIndex((a) => a === "--model" || a === "-m");
      let model = modelArgs[0];
      if (!model && modelFlagIdx !== -1 && remaining[modelFlagIdx + 1]) {
        model = remaining[modelFlagIdx + 1];
      }
      return {
        cmd: "start",
        args: { model: model || "", help: flags.help },
      };
    }

    case "classify":
    case "-c": {
      const { flags, remaining } = parseGlobalFlags(args.slice(1));
      if (flags.help) {
        return { cmd: "help" };
      }
      const folderFlagIdx = remaining.findIndex((a) => a === "--folder" || a === "-f");
      const labelsFlagIdx = remaining.findIndex((a) => a === "--labels" || a === "-l");
      const modelFlagIdx = remaining.findIndex((a) => a === "--model" || a === "-m");
      const nonFlagArgs = remaining.filter((a) => !a.startsWith("-"));
      return {
        cmd: "classify",
        args: {
          folder: folderFlagIdx !== -1 ? remaining[folderFlagIdx + 1] : nonFlagArgs[0] || "",
          labels: labelsFlagIdx !== -1 ? remaining[labelsFlagIdx + 1] : "",
          model: modelFlagIdx !== -1 ? remaining[modelFlagIdx + 1] : nonFlagArgs[1] || "",
          force: remaining.includes("--force"),
          watch: remaining.includes("--watch") || remaining.includes("-w"),
          help: flags.help,
        },
      };
    }

    case "stop":
      return { cmd: "stop" };

    case "list-tags": {
      const nonFlag = args.slice(1).filter((a) => !a.startsWith("-"));
      return { cmd: "list-tags", folder: nonFlag[0] || "" };
    }

    case "remove-tags": {
      const nonFlag = args.slice(1).filter((a) => !a.startsWith("-"));
      return { cmd: "remove-tags", folder: nonFlag[0] || "" };
    }

    default:
      console.error(`Unknown command: ${subcommand}`);
      printHelp();
      return null;
  }
}

async function handleCommand(cmd: Command): Promise<void> {
  switch (cmd.cmd) {
    case "help":
      printHelp();
      break;

    case "start": {
      if (!cmd.args.model) {
        console.error("Error: --model is required");
        console.error("Usage: classifier start --model <path>");
        printStartHelp();
        process.exit(1);
      }
      try {
        await stopServer();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await startServer(cmd.args.model);
        console.log("Server running. Model loaded.");
        console.log("Run 'classifier classify --folder <path> --labels <yaml>' to classify files.");
        console.log("Run 'classifier stop' to unload the model.");
      } catch (e) {
        console.error("Error starting server:", e instanceof Error ? e.message : e);
        process.exit(1);
      }
      break;
    }

    case "classify": {
      if (!cmd.args.folder || !cmd.args.labels || !cmd.args.model) {
        console.error("Error: --folder, --labels, and --model are required");
        console.error("Usage: classifier classify --folder <path> --labels <yaml> --model <path>");
        printClassifyHelp();
        process.exit(1);
      }

      const modelLoadStart = Date.now();
      console.log("Loading model (this may take a minute)...\n");
      await startServer(cmd.args.model);
      const modelLoadTime = Date.now() - modelLoadStart;

      console.log("Loading labels...");
      const labels = await loadLabels(cmd.args.labels);
      console.log(`Loaded ${labels.length} labels: ${labels.map((l) => l.name).join(", ")}`);

      console.log("Scanning folder...");
      const files = scanFolder(cmd.args.folder);
      console.log(`Found ${files.length} text files\n`);

      const startTime = new Date();
      const summary: ProcessingSummary = {
        processed: 0,
        tagged: 0,
        noLabel: 0,
        skipped: 0,
        totalTime: 0,
      };

      for (const filePath of files) {
        const result = await processFile(filePath, labels, cmd.args.force);
        logProgress(result, startTime, labels);

        if (result.status === "ok") {
          summary.processed++;
          summary.tagged++;
        } else if (result.status === "none") {
          summary.processed++;
          summary.noLabel++;
        } else if (result.status === "skip") {
          summary.skipped++;
        }
      }

      const processTime = Date.now() - startTime.getTime();
      summary.totalTime = Math.floor((modelLoadTime + processTime) / 1000);
      logSummary(summary);

      if (cmd.args.watch) {
        const ac = new AbortController();
        const watcher = await watchFolder({
          folder: cmd.args.folder,
          debounceMs: 750,
          signal: ac.signal,
          onFile: async (filePath) => {
            const r = await processFile(filePath, labels, cmd.args.force);
            logProgress(r, new Date(), labels);
          },
        });

        console.log(`\nWatching ${cmd.args.folder} for new files... (Ctrl+C to stop)\n`);

        const shutdown = async () => {
          console.log("\nStopping watcher...");
          ac.abort();
          try { watcher.close(); } catch {}
          await stopServer();
          process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        await new Promise(() => {});
      } else {
        await stopServer();
      }
      break;
    }

    case "stop":
      try {
        await stopServer();
      } catch (e) {
        console.error("Error stopping server:", e instanceof Error ? e.message : e);
        process.exit(1);
      }
      break;

    case "list-tags": {
      if (!cmd.folder) {
        console.error("Error: folder path required");
        console.error("Usage: classifier list-tags <path>");
        process.exit(1);
      }
      console.log("Listing tags for files in: " + cmd.folder + "\n");
      const files = scanFolder(cmd.folder);
      for (const filePath of files) {
        const filename = filePath.split("/").pop() || filePath;
        const tags = getAllTags(filePath);
        if (tags.length > 0) {
          console.log(filename.padEnd(40) + " → " + tags.join(", "));
        } else {
          console.log(filename.padEnd(40) + " → (no tags)");
        }
      }
      console.log("\n" + files.length + " files scanned");
      break;
    }

    case "remove-tags": {
      if (!cmd.folder) {
        console.error("Error: folder path required");
        console.error("Usage: classifier remove-tags <path>");
        process.exit(1);
      }
      console.log("Removing tags from files in: " + cmd.folder + "\n");
      const files = scanFolder(cmd.folder);
      let removed = 0;
      for (const filePath of files) {
        const filename = filePath.split("/").pop() || filePath;
        const hadOwnTags = hasAIClassifiedTag(filePath);
        if (hadOwnTags) {
          removeOwnTags(filePath);
          console.log(filename.padEnd(40) + " → removed");
          removed++;
        } else {
          console.log(filename.padEnd(40) + " → (no AI tags to remove)");
        }
      }
      console.log("\nRemoved AI tags from " + removed + " files");
      break;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = parseCommand(args);

  if (!command) {
    return;
  }

  await handleCommand(command);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});