import type { HookMessage } from './hookMessages';
import type { RawPruneDecision, ValidatedPruneDecision } from './types';

export type PruneDecisionValidation =
  | { readonly ok: true; readonly decision: ValidatedPruneDecision }
  | { readonly ok: false; readonly reason: string };

export function validatePruneDecision(
  raw: RawPruneDecision,
  messages: readonly HookMessage[],
): PruneDecisionValidation {
  const callIds = new Set<string>();
  const resultIds = new Set<string>();
  for (const message of messages) {
    for (const call of message.tool_calls ?? []) {
      callIds.add(call.id);
    }
    if (message.tool_call_id !== undefined) {
      resultIds.add(message.tool_call_id);
    }
  }

  const seen = new Set<string>();
  for (const id of raw.dropCalls) {
    const rejection = rejectId(id, callIds, resultIds, seen);
    if (rejection !== undefined) return { ok: false, reason: rejection };
    seen.add(id);
  }

  const truncateResults: { readonly toolCallId: string; readonly headChars: number }[] = [];
  for (const truncate of raw.truncateResults) {
    if (!Number.isInteger(truncate.headChars) || truncate.headChars < 0) {
      return { ok: false, reason: `bad headChars for id "${truncate.toolCallId}"` };
    }
    const rejection = rejectId(truncate.toolCallId, callIds, resultIds, seen);
    if (rejection !== undefined) return { ok: false, reason: rejection };
    seen.add(truncate.toolCallId);
    truncateResults.push({ toolCallId: truncate.toolCallId, headChars: truncate.headChars });
  }

  return {
    ok: true,
    decision: { dropCalls: [...raw.dropCalls], truncateResults, note: raw.note },
  };
}

function rejectId(
  id: string,
  callIds: ReadonlySet<string>,
  resultIds: ReadonlySet<string>,
  seen: ReadonlySet<string>,
): string | undefined {
  if (seen.has(id)) return `duplicate id "${id}"`;
  if (!callIds.has(id)) return `unknown tool call id "${id}"`;
  if (!resultIds.has(id)) return `open tool exchange for id "${id}"`;
  return undefined;
}
