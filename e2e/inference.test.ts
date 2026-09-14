import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadLabels, processFile } from "../src/classifier.ts";
import { startServer, stopServer } from "../src/llm.ts";
import { getOwnLabels, hasAIClassifiedTag, removeOwnTags } from "../src/xattr.ts";

/**
 * Real llama-server inference. Skipped when runtime or a GGUF is missing
 * (CI, fresh clone). Does not write RESULTS.md or any other report file.
 *
 *   bun test e2e
 *   CLASSIFIER_MODEL=models/your-model.gguf bun test e2e
 *   CLASSIFIER_E2E=0 bun test   # skip even if a model is present
 */

const FIXTURES: { file: string; label: string }[] = [
  { file: "bank-statement.txt", label: "banking" },
  { file: "vet-records.txt", label: "pets" },
  { file: "birthday-card.txt", label: "family" },
  { file: "microservices-architecture.txt", label: "technology" },
  { file: "sales-proposal.txt", label: "marketing" },
];

async function resolveModel(): Promise<string | null> {
  const fromEnv = process.env.CLASSIFIER_MODEL;
  if (fromEnv && (await Bun.file(fromEnv).exists())) return fromEnv;

  const found: string[] = [];
  for await (const file of new Bun.Glob("*.gguf").scan("models")) {
    found.push(join("models", file));
  }
  found.sort();
  return found[0] ?? null;
}

const llamaExists = await Bun.file("bin/llama-server").exists();
const modelPath = await resolveModel();
const enabled =
  process.env.CLASSIFIER_E2E !== "0" && llamaExists && modelPath !== null;

describe.skipIf(!enabled)("e2e inference", () => {
  let workDir: string;
  let labels: Awaited<ReturnType<typeof loadLabels>>;

  beforeAll(async () => {
    labels = await loadLabels("examples/labels.yaml");
    workDir = join(tmpdir(), `classifier-e2e-${Date.now()}`);
    await mkdir(workDir, { recursive: true });
    for (const { file } of FIXTURES) {
      const src = join("examples/documents", file);
      const dest = join(workDir, file);
      await Bun.write(dest, await Bun.file(src).text());
    }
    await startServer(modelPath!);
  }, 240_000);

  afterAll(async () => {
    await stopServer();
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  for (const { file, label } of FIXTURES) {
    test(
      `${file} → ${label}`,
      async () => {
        const path = join(workDir, file);
        removeOwnTags(path);
        const result = await processFile(path, labels, true);
        expect(result.status).toBe("ok");
        expect(result.labels).toEqual([label]);
        expect(hasAIClassifiedTag(path)).toBe(true);
        expect(getOwnLabels(path)).toEqual([label]);
      },
      { timeout: 120_000 }
    );
  }

  test("skips a file that already has the marker", async () => {
    const path = join(workDir, "bank-statement.txt");
    expect(hasAIClassifiedTag(path)).toBe(true);
    const result = await processFile(path, labels, false);
    expect(result.status).toBe("skip");
  });

  test("--force reclassifies and keeps a valid label", async () => {
    const path = join(workDir, "bank-statement.txt");
    const result = await processFile(path, labels, true);
    expect(result.status).toBe("ok");
    expect(result.labels).toEqual(["banking"]);
  }, { timeout: 120_000 });
});
