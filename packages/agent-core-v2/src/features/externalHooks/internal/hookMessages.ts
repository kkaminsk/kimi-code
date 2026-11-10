import type { ContextMessage } from '#/agent/contextMemory/types';

export const HOOK_MESSAGE_TEXT_CAP = 200_000;

export interface HookToolCallRef {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

export interface HookMessage {
  readonly index: number;
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly origin_kind?: string;
  readonly text: string;
  readonly tool_calls?: readonly HookToolCallRef[];
  readonly tool_call_id?: string;
  readonly is_error: boolean;
  readonly chars: number;
}

export function toHookMessages(history: readonly ContextMessage[]): HookMessage[] {
  return history.map((message, index) => toHookMessage(message, index));
}

function toHookMessage(message: ContextMessage, index: number): HookMessage {
  const text = capHookText(
    message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(''),
  );
  const toolCalls =
    message.role === 'assistant' && message.toolCalls.length > 0
      ? message.toolCalls.map((call) => ({
          id: call.id,
          name: call.name,
          arguments: call.arguments ?? '',
        }))
      : undefined;
  const toolCallId = message.role === 'tool' ? message.toolCallId : undefined;
  return {
    index,
    role: message.role,
    origin_kind: message.origin?.kind,
    text,
    tool_calls: toolCalls,
    tool_call_id: toolCallId,
    is_error: message.isError === true,
    chars: text.length,
  };
}

function capHookText(text: string): string {
  if (text.length <= HOOK_MESSAGE_TEXT_CAP) return text;
  const omitted = text.length - HOOK_MESSAGE_TEXT_CAP;
  return `${text.slice(0, HOOK_MESSAGE_TEXT_CAP)}[… ${String(omitted)} chars omitted …]`;
}
