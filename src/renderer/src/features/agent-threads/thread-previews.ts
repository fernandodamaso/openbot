// Fork: the latest message of a side thread, shown as the second line of its sidebar row and used to
// search threads from Ctrl+K. Read lazily (only for rows that ask), cached per thread, and read again
// only when the thread's updatedAt changes.
import type { AgentTaskInput, ConversationSnapshot } from "@openbot/contracts/ipc";
import { createSignal } from "solid-js";

type ReadTask = (input: AgentTaskInput) => Promise<ConversationSnapshot>;

const PREVIEW_LENGTH = 160;
const PARALLEL_READS = 3;

const cache = new Map<string, { updatedAt: string; text: string }>();
const requested = new Set<string>();
const waiting: Array<() => Promise<void>> = [];
let running = 0;
const [version, setVersion] = createSignal(0);

function pump(): void {
  while (running < PARALLEL_READS && waiting.length > 0) {
    const job = waiting.shift();
    if (!job) return;
    running += 1;
    void job().finally(() => {
      running -= 1;
      pump();
    });
  }
}

// markdown to one plain line: drop emphasis/code marks, headings, quotes and list bullets, keep link text
function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|~~|`+)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function request(read: ReadTask, agentId: string, threadId: string, updatedAt: string): void {
  const key = `${threadId}@${updatedAt}`;
  if (requested.has(key)) return;
  requested.add(key);
  waiting.push(async () => {
    try {
      const snapshot = await read({ agentId, taskId: threadId });
      const last = [...snapshot.messages]
        .reverse()
        .find((message) => message.author !== "system" && message.text.trim() !== "");
      const text = last ? plainText(last.text).slice(0, PREVIEW_LENGTH) : "";
      cache.set(threadId, { updatedAt, text });
      setVersion((value) => value + 1);
    } catch {
      requested.delete(key);
    }
  });
  queueMicrotask(pump);
}

/** Cached latest-message text of a thread; starts a read when missing or out of date. */
export function threadPreview(
  read: ReadTask,
  agentId: string,
  threadId: string,
  updatedAt: string,
): string | undefined {
  version();
  const hit = cache.get(threadId);
  if (!hit || hit.updatedAt !== updatedAt) request(read, agentId, threadId, updatedAt);
  return hit?.text || undefined;
}

/** Cached text only, never starts a read (for search over many threads). */
export function cachedThreadPreview(threadId: string): string | undefined {
  version();
  return cache.get(threadId)?.text || undefined;
}
