import { spawnSync } from "bun:child_process";
import { FileInfo, FileMetadata } from "./types.ts";
import { getAllTags } from "./xattr.ts";

export function extractFileInfo(filePath: string): FileInfo {
  const result = spawnSync("stat", ["-f", "%z,%B,%m,%S", filePath]);
  const statParts = new TextDecoder().decode(result.stdout).trim().split(",");
  
  const name = filePath.split("/").pop() || "";
  const extension = name.includes(".") ? "." + name.split(".").pop()?.toLowerCase() : "";
  const existingTags = getAllTags(filePath);

  return {
    path: filePath,
    name,
    extension,
    size: parseInt(statParts[0]) || 0,
    created: new Date(parseInt(statParts[1]) * 1000),
    modified: new Date(parseInt(statParts[2]) * 1000),
    existingTags,
  };
}

export async function extractMetadata(filePath: string, tokenCount: number): Promise<FileMetadata> {
  const content = await Bun.file(filePath).text();
  const info = extractFileInfo(filePath);

  return {
    info,
    content,
    tokenCount,
  };
}
