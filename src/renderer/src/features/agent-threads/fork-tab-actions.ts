import {
  DRAFT_THREAD_ID,
  MAIN_THREAD_ID,
  type ThreadItem,
} from "@openbot/ui/features/conversation/threads/thread-types";

const CLOSED_TABS_LIMIT = 20;

// Closed side-thread tab ids, newest last. Kept in memory only, per agent.
const closedTabs = new Map<string, string[]>();

// A side-thread tab is idle when its agent is not working, queued, waiting or failed,
// it has no unread reply, and it is not awaiting an answer from the user.
export function isIdleTab(tab: ThreadItem): boolean {
  return tab.kind === "side" && tab.status.kind === "idle" && !((tab.unread ?? 0) > 0);
}

export function idleTabIds(tabs: readonly ThreadItem[], activeId: string): string[] {
  return tabs.filter((tab) => tab.id !== activeId && isIdleTab(tab)).map((tab) => tab.id);
}

export function rememberClosedTabs(agentId: string, ids: readonly string[]): void {
  const sides = ids.filter((id) => id !== MAIN_THREAD_ID && id !== DRAFT_THREAD_ID);
  if (sides.length === 0) return;
  const stack = (closedTabs.get(agentId) ?? []).filter((id) => !sides.includes(id));
  closedTabs.set(agentId, [...stack, ...sides].slice(-CLOSED_TABS_LIMIT));
}

// Pops the most recently closed tab that can still be shown. Ids that cannot be shown are dropped.
export function takeClosedTab(agentId: string, reopenable: (id: string) => boolean): string | undefined {
  const stack = closedTabs.get(agentId);
  while (stack && stack.length > 0) {
    const id = stack.pop();
    if (id !== undefined && reopenable(id)) return id;
  }
  return undefined;
}

export type ForkTabShortcut = "closeActive" | "reopenClosed";

// Alt+W closes the active side-thread tab. Alt+Shift+T reopens the last closed tab.
// Keys pressed while an IME is composing are ignored.
export function forkTabShortcut(event: KeyboardEvent): ForkTabShortcut | undefined {
  if (event.isComposing || event.keyCode === 229 || event.repeat) return undefined;
  if (!event.altKey || event.ctrlKey || event.metaKey) return undefined;
  const letter = (event.code.startsWith("Key") ? event.code.slice(3) : event.key).toLowerCase();
  if (letter === "w" && !event.shiftKey) return "closeActive";
  if (letter === "t" && event.shiftKey) return "reopenClosed";
  return undefined;
}
