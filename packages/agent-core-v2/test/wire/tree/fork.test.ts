import { describe, expect, it } from 'vitest';

import { computeForkLine } from '#/wire/tree/fork';
import type { WireRecord } from '#/wire/record';
import type { WireLine } from '#/wire/tree/tree';

function userPrompt(text: string): WireRecord {
  return {
    type: 'context.append_message',
    message: { role: 'user', content: [{ type: 'text', text }], toolCalls: [] },
  };
}

function assistantWithCall(id: string): WireRecord {
  return {
    type: 'context.append_message',
    message: {
      role: 'assistant',
      content: [],
      toolCalls: [{ type: 'function', id, name: 'Read', arguments: '{}' }],
    },
  };
}

function toolResult(id: string): WireRecord {
  return {
    type: 'context.append_message',
    message: { role: 'tool', content: [{ type: 'text', text: `result ${id}` }], toolCalls: [], toolCallId: id },
  };
}

const PRUNE_RECORD: WireRecord = {
  type: 'context.apply_prune',
  agentId: 'main',
  dropCalls: ['c1'],
  truncateResults: [],
  trigger: 'manual',
  tokensBefore: 100,
  tokensAfter: 40,
  removedCount: 2,
};

function chain(...records: readonly WireRecord[]): WireLine[] {
  return records.map((record, index) => ({ record, line: index + 1 }));
}

describe('computeForkLine across a prune', () => {
  it('forks from before a prune as if the prune were not a boundary', () => {
    const entries = chain(
      userPrompt('first'),
      assistantWithCall('c1'),
      toolResult('c1'),
      PRUNE_RECORD,
      userPrompt('second'),
      assistantWithCall('c2'),
      toolResult('c2'),
    );

    expect(computeForkLine(entries, new Set(), 1)).toBe(4);
    expect(computeForkLine(entries, new Set(), 2)).toBe(0);
  });

  it('still refuses to cross a compaction summary after a prune', () => {
    const summaryRecord: WireRecord = {
      type: 'context.apply_compaction',
      summary: 'summary',
      compactedCount: 2,
      tokensBefore: 100,
      tokensAfter: 20,
    };
    const entries = chain(
      userPrompt('first'),
      PRUNE_RECORD,
      {
        type: 'context.append_message',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'summary' }],
          toolCalls: [],
          origin: { kind: 'compaction_summary' },
        },
      },
      userPrompt('second'),
    );

    expect(() => computeForkLine(entries, new Set(), 2)).toThrowError(/compaction_boundary/);
  });
});
