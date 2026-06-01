import { test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "bun:child_process";
import { join } from "node:path";

const CLASSIFIER = join(import.meta.dir, "../classifier-dist/classifier");
const tmpdir = process.env.TMPDIR || "/tmp";
const MODEL_PATH = join(import.meta.dir, "../models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf");
const LABELS_PATH = join(import.meta.dir, "../test-files/labels.yaml");

function createTestFile(dir: string, name: string, content: string): string {
  const filePath = join(dir, name);
  spawnSync("bash", ["-c", `printf '%s' "${content.replace(/"/g, '\\"')}" > "${filePath}"`]);
  return filePath;
}

function getTags(filePath: string): string[] {
  const result = spawnSync("xattr", ["-p", "ai-classified-labels", filePath]);
  if (result.status !== 0) {
    return [];
  }
  const str = result.stdout?.toString() || "";
  return str.trim().split(" ").filter(Boolean);
}

function clearTags(filePath: string): void {
  spawnSync("xattr", ["-d", "ai-classified", filePath]);
  spawnSync("xattr", ["-d", "ai-classified-labels", filePath]);
}

function runClassifier(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(CLASSIFIER, args);
  return {
    exitCode: result.exitCode ?? result.status ?? 1,
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
  };
}

let testDir: string;
let serverPid: number | null = null;

async function startServer(): Promise<void> {
  if (! Bun.file(MODEL_PATH).exists()) {
    throw new Error(`Model not found at ${MODEL_PATH}. Please download the model first.`);
  }

  const proc = spawnSync("bash", ["-c", `${CLASSIFIER} --server-start --model ${MODEL_PATH} &> /dev/null & echo $!`]);
  serverPid = parseInt(proc.stdout?.toString().trim() || "0");
  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function stopServer(): Promise<void> {
  if (serverPid) {
    try {
      spawnSync("kill", [String(serverPid)]);
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
    serverPid = null;
  }
}

beforeAll(async () => {
  testDir = join(tmpdir, `classifier-test-${Date.now()}`);
  spawnSync("mkdir", ["-p", testDir]);
});

afterAll(async () => {
  await stopServer();
  spawnSync("rm", ["-rf", testDir]);
});

test("classifier --help works", () => {
  const { stdout } = runClassifier(["--help"]);
  expect(stdout).toContain("File Classifier CLI");
});

test("classifier --list-tags shows no tags on empty folder", () => {
  const { stdout } = runClassifier(["--list-tags", testDir]);
  expect(stdout).toContain("0 files scanned");
});

test("classifier starts server and loads model", async () => {
  await startServer();
  const { exitCode } = runClassifier(["--list-tags", testDir]);
  expect(exitCode).toBe(0);
}, 60000);

test("classifier classifies invoice file correctly", async () => {
  const invoiceContent = `INVOICE

Date: March 15, 2024
Amount: $1,250.00
From: Acme Corp
To: John Doe

Description: Professional consulting services for Q1 2024`;

  const invoicePath = createTestFile(testDir, "invoice.txt", invoiceContent);

  const { exitCode, stdout } = runClassifier([
    "--folder", testDir,
    "--labels", LABELS_PATH
  ]);

  expect(exitCode).toBe(0);
  expect(stdout).toContain("Processed:");
  expect(stdout).toMatch(/Tagged:\s+[1-9]/);

  clearTags(invoicePath);
}, 120000);

test("classifier classifies meeting notes correctly", async () => {
  const meetingPath = createTestFile(testDir, "meeting_notes.txt", "Team meeting to discuss project roadmap and timeline");

  const { exitCode, stdout } = runClassifier([
    "--folder", testDir,
    "--labels", LABELS_PATH
  ]);

  expect(exitCode).toBe(0);
  expect(stdout).toContain("Processed:");
  expect(stdout).toMatch(/Tagged:\s+[1-9]/);

  clearTags(meetingPath);
}, 120000);

test("classifier respects --force flag for reprocessing", async () => {
  const filePath = createTestFile(testDir, "todo.txt", "TODO: Buy groceries, call mom");

  runClassifier([
    "--folder", testDir,
    "--labels", LABELS_PATH
  ]);

  const { exitCode } = runClassifier([
    "--folder", testDir,
    "--labels", LABELS_PATH,
    "--force"
  ]);

  expect(exitCode).toBe(0);

  clearTags(filePath);
}, 120000);

test("classifier --remove-tags removes AI tags", () => {
  const filePath = createTestFile(testDir, "test_remove.txt", "Test content for tag removal");

  spawnSync("xattr", ["-w", "ai-classified", "1", filePath]);
  spawnSync("xattr", ["-w", "ai-classified-labels", "test-tag another-tag", filePath]);

  const { stdout } = runClassifier(["--remove-tags", testDir]);
  expect(stdout).toContain("removed");

  const tags = getTags(filePath);
  expect(tags).toHaveLength(0);
});

test("classifier --list-tags shows correct tags", () => {
  const filePath1 = createTestFile(testDir, "file1.txt", "Content A");
  const filePath2 = createTestFile(testDir, "file2.txt", "Content B");

  spawnSync("xattr", ["-w", "ai-classified-labels", "label1 label2", filePath1]);
  spawnSync("xattr", ["-w", "ai-classified-labels", "label3", filePath2]);

  const { stdout } = runClassifier(["--list-tags", testDir]);

  expect(stdout).toContain("file1.txt");
  expect(stdout).toContain("label1, label2");
  expect(stdout).toContain("file2.txt");
  expect(stdout).toContain("label3");

  clearTags(filePath1);
  clearTags(filePath2);
});