import { mkdirSync, rmSync, copyFileSync, existsSync, readdirSync, lstatSync } from "bun:fs";
import { execSync } from "bun:child_process";

const VERSION = "b9413";
const ARCHIVE_URL = "https://github.com/ggml-org/llama.cpp/releases/download/b9413/llama-b9413-bin-macos-arm64.tar.gz";

const PROJECT_ROOT = process.cwd();
const BIN_DIR = PROJECT_ROOT + "/bin";
const LLAMA_SERVER_PATH = BIN_DIR + "/llama-server";

const NEEDED_FILES = [
  "llama-server",
  "libllama.0.dylib",
  "libllama.dylib",
  "libggml.0.dylib",
  "libggml.dylib",
  "libggml-base.0.dylib",
  "libggml-base.dylib",
  "libggml-metal.0.dylib",
  "libggml-metal.dylib",
  "libggml-cpu.0.dylib",
  "libggml-cpu.dylib",
  "libggml-blas.0.dylib",
  "libggml-blas.dylib",
  "libggml-rpc.0.dylib",
  "libggml-rpc.dylib",
  "libmtmd.0.dylib",
  "libmtmd.dylib",
  "libllama-server-impl.dylib",
  "libllama-common.0.dylib",
  "libllama-common.dylib",
];

async function downloadLlama(): Promise<void> {
  console.log("Downloading llama.cpp...");
  console.log("URL: " + ARCHIVE_URL);

  const tmpDir = "/tmp/llama-build-download";

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
  execSync("mkdir -p " + tmpDir);

  try {
    console.log("Downloading archive (this may take a few minutes)...");
    execSync("curl -L -o " + tmpDir + "/archive.tar.gz \"" + ARCHIVE_URL + "\"");

    console.log("Extracting...");
    execSync("tar -xzf " + tmpDir + "/archive.tar.gz -C " + tmpDir);

    const extractedPath = tmpDir + "/llama-b9413";

    if (!existsSync(extractedPath)) {
      throw new Error("Extracted path not found");
    }

    console.log("Installing to bin/...");
    mkdirSync(BIN_DIR, { recursive: true });

    for (const file of NEEDED_FILES) {
      const srcPath = extractedPath + "/" + file;
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, BIN_DIR + "/" + file);
        console.log("  Installed: " + file);
      } else {
        console.log("  Missing: " + file);
      }
    }

    execSync("chmod +x " + BIN_DIR + "/llama-server");

    rmSync(tmpDir, { recursive: true, force: true });
    console.log("llama-server installed to " + BIN_DIR + "/");
  } catch (e: any) {
    console.error("Error:", e?.message || e);
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (e2) {}
    console.error("Failed to download llama-server");
    process.exit(1);
  }
}

async function main() {
  if (await Bun.file(LLAMA_SERVER_PATH).exists()) {
    const allExist = true;
    for (const file of NEEDED_FILES) {
      if (!existsSync(BIN_DIR + "/" + file)) {
        console.log("Missing file: " + file + " - re-downloading...");
        await downloadLlama();
        break;
      }
    }
    if (allExist) {
      console.log("llama-server already exists at " + LLAMA_SERVER_PATH);
    }
  } else {
    await downloadLlama();
  }
}

main();
