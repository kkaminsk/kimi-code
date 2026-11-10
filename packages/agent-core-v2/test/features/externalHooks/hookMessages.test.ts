import { describe, expect, it } from 'vitest';

import type { ContextMessage } from '#/agent/contextMemory/types';
import { HOOK_MESSAGE_TEXT_CAP, toHookMessages } from '#/features/externalHooks/internal/hookMessages';

function userMessage(text: string): ContextMessage {
  return { role: 'user', content: [{ type: 'text', text }], toolCalls: [] };
}

describe('toHookMessages', () => {
  it('projects user, assistant, tool, and system messages with index, role, and text', () => {
    const history: ContextMessage[] = [
      { role: 'system', content: [{ type: 'text', text: 'sys' }], toolCalls: [] },
      userMessage('hello'),
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'working on it' }],
        toolCalls: [
          { type: 'function', id: 'c1', name: 'Read', arguments: '{"path":"a"}' },
          { type: 'function', id: 'c2', name: 'Bash', arguments: null },
        ],
      },
      { role: 'tool', content: [{ type: 'text', text: 'file a' }], toolCalls: [], toolCallId: 'c1' },
    ];

    const messages = toHookMessages(history);

    expect(messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
    ]);
    expect(messages.map((message) => message.index)).toEqual([0, 1, 2, 3]);
    expect(messages[1]?.text).toBe('hello');
    expect(messages[1]?.chars).toBe('hello'.length);
    expect(messages[1]?.is_error).toBe(false);
    expect(messages[3]?.tool_call_id).toBe('c1');
  });

  it('carries tool calls with raw argument strings', () => {
    const history: ContextMessage[] = [
      {
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        toolCalls: [
          { type: 'function', id: 'c1', name: 'Read', arguments: '{"path":"a"}' },
          { type: 'function', id: 'c2', name: 'Bash', arguments: null },
        ],
      },
    ];

    const messages = toHookMessages(history);

    expect(messages[0]?.tool_calls).toEqual([
      { id: 'c1', name: 'Read', arguments: '{"path":"a"}' },
      { id: 'c2', name: 'Bash', arguments: '' },
    ]);
  });

  it('excludes thinking parts from the projected text', () => {
    const history: ContextMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'think', think: 'hidden reasoning' },
          { type: 'text', text: 'visible answer' },
        ],
        toolCalls: [],
      },
    ];

    const messages = toHookMessages(history);

    expect(messages[0]?.text).toBe('visible answer');
    expect(messages[0]?.chars).toBe('visible answer'.length);
  });

  it('carries the message origin kind when present', () => {
    const history: ContextMessage[] = [
      {
        ...userMessage('summary'),
        origin: { kind: 'compaction_summary' },
      },
    ];

    const messages = toHookMessages(history);

    expect(messages[0]?.origin_kind).toBe('compaction_summary');
  });

  it('marks errored tool messages', () => {
    const history: ContextMessage[] = [
      {
        role: 'tool',
        content: [{ type: 'text', text: 'boom' }],
        toolCalls: [],
        toolCallId: 'c9',
        isError: true,
      },
    ];

    const messages = toHookMessages(history);

    expect(messages[0]?.is_error).toBe(true);
  });

  it('caps oversized text and leaves the source message untouched', () => {
    const big = 'x'.repeat(HOOK_MESSAGE_TEXT_CAP * 2 + 700);
    const history: ContextMessage[] = [userMessage(big)];

    const messages = toHookMessages(history);

    const expectedNote = `[… ${String(big.length - HOOK_MESSAGE_TEXT_CAP)} chars omitted …]`;
    expect(messages[0]?.text).toBe(big.slice(0, HOOK_MESSAGE_TEXT_CAP) + expectedNote);
    expect(messages[0]?.chars).toBe(messages[0]?.text.length);
    expect(history[0]?.content[0]?.type).toBe('text');
    if (history[0]?.content[0]?.type === 'text') {
      expect(history[0].content[0].text).toBe(big);
    }
  });
});
