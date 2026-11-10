import type { ProjectedMessage } from '../../types';

interface PruneRibbonProps {
  /** The synthetic prune-marker message emitted by the projector
   *  (`source === 'prune'`). */
  message: ProjectedMessage;
}

/**
 * Horizontal ribbon that marks where a `context.apply_prune` record dropped
 * tool calls and truncated tool results. Styled to match
 * `CompactionRibbon` / `UndoRibbon` / `ClearRibbon` (flanking `h-px` rules +
 * a centered mono uppercase label), using the info tone.
 */
export function PruneRibbon({ message }: PruneRibbonProps) {
  const dropped = message.prune?.droppedCalls ?? 0;
  const truncated = message.prune?.truncatedResults ?? 0;
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-sev-info)] opacity-50" />
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-sev-info)]">
        pruned · {dropped} call{dropped === 1 ? '' : 's'} dropped · {truncated} result
        {truncated === 1 ? '' : 's'} truncated · line {message.lineNo}
      </span>
      <span className="h-px flex-1 bg-[var(--color-sev-info)] opacity-50" />
    </div>
  );
}
