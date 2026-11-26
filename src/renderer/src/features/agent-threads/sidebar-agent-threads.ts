import { sideThreadItem } from "@openbot/ui/features/conversation/threads/thread-items";
import { MAIN_THREAD_ID } from "@openbot/ui/features/conversation/threads/thread-types";
import { forkAgentActivity } from "@openbot/ui/features/sidebar/fork-activity";
import type { SidebarAgentThreads } from "@openbot/ui/features/sidebar/sidebar-types";
import type { AgentTasks } from "../agent-tasks/agent-tasks-state";
import type { AgentThreadTabsState } from "./agent-thread-tabs";
import { type ThreadWaits, taskWaitsFor } from "./conversation-threads";
import { threadPreview } from "./thread-previews";

export interface SidebarAgentThreadsInput {
  tasks: AgentTasks;
  tabs: AgentThreadTabsState;
  activeAgentId: () => string;
  waits: () => ThreadWaits;
  openThread: (agentId: string, threadId: string) => void;
  onNew?: ((agentId: string) => void) | undefined;
}

export function sidebarAgentThreads(input: SidebarAgentThreadsInput): SidebarAgentThreads | undefined {
  const { tasks, tabs } = input;
  if (!tasks.available()) return undefined;
  const reading = new Set<string>();
  const editable = tasks.editable();
  return {
    threads: (agentId) => {
      const list = tasks.snapshot(agentId)?.tasks ?? [];
      const hidden = tabs.hidden();
      const waits = input.waits();
      return list
        .filter((task) => task.state !== "closed" && !hidden.has(task.id))
        .map((task) => sideThreadItem(task, taskWaitsFor(task, waits), tasks.unreadCount(task)))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    openId: (agentId) => {
      if (input.activeAgentId() !== agentId) return undefined;
      const id = tabs.activeId(agentId);
      return id === MAIN_THREAD_ID ? undefined : id;
    },
    load: (agentId) => {
      if (tasks.snapshot(agentId) || reading.has(agentId)) return;
      reading.add(agentId);
      void tasks.loadTasks(agentId).finally(() => reading.delete(agentId));
    },
    onOpen: input.openThread,
    onNew: input.onNew,
    onArchive: (agentId, threadId) => void tabs.archive(agentId, threadId),
    onDelete: editable ? (agentId, threadId) => void tabs.remove(agentId, threadId) : undefined,
    preview: (agentId, threadId) => {
      const task = tasks.snapshot(agentId)?.tasks.find((item) => item.id === threadId);
      return task ? threadPreview(tasks.readTask, agentId, task.id, task.updatedAt) : undefined;
    },
    // Fork: a running thread shows its live step text (turn progress, else the task's progress line)
    live: (agentId, threadId) => {
      const task = tasks.snapshot(agentId)?.tasks.find((item) => item.id === threadId);
      if (task?.state !== "running") return undefined;
      return forkAgentActivity(agentId, task.activeTurnId) || task.progress || undefined;
    },
  };
}
