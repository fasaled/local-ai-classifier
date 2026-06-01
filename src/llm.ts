import { spawn, execSync } from "bun:child_process";
import type { Label, ClassificationResult } from "./types.ts";
import { parseResponse, selectLabelByMajority } from "./parser.ts";

const MAX_CONTEXT = 32768;
const SYSTEM_RESERVE = 1024;
const EFFECTIVE_LIMIT = MAX_CONTEXT - SYSTEM_RESERVE;
const SERVER_INFO_FILE = process.env.HOME + "/.classifier/server-info.json";

let serverProcess: any = null;
let serverUrl: string | null = null;
let loadedModelPath: string | null = null;

function getAppDir(): string {
  try {
    const result = execSync("dirname \"$(readlink -f \"$0\" 2>/dev/null || echo \"$0\")\"", {
      encoding: "utf-8",
    });
    const dir = result.trim();
    if (dir) return dir;
  } catch {}

  try {
    const result = execSync("pwd", { encoding: "utf-8" });
    return result.trim();
  } catch {
    return "/usr/local/bin";
  }
}

function getBinDir(): string {
  const appDir = getAppDir();
  return appDir + "/bin";
}

async function fileExists(path: string): Promise<boolean> {
  return await Bun.file(path).exists();
}

async function findLlamaServer(): Promise<string | null> {
  try {
    const result = execSync("which llama-server 2>/dev/null || echo ''", { encoding: "utf-8" });
    const path = result.trim();
    if (path && await fileExists(path)) return path;
  } catch {}

  const binDir = getBinDir();
  const bundledPath = binDir + "/llama-server";
  if (await fileExists(bundledPath)) return bundledPath;

  const currentDir = execSync("pwd", { encoding: "utf-8" }).trim();
  const localPath = currentDir + "/bin/llama-server";
  if (await fileExists(localPath)) return localPath;

  return null;
}

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:8080/health");
    return response.ok;
  } catch {
    return false;
  }
}

function saveServerInfo(modelPath: string): void {
  try {
    execSync("mkdir -p ~/.classifier");
    const absPath = Bun.file(modelPath).exists() ? modelPath : execSync("realpath " + modelPath, { encoding: "utf-8" }).trim();
    const info = JSON.stringify({ modelPath: absPath, port: 8080 });
    execSync("printf '%s' '" + info.replace(/'/g, "'\\''") + "' > ~/.classifier/server-info.json");
  } catch {}
}

async function loadServerInfo(): Promise<{ modelPath: string; port: number } | null> {
  try {
    const content = await Bun.file(SERVER_INFO_FILE).text();
    if (content) return JSON.parse(content);
  } catch {}
  return null;
}

function clearServerInfo(): void {
  try {
    execSync("rm -f " + SERVER_INFO_FILE);
  } catch {}
}

export async function startServer(modelPath: string, port: number = 8080): Promise<string> {
  await stopServer();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const llamaServer = await findLlamaServer();
  if (!llamaServer) {
    throw new Error("llama-server not found in bin/ directory");
  }

  const binDir = getBinDir();

  console.log("Loading model (this may take a minute)...\n");

  const args = [
    "-m", modelPath,
    "-c", String(MAX_CONTEXT),
    "--port", String(port),
    "--log-disable",
    "--parallel", "1",
  ];

  serverProcess = spawn(llamaServer, args, {
    env: {
      ...process.env,
      DYLD_LIBRARY_PATH: binDir,
    },
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
  });

  serverProcess.unref();

  serverUrl = "http://localhost:" + port;
  saveServerInfo(modelPath);

  let ready = false;
  let attempts = 0;
  const maxAttempts = 120;

  while (!ready && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;

    try {
      const response = await fetch("http://localhost:" + port + "/health");
      if (response.ok) {
        ready = true;
        console.log("Model loaded and ready.\n");
      }
    } catch {
      // Server not ready yet
    }
  }

  if (!ready) {
    throw new Error("Server failed to start within timeout");
  }

  return serverUrl;
}

export async function stopServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }

  try {
    execSync("pkill -f llama-server", { encoding: "utf-8" });
  } catch {}

  try {
    await fetch("http://localhost:8080/shutdown", { method: "POST" });
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, 500));

  serverUrl = null;
  loadedModelPath = null;
  clearServerInfo();
  console.log("llama-server stopped.\n");
}

