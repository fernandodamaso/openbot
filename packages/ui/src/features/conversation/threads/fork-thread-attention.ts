import type { ThreadItem } from "./thread-types";

export function threadWantsUser(thread: ThreadItem): boolean {
  return thread.status.kind === "waiting" || thread.status.kind === "failed" || (thread.unread ?? 0) > 0;
}
