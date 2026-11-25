// Fork: the "Needs you" group at the top of the Ctrl+K search. With an empty query it lists what is
// waiting for the user: agents and threads waiting for an answer, failed threads, and unread replies.
import { CircleAlert, MessageCircle, MessageCircleQuestionMark, Split } from "@openbot/ui";
import type { GlobalSearchAction } from "@openbot/ui/components/GlobalSearch";
import type { ThreadItem } from "@openbot/ui/features/conversation/threads/thread-types";
import { sidebarAgentStateLabel } from "@openbot/ui/features/sidebar/sidebar-filtering";
import type { SidebarWaitReason } from "@openbot/ui/features/sidebar/sidebar-types";
import { useText } from "@openbot/ui/text";
import { createMemo } from "solid-js";
import { useAgentTasks } from "./features/agent-tasks/agent-tasks-context";
import { useAgentThreads } from "./features/agent-threads/agent-threads-context";
import type { ThreadWaits } from "./features/agent-threads/conversation-threads";
import { sidebarAgentThreads } from "./features/agent-threads/sidebar-agent-threads";
import { cachedThreadPreview } from "./features/agent-threads/thread-previews";
import { createAgentActivity } from "./features/agents/agent-activity";
import { useAgents } from "./features/agents/agents-context";
import { useNavigation } from "./navigation";
import { useTurns } from "./turns";

const WAIT_TEXT = {
  question: "sidebar.state.waitingQuestion",
  approval: "sidebar.state.waitingApproval",
  takeover: "sidebar.state.waitingTakeover",
} as const satisfies Record<SidebarWaitReason, string>;

// lower sorts first: answers and approvals, then failures, then unread replies
function threadRank(thread: ThreadItem): 0 | 1 | 2 | undefined {
  if (thread.status.kind === "waiting") return 0;
  if (thread.status.kind === "failed") return 1;
  if ((thread.unread ?? 0) > 0) return 2;
  return undefined;
}

export function useGlobalSearchAttention() {
  const { t, format } = useText();
  const { agentList, userHiddenAgentIds } = useAgents();
  const { selectAgent } = useNavigation();
  const { pendingPrompts, approvals } = useTurns();
  const agentTasks = useAgentTasks();
  const agentThreads = useAgentThreads();
  const { agentStates } = createAgentActivity();

  const waits = createMemo((): ThreadWaits => {
    const prompts = Object.values(pendingPrompts());
    return {
      prompts: prompts.flatMap((event) => (event?.type === "prompt" ? [event] : [])),
      takeovers: prompts.flatMap((event) => (event?.type === "browser-takeover-requested" ? [event.request] : [])),
      approvals: approvals(),
    };
  });
  const threads = createMemo(() =>
    sidebarAgentThreads({
      tasks: agentTasks,
      tabs: agentThreads,
      activeAgentId: () => "",
      waits,
      openThread: (agentId, threadId) => void selectAgent(agentId, threadId),
    }),
  );

  // Fork: every thread of the visible agents, searchable from Ctrl+K by title, agent name and latest message
  const threadActions = createMemo<GlobalSearchAction[]>(() => {
    const model = threads();
    const hidden = userHiddenAgentIds();
    return agentList().flatMap((agent) =>
      hidden.has(agent.id)
        ? []
        : (model?.threads(agent.id) ?? []).map(
            (thread): GlobalSearchAction => ({
              id: `thread:${agent.id}:${thread.id}`,
              label: thread.title,
              detail: agent.name,
              keywords: cachedThreadPreview(thread.id) ?? "",
              group: "threads",
              icon: Split,
              run: () => void selectAgent(agent.id, thread.id),
            }),
          ),
    );
  });

  const attention = createMemo<GlobalSearchAction[]>(() => {
    const ranked: { rank: number; action: GlobalSearchAction }[] = [];
    const model = threads();
    const hidden = userHiddenAgentIds();
    for (const agent of agentList()) {
      if (hidden.has(agent.id)) continue;
      const agentThreadList = model?.threads(agent.id) ?? [];
      for (const thread of agentThreadList) {
        const rank = threadRank(thread);
        if (rank === undefined) continue;
        const detail =
          thread.status.kind === "waiting"
            ? t(WAIT_TEXT[thread.status.reason])
            : thread.status.kind === "failed"
              ? t("conversation.threads.state.failed")
              : t("sidebar.state.unread", { count: thread.unread ?? 0 });
        ranked.push({
          rank,
          action: {
            id: `attention:${agent.id}:${thread.id}`,
            label: `${agent.name} › ${thread.title}`,
            detail,
            group: "attention",
            icon: rank === 0 ? MessageCircleQuestionMark : rank === 1 ? CircleAlert : Split,
            run: () => void selectAgent(agent.id, thread.id),
          },
        });
      }
      const state = agentStates()[agent.id];
      const threadWaits = agentThreadList.some((thread) => thread.status.kind === "waiting");
      const waiting = state?.kind === "waiting" && !threadWaits;
      const unread = state?.kind === "unread" && state.count > 0;
      if (!state || !(waiting || unread)) continue;
      ranked.push({
        rank: waiting ? 0 : 2,
        action: {
          id: `attention:${agent.id}`,
          label: agent.name,
          detail: sidebarAgentStateLabel(state, t, format),
          group: "attention",
          icon: waiting ? MessageCircleQuestionMark : MessageCircle,
          run: () => void selectAgent(agent.id),
        },
      });
    }
    return ranked.sort((left, right) => left.rank - right.rank).map((entry) => entry.action);
  });

  return () => [...attention(), ...threadActions()];
}
