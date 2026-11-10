import { createDecorator } from "#/_base/di/instantiation";
import type { WireLineRange } from '#/wire/record';

import type { LoopRecordedEvent } from './loopEventFold';
import type { ContextMessage, ContextPruneTrigger } from './types';

export interface ContextPruneTruncateInput {
  readonly toolCallId: string;
  readonly headChars: number;
}

export interface ContextPruneInput {
  readonly dropCalls: readonly string[];
  readonly truncateResults: readonly ContextPruneTruncateInput[];
  readonly note?: string;
  readonly trigger: ContextPruneTrigger;
}

export interface ContextPruneResult {
  readonly tokensBefore: number;
  readonly tokensAfter: number;
  readonly removedCount: number;
}

export interface ContextCompactionInput {
  readonly summary: string;
  readonly contextSummary?: string;
  readonly compactedCount: number;
  readonly tokensBefore: number;
  readonly tokensAfter?: number;
  readonly summaryOutputTokens?: number;
  readonly requestOverheadTokens?: number;
  readonly keptUserMessageCount?: number;
  readonly keptHeadUserMessageCount?: number;
  readonly droppedCount?: number;
  readonly wireLines?: WireLineRange;
}

export interface ContextCompactionResult {
  summary: string;
  contextSummary: string;
  compactedCount: number;
  tokensBefore: number;
  tokensAfter: number;
  keptUserMessageCount: number;
  keptHeadUserMessageCount?: number;
  droppedCount?: number;
}

export interface IAgentContextMemoryService {
  readonly _serviceBrand: undefined;

  get(): readonly ContextMessage[];

  prefixRevision(): number;

  append(...messages: readonly ContextMessage[]): void;

  appendLoopEvent(event: LoopRecordedEvent): void;

  publishTrailingRemoval(previous: readonly ContextMessage[]): boolean;

  clear(): void;

  applyCompaction(input: ContextCompactionInput): ContextCompactionResult;

  applyPrune(input: ContextPruneInput): ContextPruneResult;
}

export const IAgentContextMemoryService = createDecorator<IAgentContextMemoryService>('agentContextMemoryService');
