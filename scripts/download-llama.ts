import { mkdirSync, rmSync, copyFileSync, existsSync } from "bun:fs";
import { execSync } from "bun:child_process";

const VERSION = "b9413";

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

function macArch(): "arm64" | "x64" {
  const machine = execSync("uname -m", { encoding: "utf-8" }).trim();
  if (machine === "x86_64") return "x64";
  if (machine === "arm64") return "arm64";
  throw new Error(
    `Unsupported architecture "${machine}". llama.cpp prebuilds are published for macOS arm64 and x64.`
  );
}

function archiveUrl(arch: "arm64" | "x64"): string {
  return `https://github.com/ggml-org/llama.cpp/releases/download/${VERSION}/llama-${VERSION}-bin-macos-${arch}.tar.gz`;
}

function missingRuntimeFiles(): string[] {
  return NEEDED_FILES.filter((file) => !existsSync(BIN_DIR + "/" + file));
}

async function downloadLlama(): Promise<void> {
  const arch = macArch();
  const url = archiveUrl(arch);

  console.log("Downloading llama.cpp " + VERSION + " for macOS " + arch + "...");
  console.log("URL: " + url);

  const tmpDir = "/tmp/llama-build-download";

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
  execSync("mkdir -p " + tmpDir);

  try {
    console.log("Downloading archive (this may take a few minutes)...");
    execSync('curl -L --fail -o ' + tmpDir + '/archive.tar.gz "' + url + '"');

    console.log("Extracting...");
    execSync("tar -xzf " + tmpDir + "/archive.tar.gz -C " + tmpDir);

    const extractedPath = tmpDir + "/llama-" + VERSION;
    if (!existsSync(extractedPath)) {
      throw new Error("Extracted path not found: " + extractedPath);
    }

    console.log("Installing to bin/...");
    mkdirSync(BIN_DIR, { recursive: true });

    for (const file of NEEDED_FILES) {
      const srcPath = extractedPath + "/" + file;
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, BIN_DIR + "/" + file);
        console.log("  Installed: " + file);
      } else {
        console.log("  Missing in archive (skipped): " + file);
      }
    }

    execSync("chmod +x " + BIN_DIR + "/llama-server");

    rmSync(tmpDir, { recursive: true, force: true });
    console.log("llama-server installed to " + BIN_DIR + "/");
  } catch (e: any) {
    console.error("Error:", e?.message || e);
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    console.error("Failed to download llama-server");
    process.exit(1);
  }
}

async function main() {
  if (!(await Bun.file(LLAMA_SERVER_PATH).exists())) {
    await downloadLlama();
    return;
  }

  const missing = missingRuntimeFiles();
  if (missing.length > 0) {
    console.log("Missing file: " + missing[0] + " — re-downloading...");
    await downloadLlama();
    return;
  }

  console.log("llama-server already exists at " + LLAMA_SERVER_PATH);
}

main();
