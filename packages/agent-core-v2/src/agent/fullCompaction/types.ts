export type CompactionMode = 'summary' | 'prune' | 'prune_then_summary';

export interface CompactionResult {
  summary: string;
  contextSummary?: string;
  compactedCount: number;
  tokensBefore: number;
  tokensAfter: number;
  keptUserMessageCount?: number;
  keptHeadUserMessageCount?: number;
  droppedCount?: number;
  mode: CompactionMode;
  droppedCalls: number;
  truncatedResults: number;
  pruneNote?: string;
}

export type CompactionSource = 'manual' | 'auto';

export interface CompactionBeginData {
  instruction?: string;
  source: CompactionSource;
}
