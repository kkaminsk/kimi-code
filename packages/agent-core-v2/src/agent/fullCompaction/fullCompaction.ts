import type {
  CompactionResult,
  CompactionSource,
} from './types';
import { createDecorator } from "#/_base/di/instantiation";
import type { Event } from '#/_base/event';
import type { Hooks } from '#/hooks';
import type { ValidatedPruneDecision } from '#/features/externalHooks/internal/types';

export interface FullCompactionInput {
  readonly source: CompactionSource;
  readonly instruction?: string;
}

export interface FullCompactionTask {
  readonly abortController: AbortController;
  readonly promise: Promise<CompactionResult>;
  readonly trigger: CompactionSource;
  readonly tokenCount: number;
  readonly instruction?: string;
  readonly maxContextTokens: number;
  readonly traceId?: string;
  pruneDecision?: ValidatedPruneDecision;
}

export interface IAgentFullCompactionService {
  readonly _serviceBrand: undefined;

  readonly compacting: FullCompactionTask | null;
  begin(input: FullCompactionInput): boolean;
  cancel(): void;

  readonly hooks: Hooks<{
    onWillCompact: FullCompactionTask;
  }>;

  readonly onDidFinishCompaction: Event<FullCompactionTask>;
}

export const IAgentFullCompactionService = createDecorator<IAgentFullCompactionService>('agentFullCompactionService');