export async function isServerRunning(): Promise<boolean> {
  return await checkServerRunning();
}

export async function getLoadedModelPath(): Promise<string | null> {
  if (loadedModelPath) return loadedModelPath;

  const info = await loadServerInfo();
  if (info && await checkServerRunning()) {
    loadedModelPath = info.modelPath;
    serverUrl = "http://localhost:" + info.port;
    return loadedModelPath;
  }
  return null;
}

export async function classify(
  content: string,
  metadata: {
    filename: string;
    extension: string;
    size: number;
    created: Date;
    modified: Date;
    existingTags: string[];
  },
  labels: Label[],
  _modelPath: string
): Promise<ClassificationResult | null> {
  let url = serverUrl;
  if (!url) {
    const info = await loadServerInfo();
    if (info && await checkServerRunning()) {
      url = "http://localhost:" + info.port;
      loadedModelPath = info.modelPath;
    }
  }

  if (!url) {
    throw new Error("Server not running. Run --server-start --model <path> first.");
  }

  const labelNames = labels.map((l) => l.name).join(", ");
  const labelsText = labels.map((l) => l.name + ": " + l.description).join("\n");

  const prompt = "Classify this document by selecting ONE label from the list below.\n\nLABELS:\n" + labelsText + "\n\nDOCUMENT:\n" + content + "\n\nYour response must be ONLY the name of the best matching label (e.g. \"banking\"). Do not include the description.";

  try {
    const resp = await fetch(url + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0,
        stream: false,
      }),
    });

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "";

    const result = parseResponse(text, labels);
    if (result && result.labels.length > 0) {
      return {
        labels: result.labels.slice(0, 1),
      };
    }

    return null;
  } catch (e) {
    console.error("Classification error:", e);
    return null;
  }
}

export async function classifyChunked(
  content: string,
  metadata: {
    filename: string;
    extension: string;
    size: number;
    created: Date;
    modified: Date;
    existingTags: string[];
  },
  labels: Label[],
  _modelPath: string
): Promise<{ result: ClassificationResult | null; chunks: number; calls: number }> {
  let url = serverUrl;
  if (!url) {
    const info = await loadServerInfo();
    if (info && await checkServerRunning()) {
      url = "http://localhost:" + info.port;
      loadedModelPath = info.modelPath;
    }
  }

  if (!url) {
    throw new Error("Server not running. Run --server-start --model <path> first.");
  }

  const chunkSize = EFFECTIVE_LIMIT - 2000;
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = start + chunkSize;
    if (end < content.length) {
      const spaceIndex = content.lastIndexOf(" ", end);
      if (spaceIndex > start + chunkSize / 2) {
        end = spaceIndex;
      }
    }
    chunks.push(content.slice(start, end));
    start = end;
  }

  const labelCounts: Record<string, number> = {};
  let totalCalls = 0;

  for (const chunk of chunks) {
    const labelsText = labels.map((l) => l.name + ": " + l.description).join("\n");

    const prompt = "Classify this document by selecting ONE label from the list below.\n\nLABELS:\n" + labelsText + "\n\nDOCUMENT:\n" + chunk + "\n\nYour response must be ONLY the name of the best matching label (e.g. \"banking\"). Do not include the description.";

    try {
      const response = await fetch(url + "/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0,
          stream: false,
        }),
      });

      totalCalls++;

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";

      const parsed = parseResponse(text, labels);
      if (parsed && parsed.labels.length > 0) {
        const label = parsed.labels[0];
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      }
    } catch {
      // skip failed chunk
    }
  }

  const winner = selectLabelByMajority(labelCounts);

  return {
    result: winner ? { labels: [winner] } : null,
    chunks: chunks.length,
    calls: totalCalls,
  };
}

export async function getTokenCount(content: string, modelPath: string): Promise<number> {
  return Math.ceil(content.length / 4);
}

export { EFFECTIVE_LIMIT };
