import { Label, ClassificationResult } from "./types.ts";
import { classify, classifyChunked, EFFECTIVE_LIMIT } from "./llm.ts";

export interface ContextStrategyResult {
  result: ClassificationResult | null;
  chunks?: number;
  calls?: number;
}

export async function determineStrategy(
  content: string,
  metadata: {
    filename: string;
    extension: string;
    size: number;
    created: Date;
    modified: Date;
    existingTags: string[];
  },
  labels: Label[]
): Promise<ContextStrategyResult> {
  const tokenCount = Math.ceil(content.length / 4);

  if (tokenCount <= EFFECTIVE_LIMIT) {
    const result = await classify(content, metadata, labels);
    return { result };
  }

  const { result, chunks, calls } = await classifyChunked(
    content,
    metadata,
    labels
  );
  return { result, chunks, calls };
}