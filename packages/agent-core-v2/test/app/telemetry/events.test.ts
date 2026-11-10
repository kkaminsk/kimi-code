import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  agentTelemetryContextProperties,
  telemetryEventDefinitions,
  type TelemetryEventProperties,
} from '#/app/telemetry/events';

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

describe('telemetry event registry', () => {
  it('uses snake_case event names', () => {
    for (const name of Object.keys(telemetryEventDefinitions)) {
      expect(name, `event name "${name}"`).toMatch(NAME_PATTERN);
    }
  });

  it('documents owner, comment, and snake_case properties for every event', () => {
    for (const [name, definition] of Object.entries(telemetryEventDefinitions)) {
      const { meta } = definition;
      expect(meta.owner.length, `${name}: owner`).toBeGreaterThan(0);
      expect(meta.comment.length, `${name}: comment`).toBeGreaterThan(0);
      for (const property of Object.keys(meta.properties)) {
        expect(property, `${name}.${property}`).toMatch(NAME_PATTERN);
      }
      for (const comment of Object.values(meta.properties)) {
        expect(comment.length, `${name}: property comment`).toBeGreaterThan(0);
      }
    }
  });

  it('declares Agent identity once as ambient context', () => {
    expect(agentTelemetryContextProperties).toEqual({
      agent_id: 'Agent id (main or subagent scope id)',
    });
    for (const [name, definition] of Object.entries(telemetryEventDefinitions)) {
      if (definition.context === 'agent') {
        expect(
          definition.meta.properties,
          `${name}: agent-scope events keep agent_id out of the payload`,
        ).not.toHaveProperty('agent_id');
      }
    }
    expect(telemetryEventDefinitions.goal_created.context).toBe('agent');
    expect(telemetryEventDefinitions.image_compress.context).toBe('none');
    expectTypeOf<TelemetryEventProperties<'goal_created'>>().toMatchTypeOf<{
      agent_id: string;
    }>();
  });

  it('documents the compaction mode, dropped calls, and truncated results on compaction_finished', () => {
    const definition = telemetryEventDefinitions.compaction_finished;
    expect(Object.keys(definition.meta.properties)).toEqual(
      expect.arrayContaining(['mode', 'dropped_calls', 'truncated_results']),
    );
    expectTypeOf<
      Pick<TelemetryEventProperties<'compaction_finished'>, 'mode'>
    >().toEqualTypeOf<{ mode?: 'summary' | 'prune' | 'prune_then_summary' }>();
    expectTypeOf<
      Pick<TelemetryEventProperties<'compaction_finished'>, 'dropped_calls'>
    >().toEqualTypeOf<{ dropped_calls?: number }>();
    expectTypeOf<
      Pick<TelemetryEventProperties<'compaction_finished'>, 'truncated_results'>
    >().toEqualTypeOf<{ truncated_results?: number }>();
  });
});
