// Fork: live step text for sidebar rows. The renderer registers how to read the per-agent turn progress
// (turn-progress events); the sidebar rows read it here, so no new props are threaded through upstream.
export interface ForkTurnProgress {
  turnId?: string | null;
  detail?: string | null;
  running?: boolean;
}

type ForkTurnProgressReader = (agentId: string) => ForkTurnProgress | undefined;

let readTurnProgress: ForkTurnProgressReader = () => undefined;

export function setForkTurnProgressReader(reader: ForkTurnProgressReader): void {
  readTurnProgress = reader;
}

/** Live step text of an agent's running turn. With a turnId, only when it is that turn. Reactive when the reader reads a store. */
export function forkAgentActivity(agentId: string, turnId?: string | null): string | undefined {
  const progress = readTurnProgress(agentId);
  if (!progress?.detail) return undefined;
  if (turnId !== undefined && turnId !== progress.turnId) return undefined;
  return progress.detail;
}
