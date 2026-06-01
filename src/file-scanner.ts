import { spawnSync } from "bun:child_process";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".xml",
  ".log", ".conf", ".config", ".ini", ".toml", ".properties",
]);

export function isTextFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const ext of TEXT_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function scanFolder(folderPath: string): string[] {
  const files: string[] = [];
  const result = spawnSync("find", [folderPath, "-type", "f"]);
  if (result.status !== 0) {
    throw new Error(`Cannot access folder: ${folderPath}`);
  }
  const output = new TextDecoder().decode(result.stdout);
  const lines = output.split("\n").filter(Boolean);
  for (const line of lines) {
    if (isTextFile(line)) {
      files.push(line);
    }
  }
  return files;
}
