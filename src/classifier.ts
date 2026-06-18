import { parse } from "yaml";
import { Label, ProcessingResult, LabelsFile } from "./types.ts";
import { extractFileInfo } from "./metadata.ts";
import {
  hasAIClassifiedTag,
  getOwnLabels,
  writeOwnTags,
  removeOwnSemanticTags,
} from "./xattr.ts";
import { determineStrategy } from "./context.ts";
import { startProgress, updateProgress } from "./progress.ts";

export async function processFile(
  filePath: string,
  labels: Label[],
  force: boolean
): Promise<ProcessingResult> {
  const hasAIClassified = hasAIClassifiedTag(filePath);

  if (hasAIClassified && !force) {
    return {
      status: "skip",
      filePath,
      reason: "already classified",
    };
  }

  const filename = filePath.split("/").pop() || filePath;
  const fileInfo = extractFileInfo(filePath);
  let content: string;
  try {
    content = await Bun.file(filePath).text();
  } catch {
    return {
      status: "skip",
      filePath,
      reason: "cannot read file",
    };
  }

  startProgress(filename, 1, "reading");

  const onProgress = (current: number, total: number, message: string) => {
    updateProgress(filename, current, total, message);
  };

  const { result, chunks, calls } = await determineStrategy(
    content,
    {
      filename: fileInfo.name,
      extension: fileInfo.extension,
      size: fileInfo.size,
      created: fileInfo.created,
      modified: fileInfo.modified,
      existingTags: fileInfo.existingTags,
    },
    labels,
    onProgress
  );

  if (!result || result.labels.length === 0) {
    if (force && hasAIClassified) {
      removeOwnSemanticTags(filePath);
      writeOwnTags(filePath, []);
    }
    return {
      status: "none",
      filePath,
    };
  }

  if (force && hasAIClassified) {
    removeOwnSemanticTags(filePath);
  }

  writeOwnTags(filePath, result.labels);

  return {
    status: "ok",
    filePath,
    labels: result.labels,
    chunks,
    calls,
  };
}

export async function loadLabels(labelsPath: string): Promise<Label[]> {
  const content = await Bun.file(labelsPath).text();
  const parsed = parse(content) as LabelsFile;
  const labels: Label[] = [];
  for (const [name, description] of Object.entries(parsed)) {
    if (typeof description === "string") {
      labels.push({ name, description });
    }
  }
  if (labels.length === 0) {
    throw new Error(`No labels found in ${labelsPath}. Make sure it's a YAML file with label definitions.`);
  }
  return labels;
}
