// Fork: a collapsed folder still shows the chats that want the user (waiting for an answer, working,
// or with unread messages), plus the open one, so nothing in progress hides inside a closed folder.
import { For, Match, Show, Switch } from "solid-js";
import { SidebarAgentRow } from "./SidebarAgentRow";
import { SidebarChannelRow } from "./SidebarChannelRow";
import { useSidebarScope } from "./sidebar-scope";
import type { SidebarChatItem } from "./sidebar-types";

export function SidebarFolderPeek(peekProps: { sectionId: string }) {
  const { chatIsUnread, customSectionById, filteredChatsBySection, props, sectionChildren } = useSidebarScope();

  const chatsIn = (sectionId: string): SidebarChatItem[] => [
    ...(filteredChatsBySection().get(sectionId) ?? []),
    ...(customSectionById().get(sectionId) ? sectionChildren(sectionId) : []).flatMap(chatsIn),
  ];
  const peeks = (chat: SidebarChatItem) => {
    if (chat.kind === "agent" && props.activeAgentId === chat.id) return true;
    if (chat.kind === "channel" && props.activeChannelId === chat.id) return true;
    const kind = props.agentStates[chat.id]?.kind;
    if (kind === "waiting" || kind === "working") return true;
    return chatIsUnread(chat.id) && !(props.mutedAgentIds?.has(chat.id) ?? false);
  };
  const shown = () => chatsIn(peekProps.sectionId).filter(peeks);

  return (
    <Show when={shown().length > 0}>
      <div class="sidebar-section-body sidebar-folder-peek">
        <For each={shown()}>
          {(chat) => (
            <Switch>
              <Match when={chat.kind === "agent" ? chat.agent : undefined}>
                {(agent) => <SidebarAgentRow agent={agent()} />}
              </Match>
              <Match when={chat.kind === "channel" ? chat.channel : undefined}>
                {(channel) => <SidebarChannelRow channel={channel()} />}
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </Show>
  );
}
