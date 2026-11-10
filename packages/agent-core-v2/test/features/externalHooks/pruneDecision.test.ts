import { describe, expect, it } from 'vitest';

import type { HookMessage } from '#/features/externalHooks/internal/hookMessages';
import { validatePruneDecision } from '#/features/externalHooks/internal/pruneDecision';
import type { RawPruneDecision } from '#/features/externalHooks/internal/types';

function historyWithExchanges(...ids: readonly string[]): HookMessage[] {
  return [
    { index: 0, role: 'user', text: 'prompt', is_error: false, chars: 6 },
    {
      index: 1,
      role: 'assistant',
      text: '',
      is_error: false,
      chars: 0,
      tool_calls: ids.map((id) => ({ id, name: 'Read', arguments: '{}' })),
    },
    ...ids.map((id, i) => ({
      index: i + 2,
      role: 'tool' as const,
      text: `result ${id}`,
      is_error: false,
      chars: `result ${id}`.length,
      tool_call_id: id,
    })),
  ];
}

describe('validatePruneDecision', () => {
  it('accepts a decision whose ids all exist with arrived results', () => {
    const raw: RawPruneDecision = {
      dropCalls: ['c1'],
      truncateResults: [{ toolCallId: 'c2', headChars: 300 }],
      note: 'kept what matters',
    };

    const validation = validatePruneDecision(raw, historyWithExchanges('c1', 'c2'));

    expect(validation).toEqual({
      ok: true,
      decision: {
        dropCalls: ['c1'],
        truncateResults: [{ toolCallId: 'c2', headChars: 300 }],
        note: 'kept what matters',
      },
    });
  });

  it('rejects an unknown tool call id', () => {
    const validation = validatePruneDecision(
      { dropCalls: ['missing'], truncateResults: [] },
      historyWithExchanges('c1'),
    );

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.reason).toContain('unknown tool call id "missing"');
  });

  it('rejects a call whose result has not arrived', () => {
    const messages: HookMessage[] = [
      {
        index: 0,
        role: 'assistant',
        text: '',
        is_error: false,
        chars: 0,
        tool_calls: [{ id: 'open1', name: 'Bash', arguments: '{}' }],
      },
    ];

    const validation = validatePruneDecision(
      { dropCalls: ['open1'], truncateResults: [] },
      messages,
    );

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.reason).toContain('open tool exchange');
  });

  it('rejects duplicate ids across the two lists', () => {
    const validation = validatePruneDecision(
      {
        dropCalls: ['c1'],
        truncateResults: [{ toolCallId: 'c1', headChars: 10 }],
      },
      historyWithExchanges('c1', 'c2'),
    );

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.reason).toContain('duplicate id "c1"');
  });

  it('rejects duplicate ids within dropCalls', () => {
    const validation = validatePruneDecision(
      { dropCalls: ['c1', 'c1'], truncateResults: [] },
      historyWithExchanges('c1'),
    );

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.reason).toContain('duplicate id "c1"');
  });

  it('rejects negative and non-integer headChars', () => {
    for (const headChars of [-1, 2.5]) {
      const validation = validatePruneDecision(
        { dropCalls: [], truncateResults: [{ toolCallId: 'c1', headChars }] },
        historyWithExchanges('c1'),
      );
      expect(validation.ok).toBe(false);
      if (!validation.ok) expect(validation.reason).toContain('bad headChars');
    }
  });

  it('accepts an empty decision', () => {
    const validation = validatePruneDecision(
      { dropCalls: [], truncateResults: [] },
      historyWithExchanges('c1'),
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.decision.dropCalls).toEqual([]);
      expect(validation.decision.truncateResults).toEqual([]);
    }
  });
});
