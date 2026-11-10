import { describe, expect, it } from 'vitest';

import { applyPruneRecord } from '#/agent/contextMemory/contextOps';
import type { ContextMessage } from '#/agent/contextMemory/types';

function userMessage(text: string): ContextMessage {
  return { role: 'user', content: [{ type: 'text', text }], toolCalls: [] };
}

function assistantMessage(
  text: string,
  ...calls: readonly { id: string; arguments: string }[]
): ContextMessage {
  return {
    role: 'assistant',
    content: text.length === 0 ? [] : [{ type: 'text', text }],
    toolCalls: calls.map((call) => ({ type: 'function', id: call.id, name: 'Read', arguments: call.arguments })),
  };
}

function toolMessage(toolCallId: string, text: string): ContextMessage {
  return { role: 'tool', content: [{ type: 'text', text }], toolCalls: [], toolCallId };
}

function history(): ContextMessage[] {
  return [
    userMessage('read a and b'),
    assistantMessage('reading', { id: 'c1', arguments: '{"path":"a"}' }, { id: 'c2', arguments: '{"path":"b"}' }),
    toolMessage('c1', 'contents a'),
    toolMessage('c2', 'contents b'),
  ];
}

function orphanCheck(messages: readonly ContextMessage[]): void {
  const callIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const call of message.toolCalls) callIds.add(call.id);
  }
  for (const message of messages) {
    if (message.role === 'tool') expect(callIds.has(message.toolCallId ?? '')).toBe(true);
  }
}

describe('applyPruneRecord', () => {
  it('drops one of two calls and its tool message', () => {
    const pruned = applyPruneRecord(history(), { dropCalls: ['c1'], truncateResults: [] });

    expect(pruned.map((message) => message.role)).toEqual(['user', 'assistant', 'tool']);
    expect(pruned[1]?.toolCalls.map((call) => call.id)).toEqual(['c2']);
    expect(pruned.some((message) => message.role === 'tool' && message.toolCallId === 'c1')).toBe(false);
    orphanCheck(pruned);
  });

  it('drops the only call of a text-less assistant message and removes the message', () => {
    const state = [
      userMessage('run it'),
      assistantMessage('', { id: 'c1', arguments: '{}' }),
      toolMessage('c1', 'output'),
    ];

    const pruned = applyPruneRecord(state, { dropCalls: ['c1'], truncateResults: [] });

    expect(pruned.map((message) => message.role)).toEqual(['user']);
    orphanCheck(pruned);
  });

  it('keeps an assistant message with text when its only call is dropped', () => {
    const state = [
      userMessage('run it'),
      assistantMessage('here is the answer', { id: 'c1', arguments: '{}' }),
      toolMessage('c1', 'output'),
    ];

    const pruned = applyPruneRecord(state, { dropCalls: ['c1'], truncateResults: [] });

    expect(pruned.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(pruned[1]?.toolCalls).toEqual([]);
    expect(pruned[1]?.content).toEqual([{ type: 'text', text: 'here is the answer' }]);
    orphanCheck(pruned);
  });

  it('truncates a result to headChars plus the omission note', () => {
    const text = 'x'.repeat(5000);
    const state = [assistantMessage('', { id: 'c1', arguments: '{}' }), toolMessage('c1', text)];

    const pruned = applyPruneRecord(state, {
      dropCalls: [],
      truncateResults: [{ toolCallId: 'c1', headChars: 300 }],
    });

    const truncated = pruned[1]?.content[0];
    expect(truncated?.type).toBe('text');
    if (truncated?.type === 'text') {
      expect(truncated.text).toBe(
        `${'x'.repeat(300)}\n[… 4700 chars omitted by prune; re-run the tool if needed …]`,
      );
    }
    orphanCheck(pruned);
  });

  it('leaves a result shorter than headChars untouched', () => {
    const state = [assistantMessage('', { id: 'c1', arguments: '{}' }), toolMessage('c1', 'short')];

    const pruned = applyPruneRecord(state, {
      dropCalls: [],
      truncateResults: [{ toolCallId: 'c1', headChars: 300 }],
    });

    expect(pruned[1]?.content).toEqual([{ type: 'text', text: 'short' }]);
  });

  it('throws on an unknown id and leaves nothing applied', () => {
    const state = history();

    expect(() => applyPruneRecord(state, { dropCalls: ['missing'], truncateResults: [] })).toThrow(
      /unknown tool call id/,
    );
    expect(() =>
      applyPruneRecord(state, { dropCalls: [], truncateResults: [{ toolCallId: 'missing', headChars: 10 }] }),
    ).toThrow(/unknown tool call id/);
    expect(state).toHaveLength(4);
  });

  it('returns a copy for an empty prune', () => {
    const state = history();
    const pruned = applyPruneRecord(state, { dropCalls: [], truncateResults: [] });

    expect(pruned).toEqual(state);
    expect(pruned).not.toBe(state);
  });
});
