import { watch, type FSWatcher } from "node:fs";
import { isTextFile } from "./file-scanner.ts";

export interface WatchOptions {
  folder: string;
  onFile: (filePath: string) => void | Promise<void>;
  debounceMs?: number;
  signal?: AbortSignal;
}

export async function watchFolder(opts: WatchOptions): Promise<FSWatcher> {
  const debounceMs = opts.debounceMs ?? 500;
  const pending = new Map<string, NodeJS.Timeout>();
  const knownDirs = new Set<string>([opts.folder]);

  function scheduleFile(filePath: string) {
    const existing = pending.get(filePath);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      pending.delete(filePath);
      if (!isTextFile(filePath)) return;
      try {
        await opts.onFile(filePath);
      } catch (e) {
        console.error("Error processing", filePath, ":", e instanceof Error ? e.message : e);
      }
    }, debounceMs);
    pending.set(filePath, t);
  }

  function handleEvent(eventType: string, filename: string | Buffer | null) {
    if (!filename) return;
    const name = filename.toString();
    if (name.startsWith(".")) return;
    const fullPath = `${opts.folder}/${name}`.replace(/\/+/g, "/");

    if (eventType === "rename" && name.includes("/")) {
      knownDirs.add(fullPath);
      return;
    }
    scheduleFile(fullPath);
  }

  const watcher = watch(opts.folder, { recursive: false, signal: opts.signal }, (event, name) => {
    handleEvent(event, name);
  });

  watcher.on("error", (e) => {
    console.error("Watcher error:", e.message);
  });

  return watcher;
}
